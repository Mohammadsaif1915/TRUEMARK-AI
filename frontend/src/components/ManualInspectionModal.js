import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  FiX, FiCheckCircle, FiXCircle, FiAlertTriangle, FiUpload,
  FiTrash2, FiFileText, FiUser, FiCalendar, FiCamera, FiClipboard,
  FiLoader
} from 'react-icons/fi';
import api from '../utils/api';
import { toast } from 'react-toastify';

/* ─────────────────────────────────────────────── helpers ── */
const OUTCOME_OPTIONS = [
  {
    value: 'pass',
    label: 'Pass',
    icon: FiCheckCircle,
    bg: 'bg-emerald-50 border-emerald-300 text-emerald-800',
    activeBg: 'bg-emerald-500 border-emerald-600 text-white',
    ring: 'ring-emerald-400',
    dot: 'bg-emerald-500',
  },
  {
    value: 'fail',
    label: 'Fail',
    icon: FiXCircle,
    bg: 'bg-rose-50 border-rose-300 text-rose-800',
    activeBg: 'bg-rose-500 border-rose-600 text-white',
    ring: 'ring-rose-400',
    dot: 'bg-rose-500',
  },
  {
    value: 'complete',
    label: 'Complete',
    icon: FiCheckCircle,
    bg: 'bg-indigo-50 border-indigo-300 text-indigo-800',
    activeBg: 'bg-indigo-600 border-indigo-700 text-white',
    ring: 'ring-indigo-400',
    dot: 'bg-indigo-600',
  },
];

const STATUS_BADGE = {
  human_review_required: { label: 'Review Required', cls: 'bg-amber-100 text-amber-800 border-amber-200' },
  likely_violation: { label: 'Likely Violation', cls: 'bg-orange-100 text-orange-800 border-orange-200' },
  fail: { label: 'Failed', cls: 'bg-rose-100 text-rose-800 border-rose-200' },
  pass: { label: 'Passed', cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
};

/* ─────────────────────────────────────────────── component ── */
const ManualInspectionModal = ({ check, checkIndex, scanId, existingInspection, onClose, onSaved }) => {
  const [outcome, setOutcome] = useState(existingInspection?.outcome || '');
  const [fieldValue, setFieldValue] = useState(existingInspection?.field_value || '');
  const [notes, setNotes] = useState(existingInspection?.notes || '');
  const [evidenceFiles, setEvidenceFiles] = useState([]);
  const [existingEvidence, setExistingEvidence] = useState(existingInspection?.evidence_paths || []);
  const [submitting, setSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const modalRef = useRef(null);

  /* lock body scroll */
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  /* Esc to close */
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  /* click-outside to close */
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  /* ── file handling ── */
  const addFiles = useCallback((files) => {
    const valid = Array.from(files).filter(f =>
      ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'].includes(f.type)
    );
    if (valid.length === 0) {
      toast.warn('Only PNG, JPG, WEBP, or PDF files are accepted.');
      return;
    }
    setEvidenceFiles(prev => [...prev, ...valid]);
  }, []);

  const handleDropzoneClick = () => fileInputRef.current?.click();

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  };

  const removeNewFile = (index) => {
    setEvidenceFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingEvidence = (index) => {
    setExistingEvidence(prev => prev.filter((_, i) => i !== index));
  };

  /* ── submit ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!outcome) { toast.warn('Please select an outcome (Pass / Fail / Complete).'); return; }

    setSubmitting(true);
    try {
      const form = new FormData();
      form.append('check_index', String(checkIndex));
      form.append('rule_name', check.rule_name || '');
      form.append('citation', check.citation || '');
      form.append('outcome', outcome);
      form.append('field_value', fieldValue);
      form.append('notes', notes);
      evidenceFiles.forEach(f => form.append('evidence', f));

      const resp = await api.post(`/inspection/${scanId}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success(existingInspection ? 'Inspection updated!' : 'Inspection submitted!');
      onSaved(resp.data.inspection);
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to submit inspection.');
    } finally {
      setSubmitting(false);
    }
  };

  const aiStatusMeta = STATUS_BADGE[check?.status] || STATUS_BADGE.human_review_required;
  const isEditing = !!existingInspection;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto py-6 px-4"
      style={{ background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)' }}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="mi-modal-title"
    >
      {/* Modal Panel */}
      <div
        ref={modalRef}
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        style={{ animation: 'miSlideIn 280ms cubic-bezier(0.16,1,0.3,1) both' }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 px-6 pt-6 pb-5">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
            aria-label="Close modal"
          >
            <FiX className="h-5 w-5" />
          </button>

          <div className="flex items-start gap-4">
            <div className="h-11 w-11 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
              <FiClipboard className="h-5 w-5 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">
                {isEditing ? 'Edit Inspection Record' : 'Manual Field Inspection'}
              </p>
              <h2 id="mi-modal-title" className="text-lg font-black text-white leading-tight truncate">
                {check?.rule_name || 'Compliance Check'}
              </h2>
              {check?.citation && (
                <p className="text-xs text-indigo-300 font-mono mt-1">{check.citation}</p>
              )}
            </div>
          </div>

          {/* AI status pill */}
          <div className="mt-4 flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">AI determination:</span>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${aiStatusMeta.cls}`}>
              <FiAlertTriangle className="h-3 w-3" />
              {aiStatusMeta.label}
            </span>
          </div>

          {/* Existing inspector info */}
          {isEditing && existingInspection.inspector_name && (
            <div className="mt-3 flex items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <FiUser className="h-3 w-3" />
                {existingInspection.inspector_name}
              </span>
              <span className="flex items-center gap-1">
                <FiCalendar className="h-3 w-3" />
                {new Date(existingInspection.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            </div>
          )}
        </div>

        {/* ── Body ── */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">

            {/* AI-detected message context */}
            {check?.message && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
                <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-1">AI Finding</p>
                <p className="text-sm text-amber-900 leading-relaxed">{check.message}</p>
              </div>
            )}

            {/* ── 1. Outcome selector ── */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2.5">
                Inspector Outcome <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-3">
                {OUTCOME_OPTIONS.map(opt => {
                  const Icon = opt.icon;
                  const isActive = outcome === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setOutcome(opt.value)}
                      className={`flex flex-col items-center justify-center gap-1.5 py-3.5 px-3 rounded-2xl border-2 font-bold text-sm transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${opt.ring}
                        ${isActive ? `${opt.activeBg} shadow-md scale-[1.03]` : `${opt.bg} hover:scale-[1.01]`}`}
                    >
                      <Icon className="h-5 w-5" />
                      {opt.label}
                      {isActive && (
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-white/70" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── 2. Field value ── */}
            <div>
              <label htmlFor="mi-field-value" className="block text-sm font-bold text-slate-700 mb-1.5">
                Physically Observed Value
                <span className="ml-1.5 text-xs font-normal text-slate-400">(what you see on the product)</span>
              </label>
              <input
                id="mi-field-value"
                type="text"
                value={fieldValue}
                onChange={e => setFieldValue(e.target.value)}
                placeholder="e.g.  ₹ 250, Manufacturer: XYZ Ltd., 500g…"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
              />
            </div>

            {/* ── 3. Notes / Observations ── */}
            <div>
              <label htmlFor="mi-notes" className="block text-sm font-bold text-slate-700 mb-1.5">
                Observations / Notes
              </label>
              <textarea
                id="mi-notes"
                rows={4}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Describe your physical inspection findings, discrepancies, or additional context…"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition resize-none"
              />
            </div>

            {/* ── 4. Evidence upload ── */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <FiCamera className="h-4 w-4 text-slate-400" />
                Evidence Photos / Documents
                <span className="ml-1 text-xs font-normal text-slate-400">(PNG, JPG, WEBP, PDF)</span>
              </label>

              {/* Dropzone */}
              <div
                onClick={handleDropzoneClick}
                onDrop={handleDrop}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                className={`relative rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-150 text-center py-8 px-4
                  ${dragOver
                    ? 'border-indigo-400 bg-indigo-50 scale-[1.01]'
                    : 'border-slate-200 bg-slate-50 hover:border-indigo-300 hover:bg-indigo-50/40'}`}
              >
                <FiUpload className="h-7 w-7 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-500">
                  {dragOver ? 'Drop files here' : 'Click or drag & drop evidence files'}
                </p>
                <p className="text-xs text-slate-400 mt-1">Up to 10 files, max 10 MB each</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/webp,application/pdf"
                  className="sr-only"
                  onChange={e => addFiles(e.target.files)}
                />
              </div>

              {/* Existing evidence thumbnails (when editing) */}
              {existingEvidence.length > 0 && (
                <div className="mt-3 space-y-1">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Previously Uploaded</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {existingEvidence.map((url, i) => {
                      const isImg = /\.(png|jpg|jpeg|webp)$/i.test(url) || url.startsWith('http');
                      return (
                        <div key={i} className="relative group">
                          {isImg ? (
                            <img
                              src={url}
                              alt={`Evidence ${i + 1}`}
                              className="h-16 w-16 rounded-xl object-cover border border-slate-200"
                            />
                          ) : (
                            <div className="h-16 w-16 rounded-xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center gap-1">
                              <FiFileText className="h-5 w-5 text-slate-400" />
                              <span className="text-[9px] text-slate-400">PDF</span>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => removeExistingEvidence(i)}
                            className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-rose-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                            aria-label="Remove evidence"
                          >
                            <FiX className="h-3 w-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Newly selected files preview */}
              {evidenceFiles.length > 0 && (
                <div className="mt-3 space-y-1">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">New Files to Upload</p>
                  <ul className="space-y-1.5 mt-1">
                    {evidenceFiles.map((f, i) => (
                      <li key={i} className="flex items-center justify-between bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {f.type.startsWith('image/') ? (
                            <img
                              src={URL.createObjectURL(f)}
                              alt={f.name}
                              className="h-8 w-8 rounded-lg object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                              <FiFileText className="h-4 w-4 text-indigo-500" />
                            </div>
                          )}
                          <span className="text-xs text-slate-700 font-medium truncate">{f.name}</span>
                          <span className="text-[10px] text-slate-400 flex-shrink-0">
                            {(f.size / 1024).toFixed(0)} KB
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeNewFile(i)}
                          className="ml-2 p-1 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 transition flex-shrink-0"
                          aria-label="Remove file"
                        >
                          <FiTrash2 className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="sticky bottom-0 bg-white border-t border-slate-100 px-6 py-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !outcome}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all duration-150 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2
                ${submitting || !outcome
                  ? 'bg-indigo-300 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 hover:-translate-y-0.5 hover:shadow-md'}`}
            >
              {submitting ? (
                <>
                  <FiLoader className="h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <FiCheckCircle className="h-4 w-4" />
                  {isEditing ? 'Update Inspection' : 'Submit Inspection'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes miSlideIn {
          from { opacity: 0; transform: translateY(-20px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
      `}</style>
    </div>
  );
};

export default ManualInspectionModal;
