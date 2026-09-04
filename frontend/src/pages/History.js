import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  FiEye, FiTrash2, FiClock, FiFileText, FiChevronLeft, FiChevronRight, FiX,
  FiCheckCircle, FiXCircle, FiAlertTriangle, FiMapPin, FiPackage, FiBarChart2,
  FiShield,
} from 'react-icons/fi';
import api from '../utils/api';
import { toast } from 'react-toastify';

/* ------------------------------------------------------------------ */
/*  Design tokens — "inspection ledger": paper, ink, and a brass seal  */
/* ------------------------------------------------------------------ */
const INK = '#12181F';
const PAPER = '#F7F6F2';
const BRASS = '#B8863F';

const STATUS_CONFIG = {
  compliant: { label: 'Compliant', color: '#0E9F6E', soft: '#0E9F6E14', icon: FiCheckCircle },
  non_compliant: { label: 'Non-compliant', color: '#E1435C', soft: '#E1435C14', icon: FiXCircle },
  partial: { label: 'Partial', color: '#D9820B', soft: '#D9820B14', icon: FiAlertTriangle },
  unknown: { label: 'Unknown', color: '#6B7280', soft: '#6B728014', icon: FiFileText },
};

const normalizeStatus = (status) => {
  const s = (status || '').toLowerCase().replace(/-/g, '_');
  if (s === 'compliant') return 'compliant';
  if (s === 'non_compliant') return 'non_compliant';
  if (s === 'partial' || s === 'partially_compliant') return 'partial';
  return 'unknown';
};

/* Fraunces for the masthead, Plex Sans for UI text, Plex Mono for data */
const useLedgerFonts = () => {
  useEffect(() => {
    const id = 'ledger-fonts';
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap';
    document.head.appendChild(link);
  }, []);
};

const Stat = ({ label, value, color }) => (
  <div className="flex-1 min-w-[6.5rem] px-4 py-3 first:pl-0 last:pr-0">
    <div
      className="text-2xl font-semibold tabular-nums"
      style={{ fontFamily: "'IBM Plex Mono', monospace", color }}
    >
      {String(value).padStart(2, '0')}
    </div>
    <p className="text-xs mt-0.5" style={{ color: `${INK}99` }}>{label}</p>
  </div>
);

const History = () => {
  useLedgerFonts();

  const [scans, setScans] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState({ open: false, scan: null });
  const [deleting, setDeleting] = useState(false);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get(`/history?page=${page}`);
      const data = response.data;
      setScans(data.scans || data.items || data.results || []);
      setTotalPages(data.pagination?.total_pages ?? 1);
    } catch (err) {
      toast.error('Failed to load history');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleDelete = async () => {
    if (!deleteModal.scan) return;
    setDeleting(true);
    try {
      await api.delete(`/history/${deleteModal.scan.id}`);
      toast.success('Scan deleted');
      setDeleteModal({ open: false, scan: null });
      fetchHistory();
    } catch (err) {
      toast.error('Failed to delete scan');
    } finally {
      setDeleting(false);
    }
  };

  const counts = useMemo(() => {
    const tally = { compliant: 0, non_compliant: 0, partial: 0, unknown: 0 };
    scans.forEach((scan) => {
      tally[normalizeStatus(scan.overall_status || scan.status)] += 1;
    });
    return tally;
  }, [scans]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: PAPER, fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <style>{`
        @keyframes ledgerIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes sealPulse { from { opacity: 0; transform: scale(.9); } to { opacity: 1; transform: scale(1); } }
        @keyframes modalIn { from { opacity: 0; transform: scale(.96) translateY(6px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @media (prefers-reduced-motion: reduce) {
          .ledger-row, .seal-mark, .modal-card { animation: none !important; }
        }
        .ledger-row { animation: ledgerIn .45s cubic-bezier(.16,.8,.44,1) both; }
        .ledger-row:hover .row-bar { width: 6px; }
        .ledger-row:hover { background: #12181F06; }
      `}</style>

      {loading ? (
        <div className="min-h-screen flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div
              className="h-9 w-9 rounded-full border-[3px] animate-spin"
              style={{ borderColor: `${BRASS}33`, borderTopColor: BRASS }}
            />
            <p className="text-sm" style={{ color: `${INK}80` }}>Loading history…</p>
          </div>
        </div>
      ) : (
        <div className="max-w-5xl mx-auto px-4 py-10">
          {/* Masthead */}
          <div className="flex items-center gap-4 mb-8">
            <div
              className="seal-mark shrink-0 h-12 w-12 rounded-full flex items-center justify-center"
              style={{
                border: `1.5px solid ${BRASS}`,
                boxShadow: `inset 0 0 0 3px ${PAPER}, inset 0 0 0 4px ${BRASS}55`,
                animation: 'sealPulse .5s ease-out both',
              }}
            >
              <FiShield className="h-5 w-5" style={{ color: BRASS }} />
            </div>
            <div>
              <h1
                className="text-3xl font-semibold tracking-tight"
                style={{ fontFamily: "'Fraunces', serif", color: INK }}
              >
                Scan history
              </h1>
              <p className="text-sm mt-0.5" style={{ color: `${INK}90` }}>Your previously uploaded scans, on record</p>
            </div>
          </div>

          {/* Stat strip */}
          {scans.length > 0 && (
            <div
              className="flex flex-wrap divide-x mb-6 rounded-xl px-4"
              style={{ backgroundColor: '#FFFFFF', border: `1px solid ${INK}14`, borderColor: `${INK}14` }}
            >
              <Stat label="On this page" value={scans.length} color={INK} />
              <Stat label="Compliant" value={counts.compliant} color={STATUS_CONFIG.compliant.color} />
              <Stat label="Partial" value={counts.partial} color={STATUS_CONFIG.partial.color} />
              <Stat label="Non-compliant" value={counts.non_compliant} color={STATUS_CONFIG.non_compliant.color} />
            </div>
          )}

          {/* Ledger */}
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#FFFFFF', border: `1px solid ${INK}14` }}>
            {scans.length > 0 ? (
              <ul>
                {scans.map((scan, idx) => {
                  const status = normalizeStatus(scan.overall_status || scan.status);
                  const config = STATUS_CONFIG[status];
                  const StatusIcon = config.icon;
                  return (
                    <li
                      key={scan.id}
                      className="ledger-row relative flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 pl-5 pr-5 py-4 transition-colors duration-200"
                      style={{
                        borderTop: idx === 0 ? 'none' : `1px solid ${INK}0F`,
                        animationDelay: `${Math.min(idx, 10) * 45}ms`,
                      }}
                    >
                      <span
                        className="row-bar absolute left-0 top-0 bottom-0 w-[3px] transition-all duration-200"
                        style={{ backgroundColor: config.color }}
                      />

                      <span
                        className="text-xs shrink-0 w-6 text-right"
                        style={{ fontFamily: "'IBM Plex Mono', monospace", color: `${INK}40` }}
                      >
                        {String(idx + 1 + (page - 1) * scans.length).padStart(2, '0')}
                      </span>

                      <div
                        className="flex items-center justify-center h-9 w-9 rounded-full shrink-0"
                        style={{ border: `1.5px solid ${config.color}55`, backgroundColor: config.soft }}
                      >
                        <StatusIcon className="h-4 w-4" style={{ color: config.color }} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: INK }}>
                          {scan.product_name || 'N/A'}
                        </p>
                        <div
                          className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs"
                          style={{ fontFamily: "'IBM Plex Mono', monospace", color: `${INK}70` }}
                        >
                          <span className="inline-flex items-center gap-1">
                            <FiClock className="h-3 w-3" />
                            {new Date(scan.created_at || scan.timestamp).toLocaleString()}
                          </span>
                          <span className="inline-flex items-center gap-1 capitalize">
                            <FiPackage className="h-3 w-3" />
                            {scan.source || 'official'}
                          </span>
                          {scan.latitude && scan.longitude && (
                            <span className="inline-flex items-center gap-1">
                              <FiMapPin className="h-3 w-3" />
                              {scan.latitude.toFixed(4)}, {scan.longitude.toFixed(4)}
                            </span>
                          )}
                          {scan.city && (
                            <span className="inline-flex items-center gap-1">
                              <FiMapPin className="h-3 w-3" />
                              {scan.city}{scan.state ? `, ${scan.state}` : ''}
                            </span>
                          )}
                        </div>
                      </div>

                      <span
                        className="text-xs font-medium px-2.5 py-1 rounded-full shrink-0"
                        style={{ color: config.color, backgroundColor: config.soft }}
                      >
                        {config.label}
                      </span>

                      <div className="flex items-center gap-4 sm:pl-1 shrink-0">
                        <Link
                          to={`/scan/${scan.id}`}
                          className="inline-flex items-center gap-1 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 rounded"
                          style={{ color: BRASS }}
                        >
                          <FiEye className="h-4 w-4" />
                          View
                        </Link>
                        <button
                          onClick={() => setDeleteModal({ open: true, scan })}
                          aria-label={`Delete scan ${scan.product_name || scan.id}`}
                          className="inline-flex items-center gap-1 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 rounded"
                          style={{ color: STATUS_CONFIG.non_compliant.color }}
                        >
                          <FiTrash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="p-14 text-center">
                <div
                  className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
                  style={{ border: `1.5px dashed ${BRASS}` }}
                >
                  <FiFileText className="h-6 w-6" style={{ color: BRASS }} />
                </div>
                <p className="mb-1 font-medium" style={{ color: INK }}>No scans yet</p>
                <p className="text-sm mb-5" style={{ color: `${INK}80` }}>
                  Upload a product to start your compliance record.
                </p>
                <Link
                  to="/upload"
                  className="inline-flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2"
                  style={{ backgroundColor: INK }}
                >
                  Start a scan
                </Link>
              </div>
            )}

            {totalPages > 1 && (
              <div
                className="flex items-center justify-between px-5 py-4"
                style={{ borderTop: `1px solid ${INK}0F`, backgroundColor: `${INK}05` }}
              >
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 rounded"
                  style={{ color: INK }}
                >
                  <FiChevronLeft className="h-4 w-4" />
                  Previous
                </button>
                <span className="text-sm" style={{ fontFamily: "'IBM Plex Mono', monospace", color: `${INK}90` }}>
                  Page {String(page).padStart(2, '0')} of {String(totalPages).padStart(2, '0')}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 rounded"
                  style={{ color: INK }}
                >
                  Next
                  <FiChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {deleteModal.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ backgroundColor: `${INK}66`, backdropFilter: 'blur(2px)' }}
        >
          <div
            className="modal-card w-full max-w-md p-6 rounded-2xl"
            style={{ backgroundColor: '#FFFFFF', animation: 'modalIn .22s cubic-bezier(.16,.8,.44,1) both' }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full shrink-0"
                  style={{ border: `1.5px solid ${STATUS_CONFIG.non_compliant.color}55`, backgroundColor: STATUS_CONFIG.non_compliant.soft }}
                >
                  <FiTrash2 className="h-4.5 w-4.5" style={{ color: STATUS_CONFIG.non_compliant.color }} />
                </div>
                <h3 className="text-lg font-semibold" style={{ fontFamily: "'Fraunces', serif", color: INK }}>
                  Delete scan
                </h3>
              </div>
              <button
                onClick={() => setDeleteModal({ open: false, scan: null })}
                aria-label="Close delete confirmation"
                className="transition-colors focus:outline-none focus-visible:ring-2 rounded"
                style={{ color: `${INK}60` }}
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm mb-6" style={{ color: `${INK}90` }}>
              Are you sure you want to delete this scan? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteModal({ open: false, scan: null })}
                className="px-4 py-2 text-sm font-medium rounded-lg transition-colors focus:outline-none focus-visible:ring-2"
                style={{ color: INK, backgroundColor: `${INK}0D` }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 focus:outline-none focus-visible:ring-2"
                style={{ backgroundColor: STATUS_CONFIG.non_compliant.color }}
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default History;