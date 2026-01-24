import { motion } from 'motion/react';
import { MessageCircle } from 'lucide-react';

interface QuickSuggestionsProps {
  suggestions: string[];
  onSelect: (suggestion: string) => void;
}

export function QuickSuggestions({ suggestions, onSelect }: QuickSuggestionsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-3"
    >
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <MessageCircle className="size-4" />
        <span>Try asking:</span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {suggestions.map((suggestion, index) => (
          <motion.button
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.4 }}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(suggestion)}
            className="group text-left p-4 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl hover:border-amber-300 hover:shadow-lg transition-all"
          >
            <span className="text-sm text-slate-700 group-hover:text-amber-900 transition-colors">
              {suggestion}
            </span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
