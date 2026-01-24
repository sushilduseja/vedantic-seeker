import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, ArrowLeft, Plus } from 'lucide-react';
import { findRelevantContent } from '@/app/components/QuestionMapper';
import { HeroSection } from '@/app/components/HeroSection';
import { ConversationView, type Message } from '@/app/components/ConversationView';
import { AutocompleteInput } from '@/app/components/AutocompleteInput';
import { QuickSuggestions } from '@/app/components/QuickSuggestions';
import { SpiritualBackground } from '@/app/components/SpiritualBackground';

type View = 'hero' | 'conversation';

interface ConversationContext {
  lastTopic: string;
  lastKeywords: string[];
  lastQuestionId?: string;
}

export default function App() {
  const [view, setView] = useState<View>('hero');
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [context, setContext] = useState<ConversationContext>({ lastTopic: '', lastKeywords: [] });
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);

  // Load diverse questions on mount
  useEffect(() => {
    loadDiverseQuestions();
  }, []);

  const loadDiverseQuestions = async () => {
    try {
      const response = await fetch('/data/srimad-bhagavatam.json');
      const data = await response.json();
      
      // Get diverse questions across difficulties and themes
      const foundational = data.questions
        .filter((q: any) => q.difficulty === 'foundational')
        .sort((a: any, b: any) => b.popularity - a.popularity)
        .slice(0, 5);
      
      const intermediate = data.questions
        .filter((q: any) => q.difficulty === 'intermediate')
        .sort((a: any, b: any) => b.popularity - a.popularity)
        .slice(0, 5);
      
      const advanced = data.questions
        .filter((q: any) => q.difficulty === 'advanced')
        .sort((a: any, b: any) => b.popularity - a.popularity)
        .slice(0, 3);
      
      const allQuestions = [...foundational, ...intermediate, ...advanced]
        .map((q: any) => q.question);
      
      setSuggestedQuestions(allQuestions);
    } catch (error) {
      console.error('Failed to load questions:', error);
    }
  };

  const extractKeywords = (text: string): string[] => {
    const normalized = text.toLowerCase();
    const stopWords = new Set(['the', 'is', 'are', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'this', 'that', 'these', 'those', 'a', 'an']);
    
    // Extract meaningful words
    const words = normalized
      .split(/\W+/)
      .filter(word => word.length > 3 && !stopWords.has(word));
    
    // Remove duplicates and return top 8
    return [...new Set(words)].slice(0, 8);
  };

  const isFollowUpQuestion = (query: string): boolean => {
    const followUpPatterns = [
      /^tell me more/i,
      /^how (?:can|do) (?:i|we) practice/i,
      /^what (?:are|is) (?:the )?obstacles?/i,
      /^(?:can you )?explain.*(?:with|using) (?:an? )?example/i,
      /^more (?:about|on|regarding)/i,
      /^elaborate/i,
      /^(?:give|show) me (?:an? )?example/i,
      /^how (?:to|can)/i
    ];
    return followUpPatterns.some(pattern => pattern.test(query));
  };

  const buildContextualQuery = (originalQuery: string, ctx: ConversationContext): string => {
    if (originalQuery.toLowerCase().includes('practice')) {
      return `how to practice ${ctx.lastTopic} daily spiritual practice`;
    }
    if (originalQuery.toLowerCase().includes('obstacle')) {
      return `obstacles challenges difficulties ${ctx.lastTopic}`;
    }
    if (originalQuery.toLowerCase().includes('example')) {
      return `example illustration story ${ctx.lastTopic}`;
    }
    if (originalQuery.toLowerCase().includes('more')) {
      return `detailed explanation ${ctx.lastTopic} ${ctx.lastKeywords.join(' ')}`;
    }
    return `${originalQuery} ${ctx.lastKeywords.slice(0, 3).join(' ')}`;
  };

  const handleGetStarted = useCallback(() => {
    setView('conversation');
  }, []);

  const handleGoHome = useCallback(() => {
    setView('hero');
    setMessages([]);
    setQuestion('');
    setContext({ lastTopic: '', lastKeywords: [] });
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!question.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: question,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentQuestion = question;
    setQuestion('');
    setIsLoading(true);

    try {
      let searchQuery = currentQuestion;
      
      // Enhance query with context for follow-ups
      if (isFollowUpQuestion(currentQuestion) && context.lastKeywords.length > 0) {
        searchQuery = buildContextualQuery(currentQuestion, context);
        console.log('Contextual query:', searchQuery);
      }

      const results = await findRelevantContent(searchQuery);
      
      if (results.length > 0) {
        // For follow-ups, try to find a different answer than the last one
        let topResult = results[0];
        
        if (context.lastQuestionId && results.length > 1) {
          // Find first result that's different from last question
          const differentResult = results.find(r => r.questionId !== context.lastQuestionId);
          if (differentResult) {
            topResult = differentResult;
          }
        }
        
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: topResult.description,
          reference: topResult.reference,
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, assistantMessage]);
        
        // Update context for future follow-ups
        const keywords = extractKeywords(topResult.description + ' ' + topResult.title);
        setContext({
          lastTopic: topResult.title.toLowerCase(),
          lastKeywords: keywords,
          lastQuestionId: topResult.questionId
        });
      } else {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: "I couldn't find a direct answer in the teachings. This may be a topic that requires deeper contemplation. Could you rephrase your question or explore related concepts like the nature of the soul, dharma, karma, or devotional practice?",
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error('Search failed:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: "I encountered an error searching the teachings. Please try rephrasing your question or ask something fundamental like 'Who am I?' or 'What is the purpose of life?'",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [question, isLoading, context]);

  const initialSuggestions = [
    "Who am I beyond this body?",
    "What is the ultimate purpose of life?",
    "What is bhakti-yoga?",
    "How can I find inner peace?"
  ];

  const followUpSuggestions = [
    "Tell me more about this",
    "How can I practice this daily?",
    "What are the obstacles I might face?",
    "Can you explain this with an example?"
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 relative overflow-hidden">
      <SpiritualBackground />

      <div className="relative z-10">
        <AnimatePresence mode="wait">
          {view === 'hero' ? (
            <motion.div
              key="hero"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              <HeroSection onGetStarted={handleGetStarted} />
            </motion.div>
          ) : (
            <motion.div
              key="conversation"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="min-h-screen flex flex-col"
            >
              <motion.header
                initial={{ y: -100 }}
                animate={{ y: 0 }}
                transition={{ type: "spring", stiffness: 100, damping: 20 }}
                className="sticky top-0 z-50 border-b border-white/20 bg-white/80 backdrop-blur-xl shadow-sm"
              >
                <div className="max-w-4xl mx-auto px-4 py-4">
                  <div className="flex items-center justify-between">
                    <motion.button
                      onClick={handleGoHome}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="flex items-center gap-3 group"
                    >
                      <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg group-hover:shadow-xl transition-shadow">
                        <BookOpen className="size-5 text-white" />
                      </div>
                      <div className="text-left">
                        <h1 className="text-lg font-semibold text-slate-900">
                          Vedic Knowledge
                        </h1>
                        <p className="text-xs text-slate-500">
                          Conversational Wisdom
                        </p>
                      </div>
                    </motion.button>

                    <motion.button
                      onClick={handleGoHome}
                      whileHover={{ scale: 1.05, x: -2 }}
                      whileTap={{ scale: 0.95 }}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
                    >
                      <ArrowLeft className="size-4" />
                      <span className="hidden sm:inline">Back to Home</span>
                    </motion.button>
                  </div>
                </div>
              </motion.header>

              <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
                {messages.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="max-w-3xl mx-auto"
                  >
                    <div className="text-center mb-12">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.3, type: "spring", stiffness: 150 }}
                        className="w-20 h-20 bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl"
                      >
                        <BookOpen className="size-10 text-white" />
                      </motion.div>
                      <motion.h2
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="text-3xl font-bold text-slate-900 mb-3"
                      >
                        Ask Your First Question
                      </motion.h2>
                      <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="text-slate-600 mb-8"
                      >
                        Begin a conversation to explore spiritual wisdom. Ask follow-up questions to go deeper.
                      </motion.p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                      {suggestedQuestions.map((q, idx) => (
                        <motion.button
                          key={idx}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.6 + idx * 0.05, duration: 0.4 }}
                          whileHover={{ scale: 1.03, y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            setQuestion(q);
                            setTimeout(handleSubmit, 100);
                          }}
                          className="group text-left p-4 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl hover:border-amber-300 hover:shadow-lg transition-all"
                        >
                          <span className="text-sm text-slate-700 group-hover:text-amber-900 transition-colors line-clamp-2">
                            {q}
                          </span>
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                ) : (
                  <div className="space-y-6">
                    <ConversationView messages={messages} isLoading={isLoading} />
                    
                    {!isLoading && messages.length > 0 && (
                      <QuickSuggestions
                        suggestions={followUpSuggestions}
                        onSelect={(q) => {
                          setQuestion(q);
                        }}
                      />
                    )}
                  </div>
                )}
              </main>

              <motion.div
                initial={{ y: 100 }}
                animate={{ y: 0 }}
                transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.3 }}
                className="sticky bottom-0 border-t border-white/20 bg-gradient-to-t from-white/95 to-white/80 backdrop-blur-xl shadow-2xl"
              >
                <div className="max-w-4xl mx-auto px-4 py-6">
                  <AutocompleteInput
                    value={question}
                    onChange={setQuestion}
                    onSubmit={handleSubmit}
                    placeholder="Ask a question or continue the conversation..."
                    suggestions={suggestedQuestions}
                    disabled={isLoading}
                  />
                  
                  {messages.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      className="flex items-center justify-center gap-4 mt-4"
                    >
                      <button
                        onClick={handleGoHome}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
                      >
                        <Plus className="size-4" />
                        <span>New Conversation</span>
                      </button>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {view === 'hero' && (
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="relative z-10 border-t border-white/20 bg-white/60 backdrop-blur-sm"
        >
          <div className="max-w-4xl mx-auto px-4 py-6">
            <p className="text-center text-sm text-slate-600">
              Wisdom from Bhagavad Gita and Srimad Bhagavatam · Educational exploration
            </p>
          </div>
        </motion.footer>
      )}
    </div>
  );
}