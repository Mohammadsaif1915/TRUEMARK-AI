import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  FiEye, FiTrash2, FiClock, FiFileText, FiChevronLeft, FiChevronRight, FiX,
  FiCheckCircle, FiXCircle, FiAlertTriangle, FiMapPin, FiPackage, FiBarChart2,
} from 'react-icons/fi';
import api from '../utils/api';
import { toast } from 'react-toastify';

const STATUS_CONFIG = {
  compliant: {
    label: 'Compliant',
    badge: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20',
    accent: 'border-l-emerald-500',
    iconWrap: 'bg-emerald-100 text-emerald-600',
    icon: FiCheckCircle,
  },
  non_compliant: {
    label: 'Non-compliant',
    badge: 'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20',
    accent: 'border-l-rose-500',
    iconWrap: 'bg-rose-100 text-rose-600',
    icon: FiXCircle,
  },
  partial: {
    label: 'Partial',
    badge: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20',
    accent: 'border-l-amber-500',
    iconWrap: 'bg-amber-100 text-amber-600',
    icon: FiAlertTriangle,
  },
  unknown: {
    label: 'Unknown',
    badge: 'bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-500/10',
    accent: 'border-l-slate-300',
    iconWrap: 'bg-slate-100 text-slate-500',
    icon: FiFileText,
  },
};

const normalizeStatus = (status) => {
  const s = (status || '').toLowerCase().replace(/-/g, '_');
  if (s === 'compliant') return 'compliant';
  if (s === 'non_compliant') return 'non_compliant';
  if (s === 'partial' || s === 'partially_compliant') return 'partial';
  return 'unknown';
};

const TONE_STYLES = {
  indigo: 'bg-indigo-50 text-indigo-700',
  emerald: 'bg-emerald-50 text-emerald-700',
  amber: 'bg-amber-50 text-amber-700',
  rose: 'bg-rose-50 text-rose-700',
};

const StatCard = ({ label, value, tone, icon: Icon }) => (
  <div className={`rounded-xl px-4 py-3 ${TONE_STYLES[tone]}`}>
    <div className="flex items-center justify-between">
      <span className="text-2xl font-bold">{value}</span>
      <Icon className="h-4 w-4 opacity-70" />
    </div>
    <p className="text-xs font-medium mt-1 opacity-80">{label}</p>
  </div>
);

const History = () => {
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF9FF]">
        <div className="flex flex-col items-center space-y-3">
          <div className="h-10 w-10 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin"></div>
          <p className="text-slate-500 text-sm">Loading history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9FF]">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-start gap-3">
          <span
            className="mt-1.5 h-8 w-1.5 rounded-full bg-gradient-to-b from-indigo-500 to-violet-500 shrink-0"
            aria-hidden="true"
          ></span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Scan History</h1>
            <p className="text-slate-500 mt-1">Your previously uploaded scans</p>
          </div>
        </div>

        {/* Stat strip */}
        {scans.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <StatCard label="On this page" value={scans.length} tone="indigo" icon={FiBarChart2} />
            <StatCard label="Compliant" value={counts.compliant} tone="emerald" icon={FiCheckCircle} />
            <StatCard label="Partial" value={counts.partial} tone="amber" icon={FiAlertTriangle} />
            <StatCard label="Non-compliant" value={counts.non_compliant} tone="rose" icon={FiXCircle} />
          </div>
        )}

        {/* List */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/70 overflow-hidden">
          {scans.length > 0 ? (
            <ul className="divide-y divide-slate-100">
              {scans.map((scan) => {
                const status = normalizeStatus(scan.overall_status || scan.status);
                const config = STATUS_CONFIG[status];
                const StatusIcon = config.icon;
                return (
                  <li
                    key={scan.id}
                    className={`flex flex-col sm:flex-row sm:items-center gap-4 px-5 py-4 border-l-4 ${config.accent} hover:bg-slate-50/80 transition-colors`}
                  >
                    <div className={`flex items-center justify-center h-10 w-10 rounded-full shrink-0 ${config.iconWrap}`}>
                      <StatusIcon className="h-5 w-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {scan.product_name || 'N/A'}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <FiClock className="h-3.5 w-3.5" />
                          {new Date(scan.created_at || scan.timestamp).toLocaleString()}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <FiPackage className="h-3.5 w-3.5" />
                          <span className="capitalize">{scan.source || 'official'}</span>
                        </span>
                        {scan.latitude && scan.longitude && (
                          <span className="inline-flex items-center gap-1">
                            <FiMapPin className="h-3.5 w-3.5" />
                            {scan.latitude.toFixed(4)}, {scan.longitude.toFixed(4)}
                          </span>
                        )}
                        {scan.city && <span className="inline-flex items-center gap-1"><FiMapPin className="h-3.5 w-3.5" />{scan.city}{scan.state ? `, ${scan.state}` : ''}</span>}
                      </div>
                    </div>

                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${config.badge}`}>
                      {config.label}
                    </span>

                    <div className="flex items-center gap-4 sm:pl-2">
                      <Link
                        to={`/scan/${scan.id}`}
                        className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 rounded"
                      >
                        <FiEye className="h-4 w-4" />
                        View
                      </Link>
                      <button
                        onClick={() => setDeleteModal({ open: true, scan })}
                        aria-label={`Delete scan ${scan.product_name || scan.id}`}
                        className="inline-flex items-center gap-1 text-sm font-medium text-rose-600 hover:text-rose-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 rounded"
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
            <div className="p-12 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-violet-100">
                <FiFileText className="h-7 w-7 text-indigo-500" />
              </div>
              <p className="text-slate-500 mb-4">No scan history yet</p>
              <Link
                to="/upload"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-lg text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              >
                Start a scan
              </Link>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100 bg-slate-50/60">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 rounded"
              >
                <FiChevronLeft className="h-4 w-4" />
                Previous
              </button>
              <span className="text-sm text-slate-500">
                Page <span className="font-semibold text-slate-700">{page}</span> of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 rounded"
              >
                Next
                <FiChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {deleteModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-600 shrink-0">
                  <FiTrash2 className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">Delete scan</h3>
              </div>
              <button
                onClick={() => setDeleteModal({ open: false, scan: null })}
                aria-label="Close delete confirmation"
                className="text-slate-400 hover:text-slate-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 rounded"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-slate-600 mb-6">
              Are you sure you want to delete this scan? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteModal({ open: false, scan: null })}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default History;