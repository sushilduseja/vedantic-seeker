import { motion } from 'motion/react';
import { Search, List, Sparkles } from 'lucide-react';
import { type Language } from '@/app/translations';

type NamesView = 'hero' | 'search' | 'browser' | 'random';

interface DivineNamesHeroProps {
    lang: Language;
    onSelectView: (view: NamesView) => void;
    onRandomName: () => void;
}

export function DivineNamesHero({ lang, onSelectView, onRandomName }: DivineNamesHeroProps) {
    const labels = {
        title: 'विष्णु सहस्रनाम',
        titleEn: 'Vishnu Sahasranama',
        subtitle: lang === 'en' ? '1000 Names of the Infinite' : 'अनंत के 1000 नाम',
        description: lang === 'en'
            ? 'Explore the thousand sacred names of Lord Vishnu from the Mahabharata'
            : 'महाभारत से भगवान विष्णु के सहस्र पवित्र नामों का अन्वेषण करें',
        exploreByAttribute: lang === 'en' ? 'Explore by Attribute' : 'गुण से खोजें',
        exploreByAttributeDesc: lang === 'en'
            ? 'Search names by divine qualities like protection, compassion, and cosmic nature'
            : 'सुरक्षा, करुणा, और ब्रह्मांडीय स्वभाव जैसे दिव्य गुणों से नाम खोजें',
        sequentialRecitation: lang === 'en' ? 'Sequential Recitation' : 'क्रमिक पाठ',
        sequentialRecitationDesc: lang === 'en'
            ? 'Browse through all 1000 names in order with detailed meanings'
            : 'विस्तृत अर्थों के साथ सभी 1000 नामों को क्रम से देखें',
        randomName: lang === 'en' ? 'Random Divine Name' : 'यादृच्छिक दिव्य नाम',
        randomNameDesc: lang === 'en'
            ? 'Receive daily wisdom through a randomly selected divine name'
            : 'यादृच्छिक रूप से चयनित दिव्य नाम के माध्यम से दैनिक ज्ञान प्राप्त करें'
    };

    const entryPoints = [
        {
            id: 'search',
            icon: Search,
            title: labels.exploreByAttribute,
            description: labels.exploreByAttributeDesc,
            gradient: 'from-purple-500 to-indigo-600',
            onClick: () => onSelectView('search')
        },
        {
            id: 'browser',
            icon: List,
            title: labels.sequentialRecitation,
            description: labels.sequentialRecitationDesc,
            gradient: 'from-amber-500 to-orange-600',
            onClick: () => onSelectView('browser')
        },
        {
            id: 'random',
            icon: Sparkles,
            title: labels.randomName,
            description: labels.randomNameDesc,
            gradient: 'from-emerald-500 to-teal-600',
            onClick: onRandomName
        }
    ];

    return (
        <div className="relative min-h-[85vh] flex items-center justify-center overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 overflow-hidden">
                <motion.div
                    className="absolute top-1/4 left-1/3 w-[600px] h-[600px] bg-gradient-to-br from-yellow-300/20 to-amber-400/20 rounded-full blur-[120px]"
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 0.5, 0.3]
                    }}
                    transition={{
                        duration: 12,
                        repeat: Infinity,
                        ease: 'easeInOut'
                    }}
                />
                <motion.div
                    className="absolute bottom-1/4 right-1/3 w-[500px] h-[500px] bg-gradient-to-tr from-orange-300/20 to-red-400/20 rounded-full blur-[100px]"
                    animate={{
                        scale: [1.2, 1, 1.2],
                        opacity: [0.3, 0.5, 0.3]
                    }}
                    transition={{
                        duration: 15,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        delay: 2
                    }}
                />
            </div>

            <div className="relative z-10 max-w-5xl mx-auto px-4 text-center">
                {/* Animated Om Symbol */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8 }}
                    className="mb-8"
                >
                    <motion.div
                        className="inline-flex items-center justify-center w-28 h-28 rounded-full bg-gradient-to-br from-amber-400 via-yellow-400 to-orange-500 shadow-2xl"
                        animate={{
                            boxShadow: [
                                '0 0 40px rgba(251, 191, 36, 0.4)',
                                '0 0 80px rgba(251, 191, 36, 0.6)',
                                '0 0 40px rgba(251, 191, 36, 0.4)'
                            ]
                        }}
                        transition={{
                            duration: 3,
                            repeat: Infinity,
                            ease: 'easeInOut'
                        }}
                    >
                        <span className="text-6xl text-white drop-shadow-lg">🕉️</span>
                    </motion.div>
                </motion.div>

                {/* Title */}
                <div className="py-4">
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        className="text-5xl md:text-6xl lg:text-7xl font-bold mb-4 bg-gradient-to-r from-amber-600 via-orange-600 to-purple-600 bg-clip-text text-transparent animate-gradient-x leading-[1.3] pb-6"
                        style={{ fontFamily: lang === 'hi' ? "'Noto Sans Devanagari', sans-serif" : "inherit" }}
                    >
                        {lang === 'en' ? labels.titleEn : labels.title}
                    </motion.h1>
                </div>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="text-xl font-bold text-slate-600 mb-6"
                >
                    {labels.subtitle}
                </motion.p>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.5 }}
                    className="text-lg text-slate-600 mb-12 max-w-2xl mx-auto"
                >
                    {labels.description}
                </motion.p>

                {/* Entry Point Cards */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.6 }}
                    className="grid md:grid-cols-3 gap-6"
                >
                    {entryPoints.map((entry, index) => (
                        <motion.button
                            key={entry.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.7 + index * 0.1 }}
                            whileHover={{ y: -8, scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={entry.onClick}
                            className="group p-6 bg-white/90 backdrop-blur-xl rounded-2xl border border-white/50 shadow-lg hover:shadow-2xl transition-all text-left"
                        >
                            <div
                                className={`w-14 h-14 bg-gradient-to-br ${entry.gradient} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg`}
                            >
                                <entry.icon className="size-7 text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">
                                {entry.title}
                            </h3>
                            <p className="text-sm text-slate-600 leading-relaxed">
                                {entry.description}
                            </p>
                        </motion.button>
                    ))}
                </motion.div>
            </div>
        </div>
    );
}

export type { NamesView };
