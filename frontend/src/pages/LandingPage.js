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

  RENDER-SAFETY NOTE (read this if a dark section ever shows up blank/white)
  Tailwind's arbitrary-value + opacity-slash utilities (bg-[#0A0A0A],
  text-white/60, border-white/25, divide-white/10, bg-[#F4C10F]/15, ...)
  depend on the JIT scanner picking up the *exact* class string at build
  time. If this file is new, or the dev server didn't rebuild, or an older
  Tailwind version is in play, those utilities can silently fail to
  generate \u2014 which looks exactly like a black hero section rendering
  white with near-invisible white-on-white text.

  To make this file immune to that class of bug, every background color,
  text color, and border color that matters for legibility (dark-section
  fills, white/opacity body text, translucent chips) is set with an inline
  `style` instead of a Tailwind color utility. Inline styles are plain CSS
  the browser always applies, independent of Tailwind's build step. Layout
  utilities (flex, grid, spacing, rounded-sm, font sizes, etc.) stay as
  Tailwind classes since those are core utilities and don't have this
  failure mode.
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
  { label: 'Time per product', manual: '8\u201315 minutes, rulebook in hand', truemark: 'Under 30 seconds', fill: 92 },
  { label: 'Consistency across officers', manual: 'Varies by training and fatigue', truemark: 'Same 8 checks, every time', fill: 96 },
  { label: 'Legal citation on record', manual: 'Written up after the fact, if at all', truemark: 'Attached automatically to every verdict', fill: 100 },
  { label: 'Repeat-offender tracking', manual: 'Relies on institutional memory', truemark: 'Flagged by GTIN scan history', fill: 88 },
  { label: 'Online listing check', manual: 'Not typically performed', truemark: 'Built into every scan', fill: 100 },
];

const TICKER_ITEMS = [
  'LEGAL METROLOGY ACT, 2009',
  'PACKAGED COMMODITIES RULES, 2011',
  'RULE 6 \u00b7 DECLARATIONS',
  'RULE 7 \u00b7 TYPE SIZE',
  'RULE 11 \u00b7 NET QUANTITY',
  'CERTIFIED SCAN RESULT',
];

/* Reusable inline-style tokens \u2014 plain rgba so they never depend on the
   Tailwind build picking up an arbitrary-value / opacity-slash class. */
const INK = '#0A0A0A';
const GOLD = '#F4C10F';
const white = (a) => `rgba(255,255,255,${a})`;
const ink = (a) => `rgba(10,10,10,${a})`;
const gold = (a) => `rgba(244,193,15,${a})`;
const emerald = (a) => `rgba(16,185,129,${a})`;
const rose = (a) => `rgba(244,63,94,${a})`;

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
/*  Thin reading-progress bar under the nav, with a soft glow head     */
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
    <div className="fixed top-16 inset-x-0 z-40 h-[3px]" style={{ backgroundColor: ink(0.4) }}>
      <div
        ref={barRef}
        className="relative h-full transition-[width] duration-150 ease-out"
        style={{ width: '0%', backgroundColor: GOLD, boxShadow: `0 0 12px 1px ${gold(0.85)}` }}
      />
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Diagonal yellow/black inspection-tape marquee, edges softly faded  */
/* ------------------------------------------------------------------ */
const TapeMarquee = () => (
  <div className="tape-band relative overflow-hidden" style={{ borderTop: `2px solid ${INK}`, borderBottom: `2px solid ${INK}` }}>
    <div className="tape-track flex whitespace-nowrap py-2.5">
      {[...TICKER_ITEMS, ...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
        <span key={i} className="mx-6 font-heading italic text-[13px] font-medium tracking-wide" style={{ color: ink(0.85) }}>
          {item}
          <span className="mx-6 not-italic" style={{ color: ink(0.4) }}>&#10022;</span>
        </span>
      ))}
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/*  Rotating certification seal, with a breathing glow ring             */
/* ------------------------------------------------------------------ */
const CertificationSeal = () => {
  const words = 'CERTIFIED SCAN \u00b7 RULES 2011 \u00b7 VERIFIED \u00b7 ';
  const repeated = words.repeat(3);
  const chars = repeated.split('');
  const radius = 54;
  return (
    <div className="seal-glow relative h-32 w-32 flex-shrink-0" aria-hidden="true">
      <div className="seal-halo absolute inset-[-10px] rounded-full" />
      <div className="seal-rotate relative h-32 w-32">
        <svg viewBox="0 0 140 140" className="h-full w-full" style={{ filter: `drop-shadow(0 0 18px ${gold(0.35)})` }}>
          <circle cx="70" cy="70" r="66" fill={GOLD} stroke={INK} strokeWidth="2" />
          <circle cx="70" cy="70" r="46" fill="none" stroke={INK} strokeWidth="1" strokeDasharray="2 3" />
          <text fontSize="7.4" fontWeight="700" fill={INK} letterSpacing="1.5">
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
                  fill={INK}
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
          <FiCheckCircle className="h-9 w-9" style={{ color: INK }} />
        </div>
      </div>
    </div>
  );
};

const SectionMark = ({ n, label }) => (
  <div className="flex items-baseline space-x-3 mb-4">
    <span className="font-heading italic text-sm" style={{ color: '#C99A00' }}>&sect;{n}</span>
    <span className="text-xs font-semibold tracking-wide" style={{ color: '#6B7280' }}>{label}</span>
  </div>
);

const MockupCheckRow = ({ status, rule, citation }) => {
  const dotColor = { pass: '#10B981', fail: '#F43F5E', review: GOLD };
  const dotGlow = { pass: emerald(0.5), fail: rose(0.65), review: gold(0.6) };
  const badgeBg = { pass: emerald(0.15), fail: rose(0.15), review: gold(0.15) };
  const badgeText = { pass: '#6EE7B7', fail: '#FDA4AF', review: GOLD };
  const labels = { pass: 'Pass', fail: 'Fail', review: 'Review' };
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center space-x-2.5 min-w-0">
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: dotColor[status], boxShadow: `0 0 8px 1px ${dotGlow[status]}` }}
        />
        <div className="min-w-0">
          <p className="text-xs font-semibold truncate" style={{ color: white(0.9) }}>{rule}</p>
          <p className="text-[10px] font-data" style={{ color: white(0.4) }}>{citation}</p>
        </div>
      </div>
      <span
        className="text-[10px] font-bold px-2 py-0.5 rounded-sm flex-shrink-0 ml-2"
        style={{ backgroundColor: badgeBg[status], color: badgeText[status] }}
      >
        {labels[status]}
      </span>
    </div>
  );
};

const HeroMockup = () => (
  <div className="relative w-full max-w-lg mx-auto lg:mx-0">
    <div className="absolute -inset-1 rounded-sm blur-xl" style={{ backgroundColor: gold(0.1) }} />
    <div
      className="mockup-frame relative rounded-sm overflow-hidden shadow-2xl"
      style={{ backgroundColor: '#111111', border: `2px solid ${gold(0.3)}` }}
    >
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: `1px solid ${white(0.1)}` }}>
        <div className="flex items-center space-x-2">
          <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: '#10B981', boxShadow: `0 0 6px 1px ${emerald(0.7)}` }} />
          <span className="text-[11px] font-semibold tracking-wide" style={{ color: white(0.7) }}>Scan Result</span>
        </div>
        <span className="text-[10px] font-data" style={{ color: white(0.3) }}>Case #4821</span>
      </div>

      <div className="p-4">
        <div className="relative rounded-sm overflow-hidden mb-4" style={{ backgroundColor: white(0.05) }}>
          <div className="h-36 sm:h-44 flex items-center justify-center relative" style={{ backgroundColor: '#161616' }}>
            <div className="absolute inset-0 opacity-20" style={{
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 8px, rgba(255,255,255,0.03) 8px, rgba(255,255,255,0.03) 9px), repeating-linear-gradient(90deg, transparent, transparent 8px, rgba(255,255,255,0.03) 8px, rgba(255,255,255,0.03) 9px)',
            }} />
            <span className="scan-laser absolute left-0 right-0 h-8" aria-hidden="true" />
            <div className="absolute top-3 left-6 w-24 h-8 rounded-sm" style={{ border: '2px solid #10B981', backgroundColor: emerald(0.1) }}>
              <span className="absolute -top-3.5 left-0 text-[8px] font-bold px-1.5 py-0.5 rounded-sm" style={{ backgroundColor: '#10B981', color: '#fff' }}>MRP</span>
            </div>
            <div className="absolute top-14 left-4 w-32 h-7 rounded-sm" style={{ border: `2px solid ${GOLD}`, backgroundColor: gold(0.1) }}>
              <span className="absolute -top-3.5 left-0 text-[8px] font-bold px-1.5 py-0.5 rounded-sm" style={{ backgroundColor: GOLD, color: INK }}>Net Qty</span>
            </div>
            <div className="absolute bottom-6 left-4 right-4 h-10 rounded-sm" style={{ border: '2px solid #F43F5E', backgroundColor: rose(0.1) }}>
              <span className="absolute -top-3.5 left-0 text-[8px] font-bold px-1.5 py-0.5 rounded-sm" style={{ backgroundColor: '#F43F5E', color: '#fff' }}>Manufacturer</span>
            </div>
            <FiSearch className="h-8 w-8 relative z-10" style={{ color: white(0.15) }} />
          </div>
        </div>

        <div className="mb-3">
          <p className="text-sm font-bold" style={{ color: '#fff' }}>Premium Basmati Rice, 1kg</p>
          <p className="text-[11px]" style={{ color: white(0.5) }}>Agro Foods Pvt. Ltd. &middot; GTIN <span className="font-data">8901234567890</span></p>
        </div>

        <div className="flex items-center space-x-2 mb-3 px-3 py-2 rounded-sm" style={{ backgroundColor: rose(0.1), border: `1px solid ${rose(0.2)}` }}>
          <FiXCircle className="h-4 w-4 flex-shrink-0" style={{ color: '#FB7185' }} />
          <span className="text-xs font-bold" style={{ color: '#FDA4AF' }}>Non-compliant</span>
          <span className="text-[10px] ml-auto" style={{ color: rose(0.6) }}>2 failures</span>
        </div>

        <div className="space-y-0" style={{ borderTop: `1px solid transparent` }}>
          <div style={{ borderBottom: `1px solid ${white(0.05)}` }}><MockupCheckRow status="pass" rule="MRP Declaration" citation="Rule 6(1)(e)" /></div>
          <div style={{ borderBottom: `1px solid ${white(0.05)}` }}><MockupCheckRow status="fail" rule="Manufacturer Address" citation="Rule 6(1)(a)" /></div>
          <div style={{ borderBottom: `1px solid ${white(0.05)}` }}><MockupCheckRow status="pass" rule="Net Quantity" citation="Rule 6(1)(c) / 11" /></div>
          <div><MockupCheckRow status="review" rule="Consumer Care Details" citation="Rule 6(2)" /></div>
        </div>
      </div>
    </div>
  </div>
);

/* Feature / violation card: peeling yellow-black corner tag on hover,
   plus a subtle lift, glow-ring and gradient sheen so the interaction
   answers the pointer with real weight instead of a flat color swap. */
const CornerTagCard = ({ icon: Icon, title, desc, dark = false }) => (
  <div
    className="corner-tag group relative p-6 overflow-hidden transition-all duration-300"
    style={{
      backgroundColor: dark ? '#111111' : '#fff',
      border: `1px solid ${dark ? white(0.08) : ink(0.08)}`,
    }}
    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = dark ? '#161616' : '#FFFCF2'; }}
    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = dark ? '#111111' : '#fff'; }}
  >
    <span className="corner-tag__sheen" aria-hidden="true" />
    <span className="corner-tag__flag" aria-hidden="true" />
    <Icon className="relative h-5 w-5 mb-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:scale-110" style={{ color: dark ? GOLD : '#8A6A00' }} />
    <h3 className="relative font-heading text-base font-semibold mb-1.5" style={{ color: dark ? '#fff' : INK }}>{title}</h3>
    <p className="relative text-sm leading-relaxed" style={{ color: dark ? white(0.55) : '#4B5563' }}>{desc}</p>
  </div>
);

const LandingPage = () => {
  const [scrolled, setScrolled] = useState(false);
  const heroRef = useRef(null);
  useScrollReveal();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Cursor-tracked glow behind the hero copy \u2014 one deliberate premium
  // touch, confined to the hero, skipped entirely for reduced-motion.
  useEffect(() => {
    const node = heroRef.current;
    if (!node || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const onMove = (e) => {
      const rect = node.getBoundingClientRect();
      node.style.setProperty('--mx', `${e.clientX - rect.left}px`);
      node.style.setProperty('--my', `${e.clientY - rect.top}px`);
    };
    node.addEventListener('mousemove', onMove);
    return () => node.removeEventListener('mousemove', onMove);
  }, []);

  const handleAnchor = useCallback((e, href) => {
    e.preventDefault();
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  return (
    <div className="font-body min-h-screen" style={{ backgroundColor: '#fff', color: '#1E2A3A' }}>
      <style>{`
        @keyframes seal-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .seal-rotate svg { animation: seal-spin 22s linear infinite; }
        @keyframes seal-breathe { 0%, 100% { opacity: .35; transform: scale(1); } 50% { opacity: .7; transform: scale(1.06); } }
        .seal-halo { background: radial-gradient(circle, rgba(244,193,15,0.55) 0%, rgba(244,193,15,0) 70%); animation: seal-breathe 3.2s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .seal-rotate svg { animation: none; }
          .seal-halo { animation: none; }
        }

        .tape-band {
          background: repeating-linear-gradient(
            -45deg,
            #F4C10F 0px, #F4C10F 26px,
            #0A0A0A 26px, #0A0A0A 52px
          );
          -webkit-mask-image: linear-gradient(90deg, transparent 0, black 4%, black 96%, transparent 100%);
          mask-image: linear-gradient(90deg, transparent 0, black 4%, black 96%, transparent 100%);
        }
        .tape-track { animation: tape-scroll 34s linear infinite; width: max-content; }
        @keyframes tape-scroll { from { transform: translateX(0); } to { transform: translateX(-33.333%); } }
        @media (prefers-reduced-motion: reduce) {
          .tape-track { animation: none; }
        }

        .reveal { opacity: 0; transform: translateY(22px) scale(.985); filter: blur(4px); transition: opacity .65s cubic-bezier(.2,.7,.2,1), transform .65s cubic-bezier(.2,.7,.2,1), filter .65s cubic-bezier(.2,.7,.2,1); }
        .reveal.is-in { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        .reveal-1.is-in { transition-delay: .05s; }
        .reveal-2.is-in { transition-delay: .12s; }
        .reveal-3.is-in { transition-delay: .19s; }
        .reveal-4.is-in { transition-delay: .26s; }

        .corner-tag:hover { transform: translateY(-4px); box-shadow: 0 18px 34px -18px rgba(244,193,15,0.45); }
        .corner-tag__flag {
          position: absolute; top: 0; right: 0; width: 26px; height: 26px;
          background: repeating-linear-gradient(-45deg, #F4C10F 0 5px, #0A0A0A 5px 10px);
          clip-path: polygon(100% 0, 0 0, 100% 100%);
          transition: width .28s ease, height .28s ease;
        }
        .corner-tag:hover .corner-tag__flag { width: 46px; height: 46px; }
        .corner-tag__sheen {
          position: absolute; inset: 0; pointer-events: none;
          background: linear-gradient(115deg, transparent 40%, rgba(244,193,15,0.14) 50%, transparent 60%);
          transform: translateX(-120%); transition: transform .6s ease;
        }
        .corner-tag:hover .corner-tag__sheen { transform: translateX(120%); }

        .cta-sweep { position: relative; overflow: hidden; z-index: 0; animation: cta-pulse 2.6s ease-in-out infinite; }
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
        .cta-sweep:hover { color: #F4C10F !important; transform: translateY(-1px); }
        .cta-sweep:hover .cta-sweep-icon { transform: translateX(3px); }
        .cta-sweep-icon { transition: transform .2s ease; }
        @keyframes cta-pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(244,193,15,0.45); } 50% { box-shadow: 0 0 0 8px rgba(244,193,15,0); } }
        @media (prefers-reduced-motion: reduce) {
          .cta-sweep { animation: none; }
        }

        .nav-link { position: relative; }
        .nav-link::after {
          content: ''; position: absolute; left: 0; right: 100%; bottom: -6px; height: 2px;
          background: #F4C10F; box-shadow: 0 0 8px 1px rgba(244,193,15,0.7); transition: right .25s cubic-bezier(.2,.7,.2,1);
        }
        .nav-link:hover::after { right: 0; }

        .stat-cell { position: relative; transition: background-color .25s ease; }
        .stat-cell:hover { background-color: rgba(244,193,15,0.07); }
        .stat-cell::before {
          content: ''; position: absolute; inset: 0; border-top: 2px solid transparent; transition: border-color .25s ease;
        }
        .stat-cell:hover::before { border-color: #F4C10F; }

        .row-hover { transition: background-color .2s ease; }
        .row-hover:hover { background-color: #FBF6E4; }

        .hero-glow { background: radial-gradient(480px circle at var(--mx, 50%) var(--my, 20%), rgba(244,193,15,0.14), transparent 65%); }

        .mockup-frame { transition: transform .4s ease, box-shadow .4s ease; }
        .mockup-frame:hover { transform: translateY(-3px); box-shadow: 0 30px 60px -24px rgba(244,193,15,0.35); }

        .scan-laser {
          top: 0; z-index: 5; pointer-events: none;
          background: linear-gradient(180deg, rgba(244,193,15,0) 0%, rgba(244,193,15,0.28) 45%, rgba(244,193,15,0.85) 50%, rgba(244,193,15,0.28) 55%, rgba(244,193,15,0) 100%);
          animation: scan-sweep 3.2s cubic-bezier(.45,0,.2,1) infinite;
        }
        @keyframes scan-sweep { 0% { transform: translateY(-8px); opacity: 0; } 8% { opacity: 1; } 92% { opacity: 1; } 100% { transform: translateY(150px); opacity: 0; } }
        @media (prefers-reduced-motion: reduce) {
          .scan-laser { animation: none; display: none; }
          .mockup-frame:hover { transform: none; }
          .corner-tag:hover { transform: none; }
        }

        .fill-bar { position: relative; height: 4px; border-radius: 2px; background: rgba(10,10,10,0.08); overflow: hidden; }
        .fill-bar__value {
          position: absolute; inset: 0 auto 0 0; width: 0%; border-radius: 2px;
          background: linear-gradient(90deg, #F4C10F, #C99A00);
          transition: width 1s cubic-bezier(.2,.8,.2,1) .1s;
        }
        .row-hover.is-in .fill-bar__value { width: var(--fill, 0%); }

        .trust-shimmer { position: relative; overflow: hidden; }
        .trust-shimmer::after {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(100deg, transparent 30%, rgba(255,255,255,0.35) 45%, transparent 60%);
          transform: translateX(-100%); animation: trust-sweep 5s ease-in-out infinite;
        }
        @keyframes trust-sweep { 0%, 60% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        @media (prefers-reduced-motion: reduce) { .trust-shimmer::after { animation: none; display: none; } }
      `}</style>

      {/* \u2500\u2500\u2500 Navbar \u2500\u2500\u2500 */}
      <nav
        className="fixed top-0 inset-x-0 z-50 transition-colors duration-300"
        style={{
          backgroundColor: scrolled ? ink(0.95) : 'transparent',
          backdropFilter: scrolled ? 'blur(8px)' : 'none',
          boxShadow: scrolled ? '0 1px 2px rgba(0,0,0,0.2)' : 'none',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2.5">
            <img src="/logo.png" alt="TrueMark" className="h-8 w-auto object-contain" />
            <span className="font-heading italic text-xl font-semibold tracking-tight" style={{ color: '#fff' }}>TrueMark</span>
          </Link>

          <div className="hidden md:flex items-center space-x-8">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => handleAnchor(e, link.href)}
                className="nav-link text-sm font-medium transition-colors"
                style={{ color: white(0.7) }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = white(0.7); }}
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="flex items-center space-x-3">
            <Link
              to="/login"
              className="hidden sm:inline-flex items-center px-4 py-2 text-sm font-semibold rounded-sm transition-colors"
              style={{ color: white(0.9), border: `1px solid ${white(0.25)}` }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = GOLD; e.currentTarget.style.color = GOLD; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = white(0.25); e.currentTarget.style.color = white(0.9); }}
            >
              Sign In
            </Link>
            <Link
              to="/upload"
              className="cta-sweep inline-flex items-center px-4 py-2 text-sm font-semibold rounded-sm transition-colors"
              style={{ color: INK, backgroundColor: GOLD }}
            >
              Try Demo
            </Link>
          </div>
        </div>
      </nav>
      <ScrollProgress />

      {/* \u2500\u2500\u2500 Hero \u2500\u2500\u2500 */}
      <section ref={heroRef} className="hero-glow relative pt-32 pb-0 sm:pt-40 overflow-hidden" style={{ backgroundColor: INK }}>
        <div className="absolute inset-0 opacity-[0.05]" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '28px 28px',
        }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24 sm:pb-28">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <div className="inline-flex items-center space-x-2 mb-6">
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: GOLD, boxShadow: `0 0 8px 2px ${gold(0.7)}` }} />
                <span className="text-xs font-semibold tracking-wide" style={{ color: white(0.6) }}>Smart India Hackathon 2026 &middot; PS26034 &middot; Ministry of Consumer Affairs</span>
              </div>

              <h1 className="font-heading italic text-4xl sm:text-5xl lg:text-[3.4rem] font-medium leading-[1.14] tracking-tight max-w-xl" style={{ color: '#fff' }}>
                Every pack makes eight legal promises. TrueMark checks them in seconds.
              </h1>

              <p className="mt-6 text-base sm:text-lg leading-relaxed max-w-xl" style={{ color: white(0.6) }}>
                Photograph a label and TrueMark reads it, checks it against the Legal Metrology
                (Packaged Commodities) Rules, 2011, and hands back a verdict with the exact
                sub-rule behind every finding &mdash; no rulebook required in the field.
              </p>

              <div className="mt-9 flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                <Link
                  to="/upload"
                  className="cta-sweep inline-flex items-center space-x-2 px-6 py-3 font-semibold rounded-sm transition-colors"
                  style={{ backgroundColor: GOLD, color: INK }}
                >
                  <span>Inspector Demo</span>
                  <FiArrowRight className="cta-sweep-icon h-4 w-4" />
                </Link>
                <Link
                  to="/report"
                  className="inline-flex items-center space-x-2 px-6 py-3 font-semibold rounded-sm transition-colors"
                  style={{ color: '#fff', border: `1px solid ${white(0.25)}` }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = GOLD; e.currentTarget.style.color = GOLD; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = white(0.25); e.currentTarget.style.color = '#fff'; }}
                >
                  <FiAlertTriangle className="h-4 w-4" />
                  <span>Report a Violation</span>
                </Link>
              </div>

              <p className="mt-4 text-xs" style={{ color: white(0.35) }}>No account needed to submit a citizen report.</p>

              <div className="hidden sm:flex items-center space-x-4 mt-10">
                <CertificationSeal />
                <p className="font-heading italic text-sm leading-snug max-w-[13rem]" style={{ color: white(0.45) }}>
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
      <section style={{ backgroundColor: INK, borderTop: `1px solid ${white(0.1)}` }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4">
            {STATS.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div
                  key={i}
                  className="stat-cell flex items-center space-x-3 py-6 px-4 sm:px-6"
                  style={{ borderLeft: i === 0 ? 'none' : `1px solid ${white(0.1)}` }}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" style={{ color: GOLD }} />
                  <div>
                    <p className="text-sm font-bold font-heading" style={{ color: '#fff' }}>
                      <CountUp value={stat.value} numeric={stat.numeric} />
                    </p>
                    <p className="text-xs leading-tight" style={{ color: white(0.45) }}>{stat.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* \u2500\u2500\u2500 The Problem \u2500\u2500\u2500 */}
      <section id="problem" className="py-24 sm:py-28" style={{ backgroundColor: '#fff' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            <div className="lg:col-span-5 reveal">
              <SectionMark n="01" label="The Problem" />
              <h2 className="font-heading text-3xl sm:text-4xl font-semibold tracking-tight leading-tight" style={{ color: INK }}>
                Manual inspection can&rsquo;t keep pace with the market
              </h2>
              <p className="mt-5 leading-relaxed" style={{ color: '#4B5563' }}>
                Every packaged commodity sold in India &mdash; in a kirana store, a supermarket,
                or on an e-commerce platform &mdash; must carry mandatory declarations under the
                Legal Metrology Act, 2009 and the Legal Metrology (Packaged Commodities) Rules,
                2011: manufacturer details, net quantity, MRP, date of packing, and consumer-care
                information, each in a prescribed format.
              </p>
              <p className="mt-4 leading-relaxed" style={{ color: '#4B5563' }}>
                Given the sheer volume and variety of products on shelves and online, checking
                every pack by hand against a printed rulebook is slow and inconsistent between
                officers. Violations like missing declarations, undersized MRP text, and
                mismatched online listings routinely go unnoticed until a complaint is filed.
              </p>
              <p className="mt-5 font-heading italic text-base leading-snug pl-4" style={{ color: '#8A6A00', borderLeft: `2px solid ${GOLD}` }}>
                This is the check a compliant pack should already pass.
              </p>
            </div>

            <div className="lg:col-span-7 lg:pl-8">
              <div style={{ borderTop: '1px solid #E5E7EB' }}>
                {VIOLATIONS.map((v, i) => (
                  <div
                    key={i}
                    className={`row-hover reveal reveal-${(i % 4) + 1} grid grid-cols-12 gap-4 py-6 px-3 -mx-3`}
                    style={{ borderBottom: '1px solid #E5E7EB' }}
                  >
                    <div className="col-span-3 sm:col-span-2">
                      <span className="inline-block text-[11px] font-data font-semibold px-2 py-1 rounded-sm" style={{ color: INK, backgroundColor: GOLD }}>
                        {v.rule}
                      </span>
                    </div>
                    <div className="col-span-9 sm:col-span-10">
                      <h3 className="font-heading text-base font-semibold mb-1" style={{ color: INK }}>{v.title}</h3>
                      <p className="text-sm leading-relaxed" style={{ color: '#6B7280' }}>{v.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* \u2500\u2500\u2500 The Solution \u2500\u2500\u2500 */}
      <section id="solution" className="py-24 sm:py-28" style={{ backgroundColor: INK }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl reveal">
            <SectionMark n="02" label="The Solution" />
            <h2 className="font-heading italic text-3xl sm:text-4xl font-medium tracking-tight leading-tight" style={{ color: '#fff' }}>
              A rule engine that reads a label the way an inspector would
            </h2>
            <p className="mt-5 leading-relaxed" style={{ color: white(0.6) }}>
              TrueMark is a web and mobile application that scans a product photo, extracts every
              declaration printed on it, and checks each one against the versioned 2011 Rules.
              Officers get a verdict with citations in seconds; supervisors get a searchable
              history of every scan and a dashboard of enforcement activity.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px rounded-sm overflow-hidden" style={{ backgroundColor: white(0.1) }}>
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
      <section id="how-it-works" className="py-24 sm:py-28" style={{ backgroundColor: '#fff' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="reveal">
            <SectionMark n="03" label="How it Works" />
            <h2 className="font-heading text-3xl sm:text-4xl font-semibold tracking-tight leading-tight max-w-lg" style={{ color: INK }}>
              From field photo to evidence report, in three steps
            </h2>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-10 lg:gap-12">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={i} className={`reveal reveal-${i + 1} relative pl-6`} style={{ borderLeft: `2px solid ${ink(0.1)}` }}>
                  <span className="font-heading italic text-3xl" style={{ color: 'rgba(201,154,0,0.5)' }}>{step.num}</span>
                  <div
                    className="mt-4 mb-4 inline-flex items-center justify-center h-10 w-10 rounded-sm transition-shadow duration-300"
                    style={{ backgroundColor: INK, color: GOLD, boxShadow: '0 0 0 0 rgba(244,193,15,0.4)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 0 0 6px rgba(244,193,15,0.18)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 0 0 0 rgba(244,193,15,0.4)'; }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-heading text-xl font-semibold mb-2" style={{ color: INK }}>{step.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: '#4B5563' }}>{step.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <TapeMarquee />

      {/* \u2500\u2500\u2500 Feature Grid \u2500\u2500\u2500 */}
      <section id="features" className="py-24 sm:py-28" style={{ backgroundColor: '#FBF6E4' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="reveal">
            <SectionMark n="04" label="Features" />
            <h2 className="font-heading text-3xl sm:text-4xl font-semibold tracking-tight leading-tight max-w-lg" style={{ color: INK }}>
              Built for the workflow of a field officer
            </h2>
          </div>

          <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px rounded-sm overflow-hidden" style={{ backgroundColor: ink(0.1) }}>
            {FEATURES.map((feature, i) => (
              <div key={i} className={`reveal reveal-${(i % 4) + 1}`}>
                <CornerTagCard icon={feature.icon} title={feature.title} desc={feature.desc} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* \u2500\u2500\u2500 Why TrueMark \u2500\u2500\u2500 */}
      <section className="py-24 sm:py-28" style={{ backgroundColor: '#fff' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-14 reveal">
            <SectionMark n="05" label="Why TrueMark" />
            <h2 className="font-heading italic text-3xl sm:text-4xl font-medium tracking-tight leading-tight" style={{ color: INK }}>
              What changes when the rulebook is built in
            </h2>
            <p className="mt-5 leading-relaxed" style={{ color: '#4B5563' }}>
              TrueMark doesn&rsquo;t replace an officer&rsquo;s judgment &mdash; it removes the
              parts of the check that are mechanical, so judgment can go where it matters.
            </p>
          </div>

          <div style={{ borderTop: '1px solid #E5E7EB' }}>
            <div className="grid grid-cols-12 gap-4 py-4 text-xs font-semibold tracking-wide" style={{ color: '#9CA3AF' }}>
              <div className="col-span-4 sm:col-span-3" />
              <div className="col-span-4 sm:col-span-4">Manual inspection</div>
              <div className="col-span-4 sm:col-span-5">With TrueMark</div>
            </div>
            {COMPARISON.map((row, i) => (
              <div
                key={i}
                className={`row-hover reveal reveal-${(i % 4) + 1} grid grid-cols-12 gap-4 py-5 px-3 -mx-3 items-start`}
                style={{ borderTop: '1px solid #E5E7EB', '--fill': `${row.fill}%` }}
              >
                <div className="col-span-12 sm:col-span-3 font-heading text-sm font-semibold mb-2 sm:mb-0" style={{ color: INK }}>
                  {row.label}
                </div>
                <div className="col-span-6 sm:col-span-4 flex items-start space-x-2">
                  <FiClock className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: '#9CA3AF' }} />
                  <span className="text-sm leading-relaxed" style={{ color: '#6B7280' }}>{row.manual}</span>
                </div>
                <div className="col-span-6 sm:col-span-5">
                  <div className="flex items-start space-x-2">
                    <FiCheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: '#8A6A00' }} />
                    <span className="text-sm leading-relaxed" style={{ color: INK }}>{row.truemark}</span>
                  </div>
                  <div className="fill-bar mt-2.5 ml-6">
                    <span className="fill-bar__value" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* \u2500\u2500\u2500 Trust / Credibility Bar \u2500\u2500\u2500 */}
      <section className="trust-shimmer py-14" style={{ backgroundColor: GOLD, borderTop: `2px solid ${INK}` }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-5 sm:space-y-0 sm:space-x-4 text-center sm:text-left">
            <FiShield className="h-6 w-6 flex-shrink-0" style={{ color: INK }} />
            <p className="text-sm leading-relaxed max-w-2xl" style={{ color: ink(0.75) }}>
              <span className="font-semibold" style={{ color: INK }}>Built for enforcement officers</span> under
              the Ministry of Consumer Affairs, Food &amp; Public Distribution, aligned to the
              Legal Metrology (Packaged Commodities) Rules, 2011.
            </p>
          </div>
        </div>
      </section>

      {/* \u2500\u2500\u2500 Footer \u2500\u2500\u2500 */}
      <footer id="footer" className="relative" style={{ backgroundColor: INK, color: '#fff' }}>
        <div className="absolute top-0 inset-x-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${gold(0.6)}, transparent)` }} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
            <div className="lg:col-span-2">
              <div className="flex items-center space-x-2.5 mb-4">
                <img src="/logo.png" alt="TrueMark" className="h-8 w-auto object-contain filter brightness-0 invert" />
                <span className="font-heading italic text-xl font-semibold tracking-tight">TrueMark</span>
              </div>
              <p className="text-sm leading-relaxed max-w-sm" style={{ color: white(0.5) }}>
                Compliance scanning for Legal Metrology enforcement, built for Smart India
                Hackathon 2026.
              </p>
              <div className="flex items-center space-x-4 mt-5">
                <FiLock className="h-4 w-4" style={{ color: white(0.3) }} />
                <span className="text-xs" style={{ color: white(0.4) }}>Role-based access &amp; secure authentication</span>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-4" style={{ color: '#fff' }}>For</h4>
              <ul className="space-y-2.5">
                <li className="text-sm flex items-center space-x-1.5" style={{ color: white(0.5) }}>
                  <FiUsers className="h-3.5 w-3.5" />
                  <span>Enforcement officers</span>
                </li>
                <li className="text-sm flex items-center space-x-1.5" style={{ color: white(0.5) }}>
                  <FiAlertTriangle className="h-3.5 w-3.5" />
                  <span>Citizens reporting violations</span>
                </li>
                <li className="text-sm flex items-center space-x-1.5" style={{ color: white(0.5) }}>
                  <FiBarChart2 className="h-3.5 w-3.5" />
                  <span>Supervisory oversight</span>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-4" style={{ color: '#fff' }}>Links</h4>
              <ul className="space-y-2.5">
                <li>
                  <a
                    href="https://github.com/Mohammadsaif1915/TRUEMARK-AI"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm transition-colors flex items-center space-x-1.5"
                    style={{ color: white(0.5) }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = GOLD; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = white(0.5); }}
                  >
                    <FiGithub className="h-3.5 w-3.5" />
                    <span>GitHub</span>
                  </a>
                </li>
                <li>
                  <a
                    href="#!"
                    className="text-sm transition-colors flex items-center space-x-1.5"
                    style={{ color: white(0.5) }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = GOLD; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = white(0.5); }}
                  >
                    <FiBook className="h-3.5 w-3.5" />
                    <span>Documentation</span>
                  </a>
                </li>
                <li>
                  <a
                    href="mailto:team@truemark.in"
                    className="text-sm transition-colors flex items-center space-x-1.5"
                    style={{ color: white(0.5) }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = GOLD; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = white(0.5); }}
                  >
                    <FiMail className="h-3.5 w-3.5" />
                    <span>Contact</span>
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0" style={{ borderTop: `1px solid ${white(0.1)}` }}>
            <p className="text-xs" style={{ color: white(0.35) }}>&copy; {new Date().getFullYear()} TrueMark. Built by a 6-member team for Smart India Hackathon 2026.</p>
            <p className="text-xs font-data" style={{ color: white(0.25) }}>PS26034 &middot; Legal Metrology (Packaged Commodities) Rules, 2011</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;