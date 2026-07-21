import { motion } from 'framer-motion';
import {
  Shield,
  Instagram,
  Facebook,
  Trash2,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Database,
  RefreshCw,
  ExternalLink,
  Check,
  ArrowLeft,
} from 'lucide-react';
import { useLocation } from 'wouter';

const appleEase: [number, number, number, number] = [0.25, 0.1, 0.25, 1];

const SectionCard = ({
  icon: Icon,
  iconBg,
  iconColor,
  title,
  children,
  delay = 0,
}: {
  icon: any;
  iconBg: string;
  iconColor: string;
  title: string;
  children: React.ReactNode;
  delay?: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-40px' }}
    transition={{ duration: 0.5, ease: appleEase, delay }}
    className="rounded-2xl bg-white/80 backdrop-blur-sm border border-slate-200/60 shadow-[0_2px_20px_-6px_rgba(0,0,0,0.08)] p-6 sm:p-8"
  >
    <div className="flex items-center gap-3 mb-5">
      <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <h2 className="text-[17px] sm:text-lg font-semibold text-slate-900 tracking-tight">{title}</h2>
    </div>
    <div className="text-[14px] sm:text-[15px] text-slate-600 leading-relaxed space-y-4">
      {children}
    </div>
  </motion.div>
);

const BulletList = ({ items }: { items: { bold?: string; text: string }[] }) => (
  <ul className="space-y-2.5">
    {items.map((item, i) => (
      <li key={i} className="flex items-start gap-2.5">
        <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-2 shrink-0" />
        <span>
          {item.bold && <strong className="text-slate-800">{item.bold}</strong>}
          {item.bold ? ' ' : ''}{item.text}
        </span>
      </li>
    ))}
  </ul>
);

const CheckList = ({ items, color = 'emerald' }: { items: string[]; color?: string }) => (
  <ul className="space-y-2">
    {items.map((item, i) => (
      <li key={i} className="flex items-start gap-2.5">
        <Check className={`w-4 h-4 text-${color}-500 mt-0.5 shrink-0`} />
        <span>{item}</span>
      </li>
    ))}
  </ul>
);

const NoList = ({ items }: { items: string[] }) => (
  <ul className="space-y-2">
    {items.map((item, i) => (
      <li key={i} className="flex items-start gap-2.5">
        <EyeOff className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
        <span>{item}</span>
      </li>
    ))}
  </ul>
);

const Privacy = () => {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: '#fbfbfd' }}>
      {/* Background blurs */}
      <div className="absolute top-[-200px] left-[-100px] w-[500px] h-[500px] rounded-full bg-blue-200/30 blur-[120px] pointer-events-none" />
      <div className="absolute top-[400px] right-[-150px] w-[400px] h-[400px] rounded-full bg-purple-200/20 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-100px] left-[30%] w-[350px] h-[350px] rounded-full bg-emerald-200/20 blur-[100px] pointer-events-none" />

      {/* Header bar */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: appleEase }}
        className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 border-b border-slate-200/40"
      >
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/instagram')}
            className="flex items-center gap-2 text-[13px] text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            GoAutos Admin
          </button>
          <span className="text-[12px] text-slate-400">Last updated: February 2026</span>
        </div>
      </motion.div>

      <div className="max-w-3xl mx-auto px-6 py-12 relative z-10">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: appleEase }}
          className="text-center mb-12"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: appleEase, delay: 0.1 }}
            className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto mb-5 shadow-[0_8px_30px_-6px_rgba(59,130,246,0.4)]"
          >
            <Shield className="w-8 h-8 text-white" />
          </motion.div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight mb-3">
            Privacy Policy
          </h1>
          <p className="text-[15px] sm:text-base text-slate-500 max-w-lg mx-auto leading-relaxed">
            GoAutos Admin is a vehicle inventory management platform for automotive dealerships.
            Here's how we handle your data.
          </p>
        </motion.div>

        {/* Sections */}
        <div className="space-y-5">
          {/* 1. Data We Collect */}
          <SectionCard icon={Database} iconBg="bg-blue-50" iconColor="text-blue-600" title="1. Data We Collect" delay={0.05}>
            <p>When you use GoAutos Admin, we may collect:</p>
            <BulletList items={[
              { bold: 'Account information:', text: 'Name, email address, phone number, and role within the dealership.' },
              { bold: 'Vehicle data:', text: 'Vehicle details, images, prices, and inventory information you input.' },
              { bold: 'Customer & lead data:', text: 'Contact information and interactions related to potential buyers.' },
            ]} />
          </SectionCard>

          {/* 2. Instagram & Meta Platform Data */}
          <SectionCard icon={Instagram} iconBg="bg-gradient-to-br from-purple-50 to-pink-50" iconColor="text-purple-600" title="2. Instagram & Meta Platform Data" delay={0.1}>
            <p>When you connect your Instagram Business or Creator account, we access:</p>
            <BulletList items={[
              { bold: 'Profile information:', text: 'Username, account ID, profile picture, bio, and follower count.' },
              { bold: 'Media:', text: 'Your published posts including images, captions, timestamps, likes, and comments.' },
              { bold: 'Content publishing:', text: 'We publish photo and carousel posts on your behalf when you explicitly request it.' },
            ]} />

            <div className="rounded-xl bg-emerald-50/60 border border-emerald-200/40 p-4 mt-2">
              <p className="text-[13px] font-semibold text-emerald-800 mb-2.5 flex items-center gap-2">
                <Eye className="w-4 h-4" /> How we use your Instagram data
              </p>
              <CheckList items={[
                'Display your connected account info in the dashboard.',
                'Show your existing posts for management purposes.',
                'Publish vehicle listings when you initiate a publication.',
              ]} />
            </div>

            <div className="rounded-xl bg-red-50/60 border border-red-200/40 p-4">
              <p className="text-[13px] font-semibold text-red-800 mb-2.5 flex items-center gap-2">
                <EyeOff className="w-4 h-4" /> What we do NOT do
              </p>
              <NoList items={[
                'We do NOT sell, share, or transfer your Instagram data to third parties.',
                'We do NOT use your data for advertising beyond your explicit requests.',
                'We do NOT store your Instagram password — OAuth handles authentication.',
                'We do NOT access or publish content without your explicit action.',
              ]} />
            </div>
          </SectionCard>

          {/* 3. Facebook Platform Data */}
          <SectionCard icon={Facebook} iconBg="bg-blue-50" iconColor="text-blue-600" title="3. Facebook Platform Data" delay={0.15}>
            <p>When you connect your Facebook account for Marketplace publishing, we access:</p>
            <BulletList items={[
              { bold: 'Page information:', text: 'Facebook Page name, ID, and linked Instagram account.' },
              { bold: 'Marketplace listings:', text: 'We create and manage vehicle listings on Facebook Marketplace on your behalf.' },
              { bold: 'Conversations:', text: 'Access to Marketplace and Instagram Direct messages for lead management.' },
            ]} />

            <div className="rounded-xl bg-emerald-50/60 border border-emerald-200/40 p-4 mt-2">
              <p className="text-[13px] font-semibold text-emerald-800 mb-2.5 flex items-center gap-2">
                <Eye className="w-4 h-4" /> How we use your Facebook data
              </p>
              <CheckList items={[
                'Publish vehicle listings to Facebook Marketplace.',
                'Display conversations and messages for lead follow-up.',
                'Show your connected page info in the integrations dashboard.',
              ]} />
            </div>

            <div className="rounded-xl bg-red-50/60 border border-red-200/40 p-4">
              <p className="text-[13px] font-semibold text-red-800 mb-2.5 flex items-center gap-2">
                <EyeOff className="w-4 h-4" /> What we do NOT do
              </p>
              <NoList items={[
                'We do NOT post to your personal Facebook profile.',
                'We do NOT access your personal messages or friends list.',
                'We do NOT sell or share your Facebook data with third parties.',
                'We do NOT store your Facebook password.',
              ]} />
            </div>
          </SectionCard>

          {/* 4. Data Storage & Security */}
          <SectionCard icon={Lock} iconBg="bg-slate-100" iconColor="text-slate-600" title="4. Data Storage & Security" delay={0.2}>
            <BulletList items={[
              { text: 'All data is stored securely on Supabase infrastructure with encryption at rest and in transit.' },
              { text: 'Access tokens for Instagram and Facebook are stored encrypted and automatically refreshed before expiration.' },
              { text: 'Access to data is restricted by role-based permissions within each dealership.' },
              { text: 'We follow industry-standard security practices to protect your information.' },
            ]} />
          </SectionCard>

          {/* 5. Data Deletion */}
          <SectionCard icon={Trash2} iconBg="bg-red-50" iconColor="text-red-500" title="5. Data Deletion & Disconnection" delay={0.25}>
            <p>You can disconnect your accounts at any time:</p>
            <BulletList items={[
              { text: 'Navigate to the Instagram or Facebook section and click the disconnect button.' },
              { text: 'This immediately revokes access and deletes stored tokens and account data from our systems.' },
              { text: 'You can also revoke access from your Instagram or Facebook app settings at any time.' },
              { text: 'To request complete deletion of all your data, contact us at the email below.' },
            ]} />
          </SectionCard>

          {/* 6. Third-Party Services */}
          <SectionCard icon={ExternalLink} iconBg="bg-violet-50" iconColor="text-violet-600" title="6. Third-Party Services" delay={0.3}>
            <p>GoAutos Admin integrates with the following services, each governed by their own policies:</p>
            <div className="grid gap-2 mt-2">
              {[
                { name: 'Meta / Instagram', url: 'https://privacycenter.instagram.com/policy', icon: Instagram, color: 'text-purple-600' },
                { name: 'Meta / Facebook', url: 'https://www.facebook.com/privacy/policy/', icon: Facebook, color: 'text-blue-600' },
              ].map(service => (
                <a
                  key={service.name}
                  href={service.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-50/80 hover:bg-slate-100/80 border border-slate-200/40 transition-colors group"
                >
                  <service.icon className={`w-4 h-4 ${service.color} shrink-0`} />
                  <span className="text-[13px] font-medium text-slate-700 flex-1">{service.name}</span>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                </a>
              ))}
            </div>
          </SectionCard>

          {/* 7. Changes */}
          <SectionCard icon={RefreshCw} iconBg="bg-amber-50" iconColor="text-amber-600" title="7. Changes to This Policy" delay={0.35}>
            <p>
              We may update this privacy policy from time to time. Changes will be reflected on this page
              with an updated revision date. Continued use of the platform after changes constitutes
              acceptance of the updated policy.
            </p>
          </SectionCard>

          {/* 8. Contact */}
          <SectionCard icon={Mail} iconBg="bg-emerald-50" iconColor="text-emerald-600" title="8. Contact" delay={0.4}>
            <p>
              If you have questions about this privacy policy or wish to request data deletion:
            </p>
            <a
              href="mailto:soporte@goauto.cl"
              className="inline-flex items-center gap-2.5 mt-2 px-5 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-[14px] font-medium shadow-[0_4px_16px_-4px_rgba(59,130,246,0.4)] hover:shadow-[0_8px_24px_-4px_rgba(59,130,246,0.5)] transition-shadow"
            >
              <Mail className="w-4 h-4" />
              soporte@goauto.cl
            </a>
          </SectionCard>
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-16 pt-8 border-t border-slate-200/40 text-center"
        >
          <p className="text-[13px] text-slate-400">
            &copy; {new Date().getFullYear()} GoAutos Admin. All rights reserved.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Privacy;
