import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Sparkles } from 'lucide-react';

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  suggestions: string[];
  disabled?: boolean;
}

export function AutocompleteInput({
  value,
  onChange,
  onSubmit,
  placeholder,
  suggestions,
  disabled = false
}: AutocompleteInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showAbove, setShowAbove] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Filter suggestions based on input
  const filteredSuggestions = suggestions.filter(s =>
    s.toLowerCase().includes(value.toLowerCase()) && s.toLowerCase() !== value.toLowerCase()
  );

  // Detect if input is in bottom half of viewport
  useEffect(() => {
    const checkPosition = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const spaceBelow = viewportHeight - rect.bottom;
        const spaceAbove = rect.top;
        
        // Show above if less than 300px space below and more space above
        setShowAbove(spaceBelow < 300 && spaceAbove > spaceBelow);
      }
    };

    checkPosition();
    window.addEventListener('scroll', checkPosition);
    window.addEventListener('resize', checkPosition);

    return () => {
      window.removeEventListener('scroll', checkPosition);
      window.removeEventListener('resize', checkPosition);
    };
  }, [showSuggestions]);

  useEffect(() => {
    setShowSuggestions(value.length > 0 && filteredSuggestions.length > 0);
    setSelectedIndex(-1);
  }, [value, filteredSuggestions.length]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) {
      if (e.key === 'Enter') {
        onSubmit();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < filteredSuggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          onChange(filteredSuggestions[selectedIndex]);
          setShowSuggestions(false);
        }
        onSubmit();
        break;
      case 'Escape':
        setShowSuggestions(false);
        break;
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    onChange(suggestion);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative group">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => value.length > 0 && setShowSuggestions(true)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full px-6 py-4 pr-14 text-base bg-white/90 backdrop-blur-sm border-2 border-slate-200 rounded-2xl focus:outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100 transition-all shadow-lg focus:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <motion.button
          type="button"
          onClick={onSubmit}
          disabled={disabled || !value.trim()}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl hover:from-amber-600 hover:to-orange-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Search className="size-4" />
        </motion.button>
      </div>

      <AnimatePresence>
        {showSuggestions && (
          <motion.div
            ref={suggestionsRef}
            initial={{ opacity: 0, y: showAbove ? 10 : -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: showAbove ? 10 : -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`absolute z-50 w-full bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl shadow-2xl overflow-hidden ${
              showAbove ? 'bottom-full mb-2' : 'top-full mt-2'
            }`}
          >
            <div className="p-2 space-y-1 max-h-80 overflow-y-auto">
              {filteredSuggestions.map((suggestion, index) => (
                <motion.button
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-all flex items-center gap-3 ${
                    selectedIndex === index
                      ? 'bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <Sparkles className={`size-4 flex-shrink-0 ${
                    selectedIndex === index ? 'text-amber-600' : 'text-slate-400'
                  }`} />
                  <span className={`text-sm ${
                    selectedIndex === index ? 'text-slate-900 font-medium' : 'text-slate-700'
                  }`}>
                    {suggestion}
                  </span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}