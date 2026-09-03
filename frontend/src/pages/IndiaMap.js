import React, { useState, useEffect } from 'react';
import { FiAlertTriangle, FiShield, FiSearch, FiMapPin } from 'react-icons/fi';
import api from '../utils/api';
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import indiaGeo from '../data/india.topo.json';

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
  if (rate >= 50) return { fill: '#dc2626', hover: '#b91c1c', bg: 'bg-red-500', text: 'text-red-700', label: 'Critical' };
  if (rate >= 25) return { fill: '#ea580c', hover: '#c2410c', bg: 'bg-orange-500', text: 'text-orange-700', label: 'High' };
  if (rate >= 10) return { fill: '#ca8a04', hover: '#a16207', bg: 'bg-yellow-500', text: 'text-yellow-700', label: 'Moderate' };
  return { fill: '#16a34a', hover: '#15803d', bg: 'bg-green-500', text: 'text-green-700', label: 'Low' };
};

const MapTooltip = ({ info, pos }) => {
  if (!info || !pos) return null;
  const risk = info.data ? getRiskColor(info.data.violation_rate) : null;
  
  return (
    <div 
      className="fixed bg-white rounded-xl shadow-2xl border border-gray-200 p-4 w-64 z-50 pointer-events-none transform -translate-x-1/2 -translate-y-full mt-[-15px]"
      style={{ left: pos.x, top: pos.y }}
    >
      <div className="flex items-center space-x-2 border-b border-gray-100 pb-3 mb-3">
        <FiMapPin className="h-4 w-4 text-primary-600" />
        <h3 className="font-bold text-gray-900">{info.name}</h3>
      </div>
      
      {info.data ? (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Total Scans</span>
            <span className="text-sm font-bold text-gray-900">{info.data.total}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Non-Compliant</span>
            <span className="text-sm font-bold text-red-600">{info.data.non_compliant}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Risk Level</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full text-white ${risk.bg}`}>
              {info.data.violation_rate}% {risk.label}
            </span>
          </div>
        </div>
      ) : (
        <div className="text-center py-2 text-gray-500 text-sm italic">
          No scan data available
        </div>
      )}
    </div>
  );
};

const AlertRow = ({ alert, index }) => {
  const risk = getRiskColor(alert.risk_score);
  return (
    <tr className="hover:bg-gray-50/50 transition-colors duration-150">
      <td className="px-4 py-4">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0 h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
            <span className="text-red-700 font-bold text-sm">#{index + 1}</span>
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">{alert.product_name}</p>
            <p className="text-xs text-gray-500 font-mono mt-0.5">{alert.gtin}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">{alert.manufacturer}</td>
      <td className="px-4 py-3 text-center">
        <span className="text-sm font-bold text-gray-900">{alert.total_scans}</span>
      </td>
      <td className="px-4 py-3 text-center">
        <span className="text-sm font-bold text-red-600">{alert.fail_count}</span>
      </td>
      <td className="px-4 py-3 text-center">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold text-white ${risk.bg}`}>
          {alert.risk_score}%
        </span>
      </td>
      <td className="px-4 py-3 text-xs text-gray-500">
        {alert.last_seen ? new Date(alert.last_seen).toLocaleDateString('en-IN') : '—'}
      </td>
    </tr>
  );
};

const IndiaMap = () => {
  const [mapData, setMapData] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [tooltipContent, setTooltipContent] = useState(null);
  const [tooltipPos, setTooltipPos] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [mapRes, alertRes] = await Promise.all([
          api.get('/dashboard/map'),
          api.get('/dashboard/alerts'),
        ]);
        setMapData(mapRes.data.states || []);
        setAlerts(alertRes.data.alerts || []);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load map data');
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

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <div className="animate-spin h-10 w-10 border-4 border-primary-800 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-gray-500">Loading map data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <FiAlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <p className="text-red-600 font-medium">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 font-heading">National Scan Intelligence</h1>
        <p className="text-gray-600 mt-1">Geographic choropleth distribution of product scans and repeat-offender alerts.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center space-x-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="bg-primary-100 rounded-xl p-3"><FiSearch className="h-6 w-6 text-primary-800" /></div>
          <div><p className="text-2xl font-bold text-gray-900">{totalScans}</p><p className="text-sm text-gray-500">Total Scans</p></div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center space-x-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="bg-red-100 rounded-xl p-3"><FiAlertTriangle className="h-6 w-6 text-red-600" /></div>
          <div><p className="text-2xl font-bold text-gray-900">{totalNonCompliant}</p><p className="text-sm text-gray-500">Non-Compliant</p></div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center space-x-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="bg-green-100 rounded-xl p-3"><FiMapPin className="h-6 w-6 text-green-600" /></div>
          <div><p className="text-2xl font-bold text-gray-900">{statesCovered}</p><p className="text-sm text-gray-500">States Covered</p></div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 relative shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center space-x-2">
          <FiMapPin className="h-5 w-5 text-primary-800" />
          <span>Scan Density by State</span>
        </h2>

        <MapTooltip info={tooltipContent} pos={tooltipPos} />

        <div className="flex justify-center bg-[#f8fafc] rounded-xl border border-gray-100 p-4 relative" style={{ overflow: "hidden" }}>
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
                    
                    let fillStyle = "#e2e8f0";
                    let hoverFillStyle = "#cbd5e1";
                    
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
                            stroke: "#ffffff",
                            strokeWidth: 0.75,
                            outline: "none"
                          },
                          hover: {
                            fill: hoverFillStyle,
                            stroke: "#ffffff",
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

        <div className="flex flex-wrap justify-center gap-6 mt-6 text-sm text-gray-700 font-medium">
          <div className="flex items-center space-x-2">
            <span className="w-4 h-4 rounded-md shadow-sm bg-[#e2e8f0] border border-gray-300" />
            <span>No Data</span>
          </div>
          {[
            { color: 'bg-green-500', label: 'Low Risk (<10%)' },
            { color: 'bg-yellow-500', label: 'Moderate Risk (10-25%)' },
            { color: 'bg-orange-500', label: 'High Risk (25-50%)' },
            { color: 'bg-red-500', label: 'Critical Risk (50%+)' },
          ].map((item) => (
            <div key={item.label} className="flex items-center space-x-2">
              <span className={`w-4 h-4 rounded-md shadow-sm ${item.color}`} />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 flex items-center space-x-2">
            <FiAlertTriangle className="h-5 w-5 text-red-500" />
            <span>Repeat Offender Alerts</span>
          </h2>
          <p className="text-sm text-gray-500 mt-1">Products with multiple scans and high failure rates — prioritized for enforcement.</p>
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
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Product / GTIN</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Manufacturer</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Scans</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Fails</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Risk</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Seen</th>
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
