import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, Cell, PieChart, Pie
} from 'recharts';
import {
  FiCheckCircle, FiXCircle, FiAlertTriangle, FiFileText, FiEye,
  FiChevronLeft, FiChevronRight, FiArrowUpRight, FiActivity, FiX
} from 'react-icons/fi';
import api from '../utils/api';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';

/*
  Same black-and-yellow "inspection seal" language as the landing page:
  #0A0A0A ink, #F4C10F signal yellow, semantic green/red/amber reserved
  for compliance status only. font-heading = Fraunces (italic axis
  available), font-body = Inter, font-data = IBM Plex Mono for figures
  that are genuinely tabular (dates, coordinates, ids).

  This pass adds one deliberate centerpiece — a rotating "compliance
  seal" stamp reading the overall pass rate, echoing the ledger/stamp
  vocabulary already established by the loading state's copy ("Reading
  the ledger…") — plus a colorful compliance-breakdown donut and
  animated mini rings on the stat cards. No new hues are introduced;
  everything colorful here is a compliance signal (emerald / rose /
  amber), which keeps the palette meaningful rather than decorative.
*/

/* ------------------------------------------------------------------ */
/*  Count-up for the top stat row                                      */
/* ------------------------------------------------------------------ */
const CountUp = ({ value }) => {
  const ref = useRef(null);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const target = Number(value) || 0;
    const node = ref.current;
    if (!node) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(target);
      return undefined;
    }
    let raf;
    const start = performance.now();
    const duration = 700;
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(eased * target));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <span ref={ref}>{display}</span>;
};

const EmptyChart = ({ message }) => (
  <div className="flex flex-col items-center justify-center h-[300px] text-center">
    <FiFileText className="h-10 w-10 text-gray-300 mb-3" />
    <p className="text-gray-400 text-sm">{message}</p>
  </div>
);

/* Dark, yellow-edged tooltip shared by both charts */
const CaseTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-[#0A0A0A] border border-[#F4C10F]/40 rounded-sm px-3 py-2 shadow-lg">
      {label && <p className="text-[11px] font-data text-white/50 mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="text-sm font-semibold text-[#F4C10F]">
          {p.name || p.dataKey}: <span className="text-white">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

/* Pulsing dot for the line chart's active point */
const PulseDot = (props) => {
  const { cx, cy, index, dataLength } = props;
  if (cx == null || cy == null) return null;
  const isLast = index === dataLength - 1;
  return (
    <g>
      {isLast && <circle cx={cx} cy={cy} r={8} className="pulse-ring" fill="none" stroke="#F4C10F" strokeWidth="2" />}
      <circle cx={cx} cy={cy} r={3.5} fill="#0A0A0A" stroke="#F4C10F" strokeWidth="2" />
    </g>
  );
};

/* Small circular percentage read-out used on the stat cards */
const MiniRing = ({ percent, color, ready }) => {
  const circumference = 2 * Math.PI * 15.5;
  const filled = ready ? (percent / 100) * circumference : 0;
  return (
    <div className="relative h-11 w-11 shrink-0">
      <svg viewBox="0 0 36 36" className="h-11 w-11 -rotate-90">
        <circle cx="18" cy="18" r="15.5" fill="none" stroke="#F3F4F6" strokeWidth="4" />
        <circle
          cx="18" cy="18" r="15.5" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
          className="grow-ring transition-[stroke-dasharray] duration-700 ease-out"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-data font-bold text-gray-600">
        {ready ? percent : 0}%
      </span>
    </div>
  );
};

/* Sweep-fill button used for pagination, filters-adjacent CTAs, empty states */
const SweepButton = ({ children, onClick, disabled, className = '', dark = false }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`sweep-btn ${dark ? 'sweep-btn--dark' : ''} inline-flex items-center space-x-1.5 px-3 py-1.5 text-sm font-semibold rounded-sm border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
  >
    {children}
  </button>
);

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [scans, setScans] = useState([]);
  const [leads, setLeads] = useState([]);
  const [assignedReports, setAssignedReports] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [activeBar, setActiveBar] = useState(null);
  const [barsReady, setBarsReady] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    manufacturer: '',
    date_from: '',
    date_to: '',
  });
  const { user } = useAuth();

  const fetchStats = useCallback(async () => {
    try {
      const response = await api.get('/dashboard/stats');
      setStats(response.data.stats);
    } catch (err) {
      toast.error('Failed to load dashboard stats');
    }
  }, []);

  const fetchScans = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: page.toString() });
      if (filters.status) params.append('status', filters.status);
      if (filters.manufacturer) params.append('manufacturer', filters.manufacturer);
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);

      const response = await api.get(`/dashboard/scans?${params.toString()}`);
      const data = response.data;
      setScans(data.scans || data.items || data.results || []);
      setTotalPages(data.pagination?.total_pages ?? 1);
    } catch (err) {
      toast.error('Failed to load scans');
    }
  }, [page, filters]);

  const fetchLeads = useCallback(async () => {
    try {
      const response = await api.get('/dashboard/leads?limit=10');
      setLeads(response.data.leads || []);
    } catch (err) {
      toast.error('Failed to load crowdsourced leads');
    }
  }, []);

  const fetchAssignedReports = useCallback(async () => {
    try {
      const response = await api.get('/dashboard/assigned-reports');
      setAssignedReports(response.data.reports || []);
    } catch (err) {
      setAssignedReports([]);
    }
  }, []);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([fetchStats(), fetchScans(), fetchLeads(), fetchAssignedReports()]);
      setLoading(false);
    };
    loadAll();
  }, [fetchStats, fetchScans, fetchLeads, fetchAssignedReports]);

  useEffect(() => {
    const timer = window.setInterval(fetchAssignedReports, 15000);
    return () => window.clearInterval(timer);
  }, [fetchAssignedReports]);

  // Let the mini rings / segmented bar mount at 0 and animate in once real numbers land.
  useEffect(() => {
    setBarsReady(false);
    const timer = window.setTimeout(() => setBarsReady(true), 60);
    return () => window.clearTimeout(timer);
  }, [stats]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({ status: '', manufacturer: '', date_from: '', date_to: '' });
    setPage(1);
  };

  const hasActiveFilters = Object.values(filters).some(Boolean);

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'compliant': return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'non_compliant': case 'non-compliant': return 'bg-rose-50 text-rose-700 border border-rose-200';
      case 'partial': case 'partially_compliant': case 'partially-compliant': return 'bg-[#F4C10F]/15 text-[#8A6A00] border border-[#F4C10F]/40';
      default: return 'bg-gray-100 text-gray-700 border border-gray-200';
    }
  };

  const trendData = (stats?.scans_per_day || []).map(d => ({
    date: d.date,
    count: d.count,
  }));

  const violationsData = (stats?.top_violations || []).map(v => ({
    rule: v.rule,
    count: v.count,
  }));

  const percentOf = (n) => (stats?.total_scans ? Math.round(((n || 0) / stats.total_scans) * 100) : 0);
  const complianceRate = percentOf(stats?.compliant);

  const breakdownData = useMemo(() => ([
    { name: 'Compliant', value: stats?.compliant ?? 0, fill: '#059669' },
    { name: 'Non-Compliant', value: stats?.non_compliant ?? 0, fill: '#e11d48' },
    { name: 'Partially Compliant', value: stats?.partially_compliant ?? 0, fill: '#F4C10F' },
  ]), [stats]);

  const hasNoScans = !stats || (stats.total_scans === 0 && assignedReports.length === 0);

  const statCards = [
    {
      label: 'Total Scans',
      value: stats?.total_scans ?? 0,
      icon: FiFileText,
      accent: '#0A0A0A',
      iconClass: 'text-[#0A0A0A]',
      percent: null,
      footnote: 'All time',
    },
    {
      label: 'Compliant',
      value: stats?.compliant ?? 0,
      icon: FiCheckCircle,
      accent: '#059669',
      iconClass: 'text-emerald-600',
      percent: percentOf(stats?.compliant),
      footnote: `${percentOf(stats?.compliant)}% of scans`,
    },
    {
      label: 'Non-Compliant',
      value: stats?.non_compliant ?? 0,
      icon: FiXCircle,
      accent: '#e11d48',
      iconClass: 'text-rose-600',
      percent: percentOf(stats?.non_compliant),
      footnote: `${percentOf(stats?.non_compliant)}% of scans`,
    },
    {
      label: 'Partially Compliant',
      value: stats?.partially_compliant ?? 0,
      icon: FiAlertTriangle,
      accent: '#F4C10F',
      iconClass: 'text-[#8A6A00]',
      percent: percentOf(stats?.partially_compliant),
      footnote: `${percentOf(stats?.partially_compliant)}% of scans`,
    },
  ];

  const dashboardStyles = `
    @keyframes card-rise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .card-rise { animation: card-rise .5s cubic-bezier(.2,.7,.2,1) both; }

    @keyframes pulse-ring { 0% { r: 3.5; opacity: .9; } 100% { r: 11; opacity: 0; } }
    .pulse-ring { animation: pulse-ring 1.6s ease-out infinite; transform-origin: center; }

    @keyframes seal-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .seal-spin { animation: seal-spin 60s linear infinite; }

    @keyframes live-pulse { 0%, 100% { opacity: 1; } 50% { opacity: .35; } }
    .live-dot { animation: live-pulse 1.8s ease-in-out infinite; }

    @keyframes risk-pulse { 0% { box-shadow: 0 0 0 0 rgba(225,29,72,0.45); } 100% { box-shadow: 0 0 0 6px rgba(225,29,72,0); } }
    .risk-pulse { animation: risk-pulse 1.8s ease-out infinite; }

    @media (prefers-reduced-motion: reduce) {
      .card-rise { animation: none; }
      .pulse-ring { animation: none; opacity: 0; }
      .seal-spin { animation: none; }
      .live-dot { animation: none; }
      .risk-pulse { animation: none; }
      .grow-ring, .grow-bar { transition: none !important; }
    }

    .stat-card { position: relative; overflow: hidden; transition: transform .2s ease, box-shadow .2s ease; }
    .stat-card:hover { transform: translateY(-3px); box-shadow: 0 10px 24px -12px rgba(10,10,10,0.18); }
    .stat-card__bar { position: absolute; left: 0; top: 0; bottom: 0; width: 4px; }
    .stat-card__tint { position: absolute; inset: 0; opacity: 0; transition: opacity .2s ease; pointer-events: none; }
    .stat-card:hover .stat-card__tint { opacity: 1; }

    .sweep-btn { position: relative; overflow: hidden; z-index: 0; border-color: #d1d5db; color: #374151; background: #fff; }
    .sweep-btn::before {
      content: ''; position: absolute; inset: 0; background: #0A0A0A;
      transform: translateX(-101%); transition: transform .28s cubic-bezier(.2,.7,.2,1); z-index: -1;
    }
    .sweep-btn:not(:disabled):hover::before { transform: translateX(0); }
    .sweep-btn:not(:disabled):hover { color: #F4C10F; border-color: #0A0A0A; }
    .sweep-btn--dark { background: #0A0A0A; color: #F4C10F; border-color: #0A0A0A; }
    .sweep-btn--dark::before { background: #F4C10F; }
    .sweep-btn--dark:not(:disabled):hover { color: #0A0A0A; }

    .row-hover { transition: background-color .15s ease, box-shadow .15s ease; position: relative; }
    .row-hover:hover { background-color: #FBF6E4; }
    .row-accent::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: transparent; transition: background-color .15s ease; }
    .row-accent:hover::before { background: #F4C10F; }

    .view-link { position: relative; }
    .view-link .arrow-icon { transition: transform .18s ease; }
    .view-link:hover .arrow-icon { transform: translate(2px, -2px); }

    .focus-yellow:focus { outline: none; box-shadow: 0 0 0 2px rgba(244,193,15,0.5); border-color: #F4C10F; }

    .ledger-lines {
      background-image: repeating-linear-gradient(0deg, rgba(244,193,15,0.07) 0px, rgba(244,193,15,0.07) 1px, transparent 1px, transparent 27px);
    }
  `;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center space-y-3">
          <div className="h-10 w-10 rounded-full border-2 border-[#0A0A0A]/10 border-t-[#F4C10F] animate-spin"></div>
          <p className="text-gray-500 text-sm font-heading italic">Reading the ledger&hellip;</p>
        </div>
      </div>
    );
  }

  if (hasNoScans) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <style>{dashboardStyles}</style>
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold text-[#0A0A0A]">Dashboard</h1>
            <p className="text-gray-600 mt-1 font-heading italic">Compliance scan overview and analytics</p>
          </div>
          {user && (
            <div className="hidden sm:flex items-center space-x-2 bg-[#F4C10F]/10 px-3 py-1.5 rounded-sm border border-[#F4C10F]/30">
              <span className="text-sm text-[#8A6A00] font-medium">Role:</span>
              <span className="text-sm text-[#0A0A0A] font-bold">{user.role_display_name || user.role}</span>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between gap-3 mb-6 px-4 py-3 bg-indigo-50 border border-indigo-200 rounded-sm">
          <div>
            <p className="text-sm font-semibold text-indigo-950">Assigned citizen reports</p>
            <p className="text-xs text-indigo-700 mt-0.5">Reports routed to you by an administrator.</p>
          </div>
          <a href="#assigned-reports" className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-700 text-white rounded-sm text-sm font-semibold hover:bg-indigo-800">
            <FiEye className="h-4 w-4" /> View assigned reports <span className="font-data">{assignedReports.length}</span>
          </a>
        </div>
        <div id="assigned-reports" className="bg-white rounded-sm shadow-sm border border-indigo-200 overflow-hidden mb-8">
          <div className="p-6 border-b border-indigo-100 bg-indigo-50"><h3 className="font-heading text-lg font-semibold text-indigo-950">Assigned citizen reports</h3><p className="text-sm text-indigo-700 mt-1">Reports routed to you by an administrator.</p></div>
          {assignedReports.length > 0 ? <div className="divide-y divide-gray-100">{assignedReports.map((report) => <div key={report.id} className="p-5 flex flex-col sm:flex-row sm:items-center gap-4"><img src={report.image_url || '/logo.png'} alt="Citizen report" className="h-16 w-16 rounded-lg object-cover border border-slate-200" /><div className="flex-1"><p className="font-semibold text-[#0A0A0A]">{report.product_name || 'Product not named'}</p><p className="text-sm text-gray-600 mt-1">{report.shop_name || 'Shop not provided'} · {report.city || report.state || 'Location not captured'}</p><p className="text-xs text-gray-500 mt-1">{report.purchase_address || 'Address not provided'}</p></div><Link to={`/scan/${report.id}`} className="view-link inline-flex items-center space-x-1 text-sm text-[#0A0A0A] font-medium"><FiEye className="h-4 w-4" /><span>Review</span><FiArrowUpRight className="arrow-icon h-3.5 w-3.5" /></Link></div>)}</div> : <div className="p-8 text-center text-sm text-gray-500">No reports are assigned to you yet.</div>}
        </div>
        <div className="bg-white rounded-sm shadow-sm border border-gray-200 p-16 text-center">
          <FiFileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="font-heading text-xl font-semibold text-[#0A0A0A] mb-2">No scans yet</h2>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Upload your first product label to see compliance analytics and scan trends here.
          </p>
          <Link
            to="/upload"
            className="sweep-btn sweep-btn--dark inline-flex items-center px-5 py-2.5 rounded-sm text-sm font-semibold transition-colors"
          >
            Start a scan
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <style>{dashboardStyles}</style>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-[#0A0A0A]">Dashboard</h1>
          <p className="text-gray-600 mt-1 font-heading italic">Compliance scan overview and analytics</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-gray-400">
            <span className="live-dot h-1.5 w-1.5 rounded-full bg-emerald-500" /> live
          </span>
          {user && (
            <div className="hidden sm:flex items-center space-x-2 bg-[#F4C10F]/10 px-3 py-1.5 rounded-sm border border-[#F4C10F]/30">
              <span className="text-sm text-[#8A6A00] font-medium">Role:</span>
              <span className="text-sm text-[#0A0A0A] font-bold">{user.role_display_name || user.role}</span>
            </div>
          )}
        </div>
      </div>

      {/* ─── Compliance seal hero ─── */}
      <div className="ledger-lines relative overflow-hidden bg-[#0A0A0A] rounded-sm p-6 sm:p-8 mb-6 card-rise flex flex-col sm:flex-row items-center gap-6 sm:gap-8">
        <div className="relative h-28 w-28 sm:h-32 sm:w-32 shrink-0">
          <div className="seal-spin absolute inset-0 rounded-full border-2 border-dashed border-[#F4C10F]/50" />
          <div className="absolute inset-3 rounded-full border border-[#F4C10F]/25" />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-heading italic text-3xl font-bold text-[#F4C10F] leading-none">
              <CountUp value={complianceRate} />%
            </span>
            <span className="text-[9px] uppercase tracking-widest text-white/50 mt-1.5">compliant</span>
          </div>
        </div>

        <div className="flex-1 text-center sm:text-left">
          <p className="text-xs font-data uppercase tracking-widest text-[#F4C10F]">Compliance ledger</p>
          <h2 className="font-heading italic text-xl sm:text-2xl font-bold text-white mt-1">
            {complianceRate}% of scanned products are clean
          </h2>
          <p className="text-sm text-white/50 mt-2 max-w-md mx-auto sm:mx-0">
            {stats.total_scans} scans reviewed · {stats.non_compliant ?? 0} flagged non-compliant · {assignedReports.length} citizen report{assignedReports.length === 1 ? '' : 's'} awaiting review
          </p>
        </div>

        {assignedReports.length > 0 && (
          <a
            href="#assigned-reports"
            className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 bg-[#F4C10F] text-[#0A0A0A] rounded-sm text-sm font-bold transition-transform duration-200 hover:scale-105"
          >
            <FiEye className="h-4 w-4" /> Review queue
          </a>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 mb-6 px-4 py-3 bg-indigo-50 border border-indigo-200 rounded-sm">
        <div>
          <p className="text-sm font-semibold text-indigo-950">Assigned citizen reports</p>
          <p className="text-xs text-indigo-700 mt-0.5">Reports routed to you by an administrator.</p>
        </div>
        <a href="#assigned-reports" className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-700 text-white rounded-sm text-sm font-semibold hover:bg-indigo-800 transition-colors">
          <FiEye className="h-4 w-4" /> View assigned reports <span className="font-data">{assignedReports.length}</span>
        </a>
      </div>
      <div className="flex flex-wrap gap-3 mb-6">
        <Link to="/map" className="sweep-btn sweep-btn--dark inline-flex items-center px-4 py-2 rounded-sm text-sm font-semibold">
          <FiEye className="h-4 w-4 mr-2" /> View live map data
        </Link>
        <Link to="/history" className="sweep-btn inline-flex items-center px-4 py-2 rounded-sm text-sm font-semibold">
          <FiFileText className="h-4 w-4 mr-2" /> View inspection history
        </Link>
      </div>

      {/* ─── Stat cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="stat-card card-rise bg-white rounded-sm shadow-sm border border-gray-200 p-5 pl-6"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <span className="stat-card__bar" style={{ backgroundColor: card.accent }} />
              <span className="stat-card__tint" style={{ backgroundColor: `${card.accent}0D` }} />
              <div className="relative flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{card.label}</p>
                  <p className="font-heading text-3xl font-bold text-[#0A0A0A] mt-1">
                    <CountUp value={card.value} />
                  </p>
                </div>
                <Icon className={`h-7 w-7 ${card.iconClass}`} />
              </div>
              <div className="relative flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-400">{card.footnote}</p>
                {card.percent != null && <MiniRing percent={card.percent} color={card.accent} ready={barsReady} />}
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── Charts ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-sm shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <span className="h-2 w-2 bg-[#F4C10F]" />
            <h3 className="font-heading text-lg font-semibold text-[#0A0A0A]">Scans Over Time</h3>
          </div>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} allowDecimals={false} />
                <Tooltip content={<CaseTooltip />} cursor={{ stroke: '#F4C10F', strokeWidth: 1, strokeDasharray: '3 3' }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#0A0A0A"
                  strokeWidth={2.5}
                  name="Scans"
                  isAnimationActive
                  animationDuration={900}
                  animationEasing="ease-out"
                  dot={(props) => <PulseDot {...props} dataLength={trendData.length} key={props.index} />}
                  activeDot={{ r: 6, fill: '#F4C10F', stroke: '#0A0A0A', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message="No scan data available yet" />
          )}
        </div>

        <div className="bg-white rounded-sm shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <span className="h-2 w-2 bg-[#F4C10F]" />
            <h3 className="font-heading text-lg font-semibold text-[#0A0A0A]">Top Violations</h3>
          </div>
          {violationsData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={violationsData}
                onMouseMove={(state) => {
                  if (state?.isTooltipActive) setActiveBar(state.activeTooltipIndex);
                  else setActiveBar(null);
                }}
                onMouseLeave={() => setActiveBar(null)}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="rule" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} allowDecimals={false} />
                <Tooltip content={<CaseTooltip />} cursor={{ fill: 'rgba(244,193,15,0.08)' }} />
                <Bar
                  dataKey="count"
                  radius={[6, 6, 0, 0]}
                  isAnimationActive
                  animationDuration={800}
                  animationEasing="ease-out"
                >
                  {violationsData.map((_, i) => (
                    <Cell key={i} fill={activeBar === i ? '#F4C10F' : '#0A0A0A'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message="No violations recorded yet" />
          )}
        </div>

        <div className="bg-white rounded-sm shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <span className="h-2 w-2 bg-[#F4C10F]" />
            <h3 className="font-heading text-lg font-semibold text-[#0A0A0A]">Compliance Breakdown</h3>
          </div>
          {stats.total_scans > 0 ? (
            <>
              <div className="relative" style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={breakdownData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={58}
                      outerRadius={82}
                      paddingAngle={3}
                      stroke="none"
                      isAnimationActive
                      animationDuration={800}
                    >
                      {breakdownData.map((d) => <Cell key={d.name} fill={d.fill} />)}
                    </Pie>
                    <Tooltip content={<CaseTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="font-heading italic text-2xl font-bold text-[#0A0A0A]">{stats.total_scans}</span>
                  <span className="text-[9px] uppercase tracking-widest text-gray-400">total scans</span>
                </div>
              </div>
              <div className="space-y-3 mt-3">
                {breakdownData.map((d) => (
                  <div key={d.name}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="inline-flex items-center gap-1.5 text-gray-600">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.fill }} />
                        {d.name}
                      </span>
                      <span className="font-data font-semibold text-gray-700">{d.value}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="grow-bar h-full rounded-full transition-all duration-700 ease-out"
                        style={{ width: barsReady ? `${percentOf(d.value)}%` : '0%', backgroundColor: d.fill }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <EmptyChart message="No compliance data yet" />
          )}
        </div>
      </div>

      <div id="assigned-reports" className="bg-white rounded-sm shadow-sm border border-indigo-200 overflow-hidden mb-8">
          <div className="p-6 border-b border-indigo-100 bg-indigo-50"><h3 className="font-heading text-lg font-semibold text-indigo-950">Assigned citizen reports</h3><p className="text-sm text-indigo-700 mt-1">Reports routed to you by an administrator.</p></div>
          {assignedReports.length > 0 ? <div className="divide-y divide-gray-100">{assignedReports.map((report) => <div key={report.id} className="row-hover row-accent p-5 flex flex-col sm:flex-row sm:items-center gap-4"><img src={report.image_url || '/logo.png'} alt="Citizen report" className="h-16 w-16 rounded-lg object-cover border border-slate-200" /><div className="flex-1"><p className="font-semibold text-[#0A0A0A]">{report.product_name || 'Product not named'}</p><p className="text-sm text-gray-600 mt-1">{report.shop_name || 'Shop not provided'} · {report.city || report.state || 'Location not captured'}</p><p className="text-xs text-gray-500 mt-1">{report.purchase_address || 'Address not provided'}</p></div><Link to={`/scan/${report.id}`} className="view-link inline-flex items-center space-x-1 text-sm text-[#0A0A0A] font-medium"><FiEye className="h-4 w-4" /><span>Review</span><FiArrowUpRight className="arrow-icon h-3.5 w-3.5" /></Link></div>)}</div> : <div className="p-8 text-center text-sm text-gray-500">No reports are assigned to you yet.</div>}
      </div>

      {/* ─── Recent scans table ─── */}
      <div className="bg-white rounded-sm shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <h3 className="font-heading text-lg font-semibold text-[#0A0A0A]">Recent Scans</h3>
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="focus-yellow text-sm border border-gray-300 rounded-sm px-3 py-1.5"
              >
                <option value="">All Status</option>
                <option value="compliant">Compliant</option>
                <option value="non_compliant">Non-Compliant</option>
                <option value="partial">Partially Compliant</option>
              </select>
              <input
                type="text"
                placeholder="Manufacturer"
                value={filters.manufacturer}
                onChange={(e) => handleFilterChange('manufacturer', e.target.value)}
                className="focus-yellow text-sm border border-gray-300 rounded-sm px-3 py-1.5 w-36"
              />
              <input
                type="date"
                value={filters.date_from}
                onChange={(e) => handleFilterChange('date_from', e.target.value)}
                className="focus-yellow text-sm border border-gray-300 rounded-sm px-3 py-1.5"
              />
              <input
                type="date"
                value={filters.date_to}
                onChange={(e) => handleFilterChange('date_to', e.target.value)}
                className="focus-yellow text-sm border border-gray-300 rounded-sm px-3 py-1.5"
              />
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-rose-600 transition-colors"
                >
                  <FiX className="h-3.5 w-3.5" /> Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {scans.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 tracking-wide">Date</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 tracking-wide">Product</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 tracking-wide">Manufacturer</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 tracking-wide">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {scans.map((scan) => (
                  <tr key={scan.id} className="row-hover row-accent">
                    <td className="px-6 py-4 text-sm text-gray-600 font-data">
                      {new Date(scan.created_at || scan.timestamp).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-[#0A0A0A]">
                      {scan.product_name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {scan.manufacturer || 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-sm text-xs font-medium ${getStatusBadge(scan.overall_status || scan.status)}`}>
                        {(scan.overall_status || scan.status || 'unknown').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        to={`/scan/${scan.id}`}
                        className="view-link inline-flex items-center space-x-1 text-sm text-[#0A0A0A] hover:text-[#8A6A00] font-medium"
                      >
                        <FiEye className="h-4 w-4" />
                        <span>View</span>
                        <FiArrowUpRight className="arrow-icon h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <FiFileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No scans found</p>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
            <SweepButton onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>
              <FiChevronLeft className="h-4 w-4" />
              <span>Previous</span>
            </SweepButton>
            <span className="text-sm text-gray-600 font-data">Page {page} of {totalPages}</span>
            <SweepButton onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
              <span>Next</span>
              <FiChevronRight className="h-4 w-4" />
            </SweepButton>
          </div>
        )}
      </div>

      {/* ─── Crowdsourced Leads Section ─── */}
      <div className="mt-8 bg-white rounded-sm shadow-sm border border-[#F4C10F]/40 overflow-hidden">
        <div className="p-6 border-b border-gray-200 bg-[#F4C10F]/10">
          <div className="flex items-center space-x-2">
            <FiAlertTriangle className="h-5 w-5 text-[#8A6A00]" />
            <h3 className="font-heading text-lg font-semibold text-[#0A0A0A]">Risk Queue: Crowdsourced Leads</h3>
          </div>
          <p className="text-sm text-gray-600 mt-1 font-heading italic">High-risk, non-compliant products reported by citizens in the field.</p>
        </div>

        {leads && leads.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100 text-xs tracking-wide text-gray-500 font-semibold">
                  <th className="px-6 py-4">Report Date</th>
                  <th className="px-6 py-4">Product details</th>
                  <th className="px-6 py-4">Location</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {leads.map((lead) => {
                  const isHighRisk = (lead.overall_status || '').toLowerCase().includes('non');
                  return (
                    <tr key={lead.id} className="row-hover row-accent">
                      <td className="px-6 py-4 text-gray-500 whitespace-nowrap font-data">
                        {new Date(lead.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-[#0A0A0A]">{lead.product_name || 'Unknown'}</div>
                        <div className="text-gray-500 text-xs mt-0.5">{lead.manufacturer || 'Unknown'}</div>
                      </td>
                      <td className="px-6 py-4 text-gray-500 font-data">
                        {lead.latitude && lead.longitude
                          ? `${lead.latitude.toFixed(4)}, ${lead.longitude.toFixed(4)}`
                          : (lead.state || 'Unknown')}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-medium ${getStatusBadge(lead.overall_status)}`}>
                          {isHighRisk && <span className="risk-pulse h-1.5 w-1.5 rounded-full bg-rose-500" />}
                          {lead.overall_status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          to={`/scan/${lead.id}`}
                          className="view-link inline-flex items-center space-x-1 text-sm text-[#0A0A0A] hover:text-[#8A6A00] font-medium"
                        >
                          <FiEye className="h-4 w-4" />
                          <span>Inspect</span>
                          <FiArrowUpRight className="arrow-icon h-3.5 w-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center">
            <FiCheckCircle className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No high-risk citizen leads right now.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;