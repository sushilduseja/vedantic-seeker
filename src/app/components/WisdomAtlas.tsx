import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shuffle, X, ChevronRight } from 'lucide-react';
import { type Language } from '@/app/translations';
import { groqService } from '@/app/services/GroqService';

interface Question {
    id: string;
    question: string;
    themes: string[];
    difficulty: 'foundational' | 'intermediate' | 'advanced';
    popularity: number;
}

interface Domain {
    id: string;
    name: string;
    nameHi: string;
    icon: string;
    color: string;
    glowColor: string;
    keywords: string[];
}

interface WisdomAtlasProps {
    onSelectQuestion: (question: string) => void;
    lang: Language;
}

const DOMAINS: Domain[] = [
    { id: 'self', name: 'Self-Knowledge', nameHi: 'आत्म-ज्ञान', icon: '🔮', color: '#8B5CF6', glowColor: 'rgba(139, 92, 246, 0.4)', keywords: ['self', 'soul', 'identity', 'consciousness', 'atma', 'jiva'] },
    { id: 'devotion', name: 'Devotion', nameHi: 'भक्ति', icon: '💝', color: '#EC4899', glowColor: 'rgba(236, 72, 153, 0.4)', keywords: ['bhakti', 'devotion', 'love', 'worship', 'krishna', 'service'] },
    { id: 'dharma', name: 'Dharma', nameHi: 'धर्म', icon: '⚖️', color: '#F59E0B', glowColor: 'rgba(245, 158, 11, 0.4)', keywords: ['dharma', 'duty', 'righteousness', 'ethics', 'moral'] },
    { id: 'karma', name: 'Karma', nameHi: 'कर्म', icon: '🔄', color: '#10B981', glowColor: 'rgba(16, 185, 129, 0.4)', keywords: ['karma', 'action', 'reaction', 'rebirth', 'destiny'] },
    { id: 'detachment', name: 'Detachment', nameHi: 'वैराग्य', icon: '🪷', color: '#06B6D4', glowColor: 'rgba(6, 182, 212, 0.4)', keywords: ['detachment', 'renunciation', 'desires', 'material', 'vairagya'] },
    { id: 'creation', name: 'Creation', nameHi: 'सृष्टि', icon: '🌌', color: '#6366F1', glowColor: 'rgba(99, 102, 241, 0.4)', keywords: ['creation', 'universe', 'cosmology', 'manifestation', 'prakriti'] },
    { id: 'divine', name: 'Divine Nature', nameHi: 'दिव्य स्वरूप', icon: '✨', color: '#F97316', glowColor: 'rgba(249, 115, 22, 0.4)', keywords: ['god', 'divine', 'supreme', 'lord', 'vishnu', 'avatar'] },
    { id: 'liberation', name: 'Liberation', nameHi: 'मोक्ष', icon: '🕊️', color: '#A855F7', glowColor: 'rgba(168, 85, 247, 0.4)', keywords: ['liberation', 'moksha', 'enlightenment', 'freedom', 'transcendence'] }
];

function classifyQuestion(q: Question): string {
    const text = (q.question + ' ' + q.themes.join(' ')).toLowerCase();
    for (const domain of DOMAINS) {
        if (domain.keywords.some(kw => text.includes(kw))) {
            return domain.id;
        }
    }
    return DOMAINS[Math.floor(Math.random() * DOMAINS.length)].id;
}

export function WisdomAtlas({ onSelectQuestion, lang }: WisdomAtlasProps) {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [hoveredDomain, setHoveredDomain] = useState<string | null>(null);
    const [expandedDomain, setExpandedDomain] = useState<string | null>(null);
    const [exploredDomains, setExploredDomains] = useState<Set<string>>(new Set());
    const [isHovering, setIsHovering] = useState(false);
    const [translatedQuestions, setTranslatedQuestions] = useState<Record<string, string[]>>({});
    const [expandedTranslations, setExpandedTranslations] = useState<Record<string, string>>({});

    useEffect(() => {
        fetch('/data/srimad-bhagavatam.json')
            .then(res => res.json())
            .then(data => setQuestions(data.questions || []))
            .catch(console.error);
    }, []);

    const domainStats = useMemo(() => {
        const stats: Record<string, { total: number; foundational: number; intermediate: number; advanced: number; questions: Question[] }> = {};
        DOMAINS.forEach(d => { stats[d.id] = { total: 0, foundational: 0, intermediate: 0, advanced: 0, questions: [] }; });

        questions.forEach(q => {
            const domainId = classifyQuestion(q);
            if (stats[domainId]) {
                stats[domainId].total++;
                stats[domainId][q.difficulty]++;
                stats[domainId].questions.push(q);
            }
        });
        return stats;
    }, [questions]);

    // Translate Tooltip Questions
    useEffect(() => {
        if (lang === 'hi' && hoveredDomain) {
            const stats = domainStats[hoveredDomain];
            if (!stats || translatedQuestions[hoveredDomain]) return;

            const questionsToTranslate = stats.questions.slice(0, 3).map(q => q.question);
            Promise.all(questionsToTranslate.map(q => groqService.translateText(q, 'hi')))
                .then(translations => {
                    setTranslatedQuestions(prev => ({
                        ...prev,
                        [hoveredDomain]: translations
                    }));
                })
                .catch(console.error);
        }
    }, [hoveredDomain, lang, domainStats, translatedQuestions]);

    // Translate Expanded View Questions
    useEffect(() => {
        if (lang === 'hi' && expandedDomain) {
            const stats = domainStats[expandedDomain];
            if (!stats) return;

            // Collect all visible questions in the modal
            const foundational = stats.questions.filter(q => q.difficulty === 'foundational').slice(0, 8);
            const intermediate = stats.questions.filter(q => q.difficulty === 'intermediate').slice(0, 4);
            const advanced = stats.questions.filter(q => q.difficulty === 'advanced').slice(0, 4);
            const visibleQuestions = [...foundational, ...intermediate, ...advanced];

            const questionsToTranslate = visibleQuestions
                .filter(q => !expandedTranslations[q.question]) // Only translate untranslated ones
                .map(q => q.question);

            if (questionsToTranslate.length > 0) {
                Promise.all(questionsToTranslate.map(q => groqService.translateText(q, 'hi')))
                    .then(translations => {
                        const newTranslations: Record<string, string> = {};
                        questionsToTranslate.forEach((q, i) => {
                            newTranslations[q] = translations[i];
                        });
                        setExpandedTranslations(prev => ({ ...prev, ...newTranslations }));
                    })
                    .catch(console.error);
            }
        }
    }, [expandedDomain, lang, domainStats, expandedTranslations]);

    const handleDomainClick = (domainId: string) => {
        setExpandedDomain(domainId);
        setExploredDomains(prev => new Set([...prev, domainId]));
        setIsHovering(false); // Reset hover state on click
    };

    const handleQuestionSelect = (question: string) => {
        setExpandedDomain(null);
        onSelectQuestion(question);
    };

    const handleWanderRandomly = () => {
        const unexplored = DOMAINS.filter(d => !exploredDomains.has(d.id));
        const targetDomains = unexplored.length > 0 ? unexplored : DOMAINS;
        const randomDomain = targetDomains[Math.floor(Math.random() * targetDomains.length)];
        const domainQuestions = domainStats[randomDomain.id]?.questions || [];
        if (domainQuestions.length > 0) {
            const randomQ = domainQuestions[Math.floor(Math.random() * domainQuestions.length)];
            setExploredDomains(prev => new Set([...prev, randomDomain.id]));
            onSelectQuestion(randomQ.question);
        }
    };

    const getDomainName = (domain: Domain) => lang === 'hi' ? domain.nameHi : domain.name;

    return (
        <div className="relative w-full max-w-3xl mx-auto">
            {/* Progress indicator */}
            <div className="text-center mb-6">
                <span className="text-base font-bold text-slate-800 bg-white/50 px-4 py-1.5 rounded-full shadow-sm border border-slate-200/50">
                    {lang === 'en' ? `Explored ${exploredDomains.size} of 8 domains` : `${exploredDomains.size}/8 क्षेत्र खोजे`}
                </span>
                <div className="flex justify-center gap-1 mt-2">
                    {DOMAINS.map(d => (
                        <div
                            key={d.id}
                            className="w-3 h-3 rounded-full transition-all duration-300"
                            style={{
                                backgroundColor: exploredDomains.has(d.id) ? d.color : '#e2e8f0',
                                boxShadow: exploredDomains.has(d.id) ? `0 0 8px ${d.glowColor}` : 'none'
                            }}
                        />
                    ))}
                </div>
            </div>

            {/* Radial Atlas */}
            <div
                className="relative aspect-square max-w-xl mx-auto touch-manipulation"
                style={{ paddingBottom: '20px' }}
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
                onTouchStart={() => setIsHovering(true)}
                onTouchEnd={() => setTimeout(() => setIsHovering(false), 500)}
            >
                {/* Center glow */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-amber-200/30 to-orange-200/30 blur-3xl" />
                </div>

                {/* Rotating Container - CSS Animation */}
                <div
                    className={`absolute inset-0 w-full h-full animate-[spin_60s_linear_infinite]`}
                    style={{
                        animationPlayState: isHovering ? 'paused' : 'running',
                        pointerEvents: 'none' // Let clicks pass through to children
                    }}
                >
                    {/* Particle connections - Static relative to container */}
                    <svg className="absolute inset-0 w-full h-full opacity-30">
                        {DOMAINS.map((d, i) => {
                            const angle1 = (i * 45 - 90) * (Math.PI / 180);
                            const angle2 = ((i + 1) % 8 * 45 - 90) * (Math.PI / 180);
                            const r = 42;
                            const cx = 50, cy = 50;
                            return (
                                <line
                                    key={d.id}
                                    x1={`${cx + r * Math.cos(angle1)}%`}
                                    y1={`${cy + r * Math.sin(angle1)}%`}
                                    x2={`${cx + r * Math.cos(angle2)}%`}
                                    y2={`${cy + r * Math.sin(angle2)}%`}
                                    stroke="url(#gradient)"
                                    strokeWidth="1"
                                    strokeDasharray="4 4"
                                />
                            );
                        })}
                        <defs>
                            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#F59E0B" />
                                <stop offset="100%" stopColor="#8B5CF6" />
                            </linearGradient>
                        </defs>
                    </svg>

                    {/* Domain orbs */}
                    {DOMAINS.map((domain, index) => {
                        const angle = (index * 45 - 90) * (Math.PI / 180);
                        const radius = 36;
                        const x = 50 + radius * Math.cos(angle);
                        const y = 48 + radius * Math.sin(angle);
                        const stats = domainStats[domain.id];
                        const isHovered = hoveredDomain === domain.id;
                        const isExplored = exploredDomains.has(domain.id);
                        const isBottomHalf = y > 50; // Determine if orb is in bottom half

                        return (
                            <div
                                key={domain.id}
                                className="absolute pointer-events-auto"
                                style={{
                                    left: `${x}%`,
                                    top: `${y}%`,
                                    width: '100px',
                                    height: '100px',
                                    transform: 'translate(-50%, -50%)',
                                    zIndex: isHovered ? 50 : 10
                                }}
                            >
                                {/* Counter-rotating orb wrapper - CSS Animation */}
                                <div
                                    className="w-full h-full relative animate-[spin_60s_linear_infinite_reverse]"
                                    style={{
                                        animationPlayState: isHovering ? 'paused' : 'running'
                                    }}
                                >
                                    <motion.div
                                        className="w-full h-full relative cursor-pointer"
                                        whileHover={{ scale: 1.15 }} // Scaled only inner element
                                        whileTap={{ scale: 0.95 }}
                                        onHoverStart={() => setHoveredDomain(domain.id)}
                                        onHoverEnd={() => setHoveredDomain(null)}
                                        onClick={() => handleDomainClick(domain.id)}
                                    >
                                        {/* Glow effect */}
                                        <motion.div
                                            className="absolute inset-0 rounded-full blur-xl"
                                            style={{ backgroundColor: domain.glowColor }}
                                            animate={{ scale: isHovered ? 1.5 : 1, opacity: isHovered ? 0.8 : 0.6 }}
                                        />

                                        {/* Orb */}
                                        <motion.div
                                            className="absolute inset-0 rounded-full flex flex-col items-center justify-center text-black shadow-lg border-2 border-black/10"
                                            style={{
                                                background: `linear-gradient(135deg, ${domain.color}, ${domain.color}dd)`
                                            }}
                                            animate={{
                                                boxShadow: isHovered
                                                    ? `0 0 30px ${domain.glowColor}, 0 0 60px ${domain.glowColor}`
                                                    : `0 4px 20px ${domain.glowColor}`
                                            }}
                                        >
                                            <span className="text-3xl select-none filter drop-shadow-sm">{domain.icon}</span>
                                            <span className="text-sm font-bold mt-1 text-center px-1 leading-tight select-none drop-shadow-sm">
                                                {getDomainName(domain)}
                                            </span>
                                            {isExplored && (
                                                <div className="absolute top-0 right-0 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center border border-white">
                                                    <span className="text-[10px] font-bold select-none text-white">✓</span>
                                                </div>
                                            )}
                                        </motion.div>

                                        {/* Hover tooltip - Smart positioning & Localization */}
                                        <AnimatePresence>
                                            {isHovered && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: isBottomHalf ? -10 : 10, scale: 0.9 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.9 }}
                                                    transition={{ duration: 0.2 }}
                                                    className={`absolute left-1/2 -translate-x-1/2 w-64 p-4 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 ${isBottomHalf ? 'bottom-full mb-3' : 'top-full mt-3'
                                                        }`}
                                                >
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="font-bold text-slate-800">
                                                            {stats.total} {lang === 'en' ? 'questions' : 'प्रश्न'}
                                                        </span>
                                                        <div className="flex gap-1">
                                                            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-green-100 text-green-700" title={lang === 'en' ? 'Foundational' : 'मूलभूत'}>{stats.foundational}</span>
                                                            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-yellow-100 text-yellow-700" title={lang === 'en' ? 'Intermediate' : 'मध्यम'}>{stats.intermediate}</span>
                                                            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-red-100 text-red-700" title={lang === 'en' ? 'Advanced' : 'उन्नत'}>{stats.advanced}</span>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        {(lang === 'hi' && translatedQuestions[domain.id]
                                                            ? translatedQuestions[domain.id]
                                                            : stats.questions.slice(0, 3).map(q => q.question)
                                                        ).map((qText, i) => (
                                                            <p key={i} className="text-xs font-medium text-slate-600 line-clamp-2 leading-relaxed">• {qText}</p>
                                                        ))}
                                                    </div>
                                                    <div className="mt-3 text-xs text-amber-600 flex items-center gap-1 font-bold">
                                                        <ChevronRight className="size-3" /> {lang === 'en' ? 'Click to explore' : 'खोजने के लिए क्लिक करें'}
                                                    </div>

                                                    {/* Tooltip Arrow */}
                                                    <div
                                                        className={`absolute left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-l border-t border-slate-200 rotate-45 ${isBottomHalf ? '-bottom-2 border-t-0 border-l-0 border-b border-r' : '-top-2'
                                                            }`}
                                                    />
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </motion.div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Center button - Static */}
                <motion.button
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-black shadow-xl flex flex-col items-center justify-center gap-1 border-4 border-white/50 z-20"
                    whileHover={{ scale: 1.1, boxShadow: '0 0 40px rgba(245, 158, 11, 0.5)' }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleWanderRandomly}
                >
                    <Shuffle className="size-6" />
                    <span className="text-xs font-bold">{lang === 'en' ? 'Wander' : 'भ्रमण'}</span>
                </motion.button>
            </div>

            {/* Expanded Domain View */}
            <AnimatePresence>
                {expandedDomain && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
                        onClick={() => setExpandedDomain(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
                            onClick={e => e.stopPropagation()}
                        >
                            {(() => {
                                const domain = DOMAINS.find(d => d.id === expandedDomain)!;
                                const stats = domainStats[expandedDomain];
                                return (
                                    <>
                                        <div
                                            className="p-6 text-white relative"
                                            style={{ background: `linear-gradient(135deg, ${domain.color}, ${domain.color}cc)` }}
                                        >
                                            <button
                                                onClick={() => setExpandedDomain(null)}
                                                className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                                            >
                                                <X className="size-5" />
                                            </button>
                                            <div className="text-4xl mb-2">{domain.icon}</div>
                                            <h2 className="text-2xl font-bold">{getDomainName(domain)}</h2>
                                            <p className="text-sm opacity-80 mt-1">{stats.total} {lang === 'en' ? 'questions to explore' : 'प्रश्न उपलब्ध'}</p>
                                            <div className="flex gap-3 mt-3">
                                                <span className="px-2 py-1 text-xs font-bold rounded-full bg-white/20">{stats.foundational} {lang === 'en' ? 'Foundational' : 'मूलभूत'}</span>
                                                <span className="px-2 py-1 text-xs font-bold rounded-full bg-white/20">{stats.intermediate} {lang === 'en' ? 'Intermediate' : 'मध्यम'}</span>
                                                <span className="px-2 py-1 text-xs font-bold rounded-full bg-white/20">{stats.advanced} {lang === 'en' ? 'Advanced' : 'उन्नत'}</span>
                                            </div>
                                        </div>
                                        <div className="p-4 overflow-y-auto max-h-[50vh]">
                                            {/* Organized by difficulty - foundational first */}
                                            {(['foundational', 'intermediate', 'advanced'] as const).map(diff => {
                                                const diffQuestions = stats.questions.filter(q => q.difficulty === diff);
                                                if (diffQuestions.length === 0) return null;
                                                const diffLabel = {
                                                    foundational: { en: 'Foundational', hi: 'मूलभूत', color: 'bg-green-500' },
                                                    intermediate: { en: 'Intermediate', hi: 'मध्यम', color: 'bg-yellow-500' },
                                                    advanced: { en: 'Advanced', hi: 'उन्नत', color: 'bg-red-500' }
                                                }[diff];
                                                return (
                                                    <div key={diff} className="mb-4">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <div className={`w-2 h-2 rounded-full ${diffLabel.color}`} />
                                                            <span className="text-sm font-bold text-slate-600">
                                                                {lang === 'en' ? diffLabel.en : diffLabel.hi}
                                                            </span>
                                                        </div>
                                                        <div className="grid gap-2">
                                                            {diffQuestions.slice(0, diff === 'foundational' ? 8 : 4).map((q) => (
                                                                <motion.button
                                                                    key={q.id}
                                                                    className="text-left p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors w-full"
                                                                    whileHover={{ x: 4 }}
                                                                    onClick={() => handleQuestionSelect(q.question)}
                                                                >
                                                                    <span className="text-sm font-medium text-slate-700">
                                                                        {lang === 'hi' ? (expandedTranslations[q.question] || q.question) : q.question}
                                                                    </span>
                                                                </motion.button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </>
                                );
                            })()}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
