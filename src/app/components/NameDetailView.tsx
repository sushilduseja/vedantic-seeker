import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { useState, useEffect } from 'react';
import { type Language } from '@/app/translations';
import { type VishnuName } from './NameCard';
import { groqService } from '@/app/services/GroqService';

interface NameDetailViewProps {
    name: VishnuName;
    isOpen: boolean;
    onClose: () => void;
    onAISynthesis?: (name: VishnuName) => void;
    relatedNames?: VishnuName[];
    onSelectRelated?: (name: VishnuName) => void;
    lang: Language;
    isLoadingAI?: boolean;
    aiResult?: string | null;
}

interface ExpandableSectionProps {
    title: string;
    icon: string;
    content: string;
    defaultOpen?: boolean;
}

function ExpandableSection({ title, icon, content, defaultOpen = false }: ExpandableSectionProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="border border-amber-100 rounded-xl overflow-hidden bg-white">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-amber-50/50 to-yellow-50/50 hover:from-amber-50 hover:to-yellow-50 transition-colors"
                aria-expanded={isOpen}
            >
                <span className="flex items-center gap-2 font-medium text-slate-700">
                    <span>{icon}</span>
                    {title}
                </span>
                {isOpen ? (
                    <ChevronUp className="size-4 text-slate-500" />
                ) : (
                    <ChevronDown className="size-4 text-slate-500" />
                )}
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="p-4 text-slate-700 leading-relaxed border-t border-amber-100 whitespace-pre-wrap">
                            {content}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export function NameDetailView({
    name,
    isOpen,
    onClose,
    onAISynthesis,
    relatedNames = [],
    onSelectRelated,
    lang,
    isLoadingAI = false,
    aiResult
}: NameDetailViewProps) {
    const [translatedFields, setTranslatedFields] = useState({
        translation: name.translation,
        meaning: name.meaning,
        context: name.context,
        etymology: name.etymology,
        benefits: name.benefits
    });
    const [translatedAttrs, setTranslatedAttrs] = useState<string[]>(name.attributes);

    const labels = {
        meaning: lang === 'en' ? 'Meaning & Context' : 'अर्थ और संदर्भ',
        etymology: lang === 'en' ? 'Etymology' : 'व्युत्पत्ति',
        benefits: lang === 'en' ? 'Benefits of Chanting' : 'जाप के लाभ',
        deepen: lang === 'en' ? 'Deepen Understanding' : 'गहन ज्ञान प्राप्त करें',
        related: lang === 'en' ? 'Related Divine Names' : 'संबंधित दिव्य नाम',
        aiAnalysis: lang === 'en' ? 'Yogic Insight' : 'योगिक अंतर्दृष्टि'
    };

    // Translate English fields to Hindi when lang is 'hi'
    useEffect(() => {
        if (lang === 'hi') {
            Promise.all([
                groqService.translateText(name.translation, 'hi'),
                groqService.translateText(name.meaning, 'hi'),
                groqService.translateText(name.context, 'hi'),
                groqService.translateText(name.etymology, 'hi'),
                groqService.translateText(name.benefits, 'hi'),
                ...name.attributes.map(attr => groqService.translateText(attr, 'hi'))
            ]).then((results) => {
                setTranslatedFields({
                    translation: results[0],
                    meaning: results[1],
                    context: results[2],
                    etymology: results[3],
                    benefits: results[4]
                });
                setTranslatedAttrs(results.slice(5));
            });
        } else {
            setTranslatedFields({
                translation: name.translation,
                meaning: name.meaning,
                context: name.context,
                etymology: name.etymology,
                benefits: name.benefits
            });
            setTranslatedAttrs(name.attributes);
        }
    }, [lang, name]);

    // Handle Escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 30 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 30 }}
                        transition={{ type: 'spring', damping: 28, stiffness: 350 }}
                        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header - Compact & Organized */}
                        <div className="relative p-6 bg-gradient-to-br from-amber-400 via-yellow-400 to-orange-400 text-slate-900 shadow-md z-10">

                            {/* Top Row: Number & Close */}
                            <div className="flex justify-between items-start mb-2 relative z-10">
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/30 backdrop-blur-sm rounded-full text-xs font-bold border border-white/20 shadow-sm">
                                    <span>#{name.id}</span>
                                    <span className="w-1 h-3 bg-slate-900/20 rounded-full"></span>
                                    <span className="font-serif italic font-medium">{name.verseRef}</span>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 -mr-2 -mt-2 rounded-full hover:bg-white/20 transition-colors text-slate-900/80 hover:text-slate-900"
                                >
                                    <X className="size-5" />
                                </button>
                            </div>

                            {/* Main Title Name */}
                            <div className="text-center mb-4 relative z-10">
                                <h2 className="text-4xl md:text-5xl font-bold leading-tight mb-1 drop-shadow-sm text-slate-900" style={{ fontFamily: "'Noto Sans Devanagari', sans-serif" }}>
                                    {name.sanskrit}
                                </h2>
                                <p className="text-lg font-serif italic text-slate-900/80">
                                    {name.transliteration}
                                </p>
                            </div>

                            {/* Translation Card */}
                            <div className="bg-white/40 backdrop-blur-md rounded-xl p-3 text-center border border-white/40 relative z-10">
                                <p className="text-lg font-bold text-slate-900">
                                    {translatedFields.translation}
                                </p>
                            </div>

                            {/* Minimal Attributes */}
                            <div className="flex flex-wrap justify-center gap-2 mt-3 relative z-10">
                                {translatedAttrs.map((attr, i) => (
                                    <span
                                        key={i}
                                        className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold bg-slate-900/10 text-slate-900 rounded-full"
                                    >
                                        {attr}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Content Scrollable Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">

                            {/* Meaning (Primary) */}
                            <ExpandableSection
                                title={labels.meaning}
                                icon="📜"
                                content={`${translatedFields.meaning}\n\n${translatedFields.context}`}
                                defaultOpen={true}
                            />

                            {/* AI Synthesis Result */}
                            {aiResult && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="border border-purple-200 bg-purple-50/50 rounded-xl overflow-hidden"
                                >
                                    <div className="p-4 bg-purple-100/50 border-b border-purple-100 flex items-center gap-2 text-purple-900 font-bold">
                                        <Sparkles className="size-4 text-purple-600" />
                                        {labels.aiAnalysis}
                                    </div>
                                    <div className="p-4 text-slate-700 leading-relaxed whitespace-pre-wrap text-sm">
                                        {aiResult}
                                    </div>
                                </motion.div>
                            )}

                            {/* Etymology (Secondary) */}
                            <ExpandableSection
                                title={labels.etymology}
                                icon="🔍"
                                content={translatedFields.etymology}
                            />

                            {/* Benefits (Optimized space) */}
                            <ExpandableSection
                                title={labels.benefits}
                                icon="🙏"
                                content={translatedFields.benefits}
                            />

                            {/* AI Button (If not already shown) */}
                            {onAISynthesis && !aiResult && (
                                <motion.button
                                    whileHover={{ scale: 1.01 }}
                                    whileTap={{ scale: 0.99 }}
                                    onClick={() => onAISynthesis(name)}
                                    disabled={isLoadingAI}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-70 disabled:cursor-not-allowed mt-2"
                                >
                                    {isLoadingAI ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                                            <span className="font-semibold text-sm">{lang === 'en' ? 'Synthesizing Insight...' : 'विश्लेषण हो रहा है...'}</span>
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="size-4" />
                                            <span className="font-semibold text-sm">{labels.deepen}</span>
                                        </>
                                    )}
                                </motion.button>
                            )}

                            {/* Related Names grid */}
                            {relatedNames.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-slate-200">
                                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 text-center">{labels.related}</h3>
                                    <div className="grid grid-cols-3 gap-2">
                                        {relatedNames.slice(0, 3).map((related) => (
                                            <button
                                                key={related.id}
                                                onClick={() => onSelectRelated?.(related)}
                                                className="p-2 bg-white rounded-lg border border-slate-200 hover:border-amber-300 hover:shadow-sm transition-all text-center group"
                                            >
                                                <span className="block text-sm font-bold text-slate-800 group-hover:text-amber-700 transition-colors" style={{ fontFamily: "'Noto Sans Devanagari', sans-serif" }}>
                                                    {related.sanskrit}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
