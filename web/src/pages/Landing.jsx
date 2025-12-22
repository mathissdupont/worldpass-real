import React, { useState, useEffect, useRef, Suspense } from 'react';
import { track } from '@/lib/evt';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { t, getLocale, setLocale } from '@/lib/i18n';
// 3D Imports
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, Stars, Html } from '@react-three/drei';
import * as THREE from 'three';

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
  Globe as GlobeIcon
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

// --- 3D COMPONENTS (YENİ VE GELİŞMİŞ) ---

const RealisticGlobe = ({ isMobile }) => {
  const meshRef = useRef(null);
  const atmosphereRef = useRef(null);

  // Texture'ları yükle (GitHub raw kaynaklarından)
  const [colorMap, normalMap, specularMap] = useLoader(THREE.TextureLoader, [
    'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg',
    'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_normal_2048.jpg',
    'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_specular_2048.jpg'
  ]);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.0015; // Kendi etrafında dönüş
      // Mobilde biraz daha az salınım
      meshRef.current.rotation.x = Math.sin(time * 0.3) * (isMobile ? 0.05 : 0.1);
    }
    if (atmosphereRef.current) {
        atmosphereRef.current.rotation.y += 0.002;
    }
  });

  const scale = isMobile ? 1.8 : 2.5; // Mobilde daha küçük, masaüstünde büyük

  return (
    <group rotation={[0, 0, isMobile ? 0 : 0.2]}> {/* Hafif eksen eğikliği */}
      {/* ANA DÜNYA KÜRESİ */}
      <mesh ref={meshRef} scale={scale}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshPhongMaterial
          map={colorMap}
          normalMap={normalMap}
          specularMap={specularMap}
          shininess={15} // Okyanus parlaması
          color="#ffffff"
        />
      </mesh>

      {/* ATMOSFER (GLOW EFFECT) */}
      <mesh ref={atmosphereRef} scale={scale * 1.03}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshPhongMaterial
          color="#4f46e5" // Indigo rengi atmosfer
          transparent
          opacity={0.2}
          side={THREE.BackSide} // İçten dışa render
          blending={THREE.AdditiveBlending} // Parlama efekti
        />
      </mesh>

       {/* SİBER AĞ KATMANI (WIREFRAME) */}
       <mesh scale={scale * 1.01} rotation={[0, Math.PI, 0]}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial
          color="#22d3ee" // Cyan
          wireframe
          transparent
          opacity={0.05}
        />
      </mesh>
    </group>
  );
};

const SceneLoader = () => {
    return (
        <Html center>
            <div className="text-indigo-500 text-sm font-mono animate-pulse">Loading World...</div>
        </Html>
    )
}

const Scene3D = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize(); // İlk yüklemede kontrol et
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    // Mobilde height: 350px, Desktopta height: 650px
    <div className={`w-full relative transition-all duration-300 ${isMobile ? 'h-[350px] mt-8' : 'h-[650px]'}`}>
      <Canvas camera={{ position: [0, 0, isMobile ? 6 : 7], fov: 45 }}>
        {/* Işıklandırma */}
        <ambientLight intensity={0.2} color="#ffffff" />
        <directionalLight position={[5, 3, 5]} intensity={3.5} color="#ffffff" />
        <pointLight position={[-5, -2, -5]} intensity={1} color="#4f46e5" /> {/* Arkadan vuran mor ışık */}

        {/* Arka plan yıldızları */}
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        
        <Suspense fallback={<SceneLoader />}>
            <RealisticGlobe isMobile={isMobile} />
        </Suspense>
        
        <OrbitControls 
            enableZoom={false} 
            enablePan={false} 
            autoRotate={true}
            autoRotateSpeed={0.5}
            minPolarAngle={Math.PI / 2.5}
            maxPolarAngle={Math.PI / 1.5}
        />
      </Canvas>
      
      {/* Geçiş Maskesi */}
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none" />
    </div>
  );
};

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
        <div className="text-xl font-bold text-white cursor-pointer flex items-center gap-2" onClick={() => navigate('/')}>
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-[0_0_15px_rgba(79,70,229,0.5)]">
            <GlobeIcon className="text-white w-5 h-5" />
          </div>
          WorldPass
        </div>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              className="text-zinc-400 hover:text-white transition-colors text-sm font-medium"
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
            <GlobeIcon size={18} />
          </button>
          <button
            onClick={() => {
              track('cta_nav', { location: 'navbar' });
              navigate('/login');
            }}
            className="px-4 py-2 bg-white text-black hover:bg-zinc-200 rounded-lg text-sm font-semibold transition-colors"
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
                <GlobeIcon size={18} />
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
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-black">
      {/* Yeni Gradient Arka Plan - Daha Derin */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/20 via-zinc-950 to-black pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-32 pb-20 w-full">
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          
          {/* Sol: Metin İçeriği */}
          <div className="text-center lg:text-left order-2 lg:order-1 relative z-20">
            <FadeIn>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium mb-6 backdrop-blur-sm shadow-[0_0_10px_rgba(79,70,229,0.2)]">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                </span>
                WorldPass ID v2.0
              </div>
              <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight tracking-tight">
                {t('landing.hero.title')} <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">{t('landing.hero.title_highlight')}</span>
              </h1>
            </FadeIn>
            <FadeIn delay={0.1}>
              <p className="text-xl md:text-2xl text-zinc-400 mb-10 max-w-lg mx-auto lg:mx-0 leading-relaxed">
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
                  className="px-8 py-4 bg-white text-black hover:bg-zinc-200 rounded-xl text-lg font-bold transition-all flex items-center justify-center gap-2 group shadow-[0_0_25px_rgba(255,255,255,0.25)] hover:shadow-[0_0_35px_rgba(255,255,255,0.4)]"
                >
                  {t('landing.hero.cta_start')}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={() => {
                    track('cta_hero', { action: 'demo' });
                    document.querySelector('#features').scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="px-8 py-4 bg-zinc-900/50 backdrop-blur-md hover:bg-zinc-800 text-white border border-zinc-800 rounded-xl text-lg font-semibold transition-all"
                >
                  {t('landing.hero.cta_demo')}
                </button>
              </div>
            </FadeIn>
            
            {/* Küçük İstatistikler */}
            <FadeIn delay={0.4}>
                <div className="mt-12 flex items-center justify-center lg:justify-start gap-8 text-zinc-500 text-sm font-medium">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-indigo-500" />
                        <span>E2E Encrypted</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <GlobeIcon className="w-5 h-5 text-indigo-500" />
                        <span>Global Standarts</span>
                    </div>
                </div>
            </FadeIn>
          </div>

          {/* Sağ: 3D Scene */}
          <FadeIn delay={0.3}>
            {/* Mobilde düzeni korumak için order-1 verdik (önce metin sonra görsel), ancak görsel olarak metnin üstünde veya altında kalmasını CSS ile yönettik */}
            <div className="order-1 lg:order-2 flex justify-center items-center relative w-full">
               <Scene3D />
               
               {/* 3D Yüklenirken gösterilecek overlay (opsiyonel) */}
               <div className="absolute inset-0 z-0 bg-radial-gradient from-transparent to-black opacity-0"></div>
            </div>
          </FadeIn>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden md:block">
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
    <section id="features" className="py-24 bg-zinc-950 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-indigo-900/50 to-transparent"></div>
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
              <div className="p-6 rounded-xl border border-zinc-800 hover:border-indigo-500/50 bg-zinc-900/50 transition-all group hover:bg-zinc-900">
                <div className="w-12 h-12 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-4 group-hover:bg-indigo-500/20 group-hover:text-indigo-300 transition-colors">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
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

        <div className="grid md:grid-cols-3 gap-12 relative">
          {/* Bağlantı Çizgisi (Desktop Only) */}
          <div className="hidden md:block absolute top-24 left-1/6 right-1/6 h-0.5 bg-gradient-to-r from-transparent via-zinc-800 to-transparent -z-10" />
          
          {steps.map((step, i) => (
            <FadeIn key={i} delay={i * 0.1}>
              <div className="text-center group">
                <div className="w-20 h-20 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-indigo-400 mb-6 mx-auto group-hover:border-indigo-500/50 group-hover:scale-110 transition-all duration-300 shadow-lg shadow-black/50">
                  {step.icon}
                </div>
                <div className="text-sm text-indigo-500 font-bold mb-2 tracking-widest">ADIM {step.id}</div>
                <h3 className="text-xl font-semibold text-white mb-3">{step.title}</h3>
                <p className="text-zinc-400 text-sm px-4">{step.desc}</p>
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
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mx-auto mb-8">
            <Lock size={40} />
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            {t('landing.security.title')} <span className="text-indigo-400">{t('landing.security.title_highlight')}</span>
          </h2>
          <p className="text-zinc-400 mb-10 max-w-3xl mx-auto text-lg leading-relaxed">
            {t('landing.security.subtitle')}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {[
              t('landing.security.badge1'),
              t('landing.security.badge2'),
              t('landing.security.badge3'),
              t('landing.security.badge4')
            ].map((item, i) => (
              <span key={i} className="px-5 py-2 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm font-medium hover:border-indigo-500/30 transition-colors">
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

const FAQ = React.memo(() => {
  const questions = [
    { q: t('landing.faq.q1'), a: t('landing.faq.a1') },
    { q: t('landing.faq.q2'), a: t('landing.faq.a2') },
    { q: t('landing.faq.q3'), a: t('landing.faq.a3') },
    { q: t('landing.faq.q4'), a: t('landing.faq.a4') }
  ];

  const [openIndex, setOpenIndex] = useState(null);

  return (
    <section id="faq" className="py-24 bg-black border-t border-zinc-900">
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
              <div className={`border rounded-xl overflow-hidden transition-all duration-300 ${openIndex === i ? 'bg-zinc-900/50 border-indigo-500/30' : 'bg-zinc-900/20 border-zinc-800'}`}>
                <button
                  onClick={() => setOpenIndex(openIndex === i ? null : i)}
                  className="w-full px-6 py-5 text-left flex items-center justify-between hover:bg-zinc-900/50 transition-colors"
                >
                  <span className="font-semibold text-white text-lg">{q.q}</span>
                  <ChevronDown className={`w-5 h-5 text-zinc-400 transition-transform duration-300 ${openIndex === i ? 'rotate-180 text-indigo-400' : ''}`} />
                </button>
                <AnimatePresence>
                  {openIndex === i && (
                    <Motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-6 text-zinc-400 leading-relaxed border-t border-zinc-800/50 pt-4">
                        {q.a}
                      </div>
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
});

// --- CTA ---

const CTASection = React.memo(() => {
  const navigate = useNavigate();

  return (
    <section className="py-32 bg-zinc-950 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-black to-black opacity-50"></div>
      <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
        <FadeIn>
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-8 tracking-tight">
            {t('landing.cta.title')} <br/><span className="text-indigo-400">{t('landing.cta.title_highlight')}</span>
          </h2>
          <p className="text-zinc-400 text-xl mb-10 max-w-2xl mx-auto">
            {t('landing.cta.subtitle')}
          </p>
          <button
            onClick={() => {
              track('cta_final', { location: 'bottom' });
              navigate('/login');
            }}
            className="px-10 py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xl font-bold transition-all inline-flex items-center gap-3 group shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:-translate-y-1"
          >
            {t('landing.cta.button')}
            <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </button>
        </FadeIn>
      </div>
    </section>
  );
});

// --- FOOTER ---

const Footer = React.memo(() => {
  return (
    <footer className="bg-black border-t border-zinc-900 py-16">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          <div className="col-span-1 md:col-span-1">
            <div className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-indigo-600"></div>
              WorldPass
            </div>
            <p className="text-zinc-500 text-sm leading-relaxed mb-6">
              {t('landing.footer.tagline')}
            </p>
            <div className="flex gap-4">
              {/* Sosyal Medya İkonları (Placeholder) */}
              <div className="w-8 h-8 rounded bg-zinc-900 border border-zinc-800 hover:border-indigo-500 transition-colors"></div>
              <div className="w-8 h-8 rounded bg-zinc-900 border border-zinc-800 hover:border-indigo-500 transition-colors"></div>
              <div className="w-8 h-8 rounded bg-zinc-900 border border-zinc-800 hover:border-indigo-500 transition-colors"></div>
            </div>
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
              <h4 className="font-bold text-white mb-6">{col.title}</h4>
              <ul className="space-y-3">
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
        
        <div className="border-t border-zinc-900 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-zinc-600">
          <div>{t('landing.footer.copyright')}</div>
          <div className="flex gap-6">
            <span className="cursor-pointer hover:text-zinc-400 transition-colors">System Status</span>
            <span className="cursor-pointer hover:text-zinc-400 transition-colors">Cookie Preferences</span>
          </div>
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