import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useAnimationControls } from 'motion/react';
import { type Language } from '@/app/translations';
import { type VishnuName } from './NameCard';
import { NameDetailView } from './NameDetailView';

interface NameBrowserProps {
    names: VishnuName[];
    lang: Language;
    onAISynthesis?: (name: VishnuName) => void;
    isLoadingAI?: boolean;
    aiResults: Record<number, string>;
}

export function NameBrowser({
    names,
    lang,
    onAISynthesis,
    isLoadingAI = false,
    aiResults
}: NameBrowserProps) {
    const [selectedName, setSelectedName] = useState<VishnuName | null>(null);
    const [isPaused, setIsPaused] = useState(false);
    const controls = useAnimationControls();
    const x = useMotionValue(0);

    // To create an infinite loop, we triplicate the names array for seamless looping
    const marqueeItems = useMemo(() => {
        if (!names || names.length === 0) return [];
        return [...names, ...names, ...names];
    }, [names]);

    // Control animation based on pause state and popup state
    useEffect(() => {
        const shouldPause = isPaused || selectedName !== null;

        if (shouldPause) {
            controls.stop();
        } else {
            const currentX = x.get();
            const cardWidth = 350; // Fixed card width
            const gap = 24; // gap-6 = 1.5rem = 24px
            const totalWidth = -(cardWidth + gap) * names.length; // Negative value for leftward animation
            const remaining = totalWidth - currentX;
            const fullDuration = names.length * 1; // 1 seconds per name
            const remainingDuration = fullDuration * (remaining / totalWidth);

            controls.start({
                x: [currentX, totalWidth],
                transition: {
                    duration: remainingDuration,
                    ease: 'linear',
                    repeat: Infinity,
                    repeatType: 'loop',
                    onRepeat: () => {
                        x.set(0);
                    }
                }
            });
        }
    }, [isPaused, selectedName, controls, x, names.length]);

    const getRelatedNames = useCallback((currentName: VishnuName) => {
        if (!currentName) return [];
        return names
            .filter((n) =>
                n.id !== currentName.id &&
                n.attributes.some((attr) => currentName.attributes.includes(attr))
            )
            .slice(0, 3);
    }, [names]);

    if (!names || names.length === 0) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-amber-500 border-t-transparent" />
            </div>
        );
    }

    const labels = {
        explore: lang === 'en' ? 'Explore Details' : 'विस्तार देखें',
        paused: lang === 'en' ? 'Paused' : 'रुका हुआ'
    };

    return (
        <div className="w-full overflow-hidden py-12">
            {/* Pause Indicator Overlay */}
            <AnimatePresence>
                {isPaused && !selectedName && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="fixed top-24 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-amber-500 text-white text-sm font-bold rounded-full z-[60] shadow-2xl border border-white/20"
                    >
                        {labels.paused}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Infinite Marquee Container */}
            <div
                className="relative group cursor-grab active:cursor-grabbing"
                onMouseEnter={() => setIsPaused(true)}
                onMouseLeave={() => setIsPaused(false)}
                onTouchStart={() => setIsPaused(true)}
                onTouchEnd={() => setIsPaused(false)}
            >
                <motion.div
                    className="flex gap-6 px-3"
                    style={{ x }}
                    animate={controls}
                >
                    {marqueeItems.map((name, index) => (
                        <motion.div
                            key={`${name.id}-${index}`}
                            className="flex-shrink-0 w-[350px]"
                            whileHover={{ y: -8, scale: 1.02 }}
                        >
                            <div className="bg-white/90 backdrop-blur-sm rounded-3xl border border-amber-200/50 shadow-xl overflow-hidden p-6 h-full flex flex-col transition-shadow hover:shadow-2xl">
                                {/* Number Badge */}
                                <div className="inline-block self-start px-3 py-1 bg-gradient-to-r from-amber-100 to-yellow-100 rounded-full text-xs font-bold text-amber-700 border border-amber-200 mb-4">
                                    #{name.id}
                                </div>

                                {/* Sanskrit Name */}
                                <h2
                                    className="text-3xl font-bold text-slate-900 leading-tight"
                                    style={{ fontFamily: "'Noto Sans Devanagari', sans-serif" }}
                                >
                                    {name.sanskrit}
                                </h2>

                                {/* Transliteration */}
                                <p className="text-sm italic text-slate-500 mt-2">
                                    {name.transliteration}
                                </p>

                                {/* Translation */}
                                <p className="text-lg font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent mt-3">
                                    {name.translation}
                                </p>

                                {/* Meaning */}
                                <p className="text-slate-600 mt-4 leading-relaxed text-sm line-clamp-3">
                                    {name.meaning}
                                </p>

                                <div className="mt-auto pt-6">
                                    <button
                                        onClick={() => setSelectedName(name)}
                                        className="w-full px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold rounded-xl shadow-md hover:shadow-lg transition-all"
                                    >
                                        {labels.explore}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>

                {/* Visual Depth Gradients */}
                <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-amber-50/50 to-transparent pointer-events-none z-10" />
                <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-amber-50/50 to-transparent pointer-events-none z-10" />
            </div>

            {/* Detail Modal */}
            {selectedName && (
                <NameDetailView
                    name={selectedName}
                    isOpen={!!selectedName}
                    onClose={() => setSelectedName(null)}
                    onAISynthesis={onAISynthesis}
                    relatedNames={getRelatedNames(selectedName)}
                    onSelectRelated={setSelectedName}
                    lang={lang}
                    isLoadingAI={isLoadingAI}
                    aiResult={aiResults[selectedName.id]}
                />
            )}
        </div>
    );
}
