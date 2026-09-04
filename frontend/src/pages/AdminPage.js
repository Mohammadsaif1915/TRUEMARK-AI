import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart,
  PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  FiActivity, FiAlertTriangle, FiCheckCircle, FiChevronRight, FiClock,
  FiFileText, FiImage, FiMapPin, FiRefreshCw, FiShield, FiTrendingUp,
  FiUsers, FiXCircle, FiUserPlus, FiCopy, FiCheck, FiX, FiEye, FiTrash2,
} from 'react-icons/fi';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || `http://${window.location.hostname}:5000`;

/* ------------------------------------------------------------------ */
/* Design tokens                                                       */
/* ------------------------------------------------------------------ */
const COLORS = {
  ink: '#0B1425',
  inkSoft: '#16233B',
  gold: '#F4C10F',
  goldDeep: '#B4880A',
  teal: '#0F9D8B',
  tealSoft: '#CFF3EC',
  rose: '#E1425A',
  roseSoft: '#FBDCE1',
  indigo: '#5B5FEF',
  indigoSoft: '#E2E2FD',
  slate: '#94A3B8',
  slateSoft: '#E7ECF2',
};

const NAV_LINKS = [
  { id: 'pulse', label: 'Overview' },
  { id: 'reports', label: 'Citizen reports' },
  { id: 'workforce', label: 'Workforce' },
  { id: 'cities', label: 'Cities' },
  { id: 'register', label: 'Inspector register' },
  { id: 'users', label: 'User management' },
];

const ASSIGNABLE_ROLES = [
  { value: 'inspector', label: 'Inspector' },
  { value: 'enforcement_officer', label: 'Enforcement Officer' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'field_officer', label: 'Field Officer' },
  { value: 'administrator', label: 'Administrator' },
];

const ROLE_BADGE = {
  administrator: { bg: '#E8E2FD', fg: '#5333C4' },
  admin: { bg: '#E8E2FD', fg: '#5333C4' },
  supervisor: { bg: '#E0E7FF', fg: '#3730A3' },
  enforcement_officer: { bg: '#DBEAFE', fg: '#1D4ED8' },
  inspector: { bg: '#CCFBF1', fg: '#0F766E' },
  field_officer: { bg: '#D1FAE5', fg: '#065F46' },
};

const STATUS_STYLES = {
  submitted: { bg: '#FEF3C7', fg: '#92620A', dot: '#D97706' },
  assigned: { bg: '#E2E2FD', fg: '#3F3FB0', dot: '#5B5FEF' },
  resolved: { bg: '#CFF3EC', fg: '#0B6F62', dot: '#0F9D8B' },
  rejected: { bg: '#FBDCE1', fg: '#9F2338', dot: '#E1425A' },
  default: { bg: '#F1F5F9', fg: '#475569', dot: '#94A3B8' },
};

/* ------------------------------------------------------------------ */
/* Small presentational pieces                                         */
/* ------------------------------------------------------------------ */

const StatusPill = ({ status }) => {
  const key = (status || 'submitted').toLowerCase();
  const style = STATUS_STYLES[key] || STATUS_STYLES.default;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ backgroundColor: style.bg, color: style.fg }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: style.dot }} />
      {status || 'submitted'}
    </span>
  );
};

const Metric = ({ label, value, detail, icon: Icon, tone, glow }) => (
  <div
    className="group relative bg-white border border-slate-200 rounded-2xl p-5 shadow-sm overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
    style={{ '--glow': glow }}
  >
    <div
      className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-30"
      style={{ backgroundColor: glow }}
    />
    <div className="relative flex items-center justify-between">
      <div className={`p-2.5 rounded-xl ${tone} transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
        <Icon className="h-5 w-5" />
      </div>
      <span className="font-data text-3xl font-bold text-slate-900 tabular-nums">{value}</span>
    </div>
    <p className="relative text-sm font-semibold text-slate-700 mt-4">{label}</p>
    <p className="relative text-xs text-slate-500 mt-1">{detail}</p>
    <div
      className="absolute bottom-0 left-0 h-0.5 w-full origin-left scale-x-0 transition-transform duration-300 group-hover:scale-x-100"
      style={{ backgroundColor: glow }}
    />
  </div>
);

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0B1425] text-white rounded-xl px-3.5 py-2.5 shadow-2xl text-xs border border-white/10">
      {label && <p className="text-slate-400 mb-1">{label}</p>}
      {payload.map((item) => (
        <p key={item.dataKey || item.name} className="font-semibold flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color || item.fill }} />
          {item.name || item.dataKey}: {item.value}
        </p>
      ))}
    </div>
  );
};

const SectionHeading = ({ eyebrow, title, subtitle, icon: Icon }) => (
  <div className="flex items-center justify-between mb-5">
    <div>
      {eyebrow && <p className="text-xs font-data uppercase tracking-wider text-[#8A6A00]">{eyebrow}</p>}
      <h2 className="font-heading text-lg font-bold text-slate-900 mt-1">{title}</h2>
      {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
    </div>
    {Icon && <Icon className="text-[#8A6A00]" />}
  </div>
);

/** Donut with a number centered inside it. */
const CenteredDonut = ({ data, centerValue, centerLabel }) => (
  <div className="relative">
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={62} outerRadius={86} paddingAngle={3} stroke="none">
          {data.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
        </Pie>
        <Tooltip content={<ChartTooltip />} />
      </PieChart>
    </ResponsiveContainer>
    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
      <span className="font-data text-2xl font-bold text-slate-900">{centerValue}</span>
      <span className="text-[11px] text-slate-500">{centerLabel}</span>
    </div>
  </div>
);

/** Radial gauge, e.g. for a compliance rate percentage. */
const Gauge = ({ value, label, color }) => (
  <div className="relative">
    <ResponsiveContainer width="100%" height={170}>
      <RadialBarChart
        innerRadius="72%"
        outerRadius="100%"
        data={[{ name: label, value, fill: color }]}
        startAngle={90}
        endAngle={-270}
      >
        <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
        <RadialBar background={{ fill: '#EEF1F6' }} dataKey="value" cornerRadius={12} isAnimationActive animationDuration={900} />
      </RadialBarChart>
    </ResponsiveContainer>
    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
      <span className="font-data text-2xl font-bold text-slate-900">{value}%</span>
      <span className="text-[11px] text-slate-500 text-center px-6">{label}</span>
    </div>
  </div>
);

const SkeletonBlock = ({ className }) => (
  <div className={`relative overflow-hidden rounded-xl bg-slate-200/70 ${className}`}>
    <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
  </div>
);

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

const AdminPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [reports, setReports] = useState([]);
  const [assigning, setAssigning] = useState(null);

  // User Management state
  const [userList, setUserList] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ full_name: '', email: '', badge_number: '', phone_number: '', department: '', designation: '', role: 'inspector', status: 'Active' });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const [credentials, setCredentials] = useState(null); // { name, email, login_id, role, temporary_password }
  const [copied, setCopied] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const res = await api.get('/admin/users');
      setUserList(res.data.users || []);
    } catch (err) {
      // silently fail – admin guard already in place
    } finally {
      setUsersLoading(false);
    }
  }, []);

  const fetchOverview = useCallback(async () => {
    try {
      const [response, reportResponse] = await Promise.all([api.get('/admin/overview'), api.get('/admin/reports')]);
      setData(response.data);
      setReports(reportResponse.data.reports || []);
      setLastUpdated(new Date());
      setError(false);
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const assignReport = async (reportId, inspectorId) => {
    if (!inspectorId) return;
    setAssigning(reportId);
    try {
      await api.post(`/admin/reports/${reportId}/assign`, { inspector_id: Number(inspectorId) });
      await fetchOverview();
    } catch (err) {
      window.alert(err.response?.data?.error || 'Could not assign report');
    } finally {
      setAssigning(null);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreateError('');
    setCreateLoading(true);
    try {
      const res = await api.post('/admin/users', createForm);
      const { user: newUser, temporary_password, login_id } = res.data;
      setCredentials({
        name: newUser.full_name || login_id,
        email: newUser.email,
        badge_number: newUser.badge_number,
        role: newUser.role_display_name || newUser.role,
        login_id,
        temporary_password,
      });
      setShowCreateModal(false);
      setCreateForm({ full_name: '', email: '', badge_number: '', phone_number: '', department: '', designation: '', role: 'inspector', status: 'Active' });
      await fetchUsers();
    } catch (err) {
      setCreateError(err.response?.data?.error || 'Failed to create user.');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/admin/users/${userToDelete.id}`);
      setUserToDelete(null);
      await fetchUsers();
    } catch (err) {
      window.alert(err.response?.data?.error || 'Failed to delete user.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const copyCredentials = () => {
    if (!credentials) return;
    const text = `Name: ${credentials.name}\nEmail: ${credentials.email}\nEmployee/Inspector ID: ${credentials.badge_number || 'N/A'}\nRole: ${credentials.role}\nLogin ID: ${credentials.login_id}\nTemporary Password: ${credentials.temporary_password}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  useEffect(() => {
    if (user && !['administrator', 'admin'].includes(user.role)) {
      navigate('/dashboard', { replace: true });
      return undefined;
    }
    fetchOverview();
    fetchUsers();
    const timer = window.setInterval(fetchOverview, 15000);
    return () => window.clearInterval(timer);
  }, [fetchOverview, fetchUsers, navigate, user]);

  const derived = useMemo(() => {
    if (!data) return null;
    const { summary, inspectors, cities } = data;
    const inspectorChart = inspectors.map((item) => ({
      ...item,
      shortName: item.name.length > 14 ? `${item.name.slice(0, 14)}...` : item.name,
    }));
    const workforceDonut = [
      { name: 'Active', value: summary.active_inspectors, fill: COLORS.teal },
      { name: 'Signed out', value: summary.signed_out_inspectors, fill: COLORS.slate },
    ];
    const totalGraded = summary.compliant_inspections + summary.non_compliant_inspections;
    const complianceRate = totalGraded > 0 ? Math.round((summary.compliant_inspections / totalGraded) * 100) : 0;
    const leader = [...inspectors].sort((a, b) => b.inspections - a.inspections)[0];
    const leadingCity = cities[0];
    return { summary, inspectors, cities, inspectorChart, workforceDonut, complianceRate, leader, leadingCity };
  }, [data]);

  /* -------------------------------- Loading state ------------------------------- */
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F1F4F9] px-4 py-8 sm:px-6 lg:px-8">
        <style>{`@keyframes shimmer { 100% { transform: translateX(100%); } }`}</style>
        <div className="max-w-7xl mx-auto space-y-6">
          <SkeletonBlock className="h-40 w-full" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((i) => <SkeletonBlock key={i} className="h-32" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <SkeletonBlock className="h-72 lg:col-span-2" />
            <SkeletonBlock className="h-72" />
          </div>
          <p className="text-center text-sm text-slate-500 flex items-center justify-center gap-2">
            <FiRefreshCw className="animate-spin" /> Loading operations overview...
          </p>
        </div>
      </div>
    );
  }

  /* -------------------------------- Error state ---------------------------------- */
  if (error || !derived) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F1F4F9] px-4">
        <div className="text-center bg-white border border-slate-200 rounded-2xl p-10 shadow-sm max-w-sm">
          <div className="mx-auto h-14 w-14 rounded-full bg-amber-50 flex items-center justify-center">
            <FiAlertTriangle className="h-7 w-7 text-amber-500" />
          </div>
          <p className="font-heading font-bold text-slate-900 mt-4 text-lg">Admin data unavailable</p>
          <p className="text-sm text-slate-500 mt-1">We couldn't reach the operations service. Try again in a moment.</p>
          <button
            type="button"
            onClick={fetchOverview}
            className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-[#0B1425] text-[#F4C10F] rounded-xl text-sm font-semibold transition-transform duration-200 hover:scale-105 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F4C10F] focus-visible:ring-offset-2"
          >
            <FiRefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      </div>
    );
  }

  const { summary, inspectors, cities, inspectorChart, workforceDonut, complianceRate, leader, leadingCity } = derived;

  return (
    <div className="min-h-screen bg-[#F1F4F9] px-4 py-8 sm:px-6 lg:px-8 scroll-smooth">
      <style>{`
        html { scroll-behavior: smooth; }
        @keyframes admin-rise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shimmer { 100% { transform: translateX(100%); } }
        @keyframes pulse-ring { 0% { box-shadow: 0 0 0 0 rgba(244,193,15,0.45); } 100% { box-shadow: 0 0 0 10px rgba(244,193,15,0); } }
        @keyframes blob-float { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(10px, -14px); } }
        .admin-rise { animation: admin-rise .5s ease-out both; }
        .pulse-dot { animation: pulse-ring 1.8s ease-out infinite; }
        .blob { animation: blob-float 9s ease-in-out infinite; }
        .table-row-accent { position: relative; }
        .table-row-accent::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: transparent; transition: background .2s ease; }
        .table-row-accent:hover::before { background: #F4C10F; }
        @media (prefers-reduced-motion: reduce) {
          .admin-rise, .pulse-dot, .blob { animation: none; }
        }
      `}</style>

      <div className="max-w-7xl mx-auto">

        {/* ---------------------------- Hero ---------------------------- */}
        <div id="pulse" className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0B1425] via-[#16233B] to-[#0B1425] p-7 sm:p-9 mb-6 admin-rise shadow-lg">
          <div className="blob pointer-events-none absolute -top-16 -right-10 h-56 w-56 rounded-full bg-[#F4C10F]/20 blur-3xl" />
          <div className="blob pointer-events-none absolute -bottom-20 left-10 h-56 w-56 rounded-full bg-[#5B5FEF]/20 blur-3xl" style={{ animationDelay: '3s' }} />

          <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <p className="text-xs font-data uppercase tracking-widest text-[#F4C10F]">Administrator console</p>
              <h1 className="font-heading text-3xl sm:text-4xl font-bold text-white mt-2">Inspection command view</h1>
              <p className="text-slate-400 mt-2 max-w-md">A privacy-safe operational picture of the inspector network.</p>

              <div className="flex flex-wrap gap-2 mt-5">
                {NAV_LINKS.map((link) => (
                  <a
                    key={link.id}
                    href={`#${link.id}`}
                    className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white/5 text-slate-200 border border-white/10 transition-all duration-200 hover:bg-[#F4C10F] hover:text-[#0B1425] hover:border-[#F4C10F]"
                  >
                    {link.label} <FiChevronRight className="h-3 w-3" />
                  </a>
                ))}
              </div>
            </div>

            <div className="flex flex-col items-start lg:items-end gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="pulse-dot h-2 w-2 rounded-full bg-[#F4C10F]" />
                Live refresh every 15 seconds {lastUpdated && `· ${lastUpdated.toLocaleTimeString()}`}
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-right">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Total inspections</p>
                <p className="font-data text-4xl font-bold text-[#F4C10F] leading-tight">{summary.total_inspections}</p>
                <p className="text-xs text-slate-400 mt-1">{summary.compliant_inspections} compliant · {summary.non_compliant_inspections} non-compliant</p>
              </div>
            </div>
          </div>

          {/* Inspector coverage chips */}
          <div className="relative mt-7 pt-6 border-t border-white/10">
            <p className="text-[11px] font-data uppercase tracking-wider text-slate-400 mb-3">Inspector coverage</p>
            <div className="flex flex-wrap gap-2">
              {inspectors.map((inspector) => (
                <span
                  key={inspector.id}
                  className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-200 transition-colors duration-200 hover:bg-white/10 hover:border-[#F4C10F]/40"
                >
                  <strong className="text-white">{inspector.name}</strong>
                  <span className="text-slate-400"> · {inspector.working_city || 'Working city not set'}</span>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ------------------------ KPI metric cards ------------------------ */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 admin-rise" style={{ animationDelay: '60ms' }} aria-label="Inspector and inspection summary">
          <Metric label="Registered inspectors" value={summary.registered_inspectors} detail="Users registered in inspector roles" icon={FiUsers} tone="bg-indigo-50 text-indigo-700" glow={COLORS.indigo} />
          <Metric label="Active now" value={summary.active_inspectors} detail="Most recent session is signed in" icon={FiActivity} tone="bg-emerald-50 text-emerald-700" glow={COLORS.teal} />
          <Metric label="Signed out" value={summary.signed_out_inspectors} detail="No active session recorded" icon={FiClock} tone="bg-slate-100 text-slate-600" glow={COLORS.slate} />
          <Metric label="Total inspections" value={summary.total_inspections} detail={`${summary.compliant_inspections} compliant · ${summary.non_compliant_inspections} non-compliant`} icon={FiShield} tone="bg-amber-50 text-amber-700" glow={COLORS.gold} />
        </section>

        {/* --------------------------- Citizen reports --------------------------- */}
        <section id="reports" className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mb-6 admin-rise" style={{ animationDelay: '90ms' }}>
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-data uppercase tracking-wider text-[#8A6A00]">Queue</p>
              <h2 className="font-heading text-lg font-bold text-slate-900 mt-1 flex items-center gap-2">
                <FiFileText className="text-[#8A6A00]" /> Citizen reports
              </h2>
              <p className="text-xs text-slate-500 mt-1">Review submitted reports and assign them to an inspector working nearby.</p>
            </div>
            <span className="hidden sm:inline-flex px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">
              {reports.length} open
            </span>
          </div>

          {reports.length ? (
            <div className="divide-y divide-slate-100">
              {reports.map((report) => {
                const imageUrl = report.image_url || (report.image_path ? `${API_BASE_URL}/uploads/${report.image_path.split(/[\\/]/).pop()}` : null);
                return (
                  <div key={report.id} className="p-6 grid grid-cols-1 lg:grid-cols-[auto_1fr_auto] gap-5 items-start transition-colors duration-200 hover:bg-amber-50/30">
                    <div className="relative h-20 w-20 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center">
                      {imageUrl ? (
                        <img src={imageUrl} alt="Citizen report evidence" className="h-full w-full object-cover" />
                      ) : (
                        <FiImage className="h-6 w-6 text-slate-300" />
                      )}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-slate-900">{report.product_name || 'Product not named'}</h3>
                        <StatusPill status={report.report_status} />
                      </div>
                      <p className="text-sm text-slate-600 mt-1 flex items-center gap-1">
                        <FiMapPin className="h-3.5 w-3.5 text-slate-400" />
                        {report.shop_name || 'Shop not provided'} · {report.city || report.state || 'Location not captured'}
                      </p>
                      <p className="text-sm text-slate-500 mt-2">{report.purchase_address || 'Address not provided'}</p>
                      {report.report_description && <p className="text-sm text-slate-700 mt-2">{report.report_description}</p>}
                    </div>

                    <label className="min-w-52 text-xs font-semibold text-slate-500">
                      Assign to inspector
                      <select
                        disabled={assigning === report.id}
                        defaultValue={report.assigned_inspector_id || ''}
                        onChange={(event) => assignReport(report.id, event.target.value)}
                        className="mt-1 w-full rounded-xl border-slate-300 text-sm py-2 transition-colors duration-200 hover:border-[#F4C10F] focus:border-[#F4C10F] focus:ring-[#F4C10F] disabled:opacity-50"
                      >
                        <option value="">Select inspector</option>
                        {inspectors.map((inspector) => (
                          <option key={inspector.id} value={inspector.id}>
                            {inspector.name} · {inspector.working_city || 'City not set'}
                          </option>
                        ))}
                      </select>
                      {assigning === report.id && (
                        <span className="mt-1 inline-flex items-center gap-1 text-[11px] text-amber-600">
                          <FiRefreshCw className="h-3 w-3 animate-spin" /> Assigning...
                        </span>
                      )}
                    </label>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center text-sm text-slate-500">No citizen reports submitted yet.</div>
          )}
        </section>

        {/* --------------------------- Workforce charts --------------------------- */}
        <section id="workforce" className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm admin-rise transition-shadow duration-300 hover:shadow-md" style={{ animationDelay: '120ms' }}>
            <SectionHeading eyebrow="Throughput" title="Inspector throughput" subtitle="Named operational totals only" icon={FiTrendingUp} />
            {inspectorChart.length ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={inspectorChart} margin={{ top: 8, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="shortName" angle={-20} textAnchor="end" height={55} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(244,193,15,0.08)' }} />
                  <Bar dataKey="inspections" name="Inspections" radius={[6, 6, 0, 0]} isAnimationActive animationDuration={800}>
                    {inspectorChart.map((item) => (
                      <Cell key={item.id} fill={item.status === 'active' ? COLORS.gold : COLORS.slateSoft} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-slate-500 py-20 text-center">No inspectors registered yet.</p>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm admin-rise transition-shadow duration-300 hover:shadow-md" style={{ animationDelay: '160ms' }}>
            <SectionHeading eyebrow="Sessions" title="Workforce pulse" subtitle="Current recorded session state" icon={FiUsers} />
            <CenteredDonut data={workforceDonut} centerValue={summary.registered_inspectors} centerLabel="registered" />
            <div className="flex items-center justify-center gap-4 mt-2 text-xs">
              <span className="inline-flex items-center gap-1.5 text-slate-600"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS.teal }} /> Active</span>
              <span className="inline-flex items-center gap-1.5 text-slate-600"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS.slate }} /> Signed out</span>
            </div>
            <div className="border-t border-slate-100 mt-4 pt-4 text-xs text-slate-500">Activity is based on the last recorded login/logout event.</div>
          </div>
        </section>

        {/* ----------------------------- Cities + insight ----------------------------- */}
        <section id="cities" className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm transition-shadow duration-300 hover:shadow-md">
            <SectionHeading eyebrow="Geography" title="City activity" subtitle="Where recorded inspections happen most" icon={FiMapPin} />
            {cities.length ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={cities.slice(0, 8)} margin={{ top: 8, right: 10, left: -20, bottom: 22 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="city" angle={-25} textAnchor="end" height={60} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(91,95,239,0.06)' }} />
                  <Bar dataKey="inspections" name="Inspections" fill={COLORS.indigo} radius={[6, 6, 0, 0]} isAnimationActive animationDuration={800} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-slate-500 py-20 text-center">No city data has been captured yet.</p>
            )}
          </div>

          <div className="flex flex-col gap-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm transition-shadow duration-300 hover:shadow-md">
              <SectionHeading eyebrow="Outcomes" title="Compliance rate" icon={FiCheckCircle} />
              <Gauge value={complianceRate} label="of graded inspections were compliant" color={complianceRate >= 50 ? COLORS.teal : COLORS.rose} />
            </div>

            <div className="relative overflow-hidden bg-[#0B1425] rounded-2xl p-6 text-white shadow-sm">
              <div className="blob pointer-events-none absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-[#F4C10F]/15 blur-2xl" />
              <p className="relative text-xs font-data uppercase tracking-widest text-[#F4C10F]">Field signal</p>
              <h2 className="relative font-heading text-xl font-bold mt-3">The useful surprise</h2>
              <p className="relative text-sm text-slate-300 leading-relaxed mt-3">
                The view compares people, outcomes, and place without exposing product-level evidence.
              </p>
              <div className="relative mt-6 space-y-4 text-sm">
                {leader && (
                  <div className="border-t border-white/10 pt-3 flex items-center justify-between">
                    <div>
                      <p className="text-slate-400">Highest inspector throughput</p>
                      <p className="font-semibold text-[#F4C10F] mt-1">{leader.name}</p>
                    </div>
                    <span className="font-data text-lg font-bold text-white">{leader.inspections}</span>
                  </div>
                )}
                {leadingCity && (
                  <div className="border-t border-white/10 pt-3 flex items-center justify-between">
                    <div>
                      <p className="text-slate-400">Busiest recorded city</p>
                      <p className="font-semibold text-white mt-1">{leadingCity.city}</p>
                    </div>
                    <span className="font-data text-lg font-bold text-white">{leadingCity.inspections}</span>
                  </div>
                )}
                <div className="border-t border-white/10 pt-3 flex items-center justify-between">
                  <p className="text-slate-400">Outcome mix</p>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold"><FiCheckCircle className="h-3.5 w-3.5" /> {summary.compliant_inspections}</span>
                    <span className="inline-flex items-center gap-1 text-rose-400 font-semibold"><FiXCircle className="h-3.5 w-3.5" /> {summary.non_compliant_inspections}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --------------------------- Inspector register --------------------------- */}
        <section id="register" className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <p className="text-xs font-data uppercase tracking-wider text-[#8A6A00]">Directory</p>
            <h2 className="font-heading text-lg font-bold text-slate-900 mt-1">Inspector register</h2>
            <p className="text-xs text-slate-500 mt-1">Only identity-safe workforce and performance fields are shown.</p>
          </div>

          {inspectors.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-3 text-xs font-semibold text-slate-500">Inspector</th>
                    <th className="px-6 py-3 text-xs font-semibold text-slate-500">Status</th>
                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 text-center">Inspections</th>
                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 text-center">Compliant</th>
                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 text-center">Non-compliant</th>
                    <th className="px-6 py-3 text-xs font-semibold text-slate-500">Top city</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {inspectors.map((item) => {
                    const initials = item.name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');
                    return (
                      <tr key={item.id} className="table-row-accent transition-colors duration-200 hover:bg-amber-50/40">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <span className="h-9 w-9 shrink-0 rounded-full bg-[#0B1425] text-[#F4C10F] text-xs font-bold flex items-center justify-center">
                              {initials || '?'}
                            </span>
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                              <p className="text-xs text-slate-500 mt-0.5">{item.role}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-2 text-xs font-semibold ${item.status === 'active' ? 'text-emerald-700' : 'text-slate-500'}`}>
                            <span className={`h-2 w-2 rounded-full ${item.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                            {item.status === 'active' ? 'Active' : 'Signed out'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center font-data text-sm">{item.inspections}</td>
                        <td className="px-6 py-4 text-center font-data text-sm text-emerald-700">{item.compliant}</td>
                        <td className="px-6 py-4 text-center font-data text-sm text-rose-700">{item.non_compliant}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{item.top_city || 'Not captured'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center text-sm text-slate-500">No registered inspectors yet.</div>
          )}
        </section>

        {/* ========================== USER MANAGEMENT ========================== */}
        <section id="users" className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mt-6">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-xs font-data uppercase tracking-wider text-[#8A6A00]">RBAC</p>
              <h2 className="font-heading text-lg font-bold text-slate-900 mt-1 flex items-center gap-2">
                <FiUsers className="text-[#8A6A00]" /> User &amp; Inspector Management
              </h2>
              <p className="text-xs text-slate-500 mt-1">All accounts are admin-provisioned. No public registration.</p>
            </div>
            <button
              id="btn-register-new-user"
              onClick={() => { setShowCreateModal(true); setCreateError(''); }}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0B1425] text-[#F4C10F] rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-105 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F4C10F]"
            >
              <FiUserPlus className="h-4 w-4" /> Register New User
            </button>
          </div>

          {usersLoading ? (
            <div className="p-10 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
              <FiRefreshCw className="animate-spin" /> Loading users…
            </div>
          ) : userList.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-3 text-xs font-semibold text-slate-500">User</th>
                    <th className="px-6 py-3 text-xs font-semibold text-slate-500">Employee ID</th>
                    <th className="px-6 py-3 text-xs font-semibold text-slate-500">Department</th>
                    <th className="px-6 py-3 text-xs font-semibold text-slate-500">Role</th>
                    <th className="px-6 py-3 text-xs font-semibold text-slate-500">Status</th>
                    <th className="px-6 py-3 text-xs font-semibold text-slate-500">Joined</th>
                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {userList.map((u) => {
                    const badge = ROLE_BADGE[u.role] || { bg: '#F1F5F9', fg: '#475569' };
                    const initials = (u.full_name || u.username || '?').split(' ').filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('');
                    return (
                      <tr key={u.id} className="table-row-accent transition-colors duration-200 hover:bg-amber-50/40">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <span className="h-9 w-9 shrink-0 rounded-full bg-[#0B1425] text-[#F4C10F] text-xs font-bold flex items-center justify-center">{initials}</span>
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{u.full_name || u.username}</p>
                              <p className="text-xs text-slate-500">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-data text-slate-600">{u.badge_number || '—'}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{u.department || '—'}</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: badge.bg, color: badge.fg }}>
                            {u.role_display_name || u.role}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${u.must_change_password ? 'text-amber-600' : u.is_active ? 'text-emerald-700' : 'text-slate-400'}`}>
                            <span className={`h-2 w-2 rounded-full ${u.must_change_password ? 'bg-amber-400' : u.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                            {u.must_change_password ? 'Pending first login' : u.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500">{new Date(u.created_at).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-center">
                          <button
                            id={`btn-delete-user-${u.id}`}
                            title="Delete user"
                            onClick={() => setUserToDelete(u)}
                            className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                          >
                            <FiTrash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center text-sm text-slate-500">No users found. Click <strong>Register New User</strong> to create the first account.</div>
          )}
        </section>
      </div>

      {/* ========================== CREATE USER MODAL ========================== */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(11,20,37,0.65)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div>
                <p className="text-xs font-data uppercase tracking-wider text-[#8A6A00]">ADMIN ACTION</p>
                <h3 className="font-heading text-lg font-bold text-slate-900 mt-0.5">Register New User</h3>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"><FiX className="h-5 w-5" /></button>
            </div>

            <form onSubmit={handleCreateUser} className="px-6 py-5 space-y-4">
              {createError && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                  <FiAlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />{createError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Full Name <span className="text-red-500">*</span></label>
                  <input id="create-full-name" required type="text" value={createForm.full_name} onChange={e => setCreateForm(f => ({ ...f, full_name: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#F4C10F] focus:ring-2 focus:ring-[#F4C10F]/20" placeholder="Rahul Sharma" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Official Email <span className="text-red-500">*</span></label>
                  <input id="create-email" required type="email" value={createForm.email} onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#F4C10F] focus:ring-2 focus:ring-[#F4C10F]/20" placeholder="rahul@department.gov.in" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Employee / Inspector ID</label>
                  <input id="create-badge" type="text" value={createForm.badge_number} onChange={e => setCreateForm(f => ({ ...f, badge_number: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#F4C10F] focus:ring-2 focus:ring-[#F4C10F]/20" placeholder="LM-INS-1024" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Phone Number</label>
                  <input id="create-phone" type="tel" value={createForm.phone_number} onChange={e => setCreateForm(f => ({ ...f, phone_number: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#F4C10F] focus:ring-2 focus:ring-[#F4C10F]/20" placeholder="+91 98765 43210" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Department / Office</label>
                  <input id="create-dept" type="text" value={createForm.department} onChange={e => setCreateForm(f => ({ ...f, department: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#F4C10F] focus:ring-2 focus:ring-[#F4C10F]/20" placeholder="Legal Metrology Dept." />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Designation</label>
                  <input id="create-designation" type="text" value={createForm.designation} onChange={e => setCreateForm(f => ({ ...f, designation: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#F4C10F] focus:ring-2 focus:ring-[#F4C10F]/20" placeholder="Senior Inspector" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Role <span className="text-red-500">*</span></label>
                  <select id="create-role" required value={createForm.role} onChange={e => setCreateForm(f => ({ ...f, role: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#F4C10F] focus:ring-2 focus:ring-[#F4C10F]/20 bg-white">
                    {ASSIGNABLE_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Account Status</label>
                  <select id="create-status" value={createForm.status} onChange={e => setCreateForm(f => ({ ...f, status: e.target.value }))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#F4C10F] focus:ring-2 focus:ring-[#F4C10F]/20 bg-white">
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <p className="text-xs text-slate-400 pt-1">A secure temporary password will be auto-generated. The user must change it on first login.</p>

              <div className="flex items-center gap-3 pt-2">
                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
                <button id="btn-create-user-submit" type="submit" disabled={createLoading} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0B1425] text-[#F4C10F] rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100">
                  {createLoading ? <><FiRefreshCw className="animate-spin h-4 w-4" /> Creating…</> : <><FiUserPlus className="h-4 w-4" /> Create User</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================== CREDENTIALS MODAL ========================== */}
      {credentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(11,20,37,0.65)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="bg-gradient-to-br from-[#0B1425] to-[#16233B] rounded-t-2xl px-6 py-6 text-center">
              <div className="mx-auto h-12 w-12 rounded-full bg-[#F4C10F] flex items-center justify-center mb-3">
                <FiCheck className="h-6 w-6 text-[#0B1425]" />
              </div>
              <h3 className="font-heading text-lg font-bold text-white">User Registered Successfully</h3>
              <p className="text-slate-400 text-sm mt-1">Securely share these credentials with the user.</p>
            </div>

            <div className="px-6 py-5 space-y-3">
              {[
                { label: 'Name', value: credentials.name },
                { label: 'Official Email', value: credentials.email },
                { label: 'Employee / Inspector ID', value: credentials.badge_number || 'Not provided' },
                { label: 'Assigned Role', value: credentials.role },
                { label: 'Login ID', value: credentials.login_id },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-xs font-semibold text-slate-500">{row.label}</span>
                  <span className="text-sm font-semibold text-slate-900">{row.value}</span>
                </div>
              ))}

              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-xs font-semibold text-slate-500">Temporary Password</span>
                <span className="text-sm font-data font-bold text-[#0B1425] bg-amber-50 px-3 py-1 rounded-lg border border-amber-200 tracking-wider select-all">{credentials.temporary_password}</span>
              </div>

              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                ⚠ This password is shown only once. The user must change it on first login.
              </p>

              <div className="flex items-center gap-3 pt-2">
                <button
                  id="btn-copy-credentials"
                  onClick={copyCredentials}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  {copied ? <><FiCheck className="text-emerald-500 h-4 w-4" /> Copied!</> : <><FiCopy className="h-4 w-4" /> Copy Credentials</>}
                </button>
                <button
                  id="btn-close-credentials"
                  onClick={() => setCredentials(null)}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0B1425] text-[#F4C10F] rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-105"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================== DELETE CONFIRM MODAL ========================== */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(11,20,37,0.65)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-br from-rose-600 to-rose-700 px-6 py-5 text-center">
              <div className="mx-auto h-12 w-12 rounded-full bg-white/20 flex items-center justify-center mb-3">
                <FiTrash2 className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-heading text-lg font-bold text-white">Delete User Account</h3>
              <p className="text-rose-100 text-sm mt-1">This action is permanent and cannot be undone.</p>
            </div>

            {/* Body */}
            <div className="px-6 py-5">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 mb-4">
                <span className="h-10 w-10 shrink-0 rounded-full bg-[#0B1425] text-[#F4C10F] text-sm font-bold flex items-center justify-center">
                  {(userToDelete.full_name || userToDelete.username || '?').split(' ').filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('')}
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{userToDelete.full_name || userToDelete.username}</p>
                  <p className="text-xs text-slate-500">{userToDelete.email}</p>
                </div>
              </div>

              <p className="text-sm text-slate-600 mb-5">
                Are you sure you want to permanently delete <strong>{userToDelete.full_name || userToDelete.username}</strong>? All associated scan assignments will be unlinked.
              </p>

              <div className="flex items-center gap-3">
                <button
                  id="btn-cancel-delete-user"
                  type="button"
                  onClick={() => setUserToDelete(null)}
                  disabled={deleteLoading}
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  id="btn-confirm-delete-user"
                  type="button"
                  onClick={handleDeleteUser}
                  disabled={deleteLoading}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-semibold transition-all duration-200 hover:bg-rose-700 hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {deleteLoading ? <><FiRefreshCw className="animate-spin h-4 w-4" /> Deleting…</> : <><FiTrash2 className="h-4 w-4" /> Delete User</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;