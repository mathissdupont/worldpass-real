import React, { useState, useEffect } from 'react';
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

const FadeIn = ({ children, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.6, delay, ease: "easeOut" }}
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
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled 
          ? 'bg-black/80 backdrop-blur-2xl border-b border-white/10 py-3 shadow-lg shadow-black/50' 
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
            className="w-9 h-9"
          />
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-200 to-gray-400">
            WorldPass
          </span>
        </motion.a>

        <div className="hidden md:flex items-center gap-1 bg-white/5 rounded-full px-2 py-2 border border-white/5 backdrop-blur-xl">
          {navLinks.map((link) => (
            <a 
              key={link.name} 
              href={link.href} 
              className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-indigo-500/20 rounded-full transition-all duration-300"
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
  
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-black via-zinc-900 to-black">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-40"></div>
      
      <div className="max-w-5xl mx-auto px-6 text-center relative z-10 pt-20">
        <FadeIn>
          <div className="inline-block mb-6 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-sm text-indigo-300">
            Erken Aşama
          </div>
        </FadeIn>
        
        <FadeIn delay={0.1}>
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Dijital Kimlik<br/>Cüzdanı
          </h1>
        </FadeIn>
        
        <FadeIn delay={0.2}>
          <p className="text-xl text-zinc-400 mb-10 max-w-2xl mx-auto">
            Fiziksel kartlarınızı dijital ortamda tek yerde toplayan, basit ve güvenli bir platform.
          </p>
        </FadeIn>

        <FadeIn delay={0.3}>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate('/register')}
              className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              Erken Erişim <ArrowRight size={18} />
            </button>
            <a
              href="#features"
              className="px-8 py-3 border border-zinc-700 hover:border-zinc-600 text-white rounded-lg font-medium transition-colors"
            >
              Daha Fazla Bilgi
            </a>
          </div>
        </FadeIn>

        <FadeIn delay={0.4}>
          <div className="mt-16 flex items-center justify-center gap-12 text-sm text-zinc-500">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-green-500" />
              <span>Ücretsiz</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-green-500" />
              <span>Açık Kaynak</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-green-500" />
              <span>Şeffaf</span>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
};

// --- FEATURES SECTION ---

const Features = React.memo(() => {
  const features = [
    {
      title: "Hızlı Paylaşım",
      desc: "QR kod ile kimlik bilgilerini saniyeler içinde paylaş.",
      icon: <Zap className="w-6 h-6" />
    },
    {
      title: "Güvenli Altyapı",
      desc: "Veriler şifreli olarak cihazında saklanır.",
      icon: <ShieldCheck className="w-6 h-6" />
    },
    {
      title: "Tek Cüzdan",
      desc: "Tüm kimlik kartlarını tek yerde topla.",
      icon: <Wallet className="w-6 h-6" />
    },
    {
      title: "Paylaşım Kontrolü",
      desc: "Hangi bilgiyi paylaştığını sen belirle.",
      icon: <Fingerprint className="w-6 h-6" />
    },
    {
      title: "Şifreli Saklama",
      desc: "AES-256 şifreleme ile verilerinizi koruyoruz.",
      icon: <Lock className="w-6 h-6" />
    },
    {
      title: "Mobil Odaklı",
      desc: "Telefonundan her zaman erişebilirsin.",
      icon: <Smartphone className="w-6 h-6" />
    }
  ];

  return (
    <section id="features" className="py-24 bg-zinc-950">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <FadeIn>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Neler Sunuyoruz?
            </h2>
            <p className="text-zinc-400 text-lg">
              Basit ve güvenli dijital kimlik deneyimi
            </p>
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
    { id: "01", title: "Kayıt Ol", desc: "E-posta ile hesap oluştur.", icon: <Shield /> },
    { id: "02", title: "Kimlik Ekle", desc: "Kartlarını dijital cüzdana aktar.", icon: <Wallet /> },
    { id: "03", title: "QR ile Paylaş", desc: "QR kod ile güvenle paylaş.", icon: <QrCode /> }
  ];

  return (
    <section id="how-it-works" className="py-24 bg-black">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-16">
          <FadeIn>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Nasıl Çalışır?</h2>
            <p className="text-zinc-400 text-lg">3 basit adım</p>
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
          </FadeIn>
          <FadeIn delay={0.1}>
            <h2 className="text-4xl md:text-5xl font-bold text-white">
              Basit Başlayan <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400">Dijital Kimlik Deneyimi</span>
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
              <SpotlightCard className="h-full p-8 group">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6 text-white shadow-lg group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-indigo-500/30 transition-all duration-500`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-indigo-300 transition-colors duration-300">
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
});

// --- HOW IT WORKS ---

const HowItWorks = React.memo(() => {
  const steps = React.useMemo(() => [
    { id: "01", title: "Kayıt Ol", desc: "E-posta ile basit bir hesap oluştur ve erken erişim cüzdanını aktif et.", icon: <Shield /> },
    { id: "02", title: "Kimliklerini Ekle", desc: "İstersen örnek verilerle, istersen gerçek kimliklerinle cüzdanını test et.", icon: <Wallet /> },
    { id: "03", title: "QR ile Göster", desc: "Etkinlikte ya da kulüp ortamında kimliğini QR kod üzerinden gösterebileceğin akışı dene.", icon: <QrCode /> }
  ], []);

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
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-zinc-900/80 to-indigo-950/50 border border-white/5 flex items-center justify-center text-4xl font-bold text-white shadow-2xl mb-6 group-hover:border-indigo-500/50 group-hover:bg-gradient-to-br group-hover:from-indigo-950/50 group-hover:to-purple-950/50 transition-all duration-500 group-hover:shadow-[0_0_40px_rgba(99,102,241,0.4)]">
                  <span className="absolute text-7xl font-bold text-indigo-500/5">{step.id}</span>
                  <span className="relative text-indigo-400 group-hover:scale-110 transition-transform duration-300">{step.icon}</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-indigo-300 transition-colors duration-300">
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
});

// --- SECURITY SECTION ---

const SecuritySection = React.memo(() => {
  return (
    <section id="security" className="py-24 bg-black relative overflow-hidden">
      <GridPattern />
      
      <div className="max-w-5xl mx-auto px-6 text-center relative z-10">
        <FadeIn>
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-2xl mb-6 text-indigo-400 shadow-[0_0_40px_rgba(99,102,241,0.3)]">
            <Lock size={40} />
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Güven Tarafında <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400">Gerçekçi Yaklaşım</span>
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
                className="flex items-center gap-2 px-5 py-3 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-gray-300 hover:border-indigo-500/40 hover:bg-indigo-500/20 transition-all duration-300 cursor-default backdrop-blur-xl"
              >
                <CheckCircle2 size={16} className="text-indigo-400"/> {item}
              </motion.span>
            ))}
          </div>
        </FadeIn>
      </div>
    </section>
  );
});

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
                className="border border-white/5 rounded-2xl bg-gradient-to-br from-zinc-900/50 to-zinc-950/50 backdrop-blur-xl overflow-hidden hover:border-indigo-500/30 transition-all duration-300"
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

const CTASection = React.memo(() => {
  const navigate = useNavigate();
  
  return (
    <section className="py-24 bg-black relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 via-purple-500/20 to-indigo-500/20 blur-[150px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.1)_0%,transparent_70%)]" />
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
});

// --- FOOTER ---

const Footer = React.memo(() => {
  return (
    <footer className="bg-zinc-950 border-t border-white/5 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-8 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <img src="/worldpass_logo.svg" alt="WorldPass" className="w-8 h-8" />
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
                { name: "Hakkımızda", href: "https://heptapusgroup.com/about" },
                { name: "Blog (yakında)", href: "#" },
                { name: "Katkıda Bulun", href: "#" },
                { name: "İletişim", href: "https://heptapusgroup.com/contact" }
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
                      className="text-gray-500 hover:text-indigo-400 text-sm transition-colors duration-300"
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
});

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
