import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FiCheckCircle, FiXCircle, FiAlertTriangle, FiDownload, FiArrowLeft,
  FiShield, FiEye, FiEyeOff, FiFileText, FiExternalLink, FiPackage,
  FiClipboard, FiEdit2
} from 'react-icons/fi';
import api from '../utils/api';
import { toast } from 'react-toastify';
import ManualInspectionModal from '../components/ManualInspectionModal';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

const ZONE_LABELS = {
  mrp_zone: 'MRP',
  manufacturer_zone: 'Manufacturer',
  consumer_care_zone: 'Consumer Care',
  net_qty_zone: 'Net Quantity',
  bottom_panel: 'Bottom Panel',
  unknown: 'Text Region',
};

const ZONE_BASE_COLORS = {
  mrp_zone: '#22c55e',
  manufacturer_zone: '#3b82f6',
  consumer_care_zone: '#a855f7',
  net_qty_zone: '#f97316',
  bottom_panel: '#6b7280',
  unknown: '#9ca3af',
};

function getZoneStatus(zone, checks) {
  const zoneLower = zone?.toLowerCase() || '';
  for (const check of checks) {
    const name = (check.rule_name || '').toLowerCase();
    if (
      (zoneLower === 'mrp_zone' && (name.includes('mrp') || name.includes('price'))) ||
      (zoneLower === 'net_qty_zone' && (name.includes('quantity') || name.includes('weight') || name.includes('net'))) ||
      (zoneLower === 'manufacturer_zone' && (name.includes('manufacturer') || name.includes('address'))) ||
      (zoneLower === 'consumer_care_zone' && (name.includes('care') || name.includes('helpline') || name.includes('contact')))
    ) {
      if (check.status === 'pass') return 'pass';
      if (check.status === 'fail') return 'fail';
      return 'review';
    }
  }
  return null;
}

function zoneColor(zone, checks) {
  const base = ZONE_BASE_COLORS[zone] || ZONE_BASE_COLORS.unknown;
  const status = getZoneStatus(zone, checks);
  const alpha = 0.30;
  if (status === 'fail') return { bg: `rgba(239,68,68,${alpha})`, border: '#ef4444' };
  if (status === 'pass') return { bg: `rgba(34,197,94,${alpha})`, border: '#22c55e' };
  return { bg: hexToRgba(base, alpha), border: base };
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// Maps a compliance check's rule_name to its OCR zone key.
function getZoneForCheck(check) {
  const name = (check?.rule_name || '').toLowerCase();
  if (name.includes('mrp') || name.includes('price')) return 'mrp_zone';
  if (name.includes('quantity') || name.includes('weight') || name.includes('net')) return 'net_qty_zone';
  if (name.includes('manufacturer') || name.includes('address')) return 'manufacturer_zone';
  if (name.includes('care') || name.includes('helpline') || name.includes('contact')) return 'consumer_care_zone';
  return null;
}

function useAnimatedNumber(target, duration = 900) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === null || target === undefined) return;
    let startTs;
    let raf;
    const animate = (ts) => {
      if (!startTs) startTs = ts;
      const progress = Math.min((ts - startTs) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

const BboxOverlay = ({ extractedData, imgNaturalWidth, imgNaturalHeight, displayWidth, displayHeight, checks }) => {
  if (!extractedData || extractedData.length === 0) return null;
  const scaleX = displayWidth / imgNaturalWidth;
  const scaleY = displayHeight / imgNaturalHeight;

  return (
    <div className="tm-anim-fade absolute inset-0 pointer-events-none" style={{ width: displayWidth, height: displayHeight }}>
      {extractedData.map((item, i) => {
        if (!item.bbox || item.bbox.length < 4) return null;
        const pts = item.bbox;
        const xs = pts.map(p => p[0]);
        const ys = pts.map(p => p[1]);
        const x = Math.min(...xs) * scaleX;
        const y = Math.min(...ys) * scaleY;
        const w = (Math.max(...xs) - Math.min(...xs)) * scaleX;
        const h = (Math.max(...ys) - Math.min(...ys)) * scaleY;
        const zone = item.zone || 'unknown';
        const colors = zoneColor(zone, checks);
        const status = getZoneStatus(zone, checks);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: w,
              height: h,
              backgroundColor: colors.bg,
              border: `2px solid ${colors.border}`,
              borderRadius: 3,
              transition: 'all 0.2s ease',
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: -14,
                left: 0,
                fontSize: 9,
                fontWeight: 700,
                color: '#fff',
                backgroundColor: colors.border,
                padding: '1px 5px',
                borderRadius: 3,
                lineHeight: '14px',
                whiteSpace: 'nowrap',
                letterSpacing: '0.02em',
              }}
            >
              {ZONE_LABELS[zone] || zone}
              {status === 'pass' && ' \u2713'}
              {status === 'fail' && ' \u2717'}
            </span>
          </div>
        );
      })}
    </div>
  );
};

// Shows the product image dimmed with red bounding box overlays for a specific failing zone.
const ZoneEvidenceImage = ({ imageUrl, extractedData, targetZone }) => {
  const eImgRef = React.useRef(null);
  const [eDims, setEDims] = React.useState({ natW: 0, natH: 0, dispW: 0, dispH: 0 });

  if (!imageUrl || !targetZone || !extractedData) return null;
  const zoneItems = extractedData.filter(d => d.zone === targetZone && d.bbox && d.bbox.length >= 4);
  if (zoneItems.length === 0) return null;

  const handleLoad = () => {
    const img = eImgRef.current;
    if (img) setEDims({ natW: img.naturalWidth, natH: img.naturalHeight, dispW: img.clientWidth, dispH: img.clientHeight });
  };

  const scaleX = eDims.natW ? eDims.dispW / eDims.natW : 0;
  const scaleY = eDims.natH ? eDims.dispH / eDims.natH : 0;

  return (
    <div className="mt-4">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
        Zone Evidence &mdash; <span className="text-rose-500 font-bold">{ZONE_LABELS[targetZone] || targetZone}</span>
      </p>
      <div className="relative bg-slate-900 rounded-xl overflow-hidden border-2 border-rose-300 shadow">
        <img
          ref={eImgRef}
          src={imageUrl}
          alt={`Zone evidence: ${targetZone}`}
          onLoad={handleLoad}
          className="w-full max-h-60 object-contain"
          style={{ filter: 'brightness(0.82) contrast(1.05)' }}
        />
        {scaleX > 0 && zoneItems.map((item, i) => {
          const pts = item.bbox;
          const xs = pts.map(p => p[0]);
          const ys = pts.map(p => p[1]);
          const x = Math.min(...xs) * scaleX;
          const y = Math.min(...ys) * scaleY;
          const w = (Math.max(...xs) - Math.min(...xs)) * scaleX;
          const h = (Math.max(...ys) - Math.min(...ys)) * scaleY;
          return (
            <div key={i} style={{
              position: 'absolute', left: x, top: y, width: w, height: h,
              backgroundColor: 'rgba(239,68,68,0.22)',
              border: '2px solid #ef4444',
              borderRadius: 2,
              boxShadow: '0 0 0 1px rgba(239,68,68,0.35)',
            }}>
              {i === 0 && (
                <span style={{
                  position: 'absolute', top: -16, left: 0,
                  fontSize: 9, fontWeight: 700, color: '#fff',
                  background: '#ef4444', padding: '1px 6px', borderRadius: 3,
                  whiteSpace: 'nowrap', letterSpacing: '0.04em',
                }}>
                  {ZONE_LABELS[targetZone] || targetZone} ✗
                </span>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-slate-400 mt-1.5">
        Red boxes mark the <span className="font-semibold">{ZONE_LABELS[targetZone] || targetZone}</span> region where extraction failed.
      </p>
    </div>
  );
};

const StatusChip = ({ status }) => {
  let bg, text, border, label, Icon;
  switch (status) {
    case 'pass':
      bg = 'bg-emerald-50'; text = 'text-emerald-800'; border = 'border-emerald-200';
      label = 'PASS'; Icon = FiCheckCircle;
      break;
    case 'fail':
      bg = 'bg-rose-50'; text = 'text-rose-800'; border = 'border-rose-200';
      label = 'FAIL'; Icon = FiXCircle;
      break;
    case 'human_review_required':
    case 'likely_violation':
      bg = 'bg-amber-50'; text = 'text-amber-800'; border = 'border-amber-200';
      label = status === 'likely_violation' ? 'VIOLATION' : 'REVIEW';
      Icon = FiAlertTriangle;
      break;
    default:
      bg = 'bg-slate-50'; text = 'text-slate-700'; border = 'border-slate-200';
      label = 'N/A'; Icon = FiAlertTriangle;
  }
  return (
    <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${bg} ${text} ${border}`}>
      <Icon className="h-3.5 w-3.5" />
      <span>{label}</span>
    </span>
  );
};

const RiskRing = ({ score }) => {
  const animatedScore = useAnimatedNumber(score);
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const [dashoffset, setDashoffset] = useState(circumference);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const pct = Math.min(Math.max(score, 0), 100) / 100;
      setDashoffset(circumference - pct * circumference);
    });
    return () => cancelAnimationFrame(id);
  }, [score, circumference]);

  const strokeColor = score > 60 ? '#e11d48' : score > 30 ? '#d97706' : '#059669';

  return (
    <div className="relative h-16 w-16 shrink-0">
      <svg viewBox="0 0 72 72" className="h-16 w-16 -rotate-90">
        <circle cx="36" cy="36" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="6" />
        <circle
          cx="36" cy="36" r={radius} fill="none"
          stroke={strokeColor} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashoffset}
          className="tm-ring-transition"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold text-slate-800">{animatedScore}</span>
      </div>
    </div>
  );
};

const RiskBadge = ({ riskData }) => {
  if (!riskData) return null;
  const score = riskData.risk_score ?? 0;
  const tier = riskData.risk_tier || 'LOW';
  let color, bg, border;
  if (score > 60) { color = 'text-rose-700'; bg = 'bg-rose-50'; border = 'border-rose-200'; }
  else if (score > 30) { color = 'text-amber-700'; bg = 'bg-amber-50'; border = 'border-amber-200'; }
  else { color = 'text-emerald-700'; bg = 'bg-emerald-50'; border = 'border-emerald-200'; }

  return (
    <div className={`flex items-center justify-between p-4 rounded-2xl border ${bg} ${border} transition-shadow hover:shadow-sm`}>
      <div className="flex items-center space-x-3">
        <FiShield className={`h-5 w-5 ${color}`} />
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">GTIN Risk Score</p>
          <p className="text-sm text-slate-700 mt-0.5">{riskData.total_scans} prior scan{riskData.total_scans !== 1 ? 's' : ''}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <RiskRing score={score} />
        <div className="text-right">
          <p className={`text-xs font-bold ${color}`}>{tier}</p>
          <p className="text-[11px] text-slate-400">out of 100</p>
        </div>
      </div>
    </div>
  );
};

const ConfidenceCard = ({ assessment }) => {
  if (!assessment) return null;
  const level = assessment.level || 'LOW';
  const styles = {
    HIGH: { icon: FiCheckCircle, border: 'border-emerald-200', bg: 'bg-emerald-50', text: 'text-emerald-800', message: 'AI analysis appears reliable. No immediate manual review is required.' },
    MEDIUM: { icon: FiAlertTriangle, border: 'border-amber-200', bg: 'bg-amber-50', text: 'text-amber-800', message: 'Some extracted information may require inspector verification.' },
    LOW: { icon: FiXCircle, border: 'border-rose-200', bg: 'bg-rose-50', text: 'text-rose-800', message: 'AI could not reliably determine compliance. Inspector verification is required.' },
  };
  const style = styles[level] || styles.LOW;
  const Icon = style.icon;
  const requiresReview = level !== 'HIGH';

  return (
    <div className={`rounded-2xl border ${style.border} ${style.bg} p-5`} aria-labelledby="confidence-heading">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start space-x-3">
          <Icon className={`h-5 w-5 mt-0.5 ${style.text}`} aria-hidden="true" />
          <div>
            <h3 id="confidence-heading" className={`text-base font-bold ${style.text}`}>AI Analysis Confidence</h3>
            <p className={`text-xs font-semibold uppercase tracking-wider mt-1 ${style.text}`}>
              {level}{requiresReview ? ` - ${level === 'LOW' ? 'Manual review required' : 'Review recommended'}` : ''}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className={`font-data text-xl font-bold ${style.text}`}>{assessment.score}%</p>
          <p className="text-[11px] text-slate-500">system estimate</p>
        </div>
      </div>
      <p className="text-sm text-slate-700 mt-4">{assessment.recommendation || style.message}</p>
      <p className="text-[11px] text-slate-500 mt-3">{assessment.disclaimer}</p>
    </div>
  );
};

const MismatchCard = ({ mismatch }) => {
  if (!mismatch || mismatch.status === 'skipped' || mismatch.status === 'error') return null;

  const isMatch = mismatch.status === 'match';

  return (
    <div className={`rounded-2xl border overflow-hidden transition-shadow hover:shadow-sm ${isMatch ? 'border-emerald-200' : 'border-rose-200'}`}>
      <div className={`px-5 py-3 flex items-center justify-between ${isMatch ? 'bg-emerald-50' : 'bg-rose-50'}`}>
        <div className="flex items-center space-x-2">
          <FiExternalLink className={`h-4 w-4 ${isMatch ? 'text-emerald-600' : 'text-rose-600'}`} />
          <h4 className={`text-sm font-bold ${isMatch ? 'text-emerald-800' : 'text-rose-800'}`}>E-Commerce Listing Cross-Check</h4>
        </div>
        <StatusChip status={isMatch ? 'pass' : 'fail'} />
      </div>
      <div className="bg-white p-5">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="font-semibold text-slate-500 text-xs uppercase tracking-wider">Field</div>
          <div className="font-semibold text-slate-500 text-xs uppercase tracking-wider">Physical Label</div>
          <div className="font-semibold text-slate-500 text-xs uppercase tracking-wider">Online Listing</div>

          <div className="text-slate-700 font-medium">MRP</div>
          <div className="text-slate-900">{mismatch.listing_data?.mrp || '\u2014'}</div>
          <div className="text-slate-900">{mismatch.listing_data?.mrp || '\u2014'}</div>

          <div className="text-slate-700 font-medium">Country</div>
          <div className="text-slate-900">{mismatch.listing_data?.country_of_origin || '\u2014'}</div>
          <div className="text-slate-900">{mismatch.listing_data?.country_of_origin || '\u2014'}</div>
        </div>

        {!isMatch && mismatch.mismatches && mismatch.mismatches.length > 0 && (
          <div className="mt-4 p-3 rounded-lg bg-rose-50 border border-rose-100">
            <p className="text-xs font-bold text-rose-700 mb-1.5">Discrepancies Found</p>
            <ul className="space-y-1">
              {mismatch.mismatches.map((m, i) => (
                <li key={i} className="text-sm text-rose-700 flex items-start space-x-1.5">
                  <FiXCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                  <span>{m}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

const ScanResult = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [scan, setScan] = useState(null);
  const [riskData, setRiskData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [showBboxes, setShowBboxes] = useState(false);
  const [imgDims, setImgDims] = useState({ natW: 0, natH: 0, dispW: 0, dispH: 0 });
  const imgRef = useRef(null);
  // Manual inspections state
  const [inspections, setInspections] = useState({});   // keyed by check_index
  const [inspectionModal, setInspectionModal] = useState(null); // { check, index } | null

  useEffect(() => {
    const fetchScan = async () => {
      try {
        const response = await api.get(`/scan/${id}`);
        setScan(response.data.scan);
        if (response.data.scan.gtin) {
          const riskResp = await api.get(`/scan/gtin/${response.data.scan.gtin}/risk`);
          setRiskData(riskResp.data);
        }
      } catch (err) {
        toast.error('Failed to load scan results');
        navigate('/upload');
      } finally {
        setLoading(false);
      }
    };
    fetchScan();
  }, [id, navigate]);

  // Load existing manual inspections for this scan
  useEffect(() => {
    if (!id) return;
    api.get(`/inspection/${id}`)
      .then(res => {
        const map = {};
        (res.data.inspections || []).forEach(mi => {
          map[mi.check_index] = mi;
        });
        setInspections(map);
      })
      .catch(() => {}); // non-critical
  }, [id]);

  const handleInspectionSaved = useCallback((inspection) => {
    setInspections(prev => ({ ...prev, [inspection.check_index]: inspection }));
  }, []);


  const handleImageLoad = useCallback(() => {
    const img = imgRef.current;
    if (img) {
      setImgDims({ natW: img.naturalWidth, natH: img.naturalHeight, dispW: img.clientWidth, dispH: img.clientHeight });
    }
  }, []);

  const downloadReport = async () => {
    setDownloading(true);
    try {
      const response = await api.get(`/scan/${id}/report`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `truemark-report-${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error('Failed to download report');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF9FF]">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-10 w-10 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin" />
          <p className="text-slate-500 text-sm font-medium">Loading inspection report...</p>
        </div>
      </div>
    );
  }

  if (!scan) return null;

  const checks = scan.compliance_result?.checks || [];
  const ruleVersion = scan.compliance_result?.rule_version_applied || 'Base Rules';
  const mismatch = scan.mismatch_result;
  const confidenceAssessment = scan.compliance_result?.confidence_assessment;
  const overallStatus = scan.overall_status || scan.status || 'unknown';
  const imageUrl = scan.image_url || (scan.image_path ? `${API_BASE_URL}/uploads/${scan.image_path.split(/[\\/]/).pop()}` : null);
  const cityLabel = scan.city || 'City not captured';
  const extractedData = scan.ocr_regions || scan.extracted_data || scan.ocr_extracted_data || null;
  const hasBboxData = extractedData && extractedData.length > 0 && extractedData.some(d => d.bbox);

  const passedCount = checks.filter(c => c.status === 'pass').length;
  const failedCount = checks.filter(c => c.status === 'fail').length;
  const reviewCount = checks.filter(c => c.status === 'human_review_required' || c.status === 'likely_violation').length;

  const verdictConfig = {
    compliant: {
      bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-900',
      icon: FiCheckCircle,
      label: 'Compliant',
      subtitle: 'All checks passed',
      accent: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
      glow: 'radial-gradient(circle, rgba(16,185,129,0.35), transparent 70%)',
    },
    non_compliant: {
      bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-900',
      icon: FiXCircle,
      label: 'Non-Compliant',
      subtitle: 'Critical violations detected',
      accent: 'bg-gradient-to-br from-rose-500 to-rose-600',
      glow: 'radial-gradient(circle, rgba(225,29,72,0.32), transparent 70%)',
    },
    review_required: {
      bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-900',
      icon: FiAlertTriangle,
      label: 'Human Review Required',
      subtitle: 'Needs officer verification',
      accent: 'bg-gradient-to-br from-amber-500 to-amber-600',
      glow: 'radial-gradient(circle, rgba(217,119,6,0.32), transparent 70%)',
    },
  };
  const verdict = verdictConfig[overallStatus] || verdictConfig.compliant;
  const VerdictIcon = verdict.icon;

  const rowAccent = (status) => {
    if (status === 'pass') return 'border-l-emerald-400';
    if (status === 'fail') return 'border-l-rose-400';
    if (status === 'human_review_required' || status === 'likely_violation') return 'border-l-amber-400';
    return 'border-l-slate-200';
  };

  return (
    <div className="min-h-screen bg-[#FAF9FF]">
      <style>{`
        @keyframes tmFadeScaleIn {
          from { opacity: 0; transform: scale(0.9) translateY(4px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes tmFadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes tmPulseGlow {
          0%, 100% { opacity: 0.25; transform: scale(1); }
          50% { opacity: 0.45; transform: scale(1.08); }
        }
        @keyframes tmShimmerSweep {
          0% { left: -150%; }
          100% { left: 150%; }
        }
        .tm-anim-icon { animation: tmFadeScaleIn 500ms cubic-bezier(0.16,1,0.3,1) both; }
        .tm-anim-text { animation: tmFadeIn 500ms cubic-bezier(0.16,1,0.3,1) 100ms both; }
        .tm-anim-fade { animation: tmFadeIn 220ms ease-out both; }
        .tm-glow { animation: tmPulseGlow 4s ease-in-out infinite; }
        .tm-ring-transition { transition: stroke-dashoffset 900ms cubic-bezier(0.16,1,0.3,1); }
        .tm-shimmer { position: relative; overflow: hidden; }
        .tm-shimmer::after {
          content: '';
          position: absolute;
          top: 0; left: -150%;
          height: 100%; width: 150%;
          background: linear-gradient(120deg, transparent, rgba(255,255,255,0.35), transparent);
          animation: tmShimmerSweep 1.4s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .tm-anim-icon, .tm-anim-text, .tm-anim-fade, .tm-glow, .tm-ring-transition, .tm-shimmer::after {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>

      {/* Top Verdict Banner */}
      <div className={`relative overflow-hidden ${verdict.bg} border-b ${verdict.border}`}>
        <div
          className="tm-glow pointer-events-none absolute -top-24 right-0 h-64 w-64 rounded-full blur-3xl"
          style={{ background: verdict.glow }}
          aria-hidden="true"
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(-1)}
                aria-label="Go back"
                className="p-2 rounded-lg hover:bg-white/60 transition-colors text-slate-600 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              >
                <FiArrowLeft className="h-5 w-5" />
              </button>
              <div className={`tm-anim-icon h-14 w-14 rounded-2xl ${verdict.accent} flex items-center justify-center shadow-sm`}>
                <VerdictIcon className="h-7 w-7 text-white" />
              </div>
              <div className="tm-anim-text">
                <h1 className={`text-2xl sm:text-3xl font-black ${verdict.text} tracking-tight`}>{verdict.label}</h1>
                <p className={`text-sm ${verdict.text} opacity-70 mt-0.5`}>{verdict.subtitle}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={downloadReport}
                disabled={downloading}
                className={`hidden sm:inline-flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-sm font-semibold rounded-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50 shadow-sm ${downloading ? 'tm-shimmer' : ''}`}
              >
                <FiDownload className="h-4 w-4" />
                <span>{downloading ? 'Generating...' : 'Download PDF Report'}</span>
              </button>
            </div>
          </div>

          {/* Check Summary Pills */}
          <div className="flex flex-wrap items-center gap-2 mt-4 sm:ml-16">
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white border border-slate-200 text-xs font-semibold text-slate-600">
              <FiFileText className="h-3.5 w-3.5 text-slate-400" />
              <span>Scan #{scan.id}</span>
            </span>
            <span className="px-3 py-1 rounded-full bg-white border border-slate-200 text-xs font-semibold text-slate-600">
              Rule Engine: {ruleVersion}
            </span>
            {passedCount > 0 && (
              <span className="px-3 py-1 rounded-full bg-emerald-100 border border-emerald-200 text-xs font-bold text-emerald-700">
                {passedCount} passed
              </span>
            )}
            {failedCount > 0 && (
              <span className="px-3 py-1 rounded-full bg-rose-100 border border-rose-200 text-xs font-bold text-rose-700">
                {failedCount} failed
              </span>
            )}
            {reviewCount > 0 && (
              <span className="px-3 py-1 rounded-full bg-amber-100 border border-amber-200 text-xs font-bold text-amber-700">
                {reviewCount} review
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Mobile download button */}
        <button
          onClick={downloadReport}
          disabled={downloading}
          className={`sm:hidden w-full flex items-center justify-center space-x-2 px-5 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 shadow-sm mb-6 ${downloading ? 'tm-shimmer' : ''}`}
        >
          <FiDownload className="h-4 w-4" />
          <span>{downloading ? 'Generating...' : 'Download PDF Report'}</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left Column — 2/5 width */}
          <div className="lg:col-span-2 space-y-6">
            {/* Product Image Card */}
            <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FiPackage className="h-4 w-4 text-indigo-400" />
                  <h3 className="text-sm font-bold text-slate-900">Product Label</h3>
                </div>
                {hasBboxData && (
                  <button
                    onClick={() => setShowBboxes(!showBboxes)}
                    className="flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-700 transition-colors px-2 py-1 rounded-lg hover:bg-indigo-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                  >
                    {showBboxes ? <FiEyeOff className="h-3.5 w-3.5" /> : <FiEye className="h-3.5 w-3.5" />}
                    <span>{showBboxes ? 'Hide regions' : 'Show regions'}</span>
                  </button>
                )}
              </div>
              <div className="p-4">
                <div className="relative bg-slate-50 rounded-lg overflow-hidden">
                  {showBboxes && hasBboxData && imageUrl && (
                    <BboxOverlay
                      extractedData={extractedData}
                      imgNaturalWidth={imgDims.natW}
                      imgNaturalHeight={imgDims.natH}
                      displayWidth={imgDims.dispW}
                      displayHeight={imgDims.dispH}
                      checks={checks}
                    />
                  )}
                  <img
                    ref={imgRef}
                    src={imageUrl}
                    alt="Scanned product label"
                    onLoad={handleImageLoad}
                    className="w-full h-64 sm:h-80 object-contain"
                  />
                </div>
                {hasBboxData && showBboxes && (
                  <div className="tm-anim-fade mt-3 flex flex-wrap gap-2">
                    {Object.entries(ZONE_BASE_COLORS).filter(([k]) => k !== 'unknown').map(([zone, color]) => (
                      <span key={zone} className="inline-flex items-center space-x-1.5 text-xs text-slate-500">
                        <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
                        <span>{ZONE_LABELS[zone]}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Product Info Card */}
            <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-5 space-y-3">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Product</p>
                <p className="text-base font-bold text-slate-900 mt-0.5">{scan.product_name || 'Unknown Product'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Manufacturer</p>
                <p className="text-sm text-slate-700 mt-0.5">{scan.manufacturer || 'Not detected'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Inspection location</p>
                <p className="text-sm text-slate-700 mt-0.5">{cityLabel}{scan.state ? `, ${scan.state}` : ''}</p>
              </div>
              {scan.gtin && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">GTIN</p>
                  <p className="text-sm text-slate-700 font-mono mt-0.5">{scan.gtin}</p>
                </div>
              )}
              {scan.extracted_fields && Object.keys(scan.extracted_fields).length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Extracted Fields</p>
                  <div className="space-y-1.5">
                    {Object.entries(scan.extracted_fields).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="text-slate-500 capitalize">{key.replace(/_/g, ' ')}</span>
                        <span className="text-slate-900 font-medium">{value || '\u2014'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* GTIN Risk Badge */}
            <RiskBadge riskData={riskData} />

            <ConfidenceCard assessment={confidenceAssessment} />

          </div>

          {/* Right Column — 3/5 width */}
          <div className="lg:col-span-3 space-y-6">
            {/* Rule Engine Checks Table */}
            <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Deterministic Rule Engine Checks</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{checks.length} rules evaluated &bull; {ruleVersion}</p>
                  </div>
                  <span className="text-xs font-mono bg-slate-100 text-slate-500 px-2.5 py-1 rounded-lg">{ruleVersion}</span>
                </div>
              </div>

              {checks.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-left px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Legal Rule & Citation</th>
                        <th className="text-left px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                        <th className="text-left px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Confidence</th>
                        <th className="text-left px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Extracted Evidence</th>
                        <th className="text-left px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {checks.map((check, index) => {
                        const needsManual = ['human_review_required', 'likely_violation'].includes(check.status);
                        const existingInsp = inspections[index];
                        const outcomeColors = {
                          pass: 'bg-emerald-500',
                          fail: 'bg-rose-500',
                          complete: 'bg-indigo-600',
                        };
                        return (
                          <tr key={index} className={`border-l-4 ${rowAccent(check.status)} hover:bg-slate-50/60 transition-colors`}>
                            <td className="px-6 py-4">
                              <p className="text-sm font-bold text-slate-900">{check.rule_name}</p>
                              <p className="text-xs text-indigo-600 mt-1 font-mono">{check.citation}</p>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col gap-1.5">
                                <StatusChip status={check.status} />
                                {existingInsp && (
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white w-fit
                                    ${existingInsp.outcome === 'pass' ? 'bg-emerald-500' : existingInsp.outcome === 'fail' ? 'bg-rose-500' : 'bg-indigo-600'}`}>
                                    <FiCheckCircle className="h-2.5 w-2.5" />
                                    Inspector: {existingInsp.outcome.toUpperCase()}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {check.confidence ? (
                                <div>
                                  <p className="text-xs font-bold text-slate-700">{check.confidence.level}</p>
                                  <p className="text-[11px] text-slate-500">{check.confidence.score}% estimated</p>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400">Not available</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-sm text-slate-600 leading-relaxed">{check.message}</p>
                            </td>
                            <td className="px-6 py-4">
                              {needsManual ? (
                                existingInsp ? (
                                  <div className="flex flex-col gap-1.5">
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold text-white ${outcomeColors[existingInsp.outcome] || 'bg-indigo-600'}`}>
                                      <FiCheckCircle className="h-3 w-3" />
                                      Inspected
                                    </span>
                                    <span className="text-[10px] text-slate-400 capitalize">{existingInsp.outcome}</span>
                                    <button
                                      onClick={() => setInspectionModal({ check, index })}
                                      className="inline-flex items-center gap-1 text-[10px] text-indigo-500 hover:text-indigo-700 font-semibold transition-colors"
                                      title="Edit inspection"
                                    >
                                      <FiEdit2 className="h-3 w-3" /> Edit
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setInspectionModal({ check, index })}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-800 text-xs font-bold hover:bg-amber-100 hover:border-amber-400 transition-all duration-150 hover:scale-[1.03] shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                                  >
                                    <FiClipboard className="h-3.5 w-3.5" />
                                    Manual Inspect
                                  </button>
                                )
                              ) : (
                                <span className="text-xs text-slate-300">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-12 text-center">
                  <FiFileText className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">No rule checks available for this scan.</p>
                </div>
              )}
            </div>

            {/* Evidence Intelligence: derived only from existing rule checks and OCR evidence. */}
            {checks.filter((check) => check.status !== 'pass').length > 0 && (
              <div className="bg-white rounded-2xl border border-rose-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-rose-100 bg-rose-50">
                  <div className="flex items-center space-x-2">
                    <FiEye className="h-5 w-5 text-rose-600" />
                    <div>
                      <h3 className="text-base font-bold text-rose-900">Evidence Intelligence</h3>
                      <p className="text-xs text-rose-700 mt-0.5">AI-assisted findings for inspector review</p>
                    </div>
                  </div>
                </div>
                <div className="p-6 space-y-6">
                  {checks.filter((check) => check.status !== 'pass').map((check, index) => {
                    const confidence = scan.extracted_fields?.confidence_score;
                    const isFailure = check.status === 'fail' || check.status === 'likely_violation';
                    const targetZone = isFailure ? getZoneForCheck(check) : null;
                    return (
                      <article key={`${check.rule_name}-${index}`} className="border-b border-slate-100 last:border-b-0 last:pb-0 pb-6">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-xs font-bold text-rose-600 uppercase tracking-wider">{isFailure ? 'Violation detected' : 'Review recommended'}</p>
                            <h4 className="text-sm font-bold text-slate-900 mt-1">{check.rule_name || 'Compliance finding'}</h4>
                          </div>
                          <StatusChip status={check.status} />
                        </div>
                        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3 mt-4 text-sm">
                          <div><dt className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Requirement</dt><dd className="text-slate-700 mt-1">{check.citation || 'Configured compliance requirement'}</dd></div>
                          <div><dt className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Detected value</dt><dd className="text-slate-700 mt-1">{check.message || 'Not detected'}</dd></div>
                          <div><dt className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Expected requirement</dt><dd className="text-slate-700 mt-1">{check.error_msg || 'See the cited configured rule'}</dd></div>
                          <div><dt className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Confidence</dt><dd className="text-slate-700 mt-1">{typeof confidence === 'number' ? `${confidence}% (existing AI extraction)` : 'Not available from the existing pipeline'}</dd></div>
                        </dl>
                        <div className="mt-5">
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Reason</p>
                          <p className="text-sm text-slate-600 leading-relaxed">{check.message || 'The configured compliance rule did not pass.'}</p>
                        </div>
                        {/* Zone-focused annotated evidence — only for fail/violation checks */}
                        {isFailure && hasBboxData && (
                          <ZoneEvidenceImage
                            imageUrl={imageUrl}
                            extractedData={extractedData}
                            targetZone={targetZone}
                          />
                        )}
                      </article>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Mismatch Card */}
            <MismatchCard mismatch={mismatch} />

          </div>
        </div>
      </div>

      {/* Manual Inspection Modal */}
      {inspectionModal && (
        <ManualInspectionModal
          check={inspectionModal.check}
          checkIndex={inspectionModal.index}
          scanId={id}
          existingInspection={inspections[inspectionModal.index] || null}
          onClose={() => setInspectionModal(null)}
          onSaved={handleInspectionSaved}
        />
      )}
    </div>
  );
};

export default ScanResult;