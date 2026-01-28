import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import { type Language } from '@/app/translations';
import { DivineNamesHero, type NamesView } from './DivineNamesHero';
import { NameBrowser } from './NameBrowser';
import { AttributeSearch } from './AttributeSearch';
import { NameDetailView } from './NameDetailView';
import { type VishnuName } from './NameCard';
import { groqService } from '@/app/services/GroqService';

interface VishnuSahasranamData {
    metadata: {
        totalNames: number;
        source: string;
        language: string;
    };
    names: VishnuName[];
    categories: Record<string, number[]>;
    searchIndex: Record<string, number[]>;
}

interface DivineNamesModeProps {
    lang: Language;
    aiEnabled: boolean;
}

export function DivineNamesMode({ lang, aiEnabled }: DivineNamesModeProps) {
    const [namesView, setNamesView] = useState<NamesView>('hero');
    const [data, setData] = useState<VishnuSahasranamData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isLoadingAI, setIsLoadingAI] = useState(false);
    const [aiResults, setAiResults] = useState<Record<number, string>>({});
    const [randomName, setRandomName] = useState<VishnuName | null>(null);
    const [showRandomDetail, setShowRandomDetail] = useState(false);

    // Load data
    useEffect(() => {
        const loadData = async () => {
            try {
                setIsLoading(true);
                const response = await fetch('/data/vishnu-sahasranama.json');
                if (!response.ok) throw new Error('Failed to load Vishnu Sahasranama data');
                const jsonData = await response.json();
                setData(jsonData);
                setError(null);
            } catch (err) {
                console.error('Error loading Vishnu Sahasranama:', err);
                setError('Unable to load divine names. Please try again.');
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []);

    // Handle AI synthesis for a name
    const handleAISynthesis = useCallback(async (name: VishnuName) => {
        if (!aiEnabled) return;

        setIsLoadingAI(true);
        try {
            const response = await groqService.queryNameAI({
                sanskrit: name.sanskrit,
                transliteration: name.transliteration,
                translation: name.translation,
                meaning: name.meaning,
                etymology: name.etymology,
                benefits: name.benefits
            }, lang);

            if (response.content && !response.error) {
                setAiResults(prev => ({
                    ...prev,
                    [name.id]: response.content
                }));
            }
        } catch (err) {
            console.error('AI synthesis error:', err);
        } finally {
            setIsLoadingAI(false);
        }
    }, [aiEnabled, lang]);

    // Handle random name selection
    const handleRandomName = useCallback(() => {
        if (!data?.names.length) return;
        const randomIndex = Math.floor(Math.random() * data.names.length);
        setRandomName(data.names[randomIndex]);
        setShowRandomDetail(true);
    }, [data]);

    // Get related names for a given name
    const getRelatedNames = useCallback((name: VishnuName) => {
        if (!data?.names) return [];
        return data.names
            .filter(
                (n) =>
                    n.id !== name.id &&
                    n.attributes.some((attr) => name.attributes.includes(attr))
            )
            .slice(0, 3);
    }, [data]);

    // Handle back to hero
    const handleBack = useCallback(() => {
        setNamesView('hero');
        setRandomName(null);
        setShowRandomDetail(false);
    }, []);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-amber-500 border-t-transparent mx-auto mb-4" />
                    <p className="text-slate-600">
                        {lang === 'en' ? 'Loading divine names...' : 'दिव्य नाम लोड हो रहे हैं...'}
                    </p>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="text-6xl mb-4">🙏</div>
                    <p className="text-slate-600">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative">
            <AnimatePresence mode="wait">
                {namesView === 'hero' && (
                    <motion.div
                        key="names-hero"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <DivineNamesHero
                            lang={lang}
                            onSelectView={setNamesView}
                            onRandomName={handleRandomName}
                        />
                    </motion.div>
                )}

                {namesView === 'browser' && (
                    <motion.div
                        key="names-browser"
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        className="max-w-4xl mx-auto px-4 py-8"
                    >
                        {/* Back Button */}
                        <motion.button
                            onClick={handleBack}
                            whileHover={{ scale: 1.05, x: -2 }}
                            whileTap={{ scale: 0.95 }}
                            className="flex items-center gap-2 px-4 py-2 mb-6 text-sm text-slate-600 hover:text-slate-900 transition-colors bg-white/50 rounded-lg border border-slate-200/50"
                        >
                            <ArrowLeft className="size-4" />
                            <span>{lang === 'en' ? 'Back to Names' : 'नामों पर वापस'}</span>
                        </motion.button>

                        <NameBrowser
                            names={data.names}
                            lang={lang}
                            onAISynthesis={aiEnabled ? handleAISynthesis : undefined}
                            isLoadingAI={isLoadingAI}
                            aiResults={aiResults}
                        />
                    </motion.div>
                )}

                {namesView === 'search' && (
                    <motion.div
                        key="names-search"
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        className="max-w-4xl mx-auto px-4 py-8"
                    >
                        {/* Back Button */}
                        <motion.button
                            onClick={handleBack}
                            whileHover={{ scale: 1.05, x: -2 }}
                            whileTap={{ scale: 0.95 }}
                            className="flex items-center gap-2 px-4 py-2 mb-6 text-sm text-slate-600 hover:text-slate-900 transition-colors bg-white/50 rounded-lg border border-slate-200/50"
                        >
                            <ArrowLeft className="size-4" />
                            <span>{lang === 'en' ? 'Back to Names' : 'नामों पर वापस'}</span>
                        </motion.button>

                        <AttributeSearch
                            names={data.names}
                            categories={data.categories}
                            searchIndex={data.searchIndex}
                            lang={lang}
                            onAISynthesis={aiEnabled ? handleAISynthesis : undefined}
                            isLoadingAI={isLoadingAI}
                            aiResults={aiResults}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Random Name Detail Modal */}
            {randomName && (
                <NameDetailView
                    name={randomName}
                    isOpen={showRandomDetail}
                    onClose={() => {
                        setShowRandomDetail(false);
                        setRandomName(null);
                    }}
                    onAISynthesis={aiEnabled ? handleAISynthesis : undefined}
                    relatedNames={getRelatedNames(randomName)}
                    onSelectRelated={(name) => {
                        setRandomName(name);
                    }}
                    lang={lang}
                    isLoadingAI={isLoadingAI}
                    aiResult={aiResults[randomName.id]}
                />
            )}
        </div>
    );
}
