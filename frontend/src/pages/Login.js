import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiMail, FiLock, FiAlertCircle, FiArrowRight, FiCheckCircle, FiKey } from 'react-icons/fi';
import { toast } from 'react-toastify';

/*
  DESIGN NOTE
  This page reuses the landing page's visual system exactly, so moving from
  the marketing site into the product never feels like a hand-off to a
  different team: Fraunces for headline/italic voice, Inter for body/UI,
  IBM Plex Mono reserved for tabular/data strings (case numbers, stat
  counts). Same ink/gold palette, same certification-seal motif, same
  diagonal tape marquee, same hairline-and-citation "gazette" structure.

  Add to index.html (shared with the landing page):
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,400;1,9..144,500;1,9..144,600&family=Inter:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@500;600&display=swap" rel="stylesheet">

  Colors and font stacks are set inline (not via Tailwind arbitrary-value
  classes) for the same render-safety reason documented in the landing
  page: JIT-scanned opacity-slash utilities can silently fail to generate
  on a fresh build, which looks exactly like invisible white-on-white text
  on a dark panel.
*/

const INK = '#0A0A0A';
const GOLD = '#F4C10F';
const white = (a) => `rgba(255,255,255,${a})`;
const ink = (a) => `rgba(10,10,10,${a})`;
const gold = (a) => `rgba(244,193,15,${a})`;
const rose = (a) => `rgba(244,63,94,${a})`;

const FONT_HEAD = `'Fraunces', Georgia, serif`;
const FONT_BODY = `'Inter', ui-sans-serif, system-ui`;
const FONT_DATA = `'IBM Plex Mono', ui-monospace, monospace`;

const STAT_ROWS = [
  { n: '01', label: 'OCR reads every declaration on the pack' },
  { n: '02', label: 'Checked against 8 mandatory Rule 6 declarations' },
  { n: '03', label: 'Verdicts arrive with a citation, not a guess' },
];

/* Same rotating certification seal used on the landing page, sized down
   slightly to sit comfortably above the sign-in copy. */
const CertificationSeal = () => {
  const words = 'CERTIFIED ACCESS \u00b7 RULES 2011 \u00b7 VERIFIED \u00b7 ';
  const chars = words.repeat(3).split('');
  const radius = 54;
  return (
    <div className="seal-glow relative h-28 w-28" aria-hidden="true">
      <div className="seal-halo absolute inset-[-10px] rounded-full" />
      <div className="seal-rotate relative h-28 w-28">
        <svg viewBox="0 0 140 140" className="h-full w-full" style={{ filter: `drop-shadow(0 0 16px ${gold(0.3)})` }}>
          <circle cx="70" cy="70" r="66" fill={GOLD} stroke={INK} strokeWidth="2" />
          <circle cx="70" cy="70" r="46" fill="none" stroke={INK} strokeWidth="1" strokeDasharray="2 3" />
          {chars.map((ch, i) => {
            const angle = (360 / chars.length) * i - 90;
            const rad = (angle * Math.PI) / 180;
            const x = 70 + radius * Math.cos(rad);
            const y = 70 + radius * Math.sin(rad);
            return (
              <text
                key={i}
                x={x}
                y={y}
                fontSize="7"
                fontWeight="700"
                fontFamily={FONT_BODY}
                fill={INK}
                textAnchor="middle"
                transform={`rotate(${angle + 90}, ${x}, ${y})`}
              >
                {ch}
              </text>
            );
          })}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <FiCheckCircle className="h-8 w-8" style={{ color: INK }} />
        </div>
      </div>
    </div>
  );
};

const TapeStrip = ({ className = '' }) => (
  <div
    className={`tape-strip h-2 w-full flex-shrink-0 ${className}`}
    style={{
      backgroundImage: `repeating-linear-gradient(-45deg, ${GOLD} 0px, ${GOLD} 14px, ${INK} 14px, ${INK} 28px)`,
    }}
  />
);

const SectionMark = ({ n, label }) => (
  <div className="flex items-baseline space-x-3 mb-4">
    <span style={{ fontFamily: FONT_HEAD, fontStyle: 'italic', fontSize: '0.875rem', color: '#C99A00' }}>&sect;{n}</span>
    <span className="text-xs font-semibold tracking-wide" style={{ color: '#6B7280', fontFamily: FONT_BODY }}>{label}</span>
  </div>
);

const CornerFrame = () => (
  <>
    <span className="absolute -top-2.5 -left-2.5 h-5 w-5" style={{ borderTop: `2px solid ${GOLD}`, borderLeft: `2px solid ${GOLD}` }} />
    <span className="absolute -top-2.5 -right-2.5 h-5 w-5" style={{ borderTop: `2px solid ${GOLD}`, borderRight: `2px solid ${GOLD}` }} />
    <span className="absolute -bottom-2.5 -left-2.5 h-5 w-5" style={{ borderBottom: `2px solid ${GOLD}`, borderLeft: `2px solid ${GOLD}` }} />
    <span className="absolute -bottom-2.5 -right-2.5 h-5 w-5" style={{ borderBottom: `2px solid ${GOLD}`, borderRight: `2px solid ${GOLD}` }} />
  </>
);

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // Temporary password change flow
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [tempEmail, setTempEmail] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { login, changePassword } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const loggedInUser = await login(email, password);
      toast.success('Welcome back!');
      navigate(['administrator', 'admin'].includes(loggedInUser?.role) ? '/admin' : '/dashboard');
    } catch (err) {
      if (err.response?.status === 403 && err.response.data?.must_change_password) {
        setTempEmail(err.response.data.email || email);
        setTempPassword(password);
        setMustChangePassword(true);
        setError('');
      } else if (err.response) {
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

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      const loggedInUser = await changePassword(tempEmail, tempPassword, newPassword);
      toast.success('Password updated! Welcome.');
      navigate(['administrator', 'admin'].includes(loggedInUser?.role) ? '/admin' : '/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Password change failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#fff', fontFamily: FONT_BODY, color: '#1E2A3A' }}>
      <style>{`
        @keyframes seal-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .seal-rotate svg { animation: seal-spin 22s linear infinite; }
        @keyframes seal-breathe { 0%, 100% { opacity: .35; transform: scale(1); } 50% { opacity: .7; transform: scale(1.06); } }
        .seal-halo { background: radial-gradient(circle, rgba(244,193,15,0.55) 0%, rgba(244,193,15,0) 70%); animation: seal-breathe 3.2s ease-in-out infinite; }

        .field-input { transition: border-color .2s ease, box-shadow .2s ease; }
        .field-input:focus { outline: none; border-color: ${GOLD} !important; box-shadow: 0 0 0 3px ${gold(0.18)}; }

        .cta-sweep { position: relative; overflow: hidden; z-index: 0; }
        .cta-sweep::before {
          content: ''; position: absolute; inset: 0; background: #0A0A0A;
          transform: translateX(-101%); transition: transform .32s cubic-bezier(.2,.7,.2,1); z-index: -1;
        }
        .cta-sweep::after {
          content: ''; position: absolute; top: 0; bottom: 0; width: 40%;
          background: linear-gradient(115deg, transparent, rgba(255,255,255,0.55), transparent);
          transform: translateX(-220%) skewX(-15deg); transition: transform .55s ease;
        }
        .cta-sweep:hover::before { transform: translateX(0); }
        .cta-sweep:hover::after { transform: translateX(340%) skewX(-15deg); }
        .cta-sweep:hover { color: ${GOLD} !important; }
        .cta-sweep-icon { transition: transform .2s ease; }
        .cta-sweep:hover .cta-sweep-icon { transform: translateX(3px); }
        .cta-sweep:disabled { opacity: .55; cursor: not-allowed; }
        .cta-sweep:disabled:hover::before, .cta-sweep:disabled:hover::after { transform: none; }
        .cta-sweep:disabled:hover { color: ${INK} !important; }

        .back-link { position: relative; }
        .back-link::after {
          content: ''; position: absolute; left: 0; right: 100%; bottom: -2px; height: 1px;
          background: ${GOLD}; transition: right .2s ease;
        }
        .back-link:hover::after { right: 0; }

        @media (prefers-reduced-motion: reduce) {
          .seal-rotate svg, .seal-halo { animation: none; }
        }
      `}</style>

      {/* \u2500\u2500\u2500 Left: brand / seal panel \u2500\u2500\u2500 */}
      <div className="hidden lg:flex lg:w-[46%] relative flex-col overflow-hidden" style={{ backgroundColor: INK }}>
        <div className="absolute inset-0 opacity-[0.05]" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '28px 28px',
        }} />
        <TapeStrip />

        <div className="relative flex-1 flex flex-col justify-between px-12 py-10">
          <Link to="/" className="flex items-center space-x-2.5">
            <img src="/logo.png" alt="TrueMark" className="h-8 w-auto object-contain" />
            <span style={{ fontFamily: FONT_HEAD, fontStyle: 'italic', fontSize: '1.25rem', fontWeight: 600, color: '#fff', letterSpacing: '-0.01em' }}>TrueMark</span>
          </Link>

          <div className="flex flex-col items-center text-center py-2">
            <CertificationSeal />
            <h2 className="mt-8 max-w-sm" style={{ fontFamily: FONT_HEAD, fontStyle: 'italic', fontWeight: 500, fontSize: '2.1rem', lineHeight: 1.18, color: '#fff' }}>
              Pick up right where the last scan left off.
            </h2>
            <p className="mt-5 text-sm leading-relaxed max-w-xs" style={{ color: white(0.5) }}>
              Sign in to reach your recent scans, saved cases and the enforcement
              dashboard your role has access to.
            </p>
          </div>

          <div>
            <div className="space-y-3 max-w-sm">
              {STAT_ROWS.map((row) => (
                <div key={row.n} className="flex items-center space-x-4 px-4 py-3 rounded-sm" style={{ backgroundColor: white(0.03), border: `1px solid ${white(0.1)}` }}>
                  <span style={{ fontFamily: FONT_DATA, color: GOLD, fontWeight: 600, fontSize: '0.8rem' }}>{row.n}</span>
                  <span className="text-xs leading-snug" style={{ color: white(0.6) }}>{row.label}</span>
                </div>
              ))}
            </div>
            <p className="mt-6 text-xs" style={{ fontFamily: FONT_DATA, color: white(0.3) }}>
              PS26034 &middot; Legal Metrology (Packaged Commodities) Rules, 2011
            </p>
          </div>
        </div>

        <TapeStrip />
      </div>

      {/* ─── Right: form panel ─── */}
      <div className="flex-1 relative flex items-center justify-center px-4 py-16 sm:px-6" style={{ backgroundColor: '#fff' }}>
        <div className="lg:hidden absolute top-0 inset-x-0">
          <TapeStrip className="h-1.5" />
        </div>

        <div className="relative w-full max-w-sm">
          <div className="lg:hidden flex items-center justify-center space-x-2.5 mb-9">
            <img src="/logo.png" alt="TrueMark" className="h-7 w-auto object-contain" />
            <span style={{ fontFamily: FONT_HEAD, fontStyle: 'italic', fontSize: '1.1rem', fontWeight: 600, color: INK }}>TrueMark</span>
          </div>

          <div className="relative rounded-sm px-7 py-9 sm:px-9 sm:py-10" style={{ backgroundColor: '#fff', border: `1px solid ${ink(0.1)}` }}>
            <CornerFrame />

            {mustChangePassword ? (
              /* ─── Temporary Password Change Form ─── */
              <>
                <div className="flex items-center space-x-3 mb-6">
                  <div className="flex-shrink-0 p-2.5 rounded-full" style={{ backgroundColor: gold(0.12) }}>
                    <FiKey className="h-5 w-5" style={{ color: '#8A6A00' }} />
                  </div>
                  <div>
                    <h1 style={{ fontFamily: FONT_HEAD, fontWeight: 600, fontSize: '1.4rem', color: INK }}>Set new password</h1>
                    <p style={{ fontFamily: FONT_HEAD, fontStyle: 'italic', fontSize: '0.85rem', color: '#8A6A00' }}>Temporary password detected</p>
                  </div>
                </div>

                <p className="mb-6 text-sm leading-relaxed" style={{ color: '#4B5563' }}>
                  Your account was provisioned with a temporary password. Please set a new permanent password to continue.
                </p>

                {error && (
                  <div className="mb-5 flex items-start space-x-2.5 p-3 rounded-sm" style={{ backgroundColor: rose(0.08), border: `1px solid ${rose(0.25)}`, color: '#B4283C' }}>
                    <FiAlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span className="text-sm leading-snug">{error}</span>
                  </div>
                )}

                <form onSubmit={handleChangePassword} className="space-y-5">
                  <div>
                    <label htmlFor="new-password" className="block text-xs font-semibold tracking-wide mb-2" style={{ color: '#6B7280' }}>New Password</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none"><FiLock className="h-4 w-4" style={{ color: '#9CA3AF' }} /></div>
                      <input
                        id="new-password"
                        type="password"
                        required
                        minLength={8}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="field-input block w-full pl-10 pr-3 py-2.5 rounded-sm text-sm"
                        style={{ backgroundColor: '#fff', border: `1px solid ${ink(0.15)}`, color: INK }}
                        placeholder="Minimum 8 characters"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="confirm-password" className="block text-xs font-semibold tracking-wide mb-2" style={{ color: '#6B7280' }}>Confirm New Password</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none"><FiLock className="h-4 w-4" style={{ color: '#9CA3AF' }} /></div>
                      <input
                        id="confirm-password"
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="field-input block w-full pl-10 pr-3 py-2.5 rounded-sm text-sm"
                        style={{ backgroundColor: '#fff', border: `1px solid ${ink(0.15)}`, color: INK }}
                        placeholder="Repeat new password"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="cta-sweep w-full flex justify-center items-center space-x-2 py-3 px-4 font-semibold text-sm rounded-sm"
                    style={{ backgroundColor: GOLD, color: INK }}
                  >
                    {loading ? (
                      <><div className="h-3.5 w-3.5 rounded-full border-2 animate-spin" style={{ borderColor: ink(0.3), borderTopColor: INK }} /><span>Updating&hellip;</span></>
                    ) : (
                      <><span>Set New Password</span><FiArrowRight className="cta-sweep-icon h-4 w-4" /></>
                    )}
                  </button>
                </form>

                <button
                  type="button"
                  onClick={() => { setMustChangePassword(false); setError(''); }}
                  className="mt-4 w-full text-center text-xs"
                  style={{ color: '#9CA3AF' }}
                >
                  &larr; Back to sign in
                </button>
              </>
            ) : (
              /* ─── Normal Login Form ─── */
              <>
                <SectionMark n="06" label="Officer Access" />

                <h1 style={{ fontFamily: FONT_HEAD, fontWeight: 600, fontSize: '2rem', color: INK, letterSpacing: '-0.01em' }}>
                  Sign in
                </h1>
                <p className="mt-2 mb-7" style={{ fontFamily: FONT_HEAD, fontStyle: 'italic', fontSize: '1.05rem', color: '#8A6A00' }}>
                  welcome back to the field.
                </p>

                <Link
                  to="/"
                  className="back-link inline-flex items-center text-sm mb-6"
                  style={{ color: '#6B7280' }}
                >
                  <span aria-hidden="true" className="mr-2">&larr;</span>
                  Back to landing page
                </Link>

                {error && (
                  <div className="mb-6 flex items-start space-x-2.5 p-3 rounded-sm" style={{ backgroundColor: rose(0.08), border: `1px solid ${rose(0.25)}`, color: '#B4283C' }}>
                    <FiAlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span className="text-sm leading-snug">{error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label htmlFor="email" className="block text-xs font-semibold tracking-wide mb-2" style={{ color: '#6B7280' }}>
                      Email address
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <FiMail className="h-4 w-4" style={{ color: '#9CA3AF' }} />
                      </div>
                      <input
                        id="email"
                        type="email"
                        required
                        value={email}
                        autoCapitalize="none"
                        onChange={(e) => setEmail(e.target.value)}
                        className="field-input block w-full pl-10 pr-3 py-2.5 rounded-sm text-sm"
                        style={{ backgroundColor: '#fff', border: `1px solid ${ink(0.15)}`, color: INK }}
                        placeholder="you@example.com"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label htmlFor="password" className="block text-xs font-semibold tracking-wide" style={{ color: '#6B7280' }}>
                        Password
                      </label>
                      <Link to="/forgot-password" className="back-link" style={{ fontFamily: FONT_HEAD, fontStyle: 'italic', fontSize: '0.9rem', color: '#8A6A00' }}>
                        forgot?
                      </Link>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <FiLock className="h-4 w-4" style={{ color: '#9CA3AF' }} />
                      </div>
                      <input
                        id="password"
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="field-input block w-full pl-10 pr-3 py-2.5 rounded-sm text-sm"
                        style={{ backgroundColor: '#fff', border: `1px solid ${ink(0.15)}`, color: INK }}
                        placeholder="Enter your password"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="cta-sweep w-full flex justify-center items-center space-x-2 py-3 px-4 font-semibold text-sm rounded-sm"
                    style={{ backgroundColor: GOLD, color: INK }}
                  >
                    {loading ? (
                      <>
                        <div className="h-3.5 w-3.5 rounded-full border-2 animate-spin" style={{ borderColor: ink(0.3), borderTopColor: INK }} />
                        <span>Signing in&hellip;</span>
                      </>
                    ) : (
                      <>
                        <span>Sign in</span>
                        <FiArrowRight className="cta-sweep-icon h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>

                <div className="flex items-center my-7">
                  <div className="flex-1 h-px" style={{ backgroundColor: '#E5E7EB' }} />
                  <span className="px-3 text-sm" style={{ fontFamily: FONT_HEAD, fontStyle: 'italic', color: '#9CA3AF' }}>reporting a violation?</span>
                  <div className="flex-1 h-px" style={{ backgroundColor: '#E5E7EB' }} />
                </div>

                <Link
                  to="/report"
                  className="block w-full text-center py-2.5 px-4 text-sm font-medium rounded-sm transition-colors"
                  style={{ border: `1px solid ${ink(0.15)}`, color: '#4B5563' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = GOLD; e.currentTarget.style.color = '#8A6A00'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = ink(0.15); e.currentTarget.style.color = '#4B5563'; }}
                >
                  File a citizen report &mdash; no account needed
                </Link>
              </>
            )}
          </div>

          <p className="mt-6 text-center text-xs" style={{ fontFamily: FONT_DATA, color: '#9CA3AF' }}>
            Case access is logged against your account for every scan.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;