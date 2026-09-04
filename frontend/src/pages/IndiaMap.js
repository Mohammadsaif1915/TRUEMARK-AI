import React, { useState, useEffect, useRef } from 'react';
import { FiAlertTriangle, FiShield, FiSearch, FiMapPin, FiInfo } from 'react-icons/fi';
import api from '../utils/api';
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import indiaGeo from '../data/india.topo.json';

/*
  Brand chrome stays black-and-yellow (matches Dashboard.jsx / landing
  page), but the choropleth itself is allowed to be genuinely colorful
  since color IS the data here \u2014 green \u2192 yellow \u2192 orange \u2192 red maps
  directly to violation rate. Dropping the map onto a near-black panel
  makes that gradient read much more vividly than on light gray.

  DEMO MODE: this file is currently wired to DEMO_* fixtures below instead
  of the live `/dashboard/map` and `/dashboard/alerts` endpoints, so the
  screen has something realistic to show before real inspection data
  exists. Flip USE_DEMO_DATA to false (or delete the demo branch in
  fetchData) once the backend is returning real numbers.
*/

const USE_DEMO_DATA = true;

/* ------------------------------------------------------------------ */
/*  Demo fixtures \u2014 realistic-looking, clearly fake                    */
/* ------------------------------------------------------------------ */
const DEMO_STATES = [
  { state: 'Maharashtra', total: 812, non_compliant: 146, violation_rate: 18 },
  { state: 'Uttar Pradesh', total: 764, non_compliant: 298, violation_rate: 39 },
  { state: 'Delhi', total: 693, non_compliant: 402, violation_rate: 58 },
  { state: 'Karnataka', total: 588, non_compliant: 61, violation_rate: 10 },
  { state: 'Tamil Nadu', total: 551, non_compliant: 88, violation_rate: 16 },
  { state: 'West Bengal', total: 497, non_compliant: 179, violation_rate: 36 },
  { state: 'Gujarat', total: 470, non_compliant: 52, violation_rate: 11 },
  { state: 'Rajasthan', total: 402, non_compliant: 121, violation_rate: 30 },
  { state: 'Telangana', total: 388, non_compliant: 34, violation_rate: 9 },
  { state: 'Punjab', total: 344, non_compliant: 187, violation_rate: 54 },
  { state: 'Kerala', total: 331, non_compliant: 22, violation_rate: 7 },
  { state: 'Madhya Pradesh', total: 318, non_compliant: 96, violation_rate: 30 },
  { state: 'Andhra Pradesh', total: 296, non_compliant: 41, violation_rate: 14 },
  { state: 'Haryana', total: 281, non_compliant: 158, violation_rate: 56 },
  { state: 'Bihar', total: 249, non_compliant: 112, violation_rate: 45 },
  { state: 'Odisha', total: 210, non_compliant: 19, violation_rate: 9 },
  { state: 'Assam', total: 176, non_compliant: 63, violation_rate: 36 },
  { state: 'Jharkhand', total: 154, non_compliant: 48, violation_rate: 31 },
  { state: 'Chhattisgarh', total: 139, non_compliant: 15, violation_rate: 11 },
  { state: 'Uttarakhand', total: 118, non_compliant: 9, violation_rate: 8 },
  { state: 'Himachal Pradesh', total: 91, non_compliant: 6, violation_rate: 7 },
  { state: 'Goa', total: 64, non_compliant: 3, violation_rate: 5 },
  { state: 'Jammu and Kashmir', total: 87, non_compliant: 40, violation_rate: 46 },
];

const DEMO_CITIES = [
  { city: 'Mumbai', state: 'Maharashtra', total: 312, compliant: 258, non_compliant: 54, violation_rate: 17 },
  { city: 'Pune', state: 'Maharashtra', total: 198, compliant: 172, non_compliant: 26, violation_rate: 13 },
  { city: 'Nagpur', state: 'Maharashtra', total: 121, compliant: 98, non_compliant: 23, violation_rate: 19 },
  { city: 'Lucknow', state: 'Uttar Pradesh', total: 214, compliant: 141, non_compliant: 73, violation_rate: 34 },
  { city: 'Kanpur', state: 'Uttar Pradesh', total: 176, compliant: 96, non_compliant: 80, violation_rate: 45 },
  { city: 'New Delhi', state: 'Delhi', total: 401, compliant: 176, non_compliant: 225, violation_rate: 56 },
  { city: 'Bengaluru', state: 'Karnataka', total: 349, compliant: 316, non_compliant: 33, violation_rate: 9 },
  { city: 'Mysuru', state: 'Karnataka', total: 112, compliant: 100, non_compliant: 12, violation_rate: 11 },
  { city: 'Chennai', state: 'Tamil Nadu', total: 287, compliant: 246, non_compliant: 41, violation_rate: 14 },
  { city: 'Coimbatore', state: 'Tamil Nadu', total: 134, compliant: 116, non_compliant: 18, violation_rate: 13 },
  { city: 'Kolkata', state: 'West Bengal', total: 318, compliant: 209, non_compliant: 109, violation_rate: 34 },
  { city: 'Ahmedabad', state: 'Gujarat', total: 261, compliant: 235, non_compliant: 26, violation_rate: 10 },
  { city: 'Surat', state: 'Gujarat', total: 143, compliant: 128, non_compliant: 15, violation_rate: 10 },
  { city: 'Jaipur', state: 'Rajasthan', total: 229, compliant: 165, non_compliant: 64, violation_rate: 28 },
  { city: 'Chandigarh', state: 'Punjab', total: 176, compliant: 84, non_compliant: 92, violation_rate: 52 },
  { city: 'Kochi', state: 'Kerala', total: 158, compliant: 148, non_compliant: 10, violation_rate: 6 },
  { city: 'Gurugram', state: 'Haryana', total: 165, compliant: 74, non_compliant: 91, violation_rate: 55 },
  { city: 'Patna', state: 'Bihar', total: 141, compliant: 79, non_compliant: 62, violation_rate: 44 },
];

const DEMO_ALERTS = [
  { gtin: '8901030812345', product_name: 'GoldDrop Refined Sunflower Oil 1L', manufacturer: 'Suryodaya Agro Ltd.', total_scans: 47, fail_count: 33, risk_score: 70, last_seen: '2026-08-29T10:12:00Z' },
  { gtin: '8901063400981', product_name: 'FreshBite Paneer 200g', manufacturer: 'Meadow Dairy Co-op', total_scans: 39, fail_count: 25, risk_score: 64, last_seen: '2026-08-31T06:40:00Z' },
  { gtin: '8901719022456', product_name: 'SafeGlow LPG Regulator', manufacturer: 'Vishal Gas Appliances', total_scans: 28, fail_count: 17, risk_score: 61, last_seen: '2026-08-22T14:05:00Z' },
  { gtin: '8901058873321', product_name: 'NutriKid Infant Formula Stage 1', manufacturer: 'Himalaya Nutrivita Pvt. Ltd.', total_scans: 33, fail_count: 18, risk_score: 55, last_seen: '2026-09-01T09:18:00Z' },
  { gtin: '8901240099887', product_name: 'PureShine Dish Wash Bar', manufacturer: 'Ganga Home Care', total_scans: 24, fail_count: 12, risk_score: 50, last_seen: '2026-08-27T17:52:00Z' },
  { gtin: '8901512376654', product_name: 'RoyalCrisp Namkeen Mixture 400g', manufacturer: 'Anand Snacks Industries', total_scans: 21, fail_count: 9, risk_score: 43, last_seen: '2026-08-19T11:30:00Z' },
  { gtin: '8901887765432', product_name: 'ThermoSafe Electric Kettle 1.5L', manufacturer: 'Bright Spark Electricals', total_scans: 19, fail_count: 6, risk_score: 32, last_seen: '2026-08-15T08:47:00Z' },
];

const DemoBanner = () => (
  <div
    className="flex items-center gap-2 px-3.5 py-2 rounded-sm border text-xs font-semibold"
    style={{ background: '#FFFBEA', borderColor: '#F4C10F55', color: '#8A6A00' }}
    role="status"
  >
    <FiInfo className="h-3.5 w-3.5 shrink-0" />
    <span>Showing demo data for preview \u2014 not live inspection results.</span>
  </div>
);

const normalizeName = (name) => {
  if (!name) return "";
  const n = name.toLowerCase().replace(/&/g, 'and').replace(/[^a-z]/g, '');
  if (n.includes('delhi')) return 'delhi';
  if (n.includes('arunanchal') || n.includes('arunachal')) return 'arunachalpradesh';
  if (n.includes('kashmir')) return 'jammuandkashmir';
  if (n.includes('odisha') || n.includes('orissa')) return 'odisha';
  return n;
};

const getRiskColor = (rate) => {
  if (rate >= 50) return { fill: '#ef4444', hover: '#dc2626', from: '#f87171', to: '#b91c1c', text: 'text-red-600', ring: 'ring-red-300', label: 'Critical', glow: 'rgba(239,68,68,0.45)' };
  if (rate >= 25) return { fill: '#fb923c', hover: '#ea580c', from: '#fdba74', to: '#c2410c', text: 'text-orange-600', ring: 'ring-orange-300', label: 'High', glow: 'rgba(251,146,60,0.4)' };
  if (rate >= 10) return { fill: '#facc15', hover: '#eab308', from: '#fde047', to: '#a16207', text: 'text-yellow-700', ring: 'ring-yellow-300', label: 'Moderate', glow: 'rgba(250,204,21,0.4)' };
  return { fill: '#34d399', hover: '#059669', from: '#6ee7b7', to: '#047857', text: 'text-emerald-600', ring: 'ring-emerald-300', label: 'Low', glow: 'rgba(52,211,153,0.4)' };
};

/* ------------------------------------------------------------------ */
/*  Count-up for the top stat row                                      */
/* ------------------------------------------------------------------ */
const CountUp = ({ value }) => {
  const ref = useRef(null);
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const target = Number(value) || 0;
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

const MapTooltip = ({ info, pos }) => {
  if (!info || !pos) return null;
  const risk = info.data ? getRiskColor(info.data.violation_rate) : null;

  return (
    <div
      key={info.name}
      className="tooltip-pop fixed bg-[#0A0A0A] rounded-sm shadow-2xl border border-white/10 p-4 w-64 z-50 pointer-events-none"
      style={{ left: pos.x, top: pos.y, transform: 'translate(-50%, calc(-100% - 14px))' }}
    >
      <div className="flex items-center space-x-2 border-b border-white/10 pb-3 mb-3">
        <FiMapPin className="h-4 w-4 text-[#F4C10F]" />
        <h3 className="font-heading font-bold text-white">{info.name}</h3>
      </div>

      {info.data ? (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-white/50">Total Scans</span>
            <span className="text-sm font-bold text-white font-data">{info.data.total}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-white/50">Non-Compliant</span>
            <span className="text-sm font-bold text-rose-400 font-data">{info.data.non_compliant}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-white/50">Risk Level</span>
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-sm text-white"
              style={{ background: `linear-gradient(90deg, ${risk.from}, ${risk.to})` }}
            >
              {info.data.violation_rate}% {risk.label}
            </span>
          </div>
        </div>
      ) : (
        <div className="text-center py-2 text-white/40 text-sm font-heading italic">
          No scan data available
        </div>
      )}
    </div>
  );
};

const AlertRow = ({ alert, index }) => {
  const risk = getRiskColor(alert.risk_score);
  const isCritical = alert.risk_score >= 50;
  return (
    <tr className="row-hover" style={{ borderLeft: `3px solid ${risk.fill}` }}>
      <td className="px-4 py-4">
        <div className="flex items-center space-x-3">
          <div
            className="relative flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
            style={{ background: `linear-gradient(135deg, ${risk.from}, ${risk.to})` }}
          >
            {isCritical && <span className="rank-pulse" style={{ boxShadow: `0 0 0 0 ${risk.glow}` }} />}
            #{index + 1}
          </div>
          <div>
            <p className="text-sm font-bold text-[#0A0A0A]">{alert.product_name}</p>
            <p className="text-xs text-gray-500 font-data mt-0.5">{alert.gtin}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">{alert.manufacturer}</td>
      <td className="px-4 py-3 text-center">
        <span className="text-sm font-bold text-gray-900 font-data">{alert.total_scans}</span>
      </td>
      <td className="px-4 py-3 text-center">
        <span className="text-sm font-bold text-rose-600 font-data">{alert.fail_count}</span>
      </td>
      <td className="px-4 py-3 text-center">
        <span
          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold text-white"
          style={{ background: `linear-gradient(90deg, ${risk.from}, ${risk.to})` }}
        >
          {alert.risk_score}%
        </span>
      </td>
      <td className="px-4 py-3 text-xs text-gray-500 font-data">
        {alert.last_seen ? new Date(alert.last_seen).toLocaleDateString('en-IN') : '\u2014'}
      </td>
    </tr>
  );
};

const RiskGradientLegend = () => (
  <div className="max-w-xl mx-auto mt-6">
    <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'linear-gradient(90deg, #34d399 0%, #facc15 33%, #fb923c 66%, #ef4444 100%)' }} />
    <div className="flex justify-between text-[11px] text-gray-500 mt-1.5 font-medium">
      <span>0%</span>
      <span>10%</span>
      <span>25%</span>
      <span>50%+</span>
    </div>
    <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-4 text-sm text-gray-700 font-medium">
      <div className="flex items-center space-x-2">
        <span className="w-3 h-3 rounded-sm bg-[#e2e8f0] border border-gray-300" />
        <span>No data</span>
      </div>
      {[
        { color: '#34d399', label: 'Low (<10%)' },
        { color: '#facc15', label: 'Moderate (10\u201325%)' },
        { color: '#fb923c', label: 'High (25\u201350%)' },
        { color: '#ef4444', label: 'Critical (50%+)' },
      ].map((item) => (
        <div key={item.label} className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }} />
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  </div>
);

const IndiaMap = () => {
  const [mapData, setMapData] = useState([]);
  const [cityData, setCityData] = useState([]);
  const [selectedState, setSelectedState] = useState('');
  const [mineOnly, setMineOnly] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [tooltipContent, setTooltipContent] = useState(null);
  const [tooltipPos, setTooltipPos] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);

      if (USE_DEMO_DATA) {
        // Simulate network latency so the loading state still reads naturally.
        await new Promise((resolve) => setTimeout(resolve, 450));
        if (cancelled) return;
        // "My inspections" is a smaller, scaled-down slice of the same demo set.
        const scale = mineOnly ? 0.35 : 1;
        setMapData(DEMO_STATES.map((s) => ({
          ...s,
          total: Math.max(1, Math.round(s.total * scale)),
          non_compliant: Math.max(0, Math.round(s.non_compliant * scale)),
        })));
        setCityData(DEMO_CITIES.map((c) => ({
          ...c,
          total: Math.max(1, Math.round(c.total * scale)),
          compliant: Math.max(0, Math.round(c.compliant * scale)),
          non_compliant: Math.max(0, Math.round(c.non_compliant * scale)),
        })));
        setAlerts(mineOnly ? DEMO_ALERTS.slice(0, 3) : DEMO_ALERTS);
        setError(false);
        setLoading(false);
        return;
      }

      try {
        const [mapRes, alertRes] = await Promise.all([
          api.get(`/dashboard/map?mine=${mineOnly}`),
          api.get('/dashboard/alerts'),
        ]);
        const states = mapRes.data.states || [];
        setCityData(mapRes.data.cities || []);
        const fetchedAlerts = alertRes.data.alerts || [];
        setMapData(states);
        setAlerts(fetchedAlerts);
        setError(false);
      } catch (err) {
        setMapData([]);
        setCityData([]);
        setAlerts([]);
        setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, [mineOnly]);

  const stateDataMap = {};
  mapData.forEach((s) => {
    stateDataMap[normalizeName(s.state)] = s;
  });

  const totalScans = mapData.reduce((sum, s) => sum + s.total, 0);
  const totalNonCompliant = mapData.reduce((sum, s) => sum + s.non_compliant, 0);
  const statesCovered = mapData.length;
  const visibleCities = cityData.filter((item) => !selectedState || normalizeName(item.state) === normalizeName(selectedState));

  const pageStyles = `
    @keyframes card-rise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .card-rise { animation: card-rise .5s cubic-bezier(.2,.7,.2,1) both; }

    @keyframes tooltip-pop { from { opacity: 0; transform: translate(-50%, calc(-100% - 4px)) scale(.96); } to { opacity: 1; transform: translate(-50%, calc(-100% - 14px)) scale(1); } }
    .tooltip-pop { animation: tooltip-pop .16s ease-out both; }

    @keyframes rank-pulse { 0% { box-shadow: 0 0 0 0 var(--pulse-color, rgba(239,68,68,0.5)); } 100% { box-shadow: 0 0 0 10px rgba(239,68,68,0); } }
    .rank-pulse { position: absolute; inset: 0; border-radius: 9999px; animation: rank-pulse 1.8s ease-out infinite; }

    @media (prefers-reduced-motion: reduce) {
      .card-rise { animation: none; }
      .tooltip-pop { animation: none; }
      .rank-pulse { animation: none; display: none; }
    }

    .stat-card { transition: transform .2s ease, box-shadow .2s ease; }
    .stat-card:hover { transform: translateY(-3px); box-shadow: 0 12px 26px -14px rgba(10,10,10,0.25); }

    .row-hover { transition: background-color .15s ease; }
    .row-hover:hover { background-color: #FBF6E4; }

    .map-panel { background: radial-gradient(ellipse at center, #16181c 0%, #0A0A0A 78%); }
  `;

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <div className="h-10 w-10 rounded-full border-2 border-[#0A0A0A]/10 border-t-[#F4C10F] animate-spin mx-auto mb-4" />
        <p className="text-gray-500 font-heading italic">Mapping the risk picture&hellip;</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <FiAlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-4" />
        <h1 className="font-heading text-xl font-bold text-[#0A0A0A]">Map data unavailable</h1>
        <p className="text-gray-500 mt-2">Recorded dashboard inspections could not be loaded.</p>
        <button type="button" onClick={() => window.location.reload()} className="mt-5 px-4 py-2 bg-[#0A0A0A] text-[#F4C10F] rounded-sm text-sm font-semibold">Retry</button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <style>{pageStyles}</style>

      {USE_DEMO_DATA && <DemoBanner />}

      <div>
        <h1 className="font-heading text-3xl font-bold text-[#0A0A0A]">National Scan Intelligence</h1>
        <p className="text-gray-600 mt-1 font-heading italic">Geographic choropleth distribution of product scans and repeat-offender alerts.</p>
        <div className="flex gap-2 mt-4" role="group" aria-label="Inspection scope">
          <button type="button" onClick={() => { setMineOnly(false); setSelectedState(''); }} className={`px-3 py-2 text-sm font-semibold rounded-sm border ${!mineOnly ? 'bg-[#0A0A0A] text-[#F4C10F] border-[#0A0A0A]' : 'bg-white text-gray-600 border-gray-300'}`}>All inspections</button>
          <button type="button" onClick={() => { setMineOnly(true); setSelectedState(''); }} className={`px-3 py-2 text-sm font-semibold rounded-sm border ${mineOnly ? 'bg-[#0A0A0A] text-[#F4C10F] border-[#0A0A0A]' : 'bg-white text-gray-600 border-gray-300'}`}>My inspections</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat-card card-rise bg-white rounded-sm border border-gray-200 p-5 flex items-center space-x-4 shadow-sm" style={{ animationDelay: '0ms' }}>
          <div className="rounded-sm p-3" style={{ background: 'linear-gradient(135deg, #60a5fa, #1d4ed8)' }}>
            <FiSearch className="h-6 w-6 text-white" />
          </div>
          <div><p className="font-heading text-2xl font-bold text-[#0A0A0A]"><CountUp value={totalScans} /></p><p className="text-sm text-gray-500">Total Scans</p></div>
        </div>
        <div className="stat-card card-rise bg-white rounded-sm border border-gray-200 p-5 flex items-center space-x-4 shadow-sm" style={{ animationDelay: '70ms' }}>
          <div className="rounded-sm p-3" style={{ background: 'linear-gradient(135deg, #f87171, #b91c1c)' }}>
            <FiAlertTriangle className="h-6 w-6 text-white" />
          </div>
          <div><p className="font-heading text-2xl font-bold text-[#0A0A0A]"><CountUp value={totalNonCompliant} /></p><p className="text-sm text-gray-500">Non-Compliant</p></div>
        </div>
        <div className="stat-card card-rise bg-white rounded-sm border border-gray-200 p-5 flex items-center space-x-4 shadow-sm" style={{ animationDelay: '140ms' }}>
          <div className="rounded-sm p-3" style={{ background: 'linear-gradient(135deg, #34d399, #047857)' }}>
            <FiMapPin className="h-6 w-6 text-white" />
          </div>
          <div><p className="font-heading text-2xl font-bold text-[#0A0A0A]"><CountUp value={statesCovered} /></p><p className="text-sm text-gray-500">States Covered</p></div>
        </div>
      </div>

      <div className="bg-white rounded-sm border border-gray-200 p-6 relative shadow-sm">
        <h2 className="font-heading text-lg font-bold text-[#0A0A0A] mb-4 flex items-center space-x-2">
          <span className="h-2 w-2 bg-[#F4C10F]" />
          <span>Scan Density by State</span>
        </h2>

        <MapTooltip info={tooltipContent} pos={tooltipPos} />

        <div className="map-panel flex justify-center rounded-sm border border-white/5 p-4 relative" style={{ overflow: "hidden" }}>
          <ComposableMap
            projection="geoMercator"
            projectionConfig={{
              scale: 1000,
              center: [82.8, 22.5]
            }}
            width={800}
            height={600}
            style={{ width: "100%", height: "auto", maxHeight: "600px" }}
          >
            <Geographies geography={indiaGeo}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  const stateName = geo.properties.name || "Unknown";
                  const data = stateDataMap[normalizeName(stateName)];

                  let fillStyle = "#2a2d33";
                  let hoverFillStyle = "#3a3e46";

                  if (data) {
                    const colors = getRiskColor(data.violation_rate);
                    fillStyle = colors.fill;
                    hoverFillStyle = colors.hover;
                  }

                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      onMouseEnter={(e) => {
                        setTooltipContent({
                          name: stateName,
                          data: data,
                        });
                        setTooltipPos({ x: e.clientX, y: e.clientY });
                      }}
                      onMouseMove={(e) => {
                        setTooltipPos({ x: e.clientX, y: e.clientY });
                      }}
                      onMouseLeave={() => {
                        setTooltipContent(null);
                      }}
                      onClick={() => setSelectedState(stateName)}
                      style={{
                        default: {
                          fill: fillStyle,
                          stroke: "#0A0A0A",
                          strokeWidth: 0.75,
                          outline: "none",
                          transition: "fill 150ms ease"
                        },
                        hover: {
                          fill: hoverFillStyle,
                          stroke: "#F4C10F",
                          strokeWidth: 1.5,
                          outline: "none",
                          cursor: "pointer"
                        },
                        pressed: {
                          fill: hoverFillStyle,
                          outline: "none"
                        }
                      }}
                    />
                  );
                })
              }
            </Geographies>
          </ComposableMap>
        </div>

        <RiskGradientLegend />
      </div>

      <div className="bg-white rounded-sm border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="font-heading text-lg font-bold text-[#0A0A0A] flex items-center space-x-2">
              <FiMapPin className="h-5 w-5 text-[#F4C10F]" />
              <span>City-wise inspection activity</span>
            </h2>
            <p className="text-sm text-gray-500 mt-1">Select a state on the India map to filter its recorded cities.</p>
          </div>
          {selectedState && <button type="button" onClick={() => setSelectedState('')} className="text-sm font-semibold text-[#8A6A00]">Show all cities</button>}
        </div>
        {visibleCities.length ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200"><tr><th className="px-6 py-3 text-left text-xs font-semibold text-gray-500">City</th><th className="px-6 py-3 text-left text-xs font-semibold text-gray-500">State</th><th className="px-6 py-3 text-center text-xs font-semibold text-gray-500">Inspections</th><th className="px-6 py-3 text-center text-xs font-semibold text-gray-500">Compliant</th><th className="px-6 py-3 text-center text-xs font-semibold text-gray-500">Non-compliant</th><th className="px-6 py-3 text-center text-xs font-semibold text-gray-500">Violation rate</th></tr></thead>
              <tbody className="divide-y divide-gray-100">{visibleCities.map((item) => <tr key={`${item.state}-${item.city}`} className="row-hover"><td className="px-6 py-4 text-sm font-semibold text-[#0A0A0A]">{item.city}</td><td className="px-6 py-4 text-sm text-gray-600">{item.state || 'Not captured'}</td><td className="px-6 py-4 text-center font-data text-sm">{item.total}</td><td className="px-6 py-4 text-center font-data text-sm text-emerald-700">{item.compliant}</td><td className="px-6 py-4 text-center font-data text-sm text-rose-700">{item.non_compliant}</td><td className="px-6 py-4 text-center font-data text-sm">{item.violation_rate}%</td></tr>)}</tbody>
            </table>
          </div>
        ) : <div className="p-10 text-center text-sm text-gray-500">No city-level records have been captured yet.</div>}
      </div>

      <div className="bg-white rounded-sm border border-gray-200 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-gray-100">
          <h2 className="font-heading text-lg font-bold text-[#0A0A0A] flex items-center space-x-2">
            <FiAlertTriangle className="h-5 w-5 text-rose-500" />
            <span>Repeat Offender Alerts</span>
          </h2>
          <p className="text-sm text-gray-500 mt-1 font-heading italic">Products with multiple scans and high failure rates \u2014 prioritized for enforcement.</p>
        </div>

        {alerts.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <FiShield className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium text-gray-500">No repeat offenders detected</p>
            <p className="text-sm mt-1">Products scanned multiple times will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 tracking-wide">Product / GTIN</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 tracking-wide">Manufacturer</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 tracking-wide">Scans</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 tracking-wide">Fails</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 tracking-wide">Risk</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 tracking-wide">Last Seen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {alerts.map((alert, i) => (
                  <AlertRow key={alert.gtin} alert={alert} index={i} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default IndiaMap;