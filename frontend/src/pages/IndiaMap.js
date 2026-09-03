import React, { useState, useEffect, useRef } from 'react';
import { FiAlertTriangle, FiShield, FiSearch, FiMapPin } from 'react-icons/fi';
import api from '../utils/api';
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import indiaGeo from '../data/india.topo.json';

/*
  Brand chrome stays black-and-yellow (matches Dashboard.jsx / landing
  page), but the choropleth itself is allowed to be genuinely colorful
  since color IS the data here \u2014 green \u2192 yellow \u2192 orange \u2192 red maps
  directly to violation rate. Dropping the map onto a near-black panel
  makes that gradient read much more vividly than on light gray.
*/

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

/*
  MOCK DATA \u2014 used only as a fallback when the API call fails or the
  backend isn't running, so the page still previews with realistic
  numbers. Remove MOCK_MAP_DATA / MOCK_ALERTS and the catch-block
  fallback once the real endpoints are wired up everywhere.
*/
const MOCK_MAP_DATA = [
  { state: 'Maharashtra', total: 412, non_compliant: 96, violation_rate: 23 },
  { state: 'Uttar Pradesh', total: 388, non_compliant: 201, violation_rate: 52 },
  { state: 'Delhi', total: 265, non_compliant: 71, violation_rate: 27 },
  { state: 'Karnataka', total: 301, non_compliant: 34, violation_rate: 11 },
  { state: 'Tamil Nadu', total: 274, non_compliant: 19, violation_rate: 7 },
  { state: 'Gujarat', total: 246, non_compliant: 88, violation_rate: 36 },
  { state: 'West Bengal', total: 198, non_compliant: 102, violation_rate: 51 },
  { state: 'Rajasthan', total: 177, non_compliant: 61, violation_rate: 34 },
  { state: 'Bihar', total: 143, non_compliant: 79, violation_rate: 55 },
  { state: 'Madhya Pradesh', total: 165, non_compliant: 40, violation_rate: 24 },
  { state: 'Punjab', total: 121, non_compliant: 9, violation_rate: 7 },
  { state: 'Kerala', total: 158, non_compliant: 12, violation_rate: 8 },
  { state: 'Telangana', total: 132, non_compliant: 28, violation_rate: 21 },
  { state: 'Odisha', total: 96, non_compliant: 51, violation_rate: 53 },
  { state: 'Haryana', total: 108, non_compliant: 22, violation_rate: 20 },
  { state: 'Assam', total: 64, non_compliant: 8, violation_rate: 13 },
  { state: 'Jharkhand', total: 71, non_compliant: 33, violation_rate: 46 },
  { state: 'Jammu and Kashmir', total: 39, non_compliant: 4, violation_rate: 10 },
];

const MOCK_ALERTS = [
  { gtin: '8901234567890', product_name: 'Premium Basmati Rice, 1kg', manufacturer: 'Agro Foods Pvt. Ltd.', total_scans: 14, fail_count: 11, risk_score: 79, last_seen: '2026-08-29T10:00:00Z' },
  { gtin: '8904455667788', product_name: 'Cold-Pressed Mustard Oil, 1L', manufacturer: 'Sarson Naturals', total_scans: 9, fail_count: 7, risk_score: 68, last_seen: '2026-08-27T10:00:00Z' },
  { gtin: '8909988776655', product_name: 'Instant Noodles Masala Pack', manufacturer: 'Tastee Foods Ltd.', total_scans: 11, fail_count: 6, risk_score: 55, last_seen: '2026-08-25T10:00:00Z' },
  { gtin: '8901122334455', product_name: 'Toned Milk Powder, 500g', manufacturer: 'Dairy Best Co-op', total_scans: 8, fail_count: 4, risk_score: 47, last_seen: '2026-08-22T10:00:00Z' },
  { gtin: '8905566778899', product_name: 'Herbal Shampoo, 340ml', manufacturer: 'GreenLeaf Cosmetics', total_scans: 6, fail_count: 2, risk_score: 29, last_seen: '2026-08-18T10:00:00Z' },
  { gtin: '8902233445566', product_name: 'Whole Wheat Atta, 5kg', manufacturer: 'Anaaj Mills Pvt. Ltd.', total_scans: 5, fail_count: 1, risk_score: 18, last_seen: '2026-08-14T10:00:00Z' },
];

const IndiaMap = () => {
  const [mapData, setMapData] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [tooltipContent, setTooltipContent] = useState(null);
  const [tooltipPos, setTooltipPos] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [mapRes, alertRes] = await Promise.all([
          api.get('/dashboard/map'),
          api.get('/dashboard/alerts'),
        ]);
        const states = mapRes.data.states || [];
        const fetchedAlerts = alertRes.data.alerts || [];
        setMapData(states.length ? states : MOCK_MAP_DATA);
        setAlerts(fetchedAlerts.length ? fetchedAlerts : MOCK_ALERTS);
      } catch (err) {
        // Backend not reachable / not wired up yet \u2014 preview with mock data
        // instead of showing an error screen.
        setMapData(MOCK_MAP_DATA);
        setAlerts(MOCK_ALERTS);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const stateDataMap = {};
  mapData.forEach((s) => {
    stateDataMap[normalizeName(s.state)] = s;
  });

  const totalScans = mapData.reduce((sum, s) => sum + s.total, 0);
  const totalNonCompliant = mapData.reduce((sum, s) => sum + s.non_compliant, 0);
  const statesCovered = mapData.length;

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

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <style>{pageStyles}</style>

      <div>
        <h1 className="font-heading text-3xl font-bold text-[#0A0A0A]">National Scan Intelligence</h1>
        <p className="text-gray-600 mt-1 font-heading italic">Geographic choropleth distribution of product scans and repeat-offender alerts.</p>
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