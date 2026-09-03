import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiMail, FiLock, FiAlertCircle, FiArrowRight } from 'react-icons/fi';
import { toast } from 'react-toastify';

/*
  FONTS
  Display / caps headline: Archivo Black (stamped, industrial)
  Accent / tagline: Instrument Serif Italic (soft counterpoint to the heavy caps)
  Body / UI: Space Grotesk
  Self-contained via the <style> import below — for production, move the
  @import into index.html <head> instead of a runtime <style> tag.
*/

const HazardField = ({ opacity = 0.05 }) => (
  <div
    className="absolute inset-0 pointer-events-none"
    style={{
      opacity,
      backgroundImage:
        'repeating-linear-gradient(135deg, #FFD100 0, #FFD100 2px, transparent 2px, transparent 26px)',
    }}
  />
);

const HazardStrip = ({ className = '' }) => (
  <div
    className={`h-2 w-full flex-shrink-0 ${className}`}
    style={{
      backgroundImage:
        'repeating-linear-gradient(135deg, #FFD100 0, #FFD100 14px, #0E0E0E 14px, #0E0E0E 28px)',
    }}
  />
);

const SealBadge = () => (
  <svg viewBox="0 0 220 220" className="w-48 h-48 sm:w-56 sm:h-56">
    <defs>
      <path id="sealCircle" d="M 110,110 m -78,0 a 78,78 0 1,1 156,0 a 78,78 0 1,1 -156,0" />
    </defs>
    <circle cx="110" cy="110" r="106" fill="none" stroke="#FFD100" strokeWidth="1" strokeDasharray="2 5" opacity="0.4" />
    <circle cx="110" cy="110" r="94" fill="#141414" stroke="#FFD100" strokeWidth="2" />
    <text fill="#FFD100" fontSize="10.5" fontFamily="'Space Grotesk', sans-serif" fontWeight="600" letterSpacing="3">
      <textPath href="#sealCircle" startOffset="0%">
        LEGAL METROLOGY \u2022 COMPLIANCE VERIFIED \u2022 LEGAL METROLOGY \u2022 COMPLIANCE VERIFIED \u2022
      </textPath>
    </text>
    <path
      d="M 72,112 L 96,138 L 150,80"
      fill="none"
      stroke="#FFD100"
      strokeWidth="9"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const STAT_ROWS = [
  { n: '01', label: 'OCR reads every declaration in seconds' },
  { n: '02', label: 'Checked against 8 mandatory Rule 6 declarations' },
  { n: '03', label: 'Evidence-ready reports, generated instantly' },
];

const TAGS = ['SIH 2026', 'PS26034', 'MoCA'];

const CornerFrame = () => (
  <>
    <span className="absolute -top-2.5 -left-2.5 h-5 w-5 border-t-2 border-l-2 border-[#FFD100]" />
    <span className="absolute -top-2.5 -right-2.5 h-5 w-5 border-t-2 border-r-2 border-[#FFD100]" />
    <span className="absolute -bottom-2.5 -left-2.5 h-5 w-5 border-b-2 border-l-2 border-[#FFD100]" />
    <span className="absolute -bottom-2.5 -right-2.5 h-5 w-5 border-b-2 border-r-2 border-[#FFD100]" />
  </>
);

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      if (err.response) {
        const msg = err.response.data?.error || 'Invalid email or password';
        setError(msg);
      } else if (err.request) {
        setError('Unable to connect to server. Please try again later.');
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#0E0E0E] font-['Space_Grotesk']">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=Instrument+Serif:ital@1&family=Space+Grotesk:wght@400;500;600;700&display=swap');
      `}</style>

      {/* ─── Left: brand / seal panel (hidden on small screens) ─── */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col bg-[#0E0E0E] border-r border-[#FFD100]/15 overflow-hidden">
        <HazardField opacity={0.045} />
        <HazardStrip />

        <div className="relative flex-1 flex flex-col justify-between px-12 py-10">
          <Link to="/" className="flex items-center space-x-2.5">
            <img src="/logo.png" alt="TrueMark" className="h-8 w-auto object-contain" />
            <span className="font-['Archivo_Black'] text-lg text-white tracking-tight">TRUEMARK</span>
          </Link>

          <div className="flex flex-col items-center text-center py-2">
            <SealBadge />
            <h2 className="mt-8 font-['Archivo_Black'] text-3xl sm:text-4xl text-white leading-[1.15] max-w-sm">
              EVERY PACK.
              <br />
              EVERY RULE.
            </h2>
            <p className="mt-3 font-['Instrument_Serif'] italic text-2xl sm:text-3xl text-[#FFD100] leading-tight">
              checked in seconds.
            </p>
            <p className="mt-5 text-sm text-white/45 leading-relaxed max-w-xs">
              Sign in to pick up your recent scans, saved cases and enforcement dashboard.
            </p>
          </div>

          <div>
            <div className="space-y-3 max-w-sm">
              {STAT_ROWS.map((row) => (
                <div key={row.n} className="flex items-center space-x-4 bg-white/[0.03] border border-white/10 rounded-sm px-4 py-3">
                  <span className="font-['Archivo_Black'] text-[#FFD100] text-lg leading-none flex-shrink-0">{row.n}</span>
                  <span className="text-xs text-white/60 leading-snug">{row.label}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center space-x-2 mt-6">
              {TAGS.map((tag) => (
                <span key={tag} className="text-[10px] font-semibold text-white/40 border border-white/15 rounded-full px-2.5 py-1 tracking-wide">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        <HazardStrip />
      </div>

      {/* ─── Right: form ─── */}
      <div className="flex-1 relative flex items-center justify-center px-4 py-16 sm:px-6">
        <HazardField opacity={0.03} />
        <div className="lg:hidden absolute top-0 inset-x-0">
          <HazardStrip className="h-1.5" />
        </div>

        <div className="relative w-full max-w-sm">
          <CornerFrame />

          <div className="bg-[#141414] border border-white/10 rounded-sm px-7 py-9 sm:px-9 sm:py-10 shadow-[0_0_0_1px_rgba(255,209,0,0.04)]">
            <div className="lg:hidden flex items-center justify-center space-x-2.5 mb-8">
              <img src="/logo.png" alt="TrueMark" className="h-7 w-auto object-contain" />
              <span className="font-['Archivo_Black'] text-base text-white tracking-tight">TRUEMARK</span>
            </div>

            <div className="inline-flex items-center space-x-2 mb-5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#FFD100]" />
              <span className="text-[11px] font-semibold text-white/45 tracking-wide uppercase">Officer Access</span>
            </div>

            <h1 className="font-['Archivo_Black'] text-2xl sm:text-3xl text-white">SIGN IN</h1>
            <p className="mt-2 mb-7 font-['Instrument_Serif'] italic text-lg text-white/50">
              welcome back to the field.
            </p>

            {error && (
              <div className="mb-6 flex items-start space-x-2.5 bg-red-500/10 text-red-300 p-3 rounded-sm border border-red-500/25">
                <FiAlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span className="text-sm leading-snug">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-xs font-semibold text-white/55 tracking-wide mb-2 uppercase">
                  Email address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <FiMail className="h-4 w-4 text-white/35" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    autoCapitalize="none"
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 bg-[#0E0E0E] border border-white/15 rounded-sm text-white placeholder-white/30 text-sm focus:outline-none focus:ring-1 focus:ring-[#FFD100] focus:border-[#FFD100] transition-colors"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="password" className="block text-xs font-semibold text-white/55 tracking-wide uppercase">
                    Password
                  </label>
                  <Link to="/forgot-password" className="font-['Instrument_Serif'] italic text-sm text-white/40 hover:text-[#FFD100] transition-colors">
                    forgot?
                  </Link>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <FiLock className="h-4 w-4 text-white/35" />
                  </div>
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 bg-[#0E0E0E] border border-white/15 rounded-sm text-white placeholder-white/30 text-sm focus:outline-none focus:ring-1 focus:ring-[#FFD100] focus:border-[#FFD100] transition-colors"
                    placeholder="Enter your password"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center space-x-2 py-3 px-4 bg-[#FFD100] hover:bg-[#E8BE00] text-[#0E0E0E] font-['Archivo_Black'] text-sm tracking-wide rounded-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="h-3.5 w-3.5 rounded-full border-2 border-[#0E0E0E]/30 border-t-[#0E0E0E] animate-spin" />
                    <span>SIGNING IN&hellip;</span>
                  </>
                ) : (
                  <>
                    <span>SIGN IN</span>
                    <FiArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            <div className="flex items-center my-7">
              <div className="flex-1 h-px bg-white/10" />
              <span className="px-3 font-['Instrument_Serif'] italic text-sm text-white/30">reporting a violation?</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            <Link
              to="/report"
              className="block w-full text-center py-2.5 px-4 border border-white/15 hover:border-[#FFD100]/40 text-white/70 hover:text-[#FFD100] text-sm font-medium rounded-sm transition-colors"
            >
              File a citizen report &mdash; no account needed
            </Link>

            <p className="mt-6 text-center text-sm text-white/40">
              Don&rsquo;t have an account?{' '}
              <Link to="/register" className="font-semibold text-[#FFD100] hover:text-[#E8BE00] transition-colors">
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;