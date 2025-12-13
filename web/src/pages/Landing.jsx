import React, { useState, useEffect } from 'react';
import { track } from '@/lib/evt';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { t, getLocale, setLocale } from '@/lib/i18n';
import IdentityCardMockup from '@/components/IdentityCardMockup';
import { 
  ShieldCheck, 
  Zap, 
  Wallet, 
  QrCode, 
  Lock, 
  ChevronDown, 
  Menu, 
  X,
  ArrowRight,
  Fingerprint,
  Shield,
  Smartphone,
  Globe
} from 'lucide-react';

// --- UTILITY COMPONENTS ---

const FadeIn = ({ children, delay = 0 }) => (
  <Motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.6, delay, ease: "easeOut" }}
  >
    {children}
  </Motion.div>
);

// --- NAVBAR ---

const Navbar = () => {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [locale, setLocaleState] = useState(getLocale());

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleLocale = () => {
    const newLocale = locale === 'en' ? 'tr' : 'en';
    setLocale(newLocale);
    setLocaleState(newLocale);
  };

  const navLinks = [
    { name: t('landing.footer.features'), href: '#features' },
    { name: t('landing.footer.how_it_works'), href: '#how-it-works' },
    { name: t('landing.footer.security'), href: '#security' },
    { name: 'FAQ', href: '#faq' }
  ];

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-black/80 backdrop-blur-md border-b border-zinc-800' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="text-xl font-bold text-white cursor-pointer" onClick={() => navigate('/')}>
          WorldPass
        </div>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              className="text-zinc-400 hover:text-white transition-colors text-sm"
              onClick={() => track('nav_click', { name: link.name })}
            >
              {link.name}
            </a>
          ))}
          <button
            onClick={toggleLocale}
            className="p-2 text-zinc-400 hover:text-white transition-colors"
            title={locale === 'en' ? 'Türkçe' : 'English'}
          >
            <Globe size={18} />
          </button>
          <button
            onClick={() => {
              track('cta_nav', { location: 'navbar' });
              navigate('/login');
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm transition-colors"
          >
            {t('landing.hero.cta_start')}
          </button>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden text-white"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <Motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-black border-b border-zinc-800"
          >
            <div className="px-6 py-4 space-y-4">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  className="block text-zinc-400 hover:text-white transition-colors"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    track('nav_click_mobile', { name: link.name });
                  }}
                >
                  {link.name}
                </a>
              ))}
              <button
                onClick={toggleLocale}
                className="w-full px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Globe size={18} />
                {locale === 'en' ? 'Türkçe' : 'English'}
              </button>
              <button
                onClick={() => {
                  track('cta_nav_mobile', { location: 'mobile_menu' });
                  navigate('/login');
                  setMobileMenuOpen(false);
                }}
                className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
              >
                {t('landing.hero.cta_start')}
              </button>
            </div>
          </Motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

// --- HERO ---

const Hero = React.memo(() => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-black via-zinc-950 to-black">
      {/* Simple grid background */}
      <div className="absolute inset-0 opacity-20">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-zinc-800" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-32 pb-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Text Content */}
          <div className="text-center lg:text-left">
            <FadeIn>
              <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
                {t('landing.hero.title')} <span className="text-indigo-400">{t('landing.hero.title_highlight')}</span>
              </h1>
            </FadeIn>
            <FadeIn delay={0.1}>
              <p className="text-xl md:text-2xl text-zinc-400 mb-12">
                {t('landing.hero.subtitle')}
              </p>
            </FadeIn>
            <FadeIn delay={0.2}>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <button
                  onClick={() => {
                    track('cta_hero', { action: 'start' });
                    navigate('/login');
                  }}
                  className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-lg font-semibold transition-all flex items-center justify-center gap-2 group"
                >
                  {t('landing.hero.cta_start')}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={() => {
                    track('cta_hero', { action: 'demo' });
                    document.querySelector('#features').scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="px-8 py-4 bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-800 rounded-xl text-lg font-semibold transition-all"
                >
                  {t('landing.hero.cta_demo')}
                </button>
              </div>
            </FadeIn>
          </div>

          {/* Right: Identity Card Mockup */}
          <FadeIn delay={0.3}>
            <div className="flex justify-center lg:justify-end">
              <IdentityCardMockup />
            </div>
          </FadeIn>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
        <Motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="text-zinc-600"
        >
          <ChevronDown size={32} />
        </Motion.div>
      </div>
    </section>
  );
});

// --- FEATURES ---

const Features = React.memo(() => {
  const features = [
    { title: t('landing.features.fast_share.title'), desc: t('landing.features.fast_share.desc'), icon: <Zap /> },
    { title: t('landing.features.future_ready.title'), desc: t('landing.features.future_ready.desc'), icon: <ShieldCheck /> },
    { title: t('landing.features.multi_id.title'), desc: t('landing.features.multi_id.desc'), icon: <Wallet /> },
    { title: t('landing.features.full_control.title'), desc: t('landing.features.full_control.desc'), icon: <Fingerprint /> },
    { title: t('landing.features.encrypted.title'), desc: t('landing.features.encrypted.desc'), icon: <Lock /> },
    { title: t('landing.features.mobile_first.title'), desc: t('landing.features.mobile_first.desc'), icon: <Smartphone /> }
  ];

  return (
    <section id="features" className="py-24 bg-zinc-950">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <FadeIn>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">{t('landing.features.title')}</h2>
            <p className="text-zinc-400 text-lg">{t('landing.features.subtitle')}</p>
          </FadeIn>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, i) => (
            <FadeIn key={i} delay={i * 0.1}>
              <div className="p-6 rounded-xl border border-zinc-800 hover:border-indigo-500/50 bg-zinc-900/50 transition-all group">
                <div className="w-12 h-12 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-4 group-hover:bg-indigo-500/20 transition-colors">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-zinc-400 text-sm">
                  {feature.desc}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
});

// --- HOW IT WORKS ---

const HowItWorks = React.memo(() => {
  const steps = [
    { id: "01", title: t('landing.how_it_works.step1.title'), desc: t('landing.how_it_works.step1.desc'), icon: <Shield /> },
    { id: "02", title: t('landing.how_it_works.step2.title'), desc: t('landing.how_it_works.step2.desc'), icon: <Wallet /> },
    { id: "03", title: t('landing.how_it_works.step3.title'), desc: t('landing.how_it_works.step3.desc'), icon: <QrCode /> }
  ];

  return (
    <section id="how-it-works" className="py-24 bg-black">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <FadeIn>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">{t('landing.how_it_works.title')}</h2>
            <p className="text-zinc-400 text-lg">{t('landing.how_it_works.subtitle')}</p>
          </FadeIn>
        </div>

        <div className="grid md:grid-cols-3 gap-12">
          {steps.map((step, i) => (
            <FadeIn key={i} delay={i * 0.1}>
              <div className="text-center">
                <div className="w-16 h-16 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4 mx-auto">
                  {step.icon}
                </div>
                <div className="text-sm text-indigo-500 font-semibold mb-2">Adım {step.id}</div>
                <h3 className="text-xl font-semibold text-white mb-2">{step.title}</h3>
                <p className="text-zinc-400 text-sm">{step.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
});

// --- SECURITY ---

const SecuritySection = React.memo(() => {
  return (
    <section id="security" className="py-24 bg-zinc-950">
      <div className="max-w-5xl mx-auto px-6 text-center">
        <FadeIn>
          <div className="w-16 h-16 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mx-auto mb-6">
            <Lock size={32} />
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            {t('landing.security.title')} <span className="text-indigo-400">{t('landing.security.title_highlight')}</span>
          </h2>
          <p className="text-zinc-400 mb-8 max-w-3xl mx-auto text-lg">
            {t('landing.security.subtitle')}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              t('landing.security.badge1'),
              t('landing.security.badge2'),
              t('landing.security.badge3'),
              t('landing.security.badge4')
            ].map((item, i) => (
              <span key={i} className="px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-zinc-300 text-sm">
                {item}
              </span>
            ))}
          </div>
        </FadeIn>
      </div>
    </section>
  );
});

// --- FAQ ---

const FAQ = () => {
  const questions = [
    { 
      q: t('landing.faq.q1'), 
      a: t('landing.faq.a1')
    },
    { 
      q: t('landing.faq.q2'), 
      a: t('landing.faq.a2')
    },
    { 
      q: t('landing.faq.q3'), 
      a: t('landing.faq.a3')
    },
    { 
      q: t('landing.faq.q4'), 
      a: t('landing.faq.a4')
    }
  ];

  const [openIndex, setOpenIndex] = useState(null);

  return (
    <section id="faq" className="py-24 bg-black">
      <div className="max-w-3xl mx-auto px-6">
        <div className="text-center mb-16">
          <FadeIn>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">{t('landing.faq.title')}</h2>
            <p className="text-zinc-400 text-lg">{t('landing.faq.subtitle')}</p>
          </FadeIn>
        </div>

        <div className="space-y-4">
          {questions.map((q, i) => (
            <FadeIn key={i} delay={i * 0.1}>
              <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/30">
                <button
                  onClick={() => setOpenIndex(openIndex === i ? null : i)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-zinc-900/50 transition-colors"
                >
                  <span className="font-semibold text-white">{q.q}</span>
                  <ChevronDown className={`w-5 h-5 text-zinc-400 transition-transform ${openIndex === i ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {openIndex === i && (
                    <Motion.div
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-4 text-zinc-400">{q.a}</div>
                    </Motion.div>
                  )}
                </AnimatePresence>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
};

// --- CTA ---

const CTASection = React.memo(() => {
  const navigate = useNavigate();

  return (
    <section className="py-24 bg-zinc-950">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <FadeIn>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            {t('landing.cta.title')} <span className="text-indigo-400">{t('landing.cta.title_highlight')}</span>
          </h2>
          <p className="text-zinc-400 text-lg mb-8">
            {t('landing.cta.subtitle')}
          </p>
          <button
            onClick={() => {
              track('cta_final', { location: 'bottom' });
              navigate('/login');
            }}
            className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-lg font-semibold transition-all inline-flex items-center gap-2 group"
          >
            {t('landing.cta.button')}
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </FadeIn>
      </div>
    </section>
  );
});

// --- FOOTER ---

const Footer = React.memo(() => {
  return (
    <footer className="bg-black border-t border-zinc-900 py-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="text-xl font-bold text-white mb-4">WorldPass</div>
            <p className="text-zinc-500 text-sm">
              {t('landing.footer.tagline')}
            </p>
          </div>
          
          {[
            {
              title: t('landing.footer.product'),
              links: [
                { name: t('landing.footer.features'), href: "#features" },
                { name: t('landing.footer.security'), href: "#security" },
                { name: t('landing.footer.how_it_works'), href: "#how-it-works" }
              ]
            },
            {
              title: t('landing.footer.community'),
              links: [
                { name: t('landing.footer.about'), href: "https://heptapusgroup.com/about" },
                { name: t('landing.footer.contact'), href: "https://heptapusgroup.com/contact" }
              ]
            },
            {
              title: t('landing.footer.legal'),
              links: [
                { name: t('landing.footer.privacy'), href: "/privacy" },
                { name: t('landing.footer.terms'), href: "/terms" }
              ]
            }
          ].map((col, i) => (
            <div key={i}>
              <h4 className="font-semibold text-white mb-4">{col.title}</h4>
              <ul className="space-y-2">
                {col.links.map((link, j) => (
                  <li key={j}>
                    <a
                      href={link.href}
                      className="text-zinc-500 hover:text-indigo-400 text-sm transition-colors"
                    >
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        
        <div className="border-t border-zinc-900 pt-8 text-center text-sm text-zinc-600">
          {t('landing.footer.copyright')}
        </div>
      </div>
    </footer>
  );
});

// --- MAIN ---

export default function Landing() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-indigo-500/30 font-sans antialiased">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <SecuritySection />
        <FAQ />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
