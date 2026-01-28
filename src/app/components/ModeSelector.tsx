import { motion } from 'motion/react';
import { BookOpen } from 'lucide-react';
import { type Language } from '@/app/translations';

// Om Symbol SVG Component
function OmIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1.5-5.5c-.28 0-.5-.22-.5-.5v-4c0-.28.22-.5.5-.5s.5.22.5.5v4c0 .28-.22.5-.5.5zm3 0c-.28 0-.5-.22-.5-.5v-4c0-.28.22-.5.5-.5s.5.22.5.5v4c0 .28-.22.5-.5.5zm-1.5-6c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" />
        </svg>
    );
}

export type AppMode = 'teachings' | 'names';

interface ModeSelectorProps {
    mode: AppMode;
    onModeChange: (mode: AppMode) => void;
    lang: Language;
}

export function ModeSelector({ mode, onModeChange, lang }: ModeSelectorProps) {
    const labels = {
        teachings: lang === 'en' ? 'Teachings' : 'शिक्षाएँ',
        names: lang === 'en' ? 'Divine Names' : 'दिव्य नाम'
    };

    return (
        <div className="flex justify-center">
            <div className="inline-flex bg-white/80 backdrop-blur-sm rounded-full p-1 shadow-lg border border-amber-200/50">
                <motion.button
                    onClick={() => onModeChange('teachings')}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`relative flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${mode === 'teachings'
                        ? 'text-white'
                        : 'text-slate-600 hover:text-slate-900'
                        }`}
                >
                    {mode === 'teachings' && (
                        <motion.div
                            layoutId="mode-bg"
                            className="absolute inset-0 bg-gradient-to-r from-amber-500 to-orange-600 rounded-full"
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        />
                    )}
                    <BookOpen className="relative z-10 size-4" />
                    <span className="relative z-10">{labels.teachings}</span>
                </motion.button>

                <motion.button
                    onClick={() => onModeChange('names')}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`relative flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${mode === 'names'
                        ? 'text-white'
                        : 'text-slate-600 hover:text-slate-900'
                        }`}
                >
                    {mode === 'names' && (
                        <motion.div
                            layoutId="mode-bg"
                            className="absolute inset-0 bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500 rounded-full"
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        />
                    )}
                    <span className="relative z-10 text-base">🕉️</span>
                    <span className="relative z-10">{labels.names}</span>
                </motion.button>
            </div>
        </div>
    );
}
