import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts';
import { FiActivity, FiAlertTriangle, FiClock, FiMapPin, FiShield, FiUsers } from 'react-icons/fi';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || `http://${window.location.hostname}:5000`;

const COLORS = { active: '#059669', signedOut: '#94a3b8', compliant: '#059669', nonCompliant: '#e11d48', accent: '#F4C10F' };

const Metric = ({ label, value, detail, icon: Icon, tone }) => (
  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
    <div className="flex items-center justify-between">
      <div className={`p-2.5 rounded-lg ${tone}`}><Icon className="h-5 w-5" /></div>
      <span className="font-data text-3xl font-bold text-slate-900">{value}</span>
    </div>
    <p className="text-sm font-semibold text-slate-700 mt-4">{label}</p>
    <p className="text-xs text-slate-500 mt-1">{detail}</p>
  </div>
);

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return <div className="bg-slate-900 text-white rounded-lg px-3 py-2 shadow-xl text-xs"><p className="text-slate-400 mb-1">{label}</p>{payload.map((item) => <p key={item.dataKey} className="font-semibold">{item.name || item.dataKey}: {item.value}</p>)}</div>;
};

const AdminPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [reports, setReports] = useState([]);
  const [assigning, setAssigning] = useState(null);

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

  useEffect(() => {
    if (user && !['administrator', 'admin'].includes(user.role)) {
      navigate('/dashboard', { replace: true });
      return undefined;
    }
    fetchOverview();
    const timer = window.setInterval(fetchOverview, 15000);
    return () => window.clearInterval(timer);
  }, [fetchOverview, navigate, user]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="text-center"><div className="h-10 w-10 rounded-full border-2 border-slate-200 border-t-[#F4C10F] animate-spin mx-auto" /><p className="text-sm text-slate-500 mt-3">Loading operations overview...</p></div></div>;
  if (error || !data) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="text-center"><FiAlertTriangle className="h-10 w-10 text-amber-500 mx-auto" /><p className="font-semibold text-slate-900 mt-3">Admin data unavailable</p><button type="button" onClick={fetchOverview} className="mt-4 px-4 py-2 bg-slate-900 text-[#F4C10F] rounded-lg text-sm font-semibold">Retry</button></div></div>;

  const { summary, inspectors, cities } = data;
  const inspectorChart = inspectors.map((item) => ({ ...item, shortName: item.name.length > 14 ? `${item.name.slice(0, 14)}...` : item.name }));
  const activityChart = [{ name: 'Active', value: summary.active_inspectors, fill: COLORS.active }, { name: 'Signed out', value: summary.signed_out_inspectors, fill: COLORS.signedOut }];
  const leader = [...inspectors].sort((a, b) => b.inspections - a.inspections)[0];
  const leadingCity = cities[0];

  return (
    <div className="min-h-screen bg-[#F4F6F8] px-4 py-8 sm:px-6 lg:px-8">
      <style>{`@keyframes admin-rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } } .admin-rise { animation: admin-rise .45s ease-out both; } @media (prefers-reduced-motion: reduce) { .admin-rise { animation: none; } }`}</style>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <p className="text-xs font-data uppercase tracking-wider text-[#8A6A00]">Inspector coverage</p>
          <div className="flex flex-wrap gap-2 mt-3">{inspectors.map((inspector) => <span key={inspector.id} className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-700"><strong>{inspector.name}</strong> · {inspector.working_city || 'Working city not set'}</span>)}</div>
        </div>
        <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mb-6">
          <div className="p-6 border-b border-slate-100"><h2 className="font-heading text-lg font-bold text-slate-900">Citizen reports</h2><p className="text-xs text-slate-500 mt-1">Review submitted reports and assign them to an inspector working nearby.</p></div>
          {reports.length ? <div className="divide-y divide-slate-100">{reports.map((report) => { const imageUrl = report.image_url || (report.image_path ? `${API_BASE_URL}/uploads/${report.image_path.split(/[\\/]/).pop()}` : null); return <div key={report.id} className="p-6 grid grid-cols-1 lg:grid-cols-[auto_1fr_auto] gap-5 items-start"><img src={imageUrl || '/logo.png'} alt="Citizen report evidence" className="h-20 w-20 rounded-lg object-cover border border-slate-200" /><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-slate-900">{report.product_name || 'Product not named'}</h3><span className="text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-700">{report.report_status || 'submitted'}</span></div><p className="text-sm text-slate-600 mt-1">{report.shop_name || 'Shop not provided'} · {report.city || report.state || 'Location not captured'}</p><p className="text-sm text-slate-500 mt-2">{report.purchase_address || 'Address not provided'}</p>{report.report_description && <p className="text-sm text-slate-700 mt-2">{report.report_description}</p>}</div><label className="min-w-52 text-xs font-semibold text-slate-500">Assign to inspector<select disabled={assigning === report.id} defaultValue={report.assigned_inspector_id || ''} onChange={(event) => assignReport(report.id, event.target.value)} className="mt-1 w-full rounded-lg border-slate-300 text-sm"><option value="">Select inspector</option>{inspectors.map((inspector) => <option key={inspector.id} value={inspector.id}>{inspector.name} · {inspector.working_city || 'City not set'}</option>)}</select></label></div>; })}</div> : <div className="p-12 text-center text-sm text-slate-500">No citizen reports submitted yet.</div>}
        </section>
        <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8 admin-rise">
          <div><p className="text-xs font-data uppercase tracking-widest text-[#8A6A00]">Administrator console</p><h1 className="font-heading text-3xl font-bold text-slate-950 mt-2">Inspection command view</h1><p className="text-slate-500 mt-2">A privacy-safe operational picture of the inspector network.</p></div>
          <div className="flex items-center gap-2 text-xs text-slate-500"><span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Live refresh every 15 seconds {lastUpdated && `· ${lastUpdated.toLocaleTimeString()}`}</div>
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 admin-rise" aria-label="Inspector and inspection summary">
          <Metric label="Registered inspectors" value={summary.registered_inspectors} detail="Users registered in inspector roles" icon={FiUsers} tone="bg-indigo-50 text-indigo-700" />
          <Metric label="Active now" value={summary.active_inspectors} detail="Most recent session is signed in" icon={FiActivity} tone="bg-emerald-50 text-emerald-700" />
          <Metric label="Signed out" value={summary.signed_out_inspectors} detail="No active session recorded" icon={FiClock} tone="bg-slate-100 text-slate-600" />
          <Metric label="Total inspections" value={summary.total_inspections} detail={`${summary.compliant_inspections} compliant · ${summary.non_compliant_inspections} non-compliant`} icon={FiShield} tone="bg-amber-50 text-amber-700" />
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-sm admin-rise" style={{ animationDelay: '80ms' }}><div className="flex items-center justify-between mb-5"><div><h2 className="font-heading text-lg font-bold text-slate-900">Inspector throughput</h2><p className="text-xs text-slate-500 mt-1">Named operational totals only</p></div><FiActivity className="text-[#8A6A00]" /></div>{inspectorChart.length ? <ResponsiveContainer width="100%" height={280}><BarChart data={inspectorChart} margin={{ top: 8, right: 10, left: -20, bottom: 20 }}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="shortName" angle={-20} textAnchor="end" height={55} tick={{ fontSize: 11, fill: '#64748b' }} /><YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} /><Tooltip content={<ChartTooltip />} /><Bar dataKey="inspections" name="Inspections" radius={[5, 5, 0, 0]}>{inspectorChart.map((item) => <Cell key={item.id} fill={item.status === 'active' ? COLORS.accent : '#cbd5e1'} />)}</Bar></BarChart></ResponsiveContainer> : <p className="text-sm text-slate-500 py-20 text-center">No inspectors registered yet.</p>}</div>
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm admin-rise" style={{ animationDelay: '140ms' }}><div className="flex items-center justify-between mb-5"><div><h2 className="font-heading text-lg font-bold text-slate-900">Workforce pulse</h2><p className="text-xs text-slate-500 mt-1">Current recorded session state</p></div><FiUsers className="text-[#8A6A00]" /></div><ResponsiveContainer width="100%" height={190}><BarChart data={activityChart} layout="vertical" margin={{ top: 8, right: 10, left: 8, bottom: 8 }}><XAxis type="number" allowDecimals={false} hide /><YAxis type="category" dataKey="name" width={65} tick={{ fontSize: 12, fill: '#475569' }} /><Tooltip content={<ChartTooltip />} /><Bar dataKey="value" radius={[0, 5, 5, 0]} /></BarChart></ResponsiveContainer><div className="border-t border-slate-100 pt-4 text-xs text-slate-500">Activity is based on the last recorded login/logout event.</div></div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-sm"><div className="flex items-center justify-between mb-5"><div><h2 className="font-heading text-lg font-bold text-slate-900">City activity</h2><p className="text-xs text-slate-500 mt-1">Where recorded inspections happen most</p></div><FiMapPin className="text-[#8A6A00]" /></div>{cities.length ? <ResponsiveContainer width="100%" height={260}><BarChart data={cities.slice(0, 8)} margin={{ top: 8, right: 10, left: -20, bottom: 22 }}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="city" angle={-25} textAnchor="end" height={60} tick={{ fontSize: 11, fill: '#64748b' }} /><YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} /><Tooltip content={<ChartTooltip />} /><Bar dataKey="inspections" name="Inspections" fill="#0f172a" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer> : <p className="text-sm text-slate-500 py-20 text-center">No city data has been captured yet.</p>}</div>
          <div className="bg-slate-900 rounded-xl p-6 text-white shadow-sm"><p className="text-xs font-data uppercase tracking-widest text-[#F4C10F]">Field signal</p><h2 className="font-heading text-xl font-bold mt-3">The useful surprise</h2><p className="text-sm text-slate-300 leading-relaxed mt-3">The view compares people, outcomes, and place without exposing product-level evidence.</p><div className="mt-6 space-y-4 text-sm">{leader && <div className="border-t border-white/10 pt-3"><p className="text-slate-400">Highest inspector throughput</p><p className="font-semibold text-[#F4C10F] mt-1">{leader.name} · {leader.inspections} inspections</p></div>}{leadingCity && <div className="border-t border-white/10 pt-3"><p className="text-slate-400">Busiest recorded city</p><p className="font-semibold text-white mt-1">{leadingCity.city} · {leadingCity.inspections} inspections</p></div>}<div className="border-t border-white/10 pt-3"><p className="text-slate-400">Outcome mix</p><p className="font-semibold text-white mt-1">{summary.compliant_inspections} compliant / {summary.non_compliant_inspections} non-compliant</p></div></div></div>
        </section>

        <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden"><div className="p-6 border-b border-slate-100"><h2 className="font-heading text-lg font-bold text-slate-900">Inspector register</h2><p className="text-xs text-slate-500 mt-1">Only identity-safe workforce and performance fields are shown.</p></div>{inspectors.length ? <div className="overflow-x-auto"><table className="w-full text-left"><thead className="bg-slate-50 border-b border-slate-200"><tr><th className="px-6 py-3 text-xs font-semibold text-slate-500">Inspector</th><th className="px-6 py-3 text-xs font-semibold text-slate-500">Status</th><th className="px-6 py-3 text-xs font-semibold text-slate-500 text-center">Inspections</th><th className="px-6 py-3 text-xs font-semibold text-slate-500 text-center">Compliant</th><th className="px-6 py-3 text-xs font-semibold text-slate-500 text-center">Non-compliant</th><th className="px-6 py-3 text-xs font-semibold text-slate-500">Top city</th></tr></thead><tbody className="divide-y divide-slate-100">{inspectors.map((item) => <tr key={item.id} className="hover:bg-amber-50/40"><td className="px-6 py-4"><p className="text-sm font-semibold text-slate-900">{item.name}</p><p className="text-xs text-slate-500 mt-0.5">{item.role}</p></td><td className="px-6 py-4"><span className={`inline-flex items-center gap-2 text-xs font-semibold ${item.status === 'active' ? 'text-emerald-700' : 'text-slate-500'}`}><span className={`h-2 w-2 rounded-full ${item.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />{item.status === 'active' ? 'Active' : 'Signed out'}</span></td><td className="px-6 py-4 text-center font-data text-sm">{item.inspections}</td><td className="px-6 py-4 text-center font-data text-sm text-emerald-700">{item.compliant}</td><td className="px-6 py-4 text-center font-data text-sm text-rose-700">{item.non_compliant}</td><td className="px-6 py-4 text-sm text-slate-600">{item.top_city || 'Not captured'}</td></tr>)}</tbody></table></div> : <div className="p-12 text-center text-sm text-slate-500">No registered inspectors yet.</div>}</section>
      </div>
    </div>
  );
};

export default AdminPage;
