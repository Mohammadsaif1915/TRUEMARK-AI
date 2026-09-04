import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiUser, FiMail, FiLock, FiAlertCircle, FiHash, FiArrowRight, FiChevronDown } from 'react-icons/fi';
import { toast } from 'react-toastify';

/*
  FONTS
  Headline: Archivo Black. Body/UI: Space Grotesk.
  Self-contained via the <style> import below — for production, move the
  @import into index.html <head> instead of a runtime <style> tag.
*/

const ROLES = [
  { value: 'inspector', label: 'Inspector' },
  { value: 'enforcement_officer', label: 'Enforcement Officer' },
  { value: 'administrator', label: 'Administrator' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'field_officer', label: 'Field Officer' },
];

const fieldClasses =
  'block w-full pl-10 pr-3 py-2.5 bg-[#161616] border border-white/15 rounded-sm text-white placeholder-white/30 text-sm focus:outline-none focus:ring-1 focus:ring-[#FFD100] focus:border-[#FFD100] transition-colors';

const FieldLabel = ({ children, required }) => (
  <label className="block text-xs font-semibold text-white/55 tracking-wide mb-2 uppercase">
    {children} {required && <span className="text-[#FFD100]">*</span>}
  </label>
);

const HazardStrip = ({ className = '' }) => (
  <div
    className={`h-2 w-full ${className}`}
    style={{
      backgroundImage:
        'repeating-linear-gradient(135deg, #FFD100 0, #FFD100 14px, #0E0E0E 14px, #0E0E0E 28px)',
    }}
  />
);

const SealBadge = () => (
  <svg viewBox="0 0 220 220" className="w-40 h-40 sm:w-48 sm:h-48">
    <defs>
      <path id="sealCircleReg" d="M 110,110 m -78,0 a 78,78 0 1,1 156,0 a 78,78 0 1,1 -156,0" />
    </defs>
    <circle cx="110" cy="110" r="106" fill="none" stroke="#FFD100" strokeWidth="1.5" opacity="0.35" />
    <circle cx="110" cy="110" r="94" fill="#141414" stroke="#FFD100" strokeWidth="2" />
    <text fill="#FFD100" fontSize="10.5" fontFamily="'Space Grotesk', sans-serif" fontWeight="600" letterSpacing="3">
      <textPath href="#sealCircleReg" startOffset="0%">
        OFFICER REGISTRATION \u2022 ROLE VERIFIED \u2022 OFFICER REGISTRATION \u2022 ROLE VERIFIED \u2022
      </textPath>
    </text>
    <path
      d="M110,58 L142,70 L142,104 C142,132 128,150 110,160 C92,150 78,132 78,104 L78,70 Z"
      fill="none"
      stroke="#FFD100"
      strokeWidth="4"
      strokeLinejoin="round"
    />
    <path
      d="M94,110 L106,124 L128,92"
      fill="none"
      stroke="#FFD100"
      strokeWidth="7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const FEATURE_ROWS = [
  { n: '01', label: 'Role-based access, reviewed before activation' },
  { n: '02', label: 'Badge number links every scan to its officer' },
  { n: '03', label: 'Full inspection history, searchable by case' },
];

const Register = () => {
  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    email: '',
    password: '',
    role: '',
    badge_number: '',
    working_city: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Client-side validation
    if (!formData.role) {
      setError('Please select a role');
      return;
    }

    setLoading(true);

    try {
      const payload = { ...formData };
      if (!payload.badge_number) {
        delete payload.badge_number;
      }
      await register(payload);
      toast.success('Account created! Please sign in.');
      navigate('/login');
    } catch (err) {
      if (err.response) {
        const msg = err.response.data?.error || 'Registration failed. Please try again.';
        setError(msg);
      } else if (err.request) {
        setError('Unable to connect to server. Please try again later.');
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#0E0E0E] font-['Space_Grotesk']">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=Space+Grotesk:wght@400;500;600;700&display=swap');
      `}</style>

      {/* ─── Left: brand / seal panel (hidden on small screens) ─── */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col bg-[#0E0E0E] border-r border-[#FFD100]/15 overflow-hidden">
        <HazardStrip />

        <div className="flex-1 flex flex-col justify-between px-12 py-10">
          <Link to="/" className="flex items-center space-x-2.5">
            <img src="/logo.png" alt="TrueMark" className="h-8 w-auto object-contain" />
            <span className="font-['Archivo_Black'] text-lg text-white tracking-tight">TRUEMARK</span>
          </Link>

          <div className="flex flex-col items-center text-center py-4">
            <SealBadge />
            <h2 className="mt-8 font-['Archivo_Black'] text-3xl sm:text-4xl text-white leading-[1.15] max-w-sm">
              ONE ACCOUNT.
              <br />
              <span className="text-[#FFD100]">EVERY CHECK</span>
              <br />
              THE RULES REQUIRE.
            </h2>
            <p className="mt-4 text-sm text-white/45 leading-relaxed max-w-xs">
              Registration is reviewed against your role and badge details before
              enforcement access is granted.
            </p>
          </div>

          <div className="space-y-3 max-w-sm">
            {FEATURE_ROWS.map((row) => (
              <div key={row.n} className="flex items-center space-x-4 bg-white/[0.03] border border-white/10 rounded-sm px-4 py-3">
                <span className="font-['Archivo_Black'] text-[#FFD100] text-lg leading-none flex-shrink-0">{row.n}</span>
                <span className="text-xs text-white/60 leading-snug">{row.label}</span>
              </div>
            ))}
          </div>
        </div>

        <HazardStrip />
      </div>

      {/* ─── Right: form ─── */}
      <div className="flex-1 flex items-center justify-center px-4 py-16 sm:px-6 relative">
        <div className="lg:hidden absolute top-0 inset-x-0">
          <HazardStrip className="h-1.5" />
        </div>

        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center justify-center space-x-2.5 mb-10">
            <img src="/logo.png" alt="TrueMark" className="h-8 w-auto object-contain" />
            <span className="font-['Archivo_Black'] text-lg text-white tracking-tight">TRUEMARK</span>
          </div>

          <div className="mb-8">
            <h1 className="font-['Archivo_Black'] text-2xl sm:text-3xl text-white">CREATE ACCOUNT</h1>
            <p className="mt-2 text-sm text-white/45">Register for enforcement or citizen access.</p>
          </div>

          {error && (
            <div className="mb-6 flex items-start space-x-2.5 bg-red-500/10 text-red-300 p-3 rounded-sm border border-red-500/25">
              <FiAlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span className="text-sm leading-snug">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <FieldLabel required>Full name</FieldLabel>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <FiUser className="h-4 w-4 text-white/35" />
                </div>
                <input
                  type="text"
                  name="full_name"
                  required
                  value={formData.full_name}
                  onChange={handleChange}
                  className={fieldClasses}
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div>
              <FieldLabel required>Username</FieldLabel>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <FiUser className="h-4 w-4 text-white/35" />
                </div>
                <input
                  type="text"
                  name="username"
                  required
                  value={formData.username}
                  onChange={handleChange}
                  className={fieldClasses}
                  placeholder="johndoe"
                />
              </div>
            </div>

            <div>
              <FieldLabel required>Email</FieldLabel>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <FiMail className="h-4 w-4 text-white/35" />
                </div>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className={fieldClasses}
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <FieldLabel required>Password</FieldLabel>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <FiLock className="h-4 w-4 text-white/35" />
                </div>
                <input
                  type="password"
                  name="password"
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={handleChange}
                  className={fieldClasses}
                  placeholder="Min 6 characters"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <FieldLabel required>Role</FieldLabel>
                <div className="relative">
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    required
                    className="appearance-none block w-full pl-3 pr-8 py-2.5 bg-[#161616] border border-white/15 rounded-sm text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#FFD100] focus:border-[#FFD100] transition-colors"
                  >
                    <option value="" disabled className="bg-[#161616]">Select role&hellip;</option>
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value} className="bg-[#161616]">{r.label}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <FiChevronDown className="h-4 w-4 text-white/35" />
                  </div>
                </div>
              </div>

              <div>
                <FieldLabel>Badge #</FieldLabel>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <FiHash className="h-4 w-4 text-white/35" />
                  </div>
                  <input
                    type="text"
                    name="badge_number"
                    value={formData.badge_number}
                    onChange={handleChange}
                    className={fieldClasses}
                    placeholder="Optional"
                  />
                </div>
              </div>
            </div>

            <div>
              <FieldLabel required>Working city</FieldLabel>
              <input type="text" name="working_city" required value={formData.working_city} onChange={handleChange} className={fieldClasses} placeholder="e.g. Mumbai" />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center space-x-2 py-3 px-4 bg-[#FFD100] hover:bg-[#E8BE00] text-[#0E0E0E] font-['Archivo_Black'] text-sm tracking-wide rounded-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <>
                  <div className="h-3.5 w-3.5 rounded-full border-2 border-[#0E0E0E]/30 border-t-[#0E0E0E] animate-spin" />
                  <span>CREATING ACCOUNT&hellip;</span>
                </>
              ) : (
                <>
                  <span>CREATE ACCOUNT</span>
                  <FiArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-white/40">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-[#FFD100] hover:text-[#E8BE00] transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;