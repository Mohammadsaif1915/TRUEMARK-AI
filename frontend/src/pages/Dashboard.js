import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend
} from 'recharts';
import {
  FiCheckCircle, FiXCircle, FiAlertTriangle, FiFileText, FiEye,
  FiChevronLeft, FiChevronRight
} from 'react-icons/fi';
import api from '../utils/api';
import { toast } from 'react-toastify';

const EmptyChart = ({ message }) => (
  <div className="flex flex-col items-center justify-center h-[300px] text-center">
    <FiFileText className="h-10 w-10 text-gray-300 mb-3" />
    <p className="text-gray-400 text-sm">{message}</p>
  </div>
);

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [scans, setScans] = useState([]);
  const [leads, setLeads] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    manufacturer: '',
    date_from: '',
    date_to: '',
  });

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

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([fetchStats(), fetchScans(), fetchLeads()]);
      setLoading(false);
    };
    loadAll();
  }, [fetchStats, fetchScans, fetchLeads]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'compliant': return 'bg-green-100 text-green-800';
      case 'non_compliant': case 'non-compliant': return 'bg-red-100 text-red-800';
      case 'partial': case 'partially_compliant': case 'partially-compliant': return 'bg-amber-100 text-amber-800';
      default: return 'bg-gray-100 text-gray-800';
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

  const hasNoScans = !stats || stats.total_scans === 0;

  const statCards = [
    {
      label: 'Total Scans',
      value: stats?.total_scans ?? 0,
      icon: FiFileText,
      color: 'bg-primary-50 text-primary-600',
      iconBg: 'bg-primary-100',
    },
    {
      label: 'Compliant',
      value: stats?.compliant ?? 0,
      icon: FiCheckCircle,
      color: 'bg-green-50 text-green-600',
      iconBg: 'bg-green-100',
    },
    {
      label: 'Non-Compliant',
      value: stats?.non_compliant ?? 0,
      icon: FiXCircle,
      color: 'bg-red-50 text-red-600',
      iconBg: 'bg-red-100',
    },
    {
      label: 'Partially Compliant',
      value: stats?.partially_compliant ?? 0,
      icon: FiAlertTriangle,
      color: 'bg-amber-50 text-amber-600',
      iconBg: 'bg-amber-100',
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-800"></div>
          <p className="text-gray-500 text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (hasNoScans) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Compliance scan overview and analytics</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-16 text-center">
          <FiFileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No scans yet</h2>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Upload your first product label to see compliance analytics and scan trends here.
          </p>
          <Link
            to="/upload"
            className="inline-flex items-center px-5 py-2.5 bg-primary-800 hover:bg-primary-900 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Start a scan
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Compliance scan overview and analytics</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{card.label}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{card.value}</p>
                </div>
                <div className={`${card.iconBg} rounded-xl p-3`}>
                  <Icon className={`h-6 w-6 ${card.color.split(' ')[1]}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Scans Over Time</h3>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="count" stroke="#1e40af" strokeWidth={2} name="Scans" dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message="No scan data available yet" />
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Violations</h3>
          {violationsData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={violationsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="rule" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#1e40af" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message="No violations recorded yet" />
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <h3 className="text-lg font-semibold text-gray-900">Recent Scans</h3>
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
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
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 w-36"
              />
              <input
                type="date"
                value={filters.date_from}
                onChange={(e) => handleFilterChange('date_from', e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              <input
                type="date"
                value={filters.date_to}
                onChange={(e) => handleFilterChange('date_to', e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
        </div>

        {scans.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Product</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Manufacturer</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {scans.map((scan) => (
                  <tr key={scan.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(scan.created_at || scan.timestamp).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {scan.product_name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {scan.manufacturer || 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(scan.overall_status || scan.status)}`}>
                        {(scan.overall_status || scan.status || 'unknown').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        to={`/scan/${scan.id}`}
                        className="inline-flex items-center space-x-1 text-sm text-primary-800 hover:text-primary-600 font-medium"
                      >
                        <FiEye className="h-4 w-4" />
                        <span>View</span>
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
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="flex items-center space-x-1 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <FiChevronLeft className="h-4 w-4" />
              <span>Previous</span>
            </button>
            <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="flex items-center space-x-1 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <span>Next</span>
              <FiChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Crowdsourced Leads Section */}
      <div className="mt-8 bg-white rounded-2xl shadow-sm border border-amber-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200 bg-amber-50/50">
          <div className="flex items-center space-x-2">
            <FiAlertTriangle className="h-5 w-5 text-amber-600" />
            <h3 className="text-lg font-semibold text-gray-900">Risk Queue: Crowdsourced Leads</h3>
          </div>
          <p className="text-sm text-gray-600 mt-1">High-risk, non-compliant products reported by citizens in the field.</p>
        </div>
        
        {leads && leads.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500 font-semibold">
                  <th className="px-6 py-4">Report Date</th>
                  <th className="px-6 py-4">Product details</th>
                  <th className="px-6 py-4">Location</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                      {new Date(lead.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{lead.product_name || 'Unknown'}</div>
                      <div className="text-gray-500 text-xs mt-0.5">{lead.manufacturer || 'Unknown'}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {lead.latitude && lead.longitude 
                        ? `${lead.latitude.toFixed(4)}, ${lead.longitude.toFixed(4)}` 
                        : (lead.state || 'Unknown')}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${getStatusBadge(lead.overall_status)}`}>
                        {lead.overall_status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        to={`/scan/${lead.id}`}
                        className="inline-flex items-center space-x-1 text-sm text-primary-800 hover:text-primary-600 font-medium"
                      >
                        <FiEye className="h-4 w-4" />
                        <span>Inspect</span>
                      </Link>
                    </td>
                  </tr>
                ))}
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
