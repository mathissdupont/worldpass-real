import React, { useState, useRef, useEffect } from 'react';
import { track } from '@/lib/evt';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  Globe, 
  Zap, 
  Wallet, 
  QrCode, 
  Lock, 
  ChevronDown, 
  Menu, 
  X,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Fingerprint,
  Shield,
  Smartphone
} from 'lucide-react';

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

// --- NAVBAR ---

const Navbar = () => {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Özellikler', href: '#features' },
    { name: 'Nasıl Çalışır?', href: '#how-it-works' },
    { name: 'Güvenlik', href: '#security' },
    { name: 'S.S.S.', href: '#faq' },
  ];

  return (
    <motion.nav 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-black/60 backdrop-blur-xl border-b border-white/10 py-3' 
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        <motion.a 
          href="/" 
          className="flex items-center gap-2 group"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <img
            src="/worldpass_logo.svg"
            alt="WorldPass"
            className="w-9 h-9 rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.5)] group-hover:shadow-[0_0_30px_rgba(99,102,241,0.8)] transition-shadow"
          />
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-200 to-gray-400">
            WorldPass
          </span>
        </motion.a>

        <div className="hidden md:flex items-center gap-1 bg-white/5 rounded-full px-2 py-2 border border-white/10 backdrop-blur-md">
          {navLinks.map((link) => (
            <a 
              key={link.name} 
              href={link.href} 
              className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-white/10 rounded-full transition-all"
            >
              {link.name}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { track('nav_click', { action: 'login' }); navigate('/login'); }}
            className="px-5 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
          >
            Giriş Yap
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05, boxShadow: "0 0 25px rgba(99,102,241,0.5)" }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { track('nav_click', { action: 'register' }); navigate('/register'); }}
            className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full text-sm font-medium shadow-lg flex items-center gap-2"
          >
            WorldPass’e Katıl <ArrowRight size={16} />
          </motion.button>
        </div>

        <button 
          className="md:hidden text-white" 
          onClick={() => { setMobileMenuOpen(!mobileMenuOpen); track('nav_toggle', { open: !mobileMenuOpen }); }}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-black/90 backdrop-blur-xl border-b border-white/10 overflow-hidden"
          >
            <div className="flex flex-col p-6 gap-4">
              {navLinks.map((link) => (
                <a 
                  key={link.name} 
                  href={link.href} 
                  onClick={() => setMobileMenuOpen(false)} 
                  className="text-gray-300 hover:text-white text-lg py-2"
                >
                  {link.name}
                </a>
              ))}
              <div className="flex flex-col gap-2 pt-4 border-t border-white/10">
                <button
                  onClick={() => { track('nav_click', { action: 'login' }); navigate('/login'); setMobileMenuOpen(false); }}
                  className="w-full px-5 py-3 text-sm font-medium text-gray-300 hover:text-white border border-white/20 rounded-full"
                >
                  Giriş Yap
                </button>
                <button
                  onClick={() => { track('nav_click', { action: 'register' }); navigate('/register'); setMobileMenuOpen(false); }}
                  className="w-full px-5 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full text-sm font-medium"
                >
                  WorldPass’e Katıl
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
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

      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center relative z-10">
        
        <div className="text-center lg:text-left space-y-8">
          <FadeIn delay={0.1}>
            <motion.div 
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-medium backdrop-blur-md"
              whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.1)" }}
            >
              <Sparkles size={14} className="text-cyan-400" />
              <ShinyText text="Erken Aşama Dijital Kimlik Deneyimi" className="text-gray-300" />
            </motion.div>
          </FadeIn>
          
          <div className="space-y-4">
            <BlurText 
              text="Kimliğini Dijital Olarak Yanında Taşı" 
              className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.1]"
              delay={0.3}
            />
            
            <FadeIn delay={0.9}>
              <p className="text-lg md:text-xl text-gray-400 max-w-2xl leading-relaxed">
                WorldPass, fiziksel kartlarını dijital bir kimlik cüzdanında toplamayı hedefleyen,
                halen geliştirme aşamasında olan bir projedir. Basit, anlaşılır ve kullanıcının
                kontrolünde bir deneyim kurmaya çalışıyoruz.
              </p>
            </FadeIn>
          </div>

          <FadeIn delay={1.1}>
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <motion.button
                whileHover={{ scale: 1.05, boxShadow: "0 0 30px rgba(99,102,241,0.6)" }}
                whileTap={{ scale: 0.95 }}
                onClick={() => { track('landing_cta', { cta: 'join_early_access' }); navigate('/register'); }}
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full font-semibold flex items-center justify-center gap-2 shadow-xl"
              >
                Erken Erişime Katıl <ChevronDown size={20} />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.15)" }}
                whileTap={{ scale: 0.95 }}
                onClick={() => { track('landing_cta', { cta: 'see_how_it_works' }); }}
                className="w-full sm:w-auto px-8 py-4 border border-white/20 text-white rounded-full font-semibold backdrop-blur-md hover:border-white/40 transition-all"
              >
                Nasıl Çalıştığını Gör
              </motion.button>
            </div>
          </FadeIn>

          <FadeIn delay={1.3}>
            <div className="flex items-center justify-center lg:justify-start gap-8 pt-4 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-green-500" />
                <span>Temel kullanım ücretsiz</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-green-500" />
                <span>Geliştirme aşamasında şeffaflık</span>
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
                  ERKEN ERİŞİM
                </div>
              </div>

              <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-b from-white/20 to-transparent mx-auto mb-6 relative z-10">
                <div className="w-full h-full rounded-full overflow-hidden bg-zinc-800">
                  <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-4xl font-bold">
                    WP
                  </div>
                </div>
              </div>

              <div className="text-center mb-8 relative z-10 space-y-1">
                <h3 className="text-2xl font-bold text-white tracking-wide">Dijital Kimlik Kartı</h3>
                <p className="text-gray-500 text-xs uppercase tracking-widest">Örnek arayüz</p>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-xs text-green-400">Deneysel</span>
                </div>
              </div>

              <div className="space-y-3 relative z10 mb-6">
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
                <QrCode size={20} /> Örnek QR Göster
              </motion.div>
            </div>

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
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">Hedef</p>
                  <p className="text-sm font-bold text-white">Global kullanım</p>
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
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">Odak</p>
                  <p className="text-sm font-bold text-white">Güvenli tasarım</p>
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
      title: "Hızlı Paylaşım",
      desc: "QR kod ile kimlik bilgilerini saniyeler içinde gösterebileceğin sade bir akış tasarlıyoruz.",
      icon: <Zap className="w-6 h-6" />,
      color: "from-yellow-500 to-orange-500"
    },
    {
      title: "Geleceğe Hazır Altyapı",
      desc: "Blokzincir ve on-chain doğrulama için düşünülen bir mimari üzerine inşa ediyoruz. Şu an odak MVP deneyiminde.",
      icon: <ShieldCheck className="w-6 h-6" />,
      color: "from-cyan-500 to-blue-500"
    },
    {
      title: "Tek Cüzdan, Birden Fazla Kimlik",
      desc: "Ehliyet, öğrenci kartı, üyelik kartları gibi kimlikleri tek bir dijital cüzdanda toplamayı hedefliyoruz.",
      icon: <Wallet className="w-6 h-6" />,
      color: "from-purple-500 to-pink-500"
    },
    {
      title: "Paylaşım Üzerinde Kontrol",
      desc: "Hangi bilgiyi, kiminle paylaştığın konusunda sana daha fazla kontrol sunan bir arayüz tasarlıyoruz.",
      icon: <Fingerprint className="w-6 h-6" />,
      color: "from-emerald-500 to-teal-500"
    },
    {
      title: "Şifreli Saklama Yaklaşımı",
      desc: "Verilerin şifreli tutulması için AES-256 gibi modern yöntemleri esas alan bir mimari üzerinde çalışıyoruz.",
      icon: <Lock className="w-6 h-6" />,
      color: "from-red-500 to-rose-500"
    },
    {
      title: "Mobil Öncelikli Deneyim",
      desc: "Kimliklerine telefondan erişebileceğin, offline senaryoları da düşünerek tasarlanan bir arayüz hedefliyoruz.",
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
              <span className="text-gray-400">Özellikler (MVP Hedefi)</span>
            </div>
          </FadeIn>
          <FadeIn delay={0.1}>
            <h2 className="text-4xl md:text-5xl font-bold text-white">
              Basit Başlayan <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-cyan-500">Dijital Kimlik Deneyimi</span>
            </h2>
          </FadeIn>
          <FadeIn delay={0.2}>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg">
              WorldPass, öncelikle günlük kullanımda işine yarayacak minimum seti sunmaya odaklanan bir proje. Zamanla birlikte, geri bildirimlerle büyümesini istiyoruz.
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
    { id: "01", title: "Kayıt Ol", desc: "E-posta ile basit bir hesap oluştur ve erken erişim cüzdanını aktif et.", icon: <Shield /> },
    { id: "02", title: "Kimliklerini Ekle", desc: "İstersen örnek verilerle, istersen gerçek kimliklerinle cüzdanını test et.", icon: <Wallet /> },
    { id: "03", title: "QR ile Göster", desc: "Etkinlikte ya da kulüp ortamında kimliğini QR kod üzerinden gösterebileceğin akışı dene.", icon: <QrCode /> }
  ];

  return (
    <section id="how-it-works" className="py-24 bg-zinc-950 relative overflow-hidden">
      <FloatingOrbs />
      
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <FadeIn>
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Nasıl Çalışır?</h2>
            <p className="text-gray-400 text-lg">3 sade adımda WorldPass’i dene</p>
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
            Güven Tarafında <span className="bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-emerald-500">Gerçekçi Yaklaşım</span>
          </h2>
          <p className="text-gray-400 mb-8 max-w-3xl mx-auto text-lg leading-relaxed">
            WorldPass’i geliştirirken, verilerin olabildiğince kullanıcı tarafında ve şifreli tutulduğu bir model hedefliyoruz.
            Şu an için mimariyi kademeli olarak güçlendiriyoruz ve tüm iddiaları açıkça dokümante etmeye çalışıyoruz.
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            {[
              "Şifreleme Odaklı Tasarım",
              "Kademeli Güvenlik İyileştirmeleri",
              "Açıkça İfade Edilmiş Sınırlamalar",
              "Geliştirici Topluluğu ile Şeffaflık",
              "Gelecekte On-chain Doğrulama"
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
      a: "Şu anki erken aşama sürümde temel kullanım ücretsiz. İleride ek özellikler ve kurumsal senaryolar için farklı planlar düşünebiliriz, bunların hepsini şeffaf bir şekilde paylaşacağız." 
    },
    { 
      q: "Kimlik bilgilerim nerede saklanıyor?", 
      a: "Hedefimiz, verileri mümkün olduğunca cihaz tarafında şifreli olarak tutmak. Mevcut sürümdeki mimari ve veri akışını, teknik dokümanlarda net bir şekilde anlatmaya çalışıyoruz ki tam olarak neyin nerede durduğunu görebilin." 
    },
    { 
      q: "Telefonumu kaybedersem ne olur?", 
      a: "Kurtarma anahtarı ve yedekleme işlemleri için aşama aşama bir model üzerinde çalışıyoruz. Şu anda WorldPass'i denerken, kritik verileri tek başına burada saklamamanızı, mutlaka başka bir güvenli yedek de bulundurmanızı öneriyoruz." 
    },
    { 
      q: "Hangi kimlik türlerini ekleyebilirim?", 
      a: "MVP'de odak, öğrenci kartı ve basit üyelik senaryoları. Ehliyet, sağlık kartı gibi kimlik türleri için henüz deneme aşamasındayız. Geri bildirimlere göre desteklediğimiz türleri genişleteceğiz." 
    },
    { 
      q: "Verilerim gerçekten güvende mi?", 
      a: "Güvenlik tarafında iddialı cümleler kurmaktansa, yaptığımızı net anlatmayı tercih ediyoruz. Modern şifreleme yöntemlerini kullanmaya çalışıyoruz, ama hâlâ aktif geliştirme yapan küçük bir ekibiz. Kritik veriler için her zaman ek önlemler almanızı öneririz." 
    }
  ];

  const [openIndex, setOpenIndex] = useState(null);
  const handleToggle = (index) => {
    const nextIndex = openIndex === index ? null : index;
    setOpenIndex(nextIndex);
    track('faq_toggle', { index, open: nextIndex === index });
  };

  return (
    <section id="faq" className="py-24 bg-zinc-950 relative overflow-hidden">
      <FloatingOrbs />
      
      <div className="max-w-3xl mx-auto px-6 relative z-10">
        <FadeIn>
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Sıkça Sorulan Sorular</h2>
            <p className="text-gray-400">WorldPass’i denerken aklına gelebilecek temel sorular</p>
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
                  onClick={() => handleToggle(i)}
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
            WorldPass’i <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400">
              Beraber Şekillendirelim
            </span>
          </h2>
          <p className="text-gray-400 text-lg mb-10 max-w-2xl mx-auto">
            WorldPass henüz yolun çok başında. Eğer dijital kimlik alanına ilgi duyuyorsan, erken erişime katılıp geri bildirim vererek bu projenin yönünü birlikte belirleyebiliriz.
          </p>
          <motion.button
            whileHover={{ scale: 1.05, boxShadow: "0 0 40px rgba(99,102,241,0.6)" }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { track('landing_cta', { cta: 'join_early_access_bottom' }); navigate('/register'); }}
            className="px-10 py-5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full font-bold text-lg shadow-2xl flex items-center gap-3 mx-auto"
          >
            Erken Erişime Katıl <ArrowRight size={24} />
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
              Öğrenciler ve topluluklar için doğan, gerçek dünyadaki kimlik deneyimini sadeleştirmeyi hedefleyen bir dijital kimlik projesi.
            </p>
          </div>
          
          {[
            {
              title: "Ürün",
              links: [
                { name: "Özellikler", href: "#features" },
                { name: "Güvenlik", href: "#security" },
                { name: "Nasıl Çalışır?", href: "#how-it-works" },
                { name: "Yol Haritası", href: "#" }
              ]
            },
            {
              title: "Ekip & Topluluk",
              links: [
                { name: "Hakkımızda", href: "#" },
                { name: "Blog (yakında)", href: "#" },
                { name: "Katkıda Bulun", href: "#" },
                { name: "İletişim", href: "#" }
              ]
            },
            {
              title: "Yasal & Şeffaflık",
              links: [
                { name: "Gizlilik Yaklaşımı", href: "/privacy" },
                { name: "Kullanım Koşulları (taslak)", href: "/terms" },
                { name: "Teknik Dokümanlar", href: "#" },
                { name: "Açık Kaynak Planı", href: "#" }
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
                      className="text-gray-500 hover:text-white text-sm transition-colors"
                    >
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        
        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-sm text-gray-600">
            &copy; 2025 WorldPass. Erken aşama bir projedir, her şey aktif geliştirme altındadır.
          </div>
          <div className="flex gap-4">
            {['GitHub', 'LinkedIn', 'Discord'].map((social) => (
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
