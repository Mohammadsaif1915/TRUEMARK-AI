import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FiCheckCircle, FiXCircle, FiAlertTriangle, FiDownload, FiArrowLeft,
  FiShield, FiEye, FiEyeOff, FiFileText, FiExternalLink, FiPackage
} from 'react-icons/fi';
import api from '../utils/api';
import { toast } from 'react-toastify';

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

const BboxOverlay = ({ extractedData, imgNaturalWidth, imgNaturalHeight, displayWidth, displayHeight, checks }) => {
  if (!extractedData || extractedData.length === 0) return null;
  const scaleX = displayWidth / imgNaturalWidth;
  const scaleY = displayHeight / imgNaturalHeight;

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ width: displayWidth, height: displayHeight }}>
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

const StatusChip = ({ status }) => {
  let bg, text, border, label, Icon;
  switch (status) {
    case 'pass':
      bg = 'bg-green-50'; text = 'text-green-800'; border = 'border-green-200';
      label = 'PASS'; Icon = FiCheckCircle;
      break;
    case 'fail':
      bg = 'bg-red-50'; text = 'text-red-800'; border = 'border-red-200';
      label = 'FAIL'; Icon = FiXCircle;
      break;
    case 'human_review_required':
    case 'likely_violation':
      bg = 'bg-amber-50'; text = 'text-amber-800'; border = 'border-amber-200';
      label = status === 'likely_violation' ? 'VIOLATION' : 'REVIEW';
      Icon = FiAlertTriangle;
      break;
    default:
      bg = 'bg-gray-50'; text = 'text-gray-700'; border = 'border-gray-200';
      label = 'N/A'; Icon = FiAlertTriangle;
  }
  return (
    <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${bg} ${text} ${border}`}>
      <Icon className="h-3.5 w-3.5" />
      <span>{label}</span>
    </span>
  );
};

const RiskBadge = ({ riskData }) => {
  if (!riskData) return null;
  const score = riskData.risk_score ?? 0;
  const tier = riskData.risk_tier || 'LOW';
  let color, bg, border;
  if (score > 60) { color = 'text-red-700'; bg = 'bg-red-50'; border = 'border-red-200'; }
  else if (score > 30) { color = 'text-amber-700'; bg = 'bg-amber-50'; border = 'border-amber-200'; }
  else { color = 'text-green-700'; bg = 'bg-green-50'; border = 'border-green-200'; }

  return (
    <div className={`flex items-center justify-between p-4 rounded-xl border ${bg} ${border}`}>
      <div className="flex items-center space-x-3">
        <FiShield className={`h-5 w-5 ${color}`} />
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">GTIN Risk Score</p>
          <p className="text-sm text-gray-700 mt-0.5">{riskData.total_scans} prior scan{riskData.total_scans !== 1 ? 's' : ''}</p>
        </div>
      </div>
      <div className="text-right">
        <p className={`text-2xl font-black ${color}`}>{score}<span className="text-sm font-normal text-gray-400">/100</span></p>
        <p className={`text-xs font-bold ${color}`}>{tier}</p>
      </div>
    </div>
  );
};

const MismatchCard = ({ mismatch }) => {
  if (!mismatch || mismatch.status === 'skipped' || mismatch.status === 'error') return null;

  const isMatch = mismatch.status === 'match';

  return (
    <div className={`rounded-xl border overflow-hidden ${isMatch ? 'border-green-200' : 'border-red-200'}`}>
      <div className={`px-5 py-3 flex items-center justify-between ${isMatch ? 'bg-green-50' : 'bg-red-50'}`}>
        <div className="flex items-center space-x-2">
          <FiExternalLink className={`h-4 w-4 ${isMatch ? 'text-green-600' : 'text-red-600'}`} />
          <h4 className={`text-sm font-bold ${isMatch ? 'text-green-800' : 'text-red-800'}`}>E-Commerce Listing Cross-Check</h4>
        </div>
        <StatusChip status={isMatch ? 'pass' : 'fail'} />
      </div>
      <div className="bg-white p-5">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="font-semibold text-gray-500 text-xs uppercase tracking-wider">Field</div>
          <div className="font-semibold text-gray-500 text-xs uppercase tracking-wider">Physical Label</div>
          <div className="font-semibold text-gray-500 text-xs uppercase tracking-wider">Online Listing</div>

          <div className="text-gray-700 font-medium">MRP</div>
          <div className="text-gray-900">{mismatch.listing_data?.mrp || '\u2014'}</div>
          <div className="text-gray-900">{mismatch.listing_data?.mrp || '\u2014'}</div>

          <div className="text-gray-700 font-medium">Country</div>
          <div className="text-gray-900">{mismatch.listing_data?.country_of_origin || '\u2014'}</div>
          <div className="text-gray-900">{mismatch.listing_data?.country_of_origin || '\u2014'}</div>
        </div>

        {!isMatch && mismatch.mismatches && mismatch.mismatches.length > 0 && (
          <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-100">
            <p className="text-xs font-bold text-red-700 mb-1.5">Discrepancies Found</p>
            <ul className="space-y-1">
              {mismatch.mismatches.map((m, i) => (
                <li key={i} className="text-sm text-red-700 flex items-start space-x-1.5">
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
      link.setAttribute('download', `meterolens-report-${id}.pdf`);
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-200 border-t-primary-800" />
          <p className="text-gray-500 text-sm font-medium">Loading inspection report...</p>
        </div>
      </div>
    );
  }

  if (!scan) return null;

  const checks = scan.compliance_result?.checks || [];
  const ruleVersion = scan.compliance_result?.rule_version_applied || 'Base Rules';
  const mismatch = scan.mismatch_result;
  const overallStatus = scan.overall_status || scan.status || 'unknown';
  const imageUrl = scan.image_url || (scan.image_path ? `${API_BASE_URL}/uploads/${scan.image_path.split(/[\\/]/).pop()}` : null);
  const extractedData = scan.extracted_data || scan.ocr_extracted_data || null;
  const hasBboxData = extractedData && extractedData.length > 0 && extractedData.some(d => d.bbox);

  const passedCount = checks.filter(c => c.status === 'pass').length;
  const failedCount = checks.filter(c => c.status === 'fail').length;
  const reviewCount = checks.filter(c => c.status === 'human_review_required' || c.status === 'likely_violation').length;

  const verdictConfig = {
    compliant: {
      bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-900',
      icon: FiCheckCircle, iconColor: 'text-green-600',
      label: 'Compliant',
      subtitle: 'All checks passed',
      accent: 'bg-green-600',
    },
    non_compliant: {
      bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-900',
      icon: FiXCircle, iconColor: 'text-red-600',
      label: 'Non-Compliant',
      subtitle: 'Critical violations detected',
      accent: 'bg-red-600',
    },
    review_required: {
      bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-900',
      icon: FiAlertTriangle, iconColor: 'text-amber-600',
      label: 'Human Review Required',
      subtitle: 'Needs officer verification',
      accent: 'bg-amber-600',
    },
  };
  const verdict = verdictConfig[overallStatus] || verdictConfig.compliant;
  const VerdictIcon = verdict.icon;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Verdict Banner */}
      <div className={`${verdict.bg} border-b ${verdict.border}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(-1)}
                aria-label="Go back"
                className="p-2 rounded-lg hover:bg-white/60 transition-colors text-gray-600 hover:text-gray-900"
              >
                <FiArrowLeft className="h-5 w-5" />
              </button>
              <div className={`h-14 w-14 rounded-2xl ${verdict.accent} flex items-center justify-center shadow-sm`}>
                <VerdictIcon className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className={`text-2xl sm:text-3xl font-black ${verdict.text} tracking-tight`}>{verdict.label}</h1>
                <p className={`text-sm ${verdict.text} opacity-70 mt-0.5`}>{verdict.subtitle}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={downloadReport}
                disabled={downloading}
                className="hidden sm:inline-flex items-center space-x-2 px-5 py-2.5 bg-primary-800 hover:bg-primary-900 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 shadow-sm"
              >
                <FiDownload className="h-4 w-4" />
                <span>{downloading ? 'Generating...' : 'Download PDF Report'}</span>
              </button>
            </div>
          </div>

          {/* Check Summary Pills */}
          <div className="flex items-center space-x-3 mt-4 ml-16">
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white border border-gray-200 text-xs font-semibold text-gray-600">
              <FiFileText className="h-3.5 w-3.5 text-gray-400" />
              <span>Scan #{scan.id}</span>
            </span>
            <span className="px-3 py-1 rounded-full bg-white border border-gray-200 text-xs font-semibold text-gray-600">
              Rule Engine: {ruleVersion}
            </span>
            {passedCount > 0 && (
              <span className="px-3 py-1 rounded-full bg-green-100 border border-green-200 text-xs font-bold text-green-700">
                {passedCount} passed
              </span>
            )}
            {failedCount > 0 && (
              <span className="px-3 py-1 rounded-full bg-red-100 border border-red-200 text-xs font-bold text-red-700">
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
          className="sm:hidden w-full flex items-center justify-center space-x-2 px-5 py-3 bg-primary-800 hover:bg-primary-900 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 shadow-sm mb-6"
        >
          <FiDownload className="h-4 w-4" />
          <span>{downloading ? 'Generating...' : 'Download PDF Report'}</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left Column — 2/5 width */}
          <div className="lg:col-span-2 space-y-6">
            {/* Product Image Card */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FiPackage className="h-4 w-4 text-gray-400" />
                  <h3 className="text-sm font-bold text-gray-900">Product Label</h3>
                </div>
                {hasBboxData && (
                  <button
                    onClick={() => setShowBboxes(!showBboxes)}
                    className="flex items-center space-x-1.5 text-xs font-semibold text-gray-500 hover:text-primary-800 transition-colors px-2 py-1 rounded-lg hover:bg-gray-50"
                  >
                    {showBboxes ? <FiEyeOff className="h-3.5 w-3.5" /> : <FiEye className="h-3.5 w-3.5" />}
                    <span>{showBboxes ? 'Hide regions' : 'Show regions'}</span>
                  </button>
                )}
              </div>
              <div className="p-4">
                <div className="relative bg-gray-50 rounded-lg overflow-hidden">
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
                  <div className="mt-3 flex flex-wrap gap-2">
                    {Object.entries(ZONE_BASE_COLORS).filter(([k]) => k !== 'unknown').map(([zone, color]) => (
                      <span key={zone} className="inline-flex items-center space-x-1.5 text-xs text-gray-500">
                        <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
                        <span>{ZONE_LABELS[zone]}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Product Info Card */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-3">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Product</p>
                <p className="text-base font-bold text-gray-900 mt-0.5">{scan.product_name || 'Unknown Product'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Manufacturer</p>
                <p className="text-sm text-gray-700 mt-0.5">{scan.manufacturer || 'Not detected'}</p>
              </div>
              {scan.gtin && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">GTIN</p>
                  <p className="text-sm text-gray-700 font-mono mt-0.5">{scan.gtin}</p>
                </div>
              )}
              {scan.extracted_fields && Object.keys(scan.extracted_fields).length > 0 && (
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Extracted Fields</p>
                  <div className="space-y-1.5">
                    {Object.entries(scan.extracted_fields).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="text-gray-500 capitalize">{key.replace(/_/g, ' ')}</span>
                        <span className="text-gray-900 font-medium">{value || '\u2014'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* GTIN Risk Badge */}
            <RiskBadge riskData={riskData} />
          </div>

          {/* Right Column — 3/5 width */}
          <div className="lg:col-span-3 space-y-6">
            {/* Rule Engine Checks Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Deterministic Rule Engine Checks</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{checks.length} rules evaluated &bull; {ruleVersion}</p>
                  </div>
                  <span className="text-xs font-mono bg-gray-100 text-gray-500 px-2.5 py-1 rounded-lg">{ruleVersion}</span>
                </div>
              </div>

              {checks.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Legal Rule & Citation</th>
                        <th className="text-left px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                        <th className="text-left px-6 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Extracted Evidence</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {checks.map((check, index) => (
                        <tr key={index} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <p className="text-sm font-bold text-gray-900">{check.rule_name}</p>
                            <p className="text-xs text-primary-600 mt-1 font-mono">{check.citation}</p>
                          </td>
                          <td className="px-6 py-4">
                            <StatusChip status={check.status} />
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-gray-600 leading-relaxed">{check.message}</p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-12 text-center">
                  <FiFileText className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No rule checks available for this scan.</p>
                </div>
              )}
            </div>

            {/* Mismatch Card */}
            <MismatchCard mismatch={mismatch} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScanResult;
