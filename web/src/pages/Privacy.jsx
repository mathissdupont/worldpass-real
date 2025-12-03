import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Lock, Eye, Database, UserCheck, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const GridPattern = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <div className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
  </div>
);

const Section = ({ icon: Icon, title, children }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.6 }}
    className="mb-12"
  >
    <div className="flex items-center gap-3 mb-4">
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center border border-white/10">
        <Icon className="text-indigo-400" size={20} />
      </div>
      <h2 className="text-2xl font-bold text-white">{title}</h2>
    </div>
    <div className="text-gray-300 space-y-4 leading-relaxed">
      {children}
    </div>
  </motion.div>
);

export default function Privacy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-black text-white">
      <GridPattern />
      
      {/* Navbar */}
      <motion.nav 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="fixed top-0 left-0 right-0 z-50 bg-black/60 backdrop-blur-xl border-b border-white/10 py-4"
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <motion.button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 group"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <img src="/worldpass_logo.svg" alt="WorldPass" className="w-9 h-9 rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.5)] group-hover:shadow-[0_0_30px_rgba(99,102,241,0.8)] transition-shadow" />
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-200 to-gray-400">
              WorldPass
            </span>
          </motion.button>
          <motion.button
            onClick={() => navigate('/')}
            whileHover={{ scale: 1.05 }}
            className="text-gray-400 hover:text-white transition-colors"
          >
            Ana Sayfaya Dön
          </motion.button>
        </div>
      </motion.nav>

      {/* Hero */}
      <div className="relative pt-32 pb-16 overflow-hidden">
        <div className="absolute inset-0">
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-0 left-0 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[100px]" 
          />
        </div>
        
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-2xl mb-6 border border-white/10">
              <Shield className="text-indigo-400" size={32} />
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-100 to-gray-300">
              Gizlilik Politikası
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              WorldPass MVP aşamasının gizlilik yaklaşımı ve veri koruma prensipleri
            </p>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 pb-24 relative z-10">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="bg-zinc-900/50 backdrop-blur-sm rounded-3xl border border-white/10 p-8 md:p-12 shadow-2xl"
        >
          <div className="mb-8 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
            <p className="text-yellow-200 text-sm">
              <strong>Not:</strong> Bu politika, WorldPass'in erken aşama (MVP) sürümü içindir. Proje geliştikçe güncellenecektir.
            </p>
          </div>

          <Section icon={Eye} title="Kapsam">
            <p>
              Bu politika şu bileşenler için geçerlidir:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>WorldPass web uygulaması</li>
              <li>WorldPass mobil uygulaması (geliştiriliyorsa)</li>
              <li>Kimlik oluşturma, saklama ve doğrulama işlemlerini sunan backend API'leri</li>
            </ul>
            <p className="mt-4">
              Bu politika; WorldPass'in deneysel, ticari olmayan ve erken aşamada bulunan sürümü için hazırlanmıştır.
            </p>
          </Section>

          <Section icon={Database} title="Topladığımız Veriler">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">1. Hesap Verileri</h3>
                <ul className="list-disc list-inside space-y-1 ml-4 text-gray-400">
                  <li>E-posta adresi</li>
                  <li>Kimlik doğrulama için gereken temel bilgiler</li>
                  <li>Hesabın oluşturulma ve giriş zamanları (log amaçlı)</li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">2. Kimlik / Credential Verileri</h3>
                <ul className="list-disc list-inside space-y-1 ml-4 text-gray-400">
                  <li>Dijital kimlik kartlarında yer alan alanlar (ör. ad, kurum, geçerlilik tarihi)</li>
                  <li>Bu veriler, kartın size ait olduğunu göstermek için kullanılır</li>
                </ul>
                <div className="mt-3 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                  <p className="text-sm text-indigo-200">
                    <strong>MVP Hedefi:</strong> Bu verilerin çoğu cihaz üzerinde ve şifreli biçimde tutulur. 
                    Sunucu tarafında yalnızca minimum meta veri saklanır.
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white mb-2">3. Kullanım Verileri (İsteğe Bağlı)</h3>
                <ul className="list-disc list-inside space-y-1 ml-4 text-gray-400">
                  <li>Hangi sayfaların ziyaret edildiği</li>
                  <li>Hata kayıtları (log'lar)</li>
                  <li>Basit performans metrikleri</li>
                </ul>
                <p className="mt-2 text-sm text-gray-400">
                  Bu veriler <code className="px-1 py-0.5 bg-white/10 rounded">evt.js</code> üzerinden toplanabilir 
                  ancak <strong>varsayılan olarak kapalıdır</strong>.
                </p>
              </div>
            </div>
          </Section>

          <Section icon={Lock} title="Verilerin Saklanması">
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Kimlik verileri <strong>mümkün olduğunca cihaz üzerinde</strong> saklanır</li>
              <li>Sunucuda saklanan veriler yalnızca minimum düzeyde meta veri ve yapılandırma amaçlıdır</li>
              <li>Veritabanı SQLite veya benzeri hafif bir sistem olabilir</li>
            </ul>
            <p className="mt-4 text-sm text-gray-400">
              Saklama süreleri MVP aşamasında net değildir. Proje büyüdükçe veri saklama ve silme politikaları 
              daha ayrıntılı şekilde tanımlanacaktır.
            </p>
          </Section>

          <Section icon={UserCheck} title="Verilerin Paylaşımı">
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                <span className="text-2xl">✓</span>
                <p className="text-green-200"><strong>Verileriniz satılmaz.</strong></p>
              </div>
              <p>
                Dijital kimlik kartlarınız, yalnızca siz paylaştığınızda veya QR kod ile sunduğunuzda 
                başka taraflarca görülebilir.
              </p>
              <p>
                Kimlik doğrulaması yapılırken yalnızca doğrulama için gerekli bilgiler paylaşılır.
              </p>
              <p className="text-sm text-gray-400">
                WorldPass, üçüncü taraf entegrasyonları kullanıyorsa (ör. e-posta sağlayıcıları, barındırma hizmetleri), 
                bu sağlayıcılarla yalnızca hizmetin çalışması için gerekli veriler paylaşılır.
              </p>
            </div>
          </Section>

          <Section icon={Shield} title="Güvenlik">
            <div className="space-y-4">
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                <p className="text-red-200">
                  <strong>Önemli:</strong> WorldPass MVP aşamasındadır; henüz resmi bir güvenlik denetimi yapılmamıştır.
                </p>
              </div>
              <p>
                Temel güvenlik prensipleri (ör. şifreleme, erişim kontrolü, minimal veri saklama) uygulanmaktadır.
              </p>
              <p>
                Dünya standartlarında bir güvenlik garantisi bu aşamada verilemez. Kullanıcılar, kritik verileri 
                veya geri dönüşü olmayan işlemleri yalnızca WorldPass'e güvenerek gerçekleştirmemelidir.
              </p>
              <div className="mt-4 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                <h4 className="font-semibold text-indigo-200 mb-2">Gelecek Planları:</h4>
                <ul className="list-disc list-inside space-y-1 text-indigo-200 text-sm">
                  <li>Cihaz tarafında anahtar yönetimi</li>
                  <li>Gelişmiş şifreleme yöntemleri</li>
                  <li>On-chain güvenlik katmanları (ör. EAS entegrasyonu)</li>
                </ul>
              </div>
            </div>
          </Section>

          <Section icon={FileText} title="Kullanıcı Hakları">
            <p>Aşağıdaki haklara sahipsiniz:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Hesap verilerinizin silinmesini talep etme</li>
              <li>Kimlik kartlarınızı cihazdan kaldırma</li>
              <li>Kullanım analizlerinin kapatılmasını talep etme</li>
            </ul>
            <p className="mt-4">
              Bu talepler, projenin topluluk yapısı gereği e-posta veya GitHub Issue üzerinden iletilebilir.
            </p>
          </Section>

          <div className="mt-12 pt-8 border-t border-white/10">
            <h3 className="text-xl font-bold text-white mb-4">İletişim</h3>
            <p className="text-gray-300 mb-4">
              Gizlilikle ilgili tüm sorular, geri bildirimler veya talepler için:
            </p>
            <div className="flex flex-col gap-2">
              <a 
                href="mailto:contact@heptapusgroup.com" 
                className="text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                contact@heptapusgroup.com
              </a>
              <p className="text-sm text-gray-400">
                veya GitHub deposunda bir <strong>issue</strong> açarak da ekiple iletişime geçebilirsiniz.
              </p>
            </div>
          </div>

          <div className="mt-8 p-4 bg-zinc-800/50 border border-white/10 rounded-xl">
            <p className="text-gray-400 text-sm">
              <strong>Son Güncelleme:</strong> Bu politika düzenli olarak gözden geçirilir. 
              Önemli değişiklikler repository sürüm notlarında ve uygulama içinde duyurulacaktır.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
