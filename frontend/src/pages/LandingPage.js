import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FiSearch, FiUpload, FiXCircle, FiFileText, FiShield, FiBarChart2,
  FiZap, FiArrowRight, FiGlobe,
  FiCrosshair, FiAlertTriangle, FiBook, FiGithub, FiMail
} from 'react-icons/fi';

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How it Works', href: '#how-it-works' },
  { label: 'Team', href: '#footer' },
];

const STATS = [
  { icon: FiBook, value: '8', label: 'Legal Metrology Rules Checked' },
  { icon: FiZap, value: 'OCR + Rule Engine', label: 'Dual-Layer Verification' },
  { icon: FiFileText, value: 'PDF', label: 'Evidence Reports' },
  { icon: FiGlobe, value: 'Bilingual', label: 'Label Detection' },
];

const STEPS = [
  {
    num: '01',
    icon: FiUpload,
    title: 'Capture',
    desc: 'Officer photographs the product label in the field using any mobile or desktop camera.',
    color: 'bg-blue-500',
  },
  {
    num: '02',
    icon: FiSearch,
    title: 'Extract & Verify',
    desc: 'OCR extracts text, then the rule engine checks it against versioned Legal Metrology rules with citations.',
    color: 'bg-primary-600',
  },
  {
    num: '03',
    icon: FiFileText,
    title: 'Report',
    desc: 'Instant verdict with legal citations, downloadable PDF evidence report, and e-commerce listing cross-check.',
    color: 'bg-green-600',
  },
];

const FEATURES = [
  {
    icon: FiSearch,
    title: 'OCR Label Scanning',
    desc: 'Extracts text from product packaging photos with high-accuracy optical character recognition.',
  },
  {
    icon: FiBook,
    title: 'Rule-Based Verification',
    desc: 'Checks against versioned Legal Metrology Rules with legal citations for every verdict.',
  },
  {
    icon: FiCrosshair,
    title: 'E-Commerce Mismatch Detection',
    desc: 'Cross-checks physical labels against online listings for MRP and origin discrepancies.',
  },
  {
    icon: FiShield,
    title: 'GTIN Risk Scoring',
    desc: 'Flags repeat-offender products by tracking compliance history across barcode scans.',
  },
  {
    icon: FiBarChart2,
    title: 'Officer Dashboard',
    desc: 'Analytics, filters, enforcement trends, and violation breakdowns for supervisory oversight.',
  },
  {
    icon: FiFileText,
    title: 'PDF Evidence Reports',
    desc: 'Court and enforcement-ready compliance reports with ruled citations and extracted evidence.',
  },
];

const MockupCheckRow = ({ status, rule, citation }) => {
  const colors = {
    pass: 'bg-green-500',
    fail: 'bg-red-500',
    review: 'bg-amber-500',
  };
  const labels = { pass: 'Pass', fail: 'Fail', review: 'Review' };
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center space-x-2.5 min-w-0">
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${colors[status]}`} />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-white/90 truncate">{rule}</p>
          <p className="text-[10px] text-white/40 font-mono">{citation}</p>
        </div>
      </div>
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ml-2 ${
        status === 'pass' ? 'bg-green-500/20 text-green-300' :
        status === 'fail' ? 'bg-red-500/20 text-red-300' :
        'bg-amber-500/20 text-amber-300'
      }`}>
        {labels[status]}
      </span>
    </div>
  );
};

const HeroMockup = () => (
  <div className="relative w-full max-w-lg mx-auto lg:mx-0">
    <div className="absolute -inset-1 bg-gradient-to-br from-primary-500/20 via-primary-400/10 to-amber-500/10 rounded-2xl blur-xl" />
    <div className="relative bg-[#0f172a]/90 backdrop-blur border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="h-2 w-2 rounded-full bg-green-500" />
          <span className="text-[11px] font-semibold text-white/70 tracking-wide">Scan Result</span>
        </div>
        <span className="text-[10px] font-mono text-white/30">ID #4821</span>
      </div>

      <div className="p-4">
        {/* Fake product image with bbox overlays */}
        <div className="relative bg-white/5 rounded-lg overflow-hidden mb-4">
          <div className="h-36 sm:h-44 bg-gradient-to-br from-gray-700/40 to-gray-800/40 flex items-center justify-center relative">
            <div className="absolute inset-0 opacity-20" style={{
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 8px, rgba(255,255,255,0.03) 8px, rgba(255,255,255,0.03) 9px), repeating-linear-gradient(90deg, transparent, transparent 8px, rgba(255,255,255,0.03) 8px, rgba(255,255,255,0.03) 9px)',
            }} />
            {/* Bounding boxes */}
            <div className="absolute top-3 left-6 w-24 h-8 border-2 border-green-500 bg-green-500/15 rounded">
              <span className="absolute -top-3.5 left-0 text-[8px] font-bold bg-green-500 text-white px-1.5 py-0.5 rounded-sm">MRP</span>
            </div>
            <div className="absolute top-14 left-4 w-32 h-7 border-2 border-blue-400 bg-blue-400/15 rounded">
              <span className="absolute -top-3.5 left-0 text-[8px] font-bold bg-blue-400 text-white px-1.5 py-0.5 rounded-sm">Net Qty</span>
            </div>
            <div className="absolute bottom-6 left-4 right-4 h-10 border-2 border-red-500 bg-red-500/15 rounded">
              <span className="absolute -top-3.5 left-0 text-[8px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded-sm">Manufacturer</span>
            </div>
            <FiSearch className="h-8 w-8 text-white/20" />
          </div>
        </div>

        {/* Fake product info */}
        <div className="mb-3">
          <p className="text-sm font-bold text-white">Premium Basmati Rice</p>
          <p className="text-[11px] text-white/50">Agro Foods Pvt. Ltd. &bull; GTIN: 8901234567890</p>
        </div>

        {/* Verdict badge */}
        <div className="flex items-center space-x-2 mb-3 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
          <FiXCircle className="h-4 w-4 text-red-400" />
          <span className="text-xs font-bold text-red-300">Non-Compliant</span>
          <span className="text-[10px] text-red-400/60 ml-auto">2 critical failures</span>
        </div>

        {/* Rule checks */}
        <div className="space-y-0 divide-y divide-white/5">
          <MockupCheckRow status="pass" rule="MRP Declaration" citation="Rule 6(1)(e)" />
          <MockupCheckRow status="fail" rule="Manufacturer Address" citation="Rule 5(1)(a)" />
          <MockupCheckRow status="pass" rule="Net Quantity" citation="Rule 7(1)(a)" />
          <MockupCheckRow status="review" rule="Consumer Care Details" citation="Rule 6(1)(f)" />
        </div>
      </div>
    </div>
  </div>
);

const LandingPage = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleAnchor = (e, href) => {
    e.preventDefault();
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="font-body min-h-screen bg-white">
      {/* ─── Navbar ─── */}
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2.5">
            <div className="bg-primary-800 rounded-lg p-1.5">
              <FiSearch className="h-5 w-5 text-white" />
            </div>
            <span className="font-heading text-xl font-bold text-gray-900 tracking-tight">MeteroLens</span>
          </Link>

          <div className="hidden md:flex items-center space-x-8">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => handleAnchor(e, link.href)}
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="flex items-center space-x-3">
            <Link
              to="/login"
              className="hidden sm:inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/upload"
              className="inline-flex items-center px-4 py-2 text-sm font-semibold text-white bg-primary-800 hover:bg-primary-900 rounded-lg transition-colors shadow-sm"
            >
              Try Demo
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-950 via-primary-900 to-gray-950" />
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div>
              <div className="inline-flex items-center space-x-2 px-3 py-1.5 bg-white/10 backdrop-blur border border-white/10 rounded-full mb-6">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                <span className="text-xs font-semibold text-white/80 tracking-wide">Smart India Hackathon 2026 &middot; Ministry of Consumer Affairs</span>
              </div>

              <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.1] tracking-tight">
                Legal Metrology Compliance,{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-300 to-amber-300">
                  Scanned in Seconds
                </span>
              </h1>

              <p className="mt-6 text-base sm:text-lg text-white/60 leading-relaxed max-w-xl">
                Upload a product label photo. MeteroLens uses OCR and rule-based verification to instantly check MRP, net quantity, manufacturer details, and 8 more mandatory declarations — with legal citations for every check.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                <Link
                  to="/upload"
                  className="inline-flex items-center space-x-2 px-6 py-3 bg-primary-600 hover:bg-primary-500 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-primary-900/30"
                >
                  <span>Inspector Demo</span>
                  <FiArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/report"
                  className="inline-flex items-center space-x-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-amber-500/30"
                >
                  <FiAlertTriangle className="h-4 w-4" />
                  <span>Report Violation (Citizen)</span>
                </Link>
              </div>
            </div>

            <div className="hidden lg:block">
              <HeroMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ─── Stats Strip ─── */}
      <section className="relative -mt-8 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 px-6 py-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {STATS.map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <div key={i} className="flex items-center space-x-3">
                    <div className="flex-shrink-0 h-10 w-10 rounded-xl bg-primary-50 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-primary-700" />
                    </div>
                    <div>
                      <p className="text-lg font-bold font-heading text-gray-900">{stat.value}</p>
                      <p className="text-xs text-gray-500 leading-tight">{stat.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section id="how-it-works" className="py-24 sm:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-primary-700 uppercase tracking-widest mb-3">Process</p>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">How It Works</h2>
            <p className="mt-3 text-gray-500 max-w-lg mx-auto">From field capture to enforcement-ready report in under 30 seconds.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={i} className="relative text-center group">
                  {i < STEPS.length - 1 && (
                    <div className="hidden md:block absolute top-10 left-[60%] w-[80%] border-t-2 border-dashed border-gray-200" />
                  )}
                  <div className={`relative z-10 inline-flex items-center justify-center h-20 w-20 rounded-2xl ${step.color} text-white shadow-lg mb-6 group-hover:scale-105 transition-transform`}>
                    <Icon className="h-8 w-8" />
                  </div>
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-6 h-6 bg-white rounded-full border-2 border-gray-200 flex items-center justify-center hidden md:flex">
                    <span className="text-[10px] font-bold text-gray-400">{step.num}</span>
                  </div>
                  <h3 className="font-heading text-xl font-bold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed max-w-xs mx-auto">{step.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── Feature Grid ─── */}
      <section id="features" className="py-24 sm:py-32 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold text-primary-700 uppercase tracking-widest mb-3">Capabilities</p>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">Built for Enforcement</h2>
            <p className="mt-3 text-gray-500 max-w-lg mx-auto">Every feature designed for the workflow of a legal metrology officer in the field.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md hover:border-primary-200 transition-all group">
                  <div className="inline-flex items-center justify-center h-11 w-11 rounded-xl bg-primary-50 text-primary-700 mb-4 group-hover:bg-primary-100 transition-colors">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-heading text-base font-bold text-gray-900 mb-1.5">{feature.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{feature.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── Trust / Credibility Bar ─── */}
      <section className="py-16 bg-white border-t border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-6 sm:space-y-0 sm:space-x-10 text-center">
            <div className="flex items-center space-x-4">
              <div className="h-14 w-14 rounded-full bg-primary-50 border-2 border-primary-100 flex items-center justify-center flex-shrink-0">
                <FiShield className="h-7 w-7 text-primary-700" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-gray-900">Built for enforcement officers under</p>
                <p className="text-sm text-gray-500">Ministry of Consumer Affairs, Food & Public Distribution</p>
                <p className="text-xs text-gray-400 mt-0.5">Legal Metrology (Packaged Commodities) Rules, 2011</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer id="footer" className="bg-gray-950 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
            <div className="lg:col-span-2">
              <div className="flex items-center space-x-2.5 mb-4">
                <div className="bg-primary-700 rounded-lg p-1.5">
                  <FiSearch className="h-5 w-5 text-white" />
                </div>
                <span className="font-heading text-xl font-bold tracking-tight">MeteroLens</span>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed max-w-sm">
                AI-powered compliance scanning for Legal Metrology enforcement. Built for Smart India Hackathon 2026.
              </p>
            </div>

            <div>
              <h4 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">Links</h4>
              <ul className="space-y-2.5">
                <li>
                  <a href="https://github.com/Abhinav5656U/MeteroLens" target="_blank" rel="noopener noreferrer" className="text-sm text-gray-400 hover:text-white transition-colors flex items-center space-x-1.5">
                    <FiGithub className="h-3.5 w-3.5" />
                    <span>GitHub</span>
                  </a>
                </li>
                <li>
                  <a href="#!" className="text-sm text-gray-400 hover:text-white transition-colors flex items-center space-x-1.5">
                    <FiBook className="h-3.5 w-3.5" />
                    <span>Documentation</span>
                  </a>
                </li>
                <li>
                  <a href="mailto:team@meterolens.in" className="text-sm text-gray-400 hover:text-white transition-colors flex items-center space-x-1.5">
                    <FiMail className="h-3.5 w-3.5" />
                    <span>Contact</span>
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">Team</h4>
              <p className="text-sm text-gray-400 leading-relaxed">
                MeteroLens was built by a 6-member interdisciplinary team for Smart India Hackathon 2026, Problem Statement PS26034.
              </p>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0">
            <p className="text-xs text-gray-500">&copy; {new Date().getFullYear()} MeteroLens. All rights reserved.</p>
            <p className="text-xs text-gray-600">Smart India Hackathon 2026 &middot; PS26034</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
