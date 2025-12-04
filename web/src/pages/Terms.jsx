import React from 'react';
import { motion } from 'framer-motion';
import { FileText, AlertTriangle, Shield, Users, Scale, Bell } from 'lucide-react';
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

export default function Terms() {
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
            <img src="/worldpass_logo.svg" alt="WorldPass" className="w-9 h-9" />
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
            className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[100px]" 
          />
        </div>
        
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500/20 to-indigo-500/20 rounded-2xl mb-6 border border-white/10">
              <FileText className="text-purple-400" size={32} />
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-100 to-gray-300">
              Kullanım Koşulları
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              WorldPass MVP sürümüne ait kullanım şartları ve sorumluluklar
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
              <strong>Önemli:</strong> Bu koşullar WorldPass'in erken aşama (MVP) sürümü içindir. 
              Hizmet deneysel niteliktedir ve üretim ortamlarında kullanılmamalıdır.
            </p>
          </div>

          <Section icon={Users} title="Kabul Edilen Kullanım">
            <p>
              WorldPass'i kullanarak aşağıdaki şartları kabul etmiş sayılırsınız:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>WorldPass'i test ve erken aşama değerlendirme amacıyla kullanmak</li>
              <li>Hizmeti kötüye kullanmamak veya güvenliğini tehlikeye atmamaya çalışmamak</li>
              <li>Yanlış veya yanıltıcı kimlik bilgileri sağlamamak</li>
              <li>Sistemi aşırı yüklemeye yönelik davranışlardan kaçınmak</li>
            </ul>
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-200 text-sm">
                <strong>Yasak:</strong> WorldPass'i yasadışı faaliyetler, kimlik sahtekarlığı veya 
                başkalarının haklarını ihlal edici şekilde kullanmak kesinlikle yasaktır.
              </p>
            </div>
          </Section>

          <Section icon={AlertTriangle} title="Garanti Olmaksızın Sağlanan Hizmet">
            <div className="space-y-4">
              <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                <p className="text-orange-200">
                  <strong>WorldPass "olduğu gibi" sunulmaktadır.</strong>
                </p>
              </div>
              <p>
                MVP aşamasında:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Özellikler değişebilir ve beklenmedik şekilde çalışmayabilir</li>
                <li>Hizmetin kesintisiz veya hatasız çalışacağı garanti edilmez</li>
                <li>Bakım ve güncellemeler önceden bildirilmeksizin yapılabilir</li>
                <li>Veri kaybı veya erişim sorunları yaşanabilir</li>
              </ul>
              <p className="text-sm text-gray-400 mt-4">
                Kullanıcılar, kritik iş süreçlerinde veya üretim ortamlarında WorldPass MVP'ye 
                güvenmemelidir.
              </p>
            </div>
          </Section>

          <Section icon={Scale} title="Sorumluluk Sınırlamaları">
            <p>
              WorldPass geliştiricileri ve katkıda bulunanlar:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Hizmetin kullanımından veya kullanılamamasından kaynaklanan zararlardan sorumlu değildir</li>
              <li>Veri kaybı, iş kaybı veya kar kaybından sorumlu tutulamaz</li>
              <li>Üçüncü taraf hizmetlerin (barındırma, e-posta vs.) aksaklıklarından sorumlu değildir</li>
              <li>Kullanıcıların yaptığı hatalı işlemlerden sorumlu değildir</li>
            </ul>
            <div className="mt-4 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
              <h4 className="font-semibold text-indigo-200 mb-2">Öneriler:</h4>
              <ul className="list-disc list-inside space-y-1 text-indigo-200 text-sm">
                <li>Kritik verilerinizi her zaman yedekleyin</li>
                <li>Önemli kimlik bilgilerinizi yalnızca WorldPass'te saklamayın</li>
                <li>Test ortamında kullanım için uygun veri setleri kullanın</li>
              </ul>
            </div>
          </Section>

          <Section icon={Shield} title="Hesap Güvenliği ve Sorumluluklar">
            <p>
              Hesabınızın güvenliğinden siz sorumlusunuz:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Güçlü ve benzersiz bir parola kullanın</li>
              <li>Hesap bilgilerinizi başkalarıyla paylaşmayın</li>
              <li>Şüpheli aktiviteleri derhal bildirin</li>
              <li>Kurtarma bilgilerinizi güncel tutun</li>
            </ul>
            <p className="mt-4">
              Hesabınızdan gerçekleştirilen tüm işlemlerden siz sorumlusunuz. Yetkisiz erişim 
              durumunda derhal ekiple iletişime geçin.
            </p>
          </Section>

          <Section icon={FileText} title="Fikri Mülkiyet">
            <p>
              WorldPass yazılımı ve belgeleri:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Belirli bir açık kaynak lisansı altında yayınlanabilir</li>
              <li>Kullanıcı verileriniz size aittir</li>
              <li>Platform tasarımı ve marka öğeleri korunmaktadır</li>
            </ul>
            <p className="mt-4 text-sm text-gray-400">
              Açık kaynak lisans detayları için repository'deki LICENSE dosyasına bakın.
            </p>
          </Section>

          <Section icon={Bell} title="Değişiklikler ve Bildirimler">
            <p>
              Bu kullanım koşulları zaman içinde değişebilir:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Önemli değişiklikler e-posta veya uygulama içi bildirimle duyurulacaktır</li>
              <li>Küçük düzenlemeler repository'de yayınlanacaktır</li>
              <li>Hizmeti kullanmaya devam etmek, güncel koşulları kabul ettiğiniz anlamına gelir</li>
            </ul>
            <p className="mt-4">
              Değişikliklere katılmıyorsanız, hizmeti kullanmayı bırakabilir ve hesabınızı 
              silebilirsiniz.
            </p>
          </Section>

          <div className="mt-12 pt-8 border-t border-white/10">
            <h3 className="text-xl font-bold text-white mb-4">Hesap Sonlandırma</h3>
            <div className="space-y-3">
              <p className="text-gray-300">
                İstediğiniz zaman hesabınızı kapatabilirsiniz. Hesap silme işlemi için:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4 text-gray-400">
                <li>Ayarlar sayfasından hesap silme talebinde bulunun</li>
                <li>Veya ekiple iletişime geçin</li>
              </ul>
              <p className="text-sm text-gray-400 mt-4">
                WorldPass ekibi, kullanım koşullarını ihlal eden hesapları askıya alma veya 
                sonlandırma hakkını saklı tutar.
              </p>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-white/10">
            <h3 className="text-xl font-bold text-white mb-4">İletişim ve Destek</h3>
            <p className="text-gray-300 mb-4">
              Kullanım koşulları hakkında sorularınız için:
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
            <p className="text-gray-400 text-sm leading-relaxed">
              <strong>Son Söz:</strong> WorldPass, dijital kimliğin geleceğini keşfetmek amacıyla 
              geliştirilen erken aşama bir projedir. Bu koşulları kabul ederek, WorldPass'in gelişimine 
              katkıda bulunan ilk kullanıcılarımızdan biri oluyorsunuz. Geri bildirimleriniz bizim 
              için çok değerlidir.
            </p>
          </div>

          <div className="mt-6 p-4 bg-zinc-800/50 border border-white/10 rounded-xl">
            <p className="text-gray-400 text-sm">
              <strong>Son Güncelleme:</strong> Bu koşullar düzenli olarak gözden geçirilir. 
              Değişiklikler repository ve uygulama içinde duyurulacaktır.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
