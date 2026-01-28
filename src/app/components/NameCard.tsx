import { motion } from 'motion/react';
import { ChevronRight } from 'lucide-react';
import { type Language } from '@/app/translations';
import { groqService } from '@/app/services/GroqService';
import { useState, useEffect } from 'react';

export interface VishnuName {
    id: number;
    sanskrit: string;
    transliteration: string;
    translation: string;
    meaning: string;
    context: string;
    attributes: string[];
    benefits: string;
    etymology: string;
    verseRef: string;
}

interface NameCardProps {
    name: VishnuName;
    lang: Language;
    onExplore?: (name: VishnuName) => void;
    compact?: boolean;
}

export function NameCard({
    name,
    lang,
    onExplore,
    compact = false
}: NameCardProps) {
    const [translatedTranslation, setTranslatedTranslation] = useState(name.translation);
    const [translatedMeaning, setTranslatedMeaning] = useState(name.meaning);
    const [translatedAttrs, setTranslatedAttrs] = useState(name.attributes);

    useEffect(() => {
        if (lang === 'hi') {
            Promise.all([
                groqService.translateText(name.translation, 'hi'),
                groqService.translateText(name.meaning, 'hi'),
                ...name.attributes.slice(0, 3).map(attr => groqService.translateText(attr, 'hi'))
            ]).then((results) => {
                setTranslatedTranslation(results[0]);
                setTranslatedMeaning(results[1]);
                setTranslatedAttrs(results.slice(2));
            });
        } else {
            setTranslatedTranslation(name.translation);
            setTranslatedMeaning(name.meaning);
            setTranslatedAttrs(name.attributes);
        }
    }, [lang, name]);
    return (
        <motion.div
            whileHover={{ y: -4, scale: 1.02 }}
            className={`relative bg-white/90 backdrop-blur-sm rounded-2xl border border-amber-200/50 shadow-lg hover:shadow-xl transition-all overflow-hidden ${compact ? 'p-4' : 'p-6'
                }`}
        >
            {/* Number Badge */}
            <div className="absolute top-3 right-3 px-2 py-1 bg-gradient-to-r from-amber-100 to-yellow-100 rounded-full text-xs font-bold text-amber-700 border border-amber-200">
                #{name.id}
            </div>

            <div className={compact ? 'mt-2' : 'mt-4'}>
                {/* Sanskrit Name */}
                <h3 className={`font-bold text-slate-900 leading-tight ${compact ? 'text-2xl' : 'text-3xl'}`} style={{ fontFamily: "'Noto Sans Devanagari', sans-serif" }}>
                    {name.sanskrit}
                </h3>

                {/* Transliteration */}
                <p className={`italic text-slate-500 mt-1 ${compact ? 'text-sm' : 'text-base'}`}>
                    {name.transliteration}
                </p>

                {/* Translation */}
                <p className={`font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent mt-2 ${compact ? 'text-base' : 'text-lg'}`}>
                    {translatedTranslation}
                </p>

                {/* Meaning (truncated) */}
                <p className={`text-slate-600 mt-2 line-clamp-2 ${compact ? 'text-xs' : 'text-sm'}`}>
                    {translatedMeaning}
                </p>

                {/* Attributes */}
                {!compact && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                        {translatedAttrs.slice(0, 3).map((attr, i) => (
                            <span
                                key={i}
                                className="px-2 py-0.5 text-xs font-medium bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-700 rounded-full border border-amber-200/50"
                            >
                                {attr}
                            </span>
                        ))}
                    </div>
                )}

                {/* Explore Button */}
                {onExplore && (
                    <motion.button
                        whileHover={{ x: 4 }}
                        onClick={() => onExplore(name)}
                        className="flex items-center gap-1 mt-4 text-sm font-bold text-amber-600 hover:text-amber-700 transition-colors"
                    >
                        {lang === 'en' ? 'Explore' : 'विस्तार से देखें'}
                        <ChevronRight className="size-4" />
                    </motion.button>
                )}
            </div>
        </motion.div>
    );
}
