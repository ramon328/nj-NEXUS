import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { AlertCircle, BarChart3, Box, Eye, EyeOff, KeyRound, Mail, Plug, Shield } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { motion, useMotionValue, useSpring } from 'framer-motion';
import { PRIMARY_COLOR } from '@/lib/colors';

const appleEase = [0.25, 0.1, 0.25, 1] as const;

/* ── CSS for grain + mouse-tracking card border ── */
const injectedCSS = `
/* Grain noise — visible texture */
.grain-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 2;
  opacity: 0.12;
  mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-repeat: repeat;
  background-size: 256px 256px;
}

/* Mouse-tracking border glow */
.glow-card {
  position: relative;
  border-radius: 1.5rem;
}
.glow-card::before,
.glow-card::after {
  content: "";
  position: absolute;
  inset: -1.5px;
  border-radius: 1.625rem;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.4s ease;
}
.glow-card::before {
  padding: 1.5px;
  background: radial-gradient(
    600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%),
    rgba(255,255,255,0.9) 0%,
    rgba(255,255,255,0.4) 25%,
    transparent 70%
  );
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
}
.glow-card::after {
  border-radius: 1.5rem;
  inset: 0;
  background: radial-gradient(
    400px circle at var(--mouse-x, 50%) var(--mouse-y, 50%),
    rgba(255,255,255,0.08) 0%,
    transparent 70%
  );
}
.glow-card:hover::before,
.glow-card:hover::after {
  opacity: 1;
}
`;

const featureKeys = [
  { icon: Box, key: 'branding.features.inventory' },
  { icon: BarChart3, key: 'branding.features.sales' },
  { icon: Plug, key: 'branding.features.integrations' },
];

/* ── Orb: dramatic floating blobs with wide travel paths ── */
const Orb = ({
  size,
  color,
  left,
  top,
  blur,
  delay,
  duration,
  travel,
  opacity,
}: {
  size: number;
  color: string;
  left: string;
  top: string;
  blur: number;
  delay: number;
  duration: number;
  travel: { x: number[]; y: number[] };
  opacity?: number[];
}) => (
  <motion.div
    className="absolute rounded-full pointer-events-none"
    style={{
      width: size,
      height: size,
      background: color,
      left,
      top,
      filter: `blur(${blur}px)`,
    }}
    animate={{
      x: travel.x,
      y: travel.y,
      scale: [1, 1.15, 0.9, 1.1, 1],
      ...(opacity ? { opacity } : {}),
    }}
    transition={{
      duration,
      delay,
      repeat: Infinity,
      repeatType: 'reverse',
      ease: 'easeInOut',
    }}
  />
);

const Login: React.FC = () => {
  const { signIn, user, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [location, navigate] = useLocation();
  const { t, i18n } = useTranslation('auth');

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    // Use ref values as fallback — browser autocomplete may not trigger onChange
    const emailValue = email || emailRef.current?.value || '';
    const passwordValue = password || passwordRef.current?.value || '';

    if (!emailValue || !passwordValue) {
      setErrorMessage(t('login.errors.invalidCredentials'));
      return;
    }

    const { error } = await signIn(emailValue, passwordValue);

    if (error) {
      console.error('Login error:', error);
      setErrorMessage(t('login.errors.invalidCredentials'));
      return;
    }
  };

  const currentLng = i18n.language?.startsWith('en') ? 'en' : 'es';
  const switchLanguage = (lng: 'en' | 'es') => {
    if (lng === currentLng) return;
    i18n.changeLanguage(lng);
    try {
      localStorage.setItem('goautos-language', lng);
    } catch {}
  };

  const togglePasswordVisibility = () => setShowPassword(!showPassword);

  return (
    <div className="min-h-[100dvh] w-full flex flex-col lg:flex-row overflow-hidden">
      <style>{injectedCSS}</style>

      {/* ──────── Left branding panel — desktop only ──────── */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: appleEase }}
        className="hidden lg:flex lg:w-[55%] relative overflow-hidden flex-col items-center justify-center p-12"
        style={{ background: '#1f5a82' }}
      >
        {/* Film grain — visible */}
        <div className="grain-overlay" />

        {/* ── Orb field: high contrast — deep darks + bright celeste ── */}
        {/* Dark orbs — much deeper than background */}
        <Orb size={420} color="rgba(4,16,35,0.7)" left="-10%" top="20%" blur={120} delay={0} duration={20}
          travel={{ x: [0, 80, -40, 60, 0], y: [0, -60, 30, -40, 0] }} />
        <Orb size={350} color="rgba(3,12,30,0.65)" left="20%" top="60%" blur={110} delay={2} duration={22}
          travel={{ x: [0, 60, -80, 40, 0], y: [0, -50, 70, -30, 0] }} />
        <Orb size={300} color="rgba(5,18,40,0.6)" left="-15%" top="50%" blur={130} delay={4} duration={26}
          travel={{ x: [0, 100, -30, 70, 0], y: [0, -40, 60, -50, 0] }} />
        {/* Bright celeste orbs — vivid glow */}
        <Orb size={280} color="rgba(81,189,229,0.3)" left="55%" top="10%" blur={90} delay={1} duration={16}
          travel={{ x: [0, -70, 40, -50, 0], y: [0, 80, -30, 60, 0] }} />
        <Orb size={200} color="rgba(110,210,240,0.25)" left="5%" top="-5%" blur={80} delay={3} duration={18}
          travel={{ x: [0, 40, -20, 50, 0], y: [0, 60, -40, 30, 0] }} />
        <Orb size={160} color="rgba(81,189,229,0.35)" left="70%" top="65%" blur={60} delay={0.5} duration={14}
          travel={{ x: [0, -50, 30, -60, 0], y: [0, -40, 50, -20, 0] }}
          opacity={[0.25, 0.45, 0.3, 0.5, 0.25]} />
        {/* Mid-tone + bright spark */}
        <Orb size={250} color="rgba(20,70,130,0.35)" left="35%" top="75%" blur={100} delay={1.5} duration={24}
          travel={{ x: [0, -60, 50, -30, 0], y: [0, -80, 20, -60, 0] }} />
        <Orb size={100} color="rgba(81,200,235,0.4)" left="80%" top="35%" blur={40} delay={2.5} duration={12}
          travel={{ x: [0, -40, 60, -50, 0], y: [0, 30, -50, 40, 0] }}
          opacity={[0.25, 0.5, 0.3, 0.55, 0.25]} />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center text-center max-w-lg">
          <motion.img
            src="/lovable-uploads/GOAUTO.LOGO.29.09.25.BLANCO.png"
            alt="GoAuto Logo"
            className="h-20 mb-10"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.3, ease: appleEase }}
          />

          <motion.h2
            className="text-5xl font-bold text-white mb-4 leading-[1.1]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45, ease: appleEase }}
          >
            {t('branding.headline')}
            <br />
            <span className="bg-gradient-to-r from-primary via-sky-300 to-cyan-200 bg-clip-text text-transparent">{t('branding.headlineHighlight')}</span>
          </motion.h2>

          <motion.p
            className="text-white/60 text-base leading-relaxed mb-12 whitespace-nowrap"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.55, ease: appleEase }}
          >
            {t('branding.subtitle')}
          </motion.p>

          {/* Feature pills */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            {featureKeys.map((feat, i) => (
              <motion.div
                key={feat.key}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.65 + i * 0.1, ease: appleEase }}
                whileHover={{ scale: 1.05, backgroundColor: 'rgba(81,189,229,0.2)' }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full border text-sm font-medium cursor-default transition-colors"
                style={{
                  background: 'rgba(81,189,229,0.08)',
                  borderColor: 'rgba(81,189,229,0.2)',
                  color: 'rgba(255,255,255,0.85)',
                }}
              >
                <feat.icon className="h-4 w-4 text-primary" />
                {t(feat.key)}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Animated bottom line accent */}
        <motion.div
          className="absolute bottom-0 left-0 h-[2px] z-10"
          style={{ background: `linear-gradient(90deg, transparent, ${PRIMARY_COLOR}, transparent)` }}
          initial={{ width: '0%', opacity: 0 }}
          animate={{ width: '100%', opacity: 1 }}
          transition={{ duration: 1.5, delay: 0.8, ease: appleEase }}
        />

        {/* Footer */}
        <motion.div
          className="absolute bottom-8 text-xs text-white/30 z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          &copy; {new Date().getFullYear()} GoAuto. {t('branding.copyright')}
        </motion.div>
      </motion.div>

      {/* ──────── Right form panel ──────── */}
      <div className="flex-1 flex flex-col items-center justify-center relative px-6 py-6 lg:py-12 lg:px-12 bg-[#f7f7f8] lg:rounded-l-[1.5rem] lg:-ml-8 z-10 shadow-[-8px_0_30px_-10px_rgba(0,0,0,0.08)] overflow-hidden">

        {/* Subtle celeste glow on form side */}
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-primary/[0.06] blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-60 h-60 rounded-full bg-primary/[0.04] blur-[80px] pointer-events-none" />

        {/* Mobile header */}
        <motion.div
          className="lg:hidden flex flex-col items-center mb-5"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: appleEase }}
        >
          <img
            src="/lovable-uploads/GOAUTO.LOGO.29.09.25.AZUL.png"
            alt="GoAuto Logo"
            className="h-14 mb-3"
          />
          <p className="text-slate-500 text-sm">{t('branding.mobileSubtitle')}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: appleEase }}
          className="w-full max-w-[420px] relative z-10"
        >
          <div
            className="glow-card bg-white/80 backdrop-blur-2xl border border-white/60 rounded-3xl p-6 sm:p-10 shadow-[0_8px_60px_-12px_rgba(255,255,255,0.4)]"
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const y = e.clientY - rect.top;
              e.currentTarget.style.setProperty('--mouse-x', `${x}px`);
              e.currentTarget.style.setProperty('--mouse-y', `${y}px`);
            }}
          >

            <div className="text-center mb-5 sm:mb-8">
              <h1 className="text-2xl font-bold text-slate-900 mb-1.5">
                {t('login.title')}
              </h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              <motion.div
                className="space-y-1.5"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.35, ease: appleEase }}
              >
                <Label
                  htmlFor="email"
                  className="text-sm font-medium text-slate-700"
                >
                  {t('login.email.label')}
                </Label>
                <div className="relative group">
                  <Input
                    ref={emailRef}
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('login.email.placeholder')}
                    className="h-12 pl-11 !bg-[#f5f5f5] !border-[#ebebeb] rounded-xl transition-all duration-300 focus:ring-2 focus:ring-gray-300/40 focus:border-gray-400/60"
                    autoComplete="email"
                  />
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-slate-400 group-focus-within:text-primary transition-colors" />
                </div>
              </motion.div>

              <motion.div
                className="space-y-1.5"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.45, ease: appleEase }}
              >
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="password"
                    className="text-sm font-medium text-slate-700"
                  >
                    {t('login.password.label')}
                  </Label>
                  <button
                    type="button"
                    onClick={() => navigate('/forgot-password')}
                    className="text-xs text-slate-500 hover:text-slate-700 font-semibold transition-colors"
                  >
                    {t('login.forgotPassword')}
                  </button>
                </div>
                <div className="relative group">
                  <Input
                    ref={passwordRef}
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 pl-11 pr-11 !bg-[#f5f5f5] !border-[#ebebeb] rounded-xl transition-all duration-300 focus:ring-2 focus:ring-gray-300/40 focus:border-gray-400/60"
                    autoComplete="current-password"
                  />
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-slate-400 group-focus-within:text-primary transition-colors" />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-[18px] w-[18px]" />
                    ) : (
                      <Eye className="h-[18px] w-[18px]" />
                    )}
                  </button>
                </div>
              </motion.div>

              {errorMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.3, ease: appleEase }}
                  className="flex items-center gap-2.5 bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm border border-red-100"
                  role="alert"
                >
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {errorMessage}
                </motion.div>
              )}

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.55, ease: appleEase }}
              >
                <Button
                  disabled={loading}
                  className="w-full h-12 rounded-xl text-sm font-semibold transition-all duration-300 hover:brightness-110 active:scale-[0.98]"
                  style={{
                    background: `linear-gradient(135deg, ${PRIMARY_COLOR} 0%, color-mix(in srgb, ${PRIMARY_COLOR} 85%, black) 50%, color-mix(in srgb, ${PRIMARY_COLOR} 70%, black) 100%)`,
                    color: 'white',
                  }}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      {t('login.button.loading')}
                    </span>
                  ) : (
                    t('login.button.submit')
                  )}
                </Button>
              </motion.div>
            </form>

            <motion.div
              className="mt-5 sm:mt-7 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              <p className="text-sm text-slate-500">
                {t('login.signup.question')}{' '}
                <button
                  onClick={() => navigate('/onboarding')}
                  className="text-primary hover:text-primary/80 font-semibold transition-colors"
                >
                  {t('login.signup.cta')}
                </button>
              </p>
            </motion.div>
          </div>

          {/* Trust badge below card */}
          <motion.div
            className="flex items-center justify-center gap-2 mt-4 sm:mt-6 text-xs text-slate-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9 }}
          >
            <Shield className="h-3.5 w-3.5" />
            {t('login.trustBadge')}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
