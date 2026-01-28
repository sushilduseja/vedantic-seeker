import { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X } from 'lucide-react';
import { type Language } from '@/app/translations';
import { type VishnuName, NameCard } from './NameCard';
import { NameDetailView } from './NameDetailView';

interface AttributeSearchProps {
    names: VishnuName[];
    categories: Record<string, number[]>;
    searchIndex: Record<string, number[]>;
    lang: Language;
    onAISynthesis?: (name: VishnuName) => void;
    isLoadingAI?: boolean;
    aiResults: Record<number, string>;
}

const SUGGESTED_ATTRIBUTES = [
    { en: 'protector', hi: 'रक्षक' },
    { en: 'creator', hi: 'सृष्टिकर्ता' },
    { en: 'cosmic', hi: 'ब्रह्मांडीय' },
    { en: 'compassionate', hi: 'दयालु' },
    { en: 'supreme', hi: 'परम' },
    { en: 'eternal', hi: 'शाश्वत' },
    { en: 'knowledge', hi: 'ज्ञान' },
    { en: 'liberation', hi: 'मोक्ष' },
    { en: 'yoga', hi: 'योग' },
    { en: 'purity', hi: 'पवित्रता' }
];

export function AttributeSearch({
    names,
    categories,
    searchIndex,
    lang,
    onAISynthesis,
    isLoadingAI = false,
    aiResults
}: AttributeSearchProps) {
    const [query, setQuery] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedName, setSelectedName] = useState<VishnuName | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Attribute translation mapping Hindi->English
    const attributeMap: Record<string, string> = {
        'रक्षक': 'protector',
        'सृष्टिकर्ता': 'creator',
        'ब्रह्मांडीय': 'cosmic',
        'दयालु': 'compassionate',
        'परम': 'supreme',
        'शाश्वत': 'eternal',
        'ज्ञान': 'knowledge',
        'मोक्ष': 'liberation',
        'योग': 'yoga',
        'पवित्रता': 'purity',
        'चेतना': 'consciousness',
        'आत्मा': 'soul'
    };

    const labels = {
        placeholder: lang === 'en' ? 'Search by divine quality...' : 'दिव्य गुण से खोजें...',
        results: lang === 'en' ? 'results' : 'परिणाम',
        noResults: lang === 'en' ? 'No names found for this attribute' : 'इस गुण के लिए कोई नाम नहीं मिला',
        suggested: lang === 'en' ? 'Suggested Attributes' : 'सुझाए गए गुण'
    };

    // Filter names based on query
    const filteredNames = useMemo(() => {
        if (!query.trim()) return [];

        let searchQuery = query.toLowerCase();

        // Map Hindi query to English attribute if in Hindi mode
        if (lang === 'hi') {
            const mappedAttr = attributeMap[query.trim()];
            if (mappedAttr) {
                searchQuery = mappedAttr.toLowerCase();
            }
        }

        const matchingIds = new Set<number>();

        // Search in categories
        Object.entries(categories).forEach(([category, ids]) => {
            if (category.toLowerCase().includes(searchQuery)) {
                ids.forEach((id) => matchingIds.add(id));
            }
        });

        // Search in search index
        Object.entries(searchIndex).forEach(([term, ids]) => {
            if (term.toLowerCase().includes(searchQuery)) {
                ids.forEach((id) => matchingIds.add(id));
            }
        });

        // Search in name attributes
        names.forEach((name) => {
            if (name.attributes.some((attr) => attr.toLowerCase().includes(searchQuery))) {
                matchingIds.add(name.id);
            }
            // Also search in translation and meaning
            if (
                name.translation.toLowerCase().includes(searchQuery) ||
                name.meaning.toLowerCase().includes(searchQuery)
            ) {
                matchingIds.add(name.id);
            }
        });

        return names.filter((name) => matchingIds.has(name.id));
    }, [query, names, categories, searchIndex, lang, attributeMap]);

    const handleSuggestionClick = (attr: { en: string; hi: string }) => {
        setQuery(lang === 'en' ? attr.en : attr.hi);
        setShowSuggestions(false);
        inputRef.current?.focus();
    };

    const getRelatedNames = (name: VishnuName) => {
        return names
            .filter(
                (n) =>
                    n.id !== name.id &&
                    n.attributes.some((attr) => name.attributes.includes(attr))
            )
            .slice(0, 3);
    };

    return (
        <div className="max-w-4xl mx-auto">
            {/* Search Input */}
            <div className="relative mb-8">
                <div className="relative">
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onFocus={() => setShowSuggestions(true)}
                        placeholder={labels.placeholder}
                        className="w-full px-6 py-4 pl-14 text-lg bg-white/90 backdrop-blur-sm border-2 border-amber-200 rounded-2xl focus:outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100 transition-all shadow-lg"
                    />
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 size-5 text-amber-500" />
                    {query && (
                        <button
                            onClick={() => {
                                setQuery('');
                                inputRef.current?.focus();
                            }}
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-100 transition-colors"
                        >
                            <X className="size-5 text-slate-400" />
                        </button>
                    )}
                </div>

                {/* Suggestions Dropdown */}
                <AnimatePresence>
                    {showSuggestions && !query && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute z-50 w-full mt-2 bg-white/95 backdrop-blur-md border border-amber-200 rounded-xl shadow-xl overflow-hidden"
                        >
                            <div className="p-4">
                                <p className="text-sm font-bold text-slate-600 mb-3">{labels.suggested}</p>
                                <div className="flex flex-wrap gap-2">
                                    {SUGGESTED_ATTRIBUTES.map((attr) => (
                                        <motion.button
                                            key={attr.en}
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => handleSuggestionClick(attr)}
                                            className="px-4 py-2 bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-700 rounded-full border border-amber-200 text-sm font-medium hover:from-amber-100 hover:to-yellow-100 transition-all"
                                        >
                                            {lang === 'en' ? attr.en : attr.hi}
                                        </motion.button>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Results Count */}
            {query && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mb-6"
                >
                    <span className="text-slate-600 font-medium">
                        {filteredNames.length} {labels.results}
                    </span>
                </motion.div>
            )}

            {/* Results Grid */}
            {query && filteredNames.length > 0 ? (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                >
                    {filteredNames.map((name, index) => (
                        <motion.div
                            key={name.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                        >
                            <NameCard
                                name={name}
                                lang={lang}
                                onExplore={setSelectedName}
                                compact
                            />
                        </motion.div>
                    ))}
                </motion.div>
            ) : query ? (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-12"
                >
                    <p className="text-slate-500">{labels.noResults}</p>
                </motion.div>
            ) : null}

            {/* Empty State - Show suggested attributes */}
            {!query && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-12"
                >
                    <div className="text-6xl mb-4">🔍</div>
                    <h3 className="text-xl font-bold text-slate-700 mb-2">
                        {lang === 'en' ? 'Search by Divine Quality' : 'दिव्य गुण से खोजें'}
                    </h3>
                    <p className="text-slate-500 max-w-md mx-auto">
                        {lang === 'en'
                            ? 'Enter an attribute like "protector", "cosmic", or "compassionate" to find related divine names'
                            : '"रक्षक", "ब्रह्मांडीय", या "दयालु" जैसे गुण दर्ज करें'}
                    </p>
                </motion.div>
            )}

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
