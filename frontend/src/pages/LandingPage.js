import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FiSearch, FiUpload, FiXCircle, FiCheckCircle, FiFileText, FiShield, FiBarChart2,
  FiZap, FiArrowRight, FiGlobe, FiCrosshair, FiAlertTriangle, FiBook, FiGithub,
  FiMail, FiClock, FiUsers, FiDatabase, FiLock, FiType,
} from 'react-icons/fi';

/*
  TYPOGRAPHY NOTE
  Fraunces (a soft-serif with a genuine italic optical axis) carries the
  "gazette / certified document" voice for display type; Inter stays for
  body and UI; IBM Plex Mono is reserved for genuinely tabular data
  (case numbers, GTINs, rule codes) rather than used as ambient decoration.

  Add to index.html:
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,400;1,9..144,500;1,9..144,600&family=Inter:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@500;600&display=swap" rel="stylesheet">

  and in tailwind.config.js:
    fontFamily: {
      heading: ['"Fraunces"', 'Georgia', 'serif'],
      body: ['Inter', 'ui-sans-serif', 'system-ui'],
      data: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
    }
*/

const NAV_LINKS = [
  { label: 'The Problem', href: '#problem' },
  { label: 'The Solution', href: '#solution' },
  { label: 'How it Works', href: '#how-it-works' },
  { label: 'Features', href: '#features' },
  { label: 'Team', href: '#footer' },
];

const STATS = [
  { icon: FiBook, value: '8', suffix: '', label: 'Mandatory declarations checked' },
  { icon: FiZap, value: 'OCR + Rules', numeric: false, label: 'Dual-layer verification' },
  { icon: FiFileText, value: 'PDF', numeric: false, label: 'Evidence-ready reports' },
  { icon: FiGlobe, value: 'Bilingual', numeric: false, label: 'Hindi & English labels' },
];

const VIOLATIONS = [
  {
    title: 'Missing declarations',
    rule: 'Rule 6',
    desc: 'Manufacturer address, net quantity, or consumer-care details left off the pack entirely.',
  },
  {
    title: 'Undersized text',
    rule: 'Rule 7',
    desc: 'MRP and net-quantity type set below the minimum height prescribed under Table-I for the pack\u2019s display-panel area.',
  },
  {
    title: 'Improper MRP format',
    rule: 'Rule 6(1)(e)',
    desc: '"Inclusive of all taxes" omitted, or the price shown does not match the printed figure.',
  },
  {
    title: 'Listing mismatches',
    rule: 'Rule 6 (cross-check)',
    desc: 'The MRP or origin shown online disagrees with what is printed on the physical pack.',
  },
  {
    title: 'Net quantity shortfall',
    rule: 'Rule 11',
    desc: 'The declared net quantity includes wrapper or packaging weight, or the customer receives less than what\u2019s printed on the pack.',
  },
];

const STEPS = [
  {
    num: '01',
    icon: FiUpload,
    title: 'Capture',
    desc: 'An officer photographs the label in the field, or a citizen submits a photo through the public reporting form.',
  },
  {
    num: '02',
    icon: FiSearch,
    title: 'Extract & verify',
    desc: 'OCR reads every declaration on the pack, then the rule engine checks each one against the versioned 2011 Rules, with a citation attached to every result.',
  },
  {
    num: '03',
    icon: FiFileText,
    title: 'Report',
    desc: 'A verdict is returned instantly, with a downloadable evidence report and, where relevant, a cross-check against the product\u2019s online listing.',
  },
];

const FEATURES = [
  {
    icon: FiSearch,
    title: 'OCR label scanning',
    desc: 'Extracts every printed declaration from a pack photo, including small and low-contrast text.',
  },
  {
    icon: FiBook,
    title: 'Rule-based verification',
    desc: 'Checks findings against the versioned Legal Metrology Rules, 2011, citing the exact sub-rule for every verdict.',
  },
  {
    icon: FiCrosshair,
    title: 'E-commerce cross-check',
    desc: 'Compares the physical label against the product\u2019s online listing to catch MRP and origin mismatches.',
  },
  {
    icon: FiShield,
    title: 'GTIN risk scoring',
    desc: 'Tracks a barcode\u2019s compliance history across scans, so repeat offenders surface automatically.',
  },
  {
    icon: FiBarChart2,
    title: 'Enforcement dashboard',
    desc: 'Filters, trends and violation breakdowns for supervisors overseeing multiple inspectors and regions.',
  },
  {
    icon: FiFileText,
    title: 'Evidence-ready reports',
    desc: 'PDF and editable reports with citations and extracted photo evidence, ready for enforcement or court use.',
  },
];

const COMPARISON = [
  { label: 'Time per product', manual: '8\u201315 minutes, rulebook in hand', truemark: 'Under 30 seconds' },
  { label: 'Consistency across officers', manual: 'Varies by training and fatigue', truemark: 'Same 8 checks, every time' },
  { label: 'Legal citation on record', manual: 'Written up after the fact, if at all', truemark: 'Attached automatically to every verdict' },
  { label: 'Repeat-offender tracking', manual: 'Relies on institutional memory', truemark: 'Flagged by GTIN scan history' },
  { label: 'Online listing check', manual: 'Not typically performed', truemark: 'Built into every scan' },
];

const TICKER_ITEMS = [
  'LEGAL METROLOGY ACT, 2009',
  'PACKAGED COMMODITIES RULES, 2011',
  'RULE 6 \u00b7 DECLARATIONS',
  'RULE 7 \u00b7 TYPE SIZE',
  'RULE 11 \u00b7 NET QUANTITY',
  'CERTIFIED SCAN RESULT',
];

/* ------------------------------------------------------------------ */
/*  Scroll-reveal: a single IntersectionObserver instance shared by    */
/*  every element carrying the .reveal class, toggling .is-in on entry */
/* ------------------------------------------------------------------ */
const useScrollReveal = () => {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll('.reveal'));
    if (!els.length) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      els.forEach((el) => el.classList.add('is-in'));
      return undefined;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.16, rootMargin: '0px 0px -8% 0px' }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
};

/* ------------------------------------------------------------------ */
/*  Count-up for numeric stat values, triggered once when in view      */
/* ------------------------------------------------------------------ */
const CountUp = ({ value, numeric }) => {
  const ref = useRef(null);
  const [display, setDisplay] = useState(numeric === false ? value : '0');

  useEffect(() => {
    if (numeric === false) return undefined;
    const target = parseInt(value, 10);
    if (Number.isNaN(target)) {
      setDisplay(value);
      return undefined;
    }
    const node = ref.current;
    if (!node) return undefined;
    let done = false;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !done) {
            done = true;
            const start = performance.now();
            const duration = 900;
            const step = (now) => {
              const t = Math.min(1, (now - start) / duration);
              const eased = 1 - Math.pow(1 - t, 3);
              setDisplay(String(Math.round(eased * target)));
              if (t < 1) requestAnimationFrame(step);
            };
            requestAnimationFrame(step);
            io.disconnect();
          }
        });
      },
      { threshold: 0.6 }
    );
    io.observe(node);
    return () => io.disconnect();
  }, [value, numeric]);

  return <span ref={ref}>{display}</span>;
};

/* ------------------------------------------------------------------ */
/*  Thin reading-progress bar under the nav                            */
/* ------------------------------------------------------------------ */
const ScrollProgress = () => {
  const barRef = useRef(null);
  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      const pct = max > 0 ? (doc.scrollTop / max) * 100 : 0;
      if (barRef.current) barRef.current.style.width = `${pct}%`;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <div className="fixed top-16 inset-x-0 z-40 h-[3px] bg-black/40">
      <div ref={barRef} className="h-full bg-[#F4C10F] transition-[width] duration-150 ease-out" style={{ width: '0%' }} />
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Diagonal yellow/black inspection-tape marquee                      */
/* ------------------------------------------------------------------ */
const TapeMarquee = () => (
  <div className="tape-band relative overflow-hidden border-y-2 border-black">
    <div className="tape-track flex whitespace-nowrap py-2.5">
      {[...TICKER_ITEMS, ...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
        <span key={i} className="mx-6 font-heading italic text-[13px] font-medium tracking-wide text-black/85">
          {item}
          <span className="mx-6 text-black/40 not-italic">&#10022;</span>
        </span>
      ))}
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/*  Rotating certification seal \u2014 the one deliberate motion moment    */
/* ------------------------------------------------------------------ */
const CertificationSeal = () => {
  const words = 'CERTIFIED SCAN \u00b7 RULES 2011 \u00b7 VERIFIED \u00b7 ';
  const repeated = words.repeat(3);
  const chars = repeated.split('');
  const radius = 54;
  return (
    <div className="seal-rotate relative h-32 w-32 flex-shrink-0" aria-hidden="true">
      <svg viewBox="0 0 140 140" className="h-full w-full">
        <circle cx="70" cy="70" r="66" fill="#F4C10F" stroke="#0A0A0A" strokeWidth="2" />
        <circle cx="70" cy="70" r="46" fill="none" stroke="#0A0A0A" strokeWidth="1" strokeDasharray="2 3" />
        <text fontSize="7.4" fontWeight="700" fill="#0A0A0A" letterSpacing="1.5">
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
                fontSize="7.4"
                fontWeight="700"
                fill="#0A0A0A"
                textAnchor="middle"
                transform={`rotate(${angle + 90}, ${x}, ${y})`}
              >
                {ch}
              </text>
            );
          })}
        </text>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <FiCheckCircle className="h-9 w-9 text-black" />
      </div>
    </div>
  );
};

const SectionMark = ({ n, label }) => (
  <div className="flex items-baseline space-x-3 mb-4">
    <span className="font-heading italic text-sm text-[#C99A00]">&sect;{n}</span>
    <span className="text-xs font-semibold text-gray-500 tracking-wide">{label}</span>
  </div>
);

const MockupCheckRow = ({ status, rule, citation }) => {
  const dot = { pass: 'bg-emerald-500', fail: 'bg-rose-500', review: 'bg-[#F4C10F]' };
  const badge = {
    pass: 'bg-emerald-500/15 text-emerald-300',
    fail: 'bg-rose-500/15 text-rose-300',
    review: 'bg-[#F4C10F]/15 text-[#F4C10F]',
  };
  const labels = { pass: 'Pass', fail: 'Fail', review: 'Review' };
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center space-x-2.5 min-w-0">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot[status]}`} />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-white/90 truncate">{rule}</p>
          <p className="text-[10px] text-white/40 font-data">{citation}</p>
        </div>
      </div>
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm flex-shrink-0 ml-2 ${badge[status]}`}>
        {labels[status]}
      </span>
    </div>
  );
};

const HeroMockup = () => (
  <div className="relative w-full max-w-lg mx-auto lg:mx-0">
    <div className="absolute -inset-1 bg-[#F4C10F]/10 rounded-sm blur-xl" />
    <div className="relative bg-[#111111] border-2 border-[#F4C10F]/30 rounded-sm overflow-hidden shadow-2xl">
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span className="text-[11px] font-semibold text-white/70 tracking-wide">Scan Result</span>
        </div>
        <span className="text-[10px] font-data text-white/30">Case #4821</span>
      </div>

      <div className="p-4">
        <div className="relative bg-white/5 rounded-sm overflow-hidden mb-4">
          <div className="h-36 sm:h-44 bg-[#161616] flex items-center justify-center relative">
            <div className="absolute inset-0 opacity-20" style={{
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 8px, rgba(255,255,255,0.03) 8px, rgba(255,255,255,0.03) 9px), repeating-linear-gradient(90deg, transparent, transparent 8px, rgba(255,255,255,0.03) 8px, rgba(255,255,255,0.03) 9px)',
            }} />
            <div className="absolute top-3 left-6 w-24 h-8 border-2 border-emerald-500 bg-emerald-500/10 rounded-sm">
              <span className="absolute -top-3.5 left-0 text-[8px] font-bold bg-emerald-500 text-white px-1.5 py-0.5 rounded-sm">MRP</span>
            </div>
            <div className="absolute top-14 left-4 w-32 h-7 border-2 border-[#F4C10F] bg-[#F4C10F]/10 rounded-sm">
              <span className="absolute -top-3.5 left-0 text-[8px] font-bold bg-[#F4C10F] text-black px-1.5 py-0.5 rounded-sm">Net Qty</span>
            </div>
            <div className="absolute bottom-6 left-4 right-4 h-10 border-2 border-rose-500 bg-rose-500/10 rounded-sm">
              <span className="absolute -top-3.5 left-0 text-[8px] font-bold bg-rose-500 text-white px-1.5 py-0.5 rounded-sm">Manufacturer</span>
            </div>
            <FiSearch className="h-8 w-8 text-white/15" />
          </div>
        </div>

        <div className="mb-3">
          <p className="text-sm font-bold text-white">Premium Basmati Rice, 1kg</p>
          <p className="text-[11px] text-white/50">Agro Foods Pvt. Ltd. &middot; GTIN <span className="font-data">8901234567890</span></p>
        </div>

        <div className="flex items-center space-x-2 mb-3 px-3 py-2 bg-rose-500/10 border border-rose-500/20 rounded-sm">
          <FiXCircle className="h-4 w-4 text-rose-400 flex-shrink-0" />
          <span className="text-xs font-bold text-rose-300">Non-compliant</span>
          <span className="text-[10px] text-rose-400/60 ml-auto">2 failures</span>
        </div>

        <div className="space-y-0 divide-y divide-white/5">
          <MockupCheckRow status="pass" rule="MRP Declaration" citation="Rule 6(1)(e)" />
          <MockupCheckRow status="fail" rule="Manufacturer Address" citation="Rule 6(1)(a)" />
          <MockupCheckRow status="pass" rule="Net Quantity" citation="Rule 6(1)(c) / 11" />
          <MockupCheckRow status="review" rule="Consumer Care Details" citation="Rule 6(2)" />
        </div>
      </div>
    </div>
  </div>
);

/* Feature / violation card with a peeling yellow-black corner tag,
   triggered on hover only \u2014 the interaction answers the pointer. */
const CornerTagCard = ({ icon: Icon, title, desc, dark = false }) => (
  <div className={`corner-tag group relative p-6 overflow-hidden transition-colors duration-300 ${dark ? 'bg-[#111111] hover:bg-[#161616]' : 'bg-white hover:bg-[#FFFCF2]'}`}>
    <span className="corner-tag__flag" aria-hidden="true" />
    <Icon className={`h-5 w-5 mb-4 transition-transform duration-300 group-hover:-translate-y-0.5 ${dark ? 'text-[#F4C10F]' : 'text-[#8A6A00]'}`} />
    <h3 className={`font-heading text-base font-semibold mb-1.5 ${dark ? 'text-white' : 'text-[#0A0A0A]'}`}>{title}</h3>
    <p className={`text-sm leading-relaxed ${dark ? 'text-white/55' : 'text-gray-600'}`}>{desc}</p>
  </div>
);

const LandingPage = () => {
  const [scrolled, setScrolled] = useState(false);
  useScrollReveal();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleAnchor = useCallback((e, href) => {
    e.preventDefault();
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  return (
    <div className="font-body min-h-screen bg-white text-[#1E2A3A]">
      <style>{`
        @keyframes seal-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .seal-rotate svg { animation: seal-spin 22s linear infinite; }
        @media (prefers-reduced-motion: reduce) {
          .seal-rotate svg { animation: none; }
        }

        .tape-band {
          background: repeating-linear-gradient(
            -45deg,
            #F4C10F 0px, #F4C10F 26px,
            #0A0A0A 26px, #0A0A0A 52px
          );
        }
        .tape-track { animation: tape-scroll 34s linear infinite; width: max-content; }
        @keyframes tape-scroll { from { transform: translateX(0); } to { transform: translateX(-33.333%); } }
        @media (prefers-reduced-motion: reduce) {
          .tape-track { animation: none; }
        }

        .reveal { opacity: 0; transform: translateY(18px); transition: opacity .6s cubic-bezier(.2,.7,.2,1), transform .6s cubic-bezier(.2,.7,.2,1); }
        .reveal.is-in { opacity: 1; transform: translateY(0); }
        .reveal-1.is-in { transition-delay: .05s; }
        .reveal-2.is-in { transition-delay: .12s; }
        .reveal-3.is-in { transition-delay: .19s; }
        .reveal-4.is-in { transition-delay: .26s; }

        .corner-tag { border: 1px solid rgba(10,10,10,0.08); }
        .corner-tag__flag {
          position: absolute; top: 0; right: 0; width: 26px; height: 26px;
          background: repeating-linear-gradient(-45deg, #F4C10F 0 5px, #0A0A0A 5px 10px);
          clip-path: polygon(100% 0, 0 0, 100% 100%);
          transition: width .28s ease, height .28s ease;
        }
        .corner-tag:hover .corner-tag__flag { width: 46px; height: 46px; }

        .cta-sweep { position: relative; overflow: hidden; z-index: 0; }
        .cta-sweep::before {
          content: ''; position: absolute; inset: 0; background: #0A0A0A;
          transform: translateX(-101%); transition: transform .32s cubic-bezier(.2,.7,.2,1); z-index: -1;
        }
        .cta-sweep:hover::before { transform: translateX(0); }
        .cta-sweep:hover { color: #F4C10F !important; }
        .cta-sweep:hover .cta-sweep-icon { transform: translateX(3px); }
        .cta-sweep-icon { transition: transform .2s ease; }

        .nav-link { position: relative; }
        .nav-link::after {
          content: ''; position: absolute; left: 0; right: 100%; bottom: -6px; height: 2px;
          background: #F4C10F; transition: right .25s cubic-bezier(.2,.7,.2,1);
        }
        .nav-link:hover::after { right: 0; }

        .stat-cell { transition: background-color .25s ease; }
        .stat-cell:hover { background-color: rgba(244,193,15,0.06); }

        .row-hover { transition: background-color .2s ease; }
        .row-hover:hover { background-color: #FBF6E4; }
      `}</style>

      {/* \u2500\u2500\u2500 Navbar \u2500\u2500\u2500 */}
      <nav className={`fixed top-0 inset-x-0 z-50 transition-colors duration-300 ${scrolled ? 'bg-[#0A0A0A]/95 backdrop-blur-md shadow-sm' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2.5">
            <img src="/logo.png" alt="TrueMark" className="h-8 w-auto object-contain" />
            <span className="font-heading italic text-xl font-semibold text-white tracking-tight">TrueMark</span>
          </Link>

          <div className="hidden md:flex items-center space-x-8">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => handleAnchor(e, link.href)}
                className="nav-link text-sm font-medium text-white/70 hover:text-white transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="flex items-center space-x-3">
            <Link
              to="/login"
              className="hidden sm:inline-flex items-center px-4 py-2 text-sm font-semibold text-white/90 border border-white/25 rounded-sm hover:border-[#F4C10F] hover:text-[#F4C10F] transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/upload"
              className="cta-sweep inline-flex items-center px-4 py-2 text-sm font-semibold text-black bg-[#F4C10F] rounded-sm transition-colors"
            >
              Try Demo
            </Link>
          </div>
        </div>
      </nav>
      <ScrollProgress />

      {/* \u2500\u2500\u2500 Hero \u2500\u2500\u2500 */}
      <section className="relative pt-32 pb-0 sm:pt-40 overflow-hidden bg-[#0A0A0A]">
        <div className="absolute inset-0 opacity-[0.05]" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '28px 28px',
        }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24 sm:pb-28">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <div className="inline-flex items-center space-x-2 mb-6">
                <span className="h-1.5 w-1.5 bg-[#F4C10F]" />
                <span className="text-xs font-semibold text-white/60 tracking-wide">Smart India Hackathon 2026 &middot; PS26034 &middot; Ministry of Consumer Affairs</span>
              </div>

              <h1 className="font-heading italic text-4xl sm:text-5xl lg:text-[3.4rem] font-medium text-white leading-[1.14] tracking-tight max-w-xl">
                Every pack makes eight legal promises. TrueMark checks them in seconds.
              </h1>

              <p className="mt-6 text-base sm:text-lg text-white/60 leading-relaxed max-w-xl">
                Photograph a label and TrueMark reads it, checks it against the Legal Metrology
                (Packaged Commodities) Rules, 2011, and hands back a verdict with the exact
                sub-rule behind every finding &mdash; no rulebook required in the field.
              </p>

              <div className="mt-9 flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                <Link
                  to="/upload"
                  className="cta-sweep inline-flex items-center space-x-2 px-6 py-3 bg-[#F4C10F] text-black font-semibold rounded-sm transition-colors"
                >
                  <span>Inspector Demo</span>
                  <FiArrowRight className="cta-sweep-icon h-4 w-4" />
                </Link>
                <Link
                  to="/report"
                  className="inline-flex items-center space-x-2 px-6 py-3 border border-white/25 hover:border-[#F4C10F] hover:text-[#F4C10F] text-white font-semibold rounded-sm transition-colors"
                >
                  <FiAlertTriangle className="h-4 w-4" />
                  <span>Report a Violation</span>
                </Link>
              </div>

              <p className="mt-4 text-xs text-white/35">No account needed to submit a citizen report.</p>

              <div className="hidden sm:flex items-center space-x-4 mt-10">
                <CertificationSeal />
                <p className="font-heading italic text-sm text-white/45 leading-snug max-w-[13rem]">
                  Every verdict carries the sub-rule it was checked against &mdash; nothing is asserted without a citation.
                </p>
              </div>
            </div>

            <div className="hidden lg:block">
              <HeroMockup />
            </div>
          </div>
        </div>

        <TapeMarquee />
      </section>

      {/* \u2500\u2500\u2500 Stats Strip \u2500\u2500\u2500 */}
      <section className="bg-[#0A0A0A] border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-white/10">
            {STATS.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div key={i} className="stat-cell flex items-center space-x-3 py-6 px-4 sm:px-6">
                  <Icon className="h-5 w-5 text-[#F4C10F] flex-shrink-0" />
                  <div>
                    <p className="text-sm font-bold font-heading text-white">
                      <CountUp value={stat.value} numeric={stat.numeric} />
                    </p>
                    <p className="text-xs text-white/45 leading-tight">{stat.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* \u2500\u2500\u2500 The Problem \u2500\u2500\u2500 */}
      <section id="problem" className="py-24 sm:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-5 reveal">
              <SectionMark n="01" label="The Problem" />
              <h2 className="font-heading text-3xl sm:text-4xl font-semibold text-[#0A0A0A] tracking-tight leading-tight">
                Manual inspection can&rsquo;t keep pace with the market
              </h2>
              <p className="mt-5 text-gray-600 leading-relaxed">
                Every packaged commodity sold in India &mdash; in a kirana store, a supermarket,
                or on an e-commerce platform &mdash; must carry mandatory declarations under the
                Legal Metrology Act, 2009 and the Legal Metrology (Packaged Commodities) Rules,
                2011: manufacturer details, net quantity, MRP, date of packing, and consumer-care
                information, each in a prescribed format.
              </p>
              <p className="mt-4 text-gray-600 leading-relaxed">
                Given the sheer volume and variety of products on shelves and online, checking
                every pack by hand against a printed rulebook is slow and inconsistent between
                officers. Violations like missing declarations, undersized MRP text, and
                mismatched online listings routinely go unnoticed until a complaint is filed.
              </p>
              <p className="mt-5 font-heading italic text-[#8A6A00] text-base leading-snug border-l-2 border-[#F4C10F] pl-4">
                This is the check a compliant pack should already pass.
              </p>
            </div>

            <div className="lg:col-span-7 lg:pl-8">
              <div className="border-t border-gray-200">
                {VIOLATIONS.map((v, i) => (
                  <div key={i} className={`row-hover reveal reveal-${(i % 4) + 1} grid grid-cols-12 gap-4 py-6 px-3 -mx-3 border-b border-gray-200`}>
                    <div className="col-span-3 sm:col-span-2">
                      <span className="inline-block text-[11px] font-data font-semibold text-black bg-[#F4C10F] px-2 py-1 rounded-sm">
                        {v.rule}
                      </span>
                    </div>
                    <div className="col-span-9 sm:col-span-10">
                      <h3 className="font-heading text-base font-semibold text-[#0A0A0A] mb-1">{v.title}</h3>
                      <p className="text-sm text-gray-500 leading-relaxed">{v.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* \u2500\u2500\u2500 The Solution \u2500\u2500\u2500 */}
      <section id="solution" className="py-24 sm:py-28 bg-[#0A0A0A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl reveal">
            <SectionMark n="02" label="The Solution" />
            <h2 className="font-heading italic text-3xl sm:text-4xl font-medium text-white tracking-tight leading-tight">
              A rule engine that reads a label the way an inspector would
            </h2>
            <p className="mt-5 text-white/60 leading-relaxed">
              TrueMark is a web and mobile application that scans a product photo, extracts every
              declaration printed on it, and checks each one against the versioned 2011 Rules.
              Officers get a verdict with citations in seconds; supervisors get a searchable
              history of every scan and a dashboard of enforcement activity.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-white/10 rounded-sm overflow-hidden">
            {[
              { icon: FiSearch, title: 'Extraction', desc: 'OCR pulls every declaration from the pack image, in Hindi or English.' },
              { icon: FiType, title: 'Validation', desc: 'Font size, placement and completeness are checked against Rules 5\u20138.' },
              { icon: FiDatabase, title: 'Repository', desc: 'Every scan, verdict and photo is stored against the product\u2019s GTIN.' },
              { icon: FiBarChart2, title: 'Oversight', desc: 'Dashboards surface violation trends across officers, regions and time.' },
            ].map((b, i) => (
              <div key={i} className={`reveal reveal-${i + 1}`}>
                <CornerTagCard icon={b.icon} title={b.title} desc={b.desc} dark />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* \u2500\u2500\u2500 How It Works \u2500\u2500\u2500 */}
      <section id="how-it-works" className="py-24 sm:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="reveal">
            <SectionMark n="03" label="How it Works" />
            <h2 className="font-heading text-3xl sm:text-4xl font-semibold text-[#0A0A0A] tracking-tight leading-tight max-w-lg">
              From field photo to evidence report, in three steps
            </h2>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-10 lg:gap-12">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={i} className={`reveal reveal-${i + 1} relative pl-6 border-l-2 border-[#0A0A0A]/10`}>
                  <span className="font-heading italic text-3xl text-[#C99A00]/50">{step.num}</span>
                  <div className="mt-4 mb-4 inline-flex items-center justify-center h-10 w-10 rounded-sm bg-[#0A0A0A] text-[#F4C10F]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-heading text-xl font-semibold text-[#0A0A0A] mb-2">{step.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{step.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <TapeMarquee />

      {/* \u2500\u2500\u2500 Feature Grid \u2500\u2500\u2500 */}
      <section id="features" className="py-24 sm:py-28 bg-[#FBF6E4]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="reveal">
            <SectionMark n="04" label="Features" />
            <h2 className="font-heading text-3xl sm:text-4xl font-semibold text-[#0A0A0A] tracking-tight leading-tight max-w-lg">
              Built for the workflow of a field officer
            </h2>
          </div>

          <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-[#0A0A0A]/10 rounded-sm overflow-hidden">
            {FEATURES.map((feature, i) => (
              <div key={i} className={`reveal reveal-${(i % 4) + 1}`}>
                <CornerTagCard icon={feature.icon} title={feature.title} desc={feature.desc} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* \u2500\u2500\u2500 Why TrueMark \u2500\u2500\u2500 */}
      <section className="py-24 sm:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-14 reveal">
            <SectionMark n="05" label="Why TrueMark" />
            <h2 className="font-heading italic text-3xl sm:text-4xl font-medium text-[#0A0A0A] tracking-tight leading-tight">
              What changes when the rulebook is built in
            </h2>
            <p className="mt-5 text-gray-600 leading-relaxed">
              TrueMark doesn&rsquo;t replace an officer&rsquo;s judgment &mdash; it removes the
              parts of the check that are mechanical, so judgment can go where it matters.
            </p>
          </div>

          <div className="border-t border-gray-200">
            <div className="grid grid-cols-12 gap-4 py-4 text-xs font-semibold text-gray-400 tracking-wide">
              <div className="col-span-4 sm:col-span-3" />
              <div className="col-span-4 sm:col-span-4">Manual inspection</div>
              <div className="col-span-4 sm:col-span-5">With TrueMark</div>
            </div>
            {COMPARISON.map((row, i) => (
              <div key={i} className={`row-hover reveal reveal-${(i % 4) + 1} grid grid-cols-12 gap-4 py-5 px-3 -mx-3 border-t border-gray-200 items-start`}>
                <div className="col-span-12 sm:col-span-3 font-heading text-sm font-semibold text-[#0A0A0A] mb-2 sm:mb-0">
                  {row.label}
                </div>
                <div className="col-span-6 sm:col-span-4 flex items-start space-x-2">
                  <FiClock className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-500 leading-relaxed">{row.manual}</span>
                </div>
                <div className="col-span-6 sm:col-span-5 flex items-start space-x-2">
                  <FiCheckCircle className="h-4 w-4 text-[#8A6A00] flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-[#0A0A0A] leading-relaxed">{row.truemark}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* \u2500\u2500\u2500 Trust / Credibility Bar \u2500\u2500\u2500 */}
      <section className="py-14 bg-[#F4C10F] border-t-2 border-black">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-5 sm:space-y-0 sm:space-x-4 text-center sm:text-left">
            <FiShield className="h-6 w-6 text-black flex-shrink-0" />
            <p className="text-sm text-black/75 leading-relaxed max-w-2xl">
              <span className="font-semibold text-black">Built for enforcement officers</span> under
              the Ministry of Consumer Affairs, Food &amp; Public Distribution, aligned to the
              Legal Metrology (Packaged Commodities) Rules, 2011.
            </p>
          </div>
        </div>
      </section>

      {/* \u2500\u2500\u2500 Footer \u2500\u2500\u2500 */}
      <footer id="footer" className="bg-[#0A0A0A] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
            <div className="lg:col-span-2">
              <div className="flex items-center space-x-2.5 mb-4">
                <img src="/logo.png" alt="TrueMark" className="h-8 w-auto object-contain filter brightness-0 invert" />
                <span className="font-heading italic text-xl font-semibold tracking-tight">TrueMark</span>
              </div>
              <p className="text-sm text-white/50 leading-relaxed max-w-sm">
                Compliance scanning for Legal Metrology enforcement, built for Smart India
                Hackathon 2026.
              </p>
              <div className="flex items-center space-x-4 mt-5">
                <FiLock className="h-4 w-4 text-white/30" />
                <span className="text-xs text-white/40">Role-based access &amp; secure authentication</span>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-white mb-4">For</h4>
              <ul className="space-y-2.5">
                <li className="text-sm text-white/50 flex items-center space-x-1.5">
                  <FiUsers className="h-3.5 w-3.5" />
                  <span>Enforcement officers</span>
                </li>
                <li className="text-sm text-white/50 flex items-center space-x-1.5">
                  <FiAlertTriangle className="h-3.5 w-3.5" />
                  <span>Citizens reporting violations</span>
                </li>
                <li className="text-sm text-white/50 flex items-center space-x-1.5">
                  <FiBarChart2 className="h-3.5 w-3.5" />
                  <span>Supervisory oversight</span>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Links</h4>
              <ul className="space-y-2.5">
                <li>
                  <a href="https://github.com/Mohammadsaif1915/TRUEMARK-AI" target="_blank" rel="noopener noreferrer" className="text-sm text-white/50 hover:text-[#F4C10F] transition-colors flex items-center space-x-1.5">
                    <FiGithub className="h-3.5 w-3.5" />
                    <span>GitHub</span>
                  </a>
                </li>
                <li>
                  <a href="#!" className="text-sm text-white/50 hover:text-[#F4C10F] transition-colors flex items-center space-x-1.5">
                    <FiBook className="h-3.5 w-3.5" />
                    <span>Documentation</span>
                  </a>
                </li>
                <li>
                  <a href="mailto:team@truemark.in" className="text-sm text-white/50 hover:text-[#F4C10F] transition-colors flex items-center space-x-1.5">
                    <FiMail className="h-3.5 w-3.5" />
                    <span>Contact</span>
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0">
            <p className="text-xs text-white/35">&copy; {new Date().getFullYear()} TrueMark. Built by a 6-member team for Smart India Hackathon 2026.</p>
            <p className="text-xs text-white/25 font-data">PS26034 &middot; Legal Metrology (Packaged Commodities) Rules, 2011</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;