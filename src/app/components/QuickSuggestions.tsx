import { motion } from 'motion/react';
import { MessageCircle, BookMarked, Shield, Lightbulb } from 'lucide-react';
import { type Language, t } from '@/app/translations';

interface QuickSuggestionsProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
  lang?: Language;
}

const getIconForSuggestion = (suggestion: string) => {
  const lower = suggestion.toLowerCase();
  // English pattern matching
  if (lower.includes('more') || lower.includes('elaborate')) return BookMarked;
  if (lower.includes('practice') || lower.includes('daily') || lower.includes('अभ्यास')) return Lightbulb;
  if (lower.includes('obstacle') || lower.includes('challenge') || lower.includes('बाधा')) return Shield;
  // Hindi pattern matching
  if (lower.includes('बताएं') || lower.includes('कहते')) return BookMarked;
  if (lower.includes('तकनीकें') || lower.includes('अनुप्रयोग')) return Lightbulb;
  return MessageCircle;
};

export function QuickSuggestions({ suggestions, onSelect, lang = 'en' }: QuickSuggestionsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-3"
    >
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <MessageCircle className="size-4" />
        <span>{t(lang, 'continueExploring')}</span>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {suggestions.map((suggestion, index) => {
          const Icon = getIconForSuggestion(suggestion);
          return (
            <motion.button
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1, duration: 0.4 }}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelect(suggestion)}
              className="group text-left p-4 bg-gradient-to-br from-white to-amber-50/30 backdrop-blur-sm border border-slate-200 rounded-xl hover:border-amber-300 hover:shadow-lg transition-all flex items-start gap-3"
            >
              <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-amber-100 to-orange-100 rounded-lg flex items-center justify-center group-hover:from-amber-200 group-hover:to-orange-200 transition-colors">
                <Icon className="size-4 text-amber-700" />
              </div>
              <span className="text-sm text-slate-700 group-hover:text-amber-900 transition-colors flex-1">
                {suggestion}
              </span>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}