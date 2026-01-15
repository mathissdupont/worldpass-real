import React from 'react';
import { motion } from 'framer-motion';
import { FileText, AlertTriangle, Shield, Users, Scale, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();

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
            {t('terms.nav.home')}
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
              {t('terms.hero.title')}
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              {t('terms.hero.subtitle')}
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
              <strong>{t('terms.important').split(':')[0]}:</strong> {t('terms.important').split(':').slice(1).join(':').trim()}
            </p>
          </div>

          <Section icon={Users} title={t('terms.accepted_use.title')}>
            <p>{t('terms.accepted_use.intro')}</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>{t('terms.accepted_use.list.1')}</li>
              <li>{t('terms.accepted_use.list.2')}</li>
              <li>{t('terms.accepted_use.list.3')}</li>
              <li>{t('terms.accepted_use.list.4')}</li>
            </ul>
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-200 text-sm">
                <strong>{t('terms.accepted_use.prohibited').split(':')[0]}:</strong> {t('terms.accepted_use.prohibited').split(':').slice(1).join(':').trim()}
              </p>
            </div>
          </Section>

          <Section icon={AlertTriangle} title={t('terms.no_warranty.title')}>
            <div className="space-y-4">
              <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                <p className="text-orange-200">
                  <strong>{t('terms.no_warranty.box')}</strong>
                </p>
              </div>
              <p>{t('terms.no_warranty.intro')}</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>{t('terms.no_warranty.list.1')}</li>
                <li>{t('terms.no_warranty.list.2')}</li>
                <li>{t('terms.no_warranty.list.3')}</li>
                <li>{t('terms.no_warranty.list.4')}</li>
              </ul>
              <p className="text-sm text-gray-400 mt-4">
                {t('terms.no_warranty.note')}
              </p>
            </div>
          </Section>

          <Section icon={Scale} title={t('terms.liability.title')}>
            <p>{t('terms.liability.intro')}</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>{t('terms.liability.list.1')}</li>
              <li>{t('terms.liability.list.2')}</li>
              <li>{t('terms.liability.list.3')}</li>
              <li>{t('terms.liability.list.4')}</li>
            </ul>
            <div className="mt-4 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
              <h4 className="font-semibold text-indigo-200 mb-2">{t('terms.liability.suggestions.title')}</h4>
              <ul className="list-disc list-inside space-y-1 text-indigo-200 text-sm">
                <li>{t('terms.liability.suggestions.1')}</li>
                <li>{t('terms.liability.suggestions.2')}</li>
                <li>{t('terms.liability.suggestions.3')}</li>
              </ul>
            </div>
          </Section>

          <Section icon={Shield} title={t('terms.security.title')}>
            <p>{t('terms.security.intro')}</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>{t('terms.security.list.1')}</li>
              <li>{t('terms.security.list.2')}</li>
              <li>{t('terms.security.list.3')}</li>
              <li>{t('terms.security.list.4')}</li>
            </ul>
            <p className="mt-4">
              {t('terms.security.responsibility')}
            </p>
          </Section>

          <Section icon={FileText} title={t('terms.ip.title')}>
            <p>{t('terms.ip.intro')}</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>{t('terms.ip.list.1')}</li>
              <li>{t('terms.ip.list.2')}</li>
              <li>{t('terms.ip.list.3')}</li>
            </ul>
            <p className="mt-4 text-sm text-gray-400">
              {t('terms.ip.note')}
            </p>
          </Section>

          <Section icon={Bell} title={t('terms.changes.title')}>
            <p>{t('terms.changes.intro')}</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>{t('terms.changes.list.1')}</li>
              <li>{t('terms.changes.list.2')}</li>
              <li>{t('terms.changes.list.3')}</li>
            </ul>
            <p className="mt-4">
              {t('terms.changes.note')}
            </p>
          </Section>

          <div className="mt-12 pt-8 border-t border-white/10">
            <h3 className="text-xl font-bold text-white mb-4">{t('terms.account_termination.title')}</h3>
            <div className="space-y-3">
              <p className="text-gray-300">
                {t('terms.account_termination.intro')}
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4 text-gray-400">
                <li>{t('terms.account_termination.list.1')}</li>
                <li>{t('terms.account_termination.list.2')}</li>
              </ul>
              <p className="text-sm text-gray-400 mt-4">
                {t('terms.account_termination.note')}
              </p>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-white/10">
            <h3 className="text-xl font-bold text-white mb-4">{t('terms.contact.title')}</h3>
            <p className="text-gray-300 mb-4">
              {t('terms.contact.intro')}
            </p>
            <div className="flex flex-col gap-2">
              <a
                href={`mailto:${t('terms.contact.email')}`}
                className="text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                {t('terms.contact.email')}
              </a>
              <p className="text-sm text-gray-400">
                {t('terms.contact.github')}
              </p>
            </div>
          </div>

          <div className="mt-8 p-4 bg-zinc-800/50 border border-white/10 rounded-xl">
            <p className="text-gray-400 text-sm leading-relaxed">
              <strong>{t('terms.final_note').split(':')[0]}:</strong> {t('terms.final_note').split(':').slice(1).join(':').trim()}
            </p>
          </div>

          <div className="mt-6 p-4 bg-zinc-800/50 border border-white/10 rounded-xl">
            <p className="text-gray-400 text-sm">
              <strong>{t('terms.last_update').split(':')[0]}:</strong> {t('terms.last_update').split(':').slice(1).join(':').trim()}
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
