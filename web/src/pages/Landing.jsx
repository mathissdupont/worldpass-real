import React, { useState, useRef, useEffect } from 'react';
import { motion, useScroll, useTransform, useSpring, useMotionValue, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  Globe, 
  Zap, 
  Wallet, 
  QrCode, 
  Lock, 
  ChevronDown, 
  ChevronRight, 
  Menu, 
  X,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Fingerprint,
  Shield,
  Smartphone,
  Eye,
  EyeOff
} from 'lucide-react';
import LightPillar from '../components/LightPillar';
import PillNav from '@/components/PillNav/PillNav';
import { track } from '@/lib/evt';

// --- UTILITY COMPONENTS ---

const BlurText = ({ text, delay = 0, className = '' }) => {
  const words = text.split(' ');
  return (
    <div className={`flex flex-wrap gap-x-3 gap-y-1 ${className}`}>
      {words.map((word, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, filter: 'blur(10px)', y: 20 }}
          animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
          transition={{ 
            duration: 0.8, 
            delay: delay + i * 0.1, 
            ease: [0.2, 0.65, 0.3, 0.9] 
          }}
          className="inline-block"
        >
          {word}&nbsp;
        </motion.span>
      ))}
    </div>
  );
};

const ShinyText = ({ text, className = '' }) => {
  return (
    <span
      className={`relative inline-block overflow-hidden ${className}`}
      style={{
        backgroundImage: 'linear-gradient(120deg, rgba(255, 255, 255, 0) 40%, rgba(255, 255, 255, 0.8) 50%, rgba(255, 255, 255, 0) 60%)',
        backgroundSize: '200% 100%',
        WebkitBackgroundClip: 'text',
        backgroundClip: 'text',
        animation: 'shine 3s linear infinite',
      }}
    >
      {text}
      <style>{`
        @keyframes shine {
          0% { background-position: 100%; }
          100% { background-position: -100%; }
        }
      `}</style>
    </span>
  );
};

const GridPattern = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <div className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
  </div>
);

const FloatingOrbs = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <motion.div 
      animate={{ 
        scale: [1, 1.2, 1],
        opacity: [0.3, 0.5, 0.3],
        x: [0, 100, 0],
        y: [0, 50, 0]
      }}
      transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] bg-indigo-600/30 rounded-full blur-[100px]" 
    />
    <motion.div 
      animate={{ 
        scale: [1, 1.3, 1],
        opacity: [0.2, 0.4, 0.2],
        x: [0, -100, 0],
        y: [0, -50, 0]
      }}
      transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
      className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] bg-cyan-600/20 rounded-full blur-[120px]" 
    />
    <motion.div 
      animate={{ 
        scale: [1, 1.1, 1],
        opacity: [0.15, 0.3, 0.15],
        rotate: [0, 180, 360]
      }}
      transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
      className="absolute top-[40%] left-[30%] w-[400px] h-[400px] bg-purple-600/20 rounded-full blur-[80px]" 
    />
  </div>
);

const SpotlightCard = ({ children, className = "" }) => {
  const divRef = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e) => {
    if (!divRef.current) return;
    const rect = divRef.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setOpacity(1)}
      onMouseLeave={() => setOpacity(0)}
      className={`relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/50 backdrop-blur-sm ${className}`}
    >
      <div
        className="pointer-events-none absolute -inset-px opacity-0 transition duration-300"
        style={{
          opacity,
          background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, rgba(99,102,241,0.15), transparent 40%)`,
        }}
      />
      <div className="relative h-full">{children}</div>
    </div>
  );
};

const FadeIn = ({ children, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 40 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-100px" }}
    transition={{ duration: 0.8, delay, type: "spring", bounce: 0.4 }}
  >
    {children}
  </motion.div>
);

// --- NAVBAR (PillNav) ---

const Navbar = () => {
  const navigate = useNavigate();
  const items = [
    { label: 'Özellikler', href: '#features' },
    { label: 'Nasıl Çalışır?', href: '#how-it-works' },
    { label: 'Güvenlik', href: '#security' },
    { label: 'S.S.S.', href: '#faq' },
  ];

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <PillNav
        logo="/worldpass_logo.svg"
        logoAlt="WorldPass"
        items={items}
        activeHref="/"
        className=""
        ease="power2.easeOut"
        baseColor="#000000"
        pillColor="#ffffff"
        hoveredPillTextColor="#ffffff"
        pillTextColor="#000000"
        onItemClick={(item, index) => track('nav_item_click', { href: item?.href, label: item?.label, index })}
        onLogoClick={() => track('logo_click', { location: 'navbar' })}
      />

      {/* Auth buttons overlay (desktop) */}
      <div className="hidden md:flex gap-3 absolute top-4 right-6">
        <button
          onClick={() => navigate('/login')}
          onMouseDown={() => track('cta_click', { id: 'login', location: 'navbar' })}
          className="px-5 py-2 text-sm font-medium text-gray-300 hover:text-white border border-white/20 rounded-full bg-black/40 backdrop-blur-md"
        >
          Giriş Yap
        </button>
        <button
          onClick={() => navigate('/register')}
          onMouseDown={() => track('cta_click', { id: 'register', location: 'navbar' })}
          className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full text-sm font-medium shadow-lg flex items-center gap-2"
        >
          Başla <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};

// --- HERO SECTION ---

const Hero = () => {
  const navigate = useNavigate();
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 500], [0, 150]);
  
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      <GridPattern />
      <FloatingOrbs />

      {/* LightPillar background */}
      <div className="absolute inset-0 z-[1]">
        <div className="w-full h-[600px] relative">
          <LightPillar
            topColor="#5227FF"
            bottomColor="#FF9FFC"
            intensity={1.0}
            rotationSpeed={0.3}
            glowAmount={0.005}
            pillarWidth={3.0}
            pillarHeight={0.6}
            noiseIntensity={0.2}
            pillarRotation={0}
            interactive={true}
            mixBlendMode="screen"
            className="pointer-events-none"
          />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center relative z-10">
        
        <div className="text-center lg:text-left space-y-8">
          <FadeIn delay={0.1}>
            <motion.div 
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-medium backdrop-blur-md"
              whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.1)" }}
            >
              <Sparkles size={14} className="text-cyan-400" />
              <ShinyText text="Güvenli Dijital Kimlik Platformu" className="text-gray-300" />
            </motion.div>
          </FadeIn>
          
          <div className="space-y-4">
            <BlurText 
              text="Kimliğiniz Artık Dijital ve Güvende" 
              className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.1]"
              delay={0.3}
            />
            
            <FadeIn delay={0.9}>
              <p className="text-lg md:text-xl text-gray-400 max-w-2xl leading-relaxed">
                WorldPass ile fiziksel kimliklerinizi dijitalleştirin, güvenle saklayın ve sadece istediğiniz kişilerle paylaşın. 
                <span className="text-cyan-400 font-semibold"> Verileriniz sadece sizde.</span>
              </p>
            </FadeIn>
          </div>

          <FadeIn delay={1.1}>
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <motion.button
                whileHover={{ scale: 1.05, boxShadow: "0 0 30px rgba(99,102,241,0.6)" }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/register')}
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full font-semibold flex items-center justify-center gap-2 shadow-xl"
              >
                Ücretsiz Başla <ChevronRight size={20} />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.15)" }}
                whileTap={{ scale: 0.95 }}
                className="w-full sm:w-auto px-8 py-4 border border-white/20 text-white rounded-full font-semibold backdrop-blur-md hover:border-white/40 transition-all"
              >
                Nasıl Çalışır?
              </motion.button>
            </div>
          </FadeIn>

          <FadeIn delay={1.3}>
            <div className="flex items-center justify-center lg:justify-start gap-8 pt-4 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-green-500" />
                <span>100% Ücretsiz</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-green-500" />
                <span>Güvenli & Şifreli</span>
              </div>
            </div>
          </FadeIn>
        </div>

        {/* 3D Card Mockup */}
        <motion.div 
          style={{ y: y1 }}
          className="relative hidden lg:block"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.5 }}
            className="relative"
          >
            {/* Main Card */}
            <div className="w-[400px] h-[550px] bg-gradient-to-br from-zinc-900 via-black to-zinc-900 rounded-3xl border border-white/10 p-6 shadow-2xl relative overflow-hidden backdrop-blur-xl">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDQwIDAgTCAwIDAgMCA0MCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDMpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30"></div>
              
              <div className="absolute -top-20 -right-20 w-60 h-60 bg-indigo-500/20 blur-[80px]" />
              <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-cyan-500/20 blur-[80px]" />
              
              <div className="flex justify-between items-start mb-8 relative z-10">
                <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center border border-white/10">
                  <ShieldCheck className="text-cyan-400" size={24} />
                </div>
                <div className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20 flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  DOĞRULANDI
                </div>
              </div>

              <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-b from-white/20 to-transparent mx-auto mb-6 relative z-10">
                <div className="w-full h-full rounded-full overflow-hidden bg-zinc-800">
                  <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-4xl font-bold">
                    AK
                  </div>
                </div>
              </div>

              <div className="text-center mb-8 relative z-10 space-y-1">
                <h3 className="text-2xl font-bold text-white tracking-wide">Ahmet Kaya</h3>
                <p className="text-gray-500 text-xs uppercase tracking-widest">ID: #WP-8492-AX91</p>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-xs text-green-400">Aktif</span>
                </div>
              </div>

              <div className="space-y-3 relative z-10 mb-6">
                {[
                  { label: "Ehliyet", value: 85 },
                  { label: "Öğrenci Kartı", value: 65 },
                  { label: "Üyelik", value: 45 }
                ].map((item, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">{item.label}</span>
                      <span className="text-gray-500">{item.value}%</span>
                    </div>
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${item.value}%` }}
                        transition={{ duration: 1.5, delay: 0.8 + (i*0.2), ease: "easeOut" }}
                        className="h-full bg-gradient-to-r from-indigo-500 to-cyan-500" 
                      />
                    </div>
                  </div>
                ))}
              </div>

              <motion.div 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="h-14 w-full bg-white text-black rounded-xl flex items-center justify-center font-bold gap-2 cursor-pointer hover:bg-gray-100 transition-colors shadow-lg relative z-10"
              >
                <QrCode size={20} /> Göster & Paylaş
              </motion.div>
            </div>

            {/* Floating Info Cards */}
            <motion.div 
              animate={{ y: [0, -10, 0], rotate: [0, 2, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -right-12 top-24 bg-black/60 backdrop-blur-md border border-white/10 p-4 rounded-xl shadow-2xl w-48"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 border border-blue-500/30">
                  <Globe size={18} />
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">Erişim</p>
                  <p className="text-sm font-bold text-white">Global</p>
                </div>
              </div>
            </motion.div>

            <motion.div 
              animate={{ y: [0, 15, 0], rotate: [0, -2, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute -left-12 bottom-32 bg-black/60 backdrop-blur-md border border-white/10 p-4 rounded-xl shadow-2xl w-48"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 border border-purple-500/30">
                  <Lock size={18} />
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">Güvenlik</p>
                  <p className="text-sm font-bold text-white">256-bit Şifreli</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

// --- FEATURES SECTION ---

const Features = () => {
  const features = [
    {
      title: "Anlık Paylaşım",
      desc: "QR kod veya NFC ile kimlik bilgilerinizi saniyeler içinde güvenle paylaşın.",
      icon: <Zap className="w-6 h-6" />,
      color: "from-yellow-500 to-orange-500"
    },
    {
      title: "Blokzincir Doğrulama",
      desc: "Kimlikleriniz blokzincir teknolojisi ile doğrulanır ve sahtecilikten korunur.",
      icon: <ShieldCheck className="w-6 h-6" />,
      color: "from-cyan-500 to-blue-500"
    },
    {
      title: "Çoklu Kimlik Desteği",
      desc: "Ehliyet, öğrenci kartı, üyelik kartları... Hepsi tek bir güvenli cüzdanda.",
      icon: <Wallet className="w-6 h-6" />,
      color: "from-purple-500 to-pink-500"
    },
    {
      title: "Tam Kontrol",
      desc: "Hangi bilgiyi, kiminle, ne kadar süreyle paylaştığınıza siz karar verirsiniz.",
      icon: <Fingerprint className="w-6 h-6" />,
      color: "from-emerald-500 to-teal-500"
    },
    {
      title: "Uçtan Uca Şifreleme",
      desc: "Verileriniz cihazınızda AES-256 ile şifrelenir. Biz bile göremeyiz.",
      icon: <Lock className="w-6 h-6" />,
      color: "from-red-500 to-rose-500"
    },
    {
      title: "Offline Erişim",
      desc: "İnternet olmadan da kimliklerinize erişebilir ve paylaşabilirsiniz.",
      icon: <Smartphone className="w-6 h-6" />,
      color: "from-indigo-500 to-purple-500"
    }
  ];

  return (
    <section id="features" className="py-24 bg-black relative overflow-hidden">
      <GridPattern />
      
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center mb-16 space-y-4">
          <FadeIn>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm font-medium backdrop-blur-md mb-4">
              <Sparkles size={16} className="text-indigo-400" />
              <span className="text-gray-400">Özellikler</span>
            </div>
          </FadeIn>
          <FadeIn delay={0.1}>
            <h2 className="text-4xl md:text-5xl font-bold text-white">
              Sınırları Kaldıran <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-cyan-500">Teknoloji</span>
            </h2>
          </FadeIn>
          <FadeIn delay={0.2}>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg">
              WorldPass, geleneksel kimlik sistemlerinin karmaşıklığını modern teknolojinin sadeliği ile birleştiriyor.
            </p>
          </FadeIn>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <FadeIn key={i} delay={i * 0.1}>
              <SpotlightCard className="h-full p-8 group hover:border-white/20 transition-all duration-300">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6 text-white shadow-lg group-hover:scale-110 group-hover:shadow-2xl transition-all duration-300`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-cyan-300 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  {feature.desc}
                </p>
              </SpotlightCard>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
};

// --- HOW IT WORKS ---

const HowItWorks = () => {
  const steps = [
    { id: "01", title: "Kayıt Ol", desc: "E-posta ile hesap oluştur ve güvenli cüzdanını aktif et.", icon: <Shield /> },
    { id: "02", title: "Kimliklerini Ekle", desc: "Kurumlar tarafından onaylanmış kimliklerini dijital cüzdanına tanımla.", icon: <Wallet /> },
    { id: "03", title: "QR ile Paylaş", desc: "Etkinliklerde veya başvurularda QR kodunu okutarak kimliğini doğrula.", icon: <QrCode /> }
  ];

  return (
    <section id="how-it-works" className="py-24 bg-zinc-950 relative overflow-hidden">
      <FloatingOrbs />
      
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <FadeIn>
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Nasıl Çalışır?</h2>
            <p className="text-gray-400 text-lg">3 basit adımda dijital kimliğe sahip ol</p>
          </div>
        </FadeIn>

        <div className="grid md:grid-cols-3 gap-8 relative">
          <div className="hidden md:block absolute top-12 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent z-0" />

          {steps.map((step, i) => (
            <FadeIn key={i} delay={i * 0.2}>
              <motion.div 
                whileHover={{ y: -10 }}
                className="relative z-10 flex flex-col items-center text-center group cursor-pointer"
              >
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-zinc-900 to-black border border-white/10 flex items-center justify-center text-4xl font-bold text-white shadow-2xl mb-6 group-hover:border-indigo-500/50 transition-all duration-300 group-hover:shadow-[0_0_40px_rgba(99,102,241,0.3)]">
                  <span className="absolute text-7xl font-bold text-white/5">{step.id}</span>
                  <span className="relative text-indigo-400">{step.icon}</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-indigo-300 transition-colors">
                  {step.title}
                </h3>
                <p className="text-gray-400 text-sm max-w-xs leading-relaxed">
                  {step.desc}
                </p>
              </motion.div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
};

// --- SECURITY SECTION ---

const SecuritySection = () => {
  return (
    <section id="security" className="py-24 bg-black relative overflow-hidden">
      <GridPattern />
      
      <div className="max-w-5xl mx-auto px-6 text-center relative z-10">
        <FadeIn>
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-2xl mb-6 text-emerald-400 shadow-[0_0_40px_rgba(16,185,129,0.2)]">
            <Lock size={40} />
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Güven ve <span className="bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-emerald-500">Kontrol</span> Sizde
          </h2>
          <p className="text-gray-400 mb-8 max-w-3xl mx-auto text-lg leading-relaxed">
            WorldPass, verilerinizi merkezi sunucularda <strong className="text-white">saklamaz</strong>. 
            Kimlik bilgileriniz cihazınızda <strong className="text-emerald-400">AES-256 şifreleme</strong> ile korunur. 
            Biz bile verilerinizi göremeyiz. Kiminle ne paylaştığınızın kaydı sadece sizde.
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            {[
              "Uçtan Uca Şifreleme",
              "GDPR Uyumlu",
              "Biyometrik Koruma",
              "Açık Kaynak",
              "Zero-Knowledge"
            ].map((item, i) => (
              <motion.span 
                key={i}
                whileHover={{ scale: 1.05, y: -2 }}
                className="flex items-center gap-2 px-5 py-3 rounded-full bg-white/5 border border-white/10 text-gray-300 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all cursor-default backdrop-blur-sm"
              >
                <CheckCircle2 size={16} className="text-emerald-500"/> {item}
              </motion.span>
            ))}
          </div>
        </FadeIn>
      </div>
    </section>
  );
};

// --- FAQ SECTION ---

const FAQ = () => {
  const questions = [
    { 
      q: "WorldPass'i kullanmak ücretli mi?", 
      a: "Bireysel kullanıcılar için WorldPass tamamen ücretsizdir. Kimlik saklama ve doğrulama işlemleri için hiçbir ücret ödemezsiniz." 
    },
    { 
      q: "Kimlik bilgilerim nerede saklanıyor?", 
      a: "Verileriniz sadece sizin cihazınızda, şifrelenmiş bir alanda (Secure Enclave) saklanır. Bulut sunucularımızda hiçbir kişisel veriniz tutulmaz. Bu da verilerinizin %100 sizin kontrolünüzde olduğu anlamına gelir." 
    },
    { 
      q: "Telefonumu kaybedersem ne olur?", 
      a: "Kayıt sırasında size verilen kurtarma anahtarı (Seed Phrase) ile yeni cihazınızda cüzdanınızı saniyeler içinde geri yükleyebilirsiniz. Bu anahtarı güvenli bir yerde saklamanız önemlidir." 
    },
    { 
      q: "Hangi kimlik türlerini ekleyebilirim?", 
      a: "Şu anda ehliyet, öğrenci kartı, sağlık kartı, üyelik kartları gibi birçok kimlik türünü destekliyoruz. Yakında daha fazla kimlik türü eklenecek." 
    },
    { 
      q: "Verilerim gerçekten güvende mi?", 
      a: "Evet. WorldPass, askeri düzeyde AES-256 şifreleme kullanır. Verileriniz cihazınızdan asla çıkmaz ve merkezi bir sunucuda saklanmaz. Sadece siz erişebilirsiniz." 
    }
  ];

  const [openIndex, setOpenIndex] = useState(null);

  return (
    <section id="faq" className="py-24 bg-zinc-950 relative overflow-hidden">
      <FloatingOrbs />
      
      <div className="max-w-3xl mx-auto px-6 relative z-10">
        <FadeIn>
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Sıkça Sorulan Sorular</h2>
            <p className="text-gray-400">Merak ettiklerinizin cevapları burada</p>
          </div>
        </FadeIn>
        
        <div className="space-y-4">
          {questions.map((item, i) => (
            <FadeIn key={i} delay={i * 0.1}>
              <motion.div 
                whileHover={{ scale: 1.01 }}
                className="border border-white/10 rounded-2xl bg-zinc-900/30 backdrop-blur-sm overflow-hidden hover:border-white/20 transition-all"
              >
                <button 
                  onClick={() => setOpenIndex(openIndex === i ? null : i)}
                  className="w-full flex items-center justify-between p-6 text-left hover:bg-white/5 transition-colors"
                >
                  <span className="font-semibold text-gray-200 pr-4">{item.q}</span>
                  <motion.div
                    animate={{ rotate: openIndex === i ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <ChevronDown className="text-gray-500 flex-shrink-0" size={20} />
                  </motion.div>
                </button>
                <AnimatePresence>
                  {openIndex === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-6 text-gray-400 text-sm leading-relaxed border-t border-white/5 pt-4">
                        {item.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
};

// --- CTA SECTION ---

const CTASection = () => {
  const navigate = useNavigate();
  
  return (
    <section className="py-24 bg-black relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 via-purple-600/20 to-cyan-600/20 blur-[120px]" />
      </div>
      
      <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
        <FadeIn>
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Dijital Kimliğinize <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400">
              Bugün Sahip Olun
            </span>
          </h2>
          <p className="text-gray-400 text-lg mb-10 max-w-2xl mx-auto">
            Milyonlarca kullanıcının güvendiği WorldPass ile güvenli dijital kimlik deneyimi başlıyor. Ücretsiz kayıt ol, hemen başla.
          </p>
          <motion.button
            whileHover={{ scale: 1.05, boxShadow: "0 0 40px rgba(99,102,241,0.6)" }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/register')}
            className="px-10 py-5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full font-bold text-lg shadow-2xl flex items-center gap-3 mx-auto"
          >
            Ücretsiz Başla <ArrowRight size={24} />
          </motion.button>
        </FadeIn>
      </div>
    </section>
  );
};

// --- FOOTER ---

const Footer = () => {
  return (
    <footer className="bg-zinc-950 border-t border-white/10 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <img src="/worldpass_logo.svg" alt="WorldPass" className="w-8 h-8 rounded-lg" />
              <span className="text-lg font-bold text-white">WorldPass</span>
            </div>
            <p className="text-gray-500 text-sm">
              Güvenli, şifreli ve tamamen sizin kontrolünüzde dijital kimlik platformu.
            </p>
          </div>
          
          {[
            {
              title: "Ürün",
              links: ["Özellikler", "Güvenlik", "Nasıl Çalışır?", "Fiyatlandırma"]
            },
            {
              title: "Şirket",
              links: ["Hakkımızda", "Blog", "Kariyer", "İletişim"]
            },
            {
              title: "Yasal",
              links: ["Gizlilik Politikası", "Kullanım Koşulları", "GDPR", "Çerezler"]
            }
          ].map((col, i) => (
            <div key={i}>
              <h4 className="font-semibold text-white mb-4">{col.title}</h4>
              <ul className="space-y-2">
                {col.links.map((link, j) => (
                  <li key={j}>
                    <a href="#" className="text-gray-500 hover:text-white text-sm transition-colors">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        
        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-sm text-gray-600">
            &copy; 2025 WorldPass. Tüm hakları saklıdır.
          </div>
          <div className="flex gap-4">
            {['Twitter', 'LinkedIn', 'GitHub'].map((social) => (
              <a 
                key={social}
                href="#" 
                className="text-gray-500 hover:text-white transition-colors text-sm"
              >
                {social}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

// --- MAIN APP ---

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
