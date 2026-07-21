import React from "react";
import { Car, TrendingUp, Users, Search, ArrowRight } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { motion } from "framer-motion";
import LottieImport from "lottie-react";
const Lottie = (typeof LottieImport === "object" && "default" in LottieImport) ? (LottieImport as any).default : LottieImport;
import aiAnimation from "@/assets/ai-animation.json";

interface EmptyConversationStateProps {
  onSendMessage: (message: string) => void;
  children?: React.ReactNode;
}

const EmptyConversationState: React.FC<EmptyConversationStateProps> = ({
  onSendMessage,
  children,
}) => {
  const { tCommon } = useI18n();

  const quickCards = [
    {
      icon: Car,
      title: tCommon("aiAssistant.emptyState.stockSummary"),
      description: tCommon("aiAssistant.emptyState.stockSummaryDesc"),
    },
    {
      icon: TrendingUp,
      title: tCommon("aiAssistant.emptyState.monthlySales"),
      description: tCommon("aiAssistant.emptyState.monthlySalesDesc"),
    },
    {
      icon: Users,
      title: tCommon("aiAssistant.emptyState.latestLeads"),
      description: tCommon("aiAssistant.emptyState.latestLeadsDesc"),
    },
    {
      icon: Search,
      title: tCommon("aiAssistant.emptyState.vehicleLookup"),
      description: tCommon("aiAssistant.emptyState.vehicleLookupDesc"),
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 py-6 md:py-10">
        <div className="flex flex-col min-h-[calc(100vh-14rem)]">
          {/* Top spacer */}
          <div className="flex-1 min-h-8" />

          {/* Hero */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
            >
              <div className="relative flex items-center justify-center w-20 h-20 mx-auto mb-4">
                <div
                  className="absolute inset-[-12px] rounded-full animate-pulse"
                  style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.18) 0%, transparent 70%)' }}
                />
                <div className="absolute inset-[-5px] animate-spin" style={{ animationDuration: '10s' }}>
                  <div className="w-full h-full rounded-full" style={{
                    background: 'conic-gradient(from 0deg, transparent 0%, transparent 55%, rgba(6,182,212,0.4) 78%, transparent 100%)',
                    WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 1.5px), #fff calc(100% - 1.5px))',
                    mask: 'radial-gradient(farthest-side, transparent calc(100% - 1.5px), #fff calc(100% - 1.5px))',
                  }} />
                </div>
                <div className="absolute inset-[-5px] animate-spin" style={{ animationDuration: '14s', animationDirection: 'reverse' }}>
                  <div className="w-full h-full rounded-full" style={{
                    background: 'conic-gradient(from 180deg, transparent 0%, transparent 60%, rgba(59,130,246,0.3) 80%, transparent 100%)',
                    WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 1.5px), #fff calc(100% - 1.5px))',
                    mask: 'radial-gradient(farthest-side, transparent calc(100% - 1.5px), #fff calc(100% - 1.5px))',
                  }} />
                </div>
                <div className="absolute inset-2 rounded-full bg-gradient-to-br from-cyan-400/25 via-cyan-500/20 to-blue-600/25 shadow-[0_0_20px_0px_rgba(6,182,212,0.15)]" />
                <Lottie animationData={aiAnimation} loop className="relative w-14 h-14" />
              </div>
            </motion.div>

            <motion.h1
              className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent mb-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              {tCommon("aiAssistant.emptyState.title")}
            </motion.h1>

            <motion.p
              className="text-sm text-gray-400 max-w-md mx-auto leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              {tCommon("aiAssistant.emptyState.subtitle")}
            </motion.p>
          </div>

          {/* 2x2 quick-start cards */}
          <motion.div
            className="grid grid-cols-2 gap-2 mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            {quickCards.map((card, idx) => {
              const Icon = card.icon;
              return (
                <motion.button
                  key={card.title}
                  onClick={() => onSendMessage(card.description)}
                  className="group relative overflow-hidden flex items-center gap-3 p-3 text-left bg-white border border-gray-200/60 rounded-xl hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <div className="w-9 h-9 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 group-hover:border-primary/20 transition-colors">
                    <Icon className="w-4 h-4 text-gray-600 group-hover:text-primary transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-[13px] truncate group-hover:text-primary transition-colors">
                      {card.title}
                    </p>
                    <p className="text-[11px] text-gray-500 truncate">
                      {card.description}
                    </p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
                </motion.button>
              );
            })}
          </motion.div>

          {/* Search bar slot */}
          {children && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              {children}
            </motion.div>
          )}

          {/* Bottom spacer */}
          <div className="flex-1 min-h-8" />
        </div>
      </div>
    </div>
  );
};

export default EmptyConversationState;
