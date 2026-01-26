import { motion } from 'motion/react';
import { Sparkles, BookOpen, Heart, Lightbulb } from 'lucide-react';
import { type Language, t } from '@/app/translations';

interface HeroSectionProps {
  onGetStarted: () => void;
  lang?: Language;
}

export function HeroSection({ onGetStarted, lang = 'en' }: HeroSectionProps) {
  return (
    <div className="relative min-h-[85vh] flex items-center justify-center overflow-hidden">
      {/* Gradient orbs with professional shimmer */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
        <motion.div
          className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-gradient-to-br from-amber-400/20 to-orange-500/20 rounded-full blur-[100px]"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
            x: [0, 50, 0],
            y: [0, 30, 0]
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-gradient-to-tr from-purple-400/20 to-pink-500/20 rounded-full blur-[100px]"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.3, 0.5, 0.3],
            x: [0, -50, 0],
            y: [0, -30, 0]
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1
          }}
        />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-6 py-2 bg-white/50 backdrop-blur-xl rounded-full shadow-lg mb-8 border border-white/40 ring-1 ring-white/60"
        >
          <Sparkles className="size-4 text-amber-600 animate-pulse" />
          <span className="text-sm font-medium bg-gradient-to-r from-amber-800 to-orange-800 bg-clip-text text-transparent">
            {t(lang, 'badge')}
          </span>
        </motion.div>

        {/* Main heading */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-6xl md:text-7xl font-bold text-slate-900 mb-6 leading-tight tracking-tight"
        >
          {t(lang, 'heroTitlePrefix')}
          <br />
          <span className="bg-gradient-to-r from-amber-600 via-orange-600 to-purple-600 bg-clip-text text-transparent animate-gradient-x">
            {t(lang, 'heroTitleHighlight')}
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-xl md:text-2xl text-slate-600 mb-12 max-w-3xl mx-auto leading-relaxed"
        >
          {t(lang, 'subtitle')}
        </motion.p>

        {/* CTA Button */}
        <motion.button
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onGetStarted}
          className="group relative px-10 py-5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white text-lg font-bold rounded-full shadow-2xl hover:shadow-orange-500/25 transition-all duration-300 overflow-hidden"
        >
          <div className="absolute inset-0 bg-white/20 skew-x-12 animate-[shimmer_2s_infinite] -translate-x-full"></div>
          <span className="relative z-10 flex items-center gap-2">
            {t(lang, 'getStarted')}
            <motion.span
              animate={{ x: [0, 5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              →
            </motion.span>
          </span>
        </motion.button>

        {/* Feature cards */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="grid md:grid-cols-3 gap-6 mt-20"
        >
          {[
            {
              icon: BookOpen,
              title: t(lang, 'feature1Title'),
              description: t(lang, 'feature1Desc')
            },
            {
              icon: Heart,
              title: t(lang, 'feature2Title'),
              description: t(lang, 'feature2Desc')
            },
            {
              icon: Lightbulb,
              title: t(lang, 'feature3Title'),
              description: t(lang, 'feature3Desc')
            }
          ].map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1 + index * 0.1 }}
              whileHover={{ y: -8, scale: 1.02 }}
              className="p-6 bg-white/80 backdrop-blur-xl rounded-2xl border border-white/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-300"
            >
              <div className="w-14 h-14 bg-gradient-to-br from-amber-100 to-orange-50 rounded-2xl flex items-center justify-center mb-4 mx-auto rotate-3 group-hover:rotate-6 transition-transform">
                <feature.icon className="size-7 text-amber-600" />
              </div>
              <h3 className="text-xl font-bold bg-gradient-to-br from-slate-900 to-slate-700 bg-clip-text text-transparent mb-2">
                {feature.title}
              </h3>
              <p className="text-slate-600 leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
