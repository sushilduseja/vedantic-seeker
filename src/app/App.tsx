import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, ArrowLeft, Plus } from 'lucide-react';
import { findRelevantContent } from '@/app/components/QuestionMapper';
import { HeroSection } from '@/app/components/HeroSection';
import { ConversationView, type Message } from '@/app/components/ConversationView';
import { AutocompleteInput } from '@/app/components/AutocompleteInput';
import { QuickSuggestions } from '@/app/components/QuickSuggestions';
import { SpiritualBackground } from '@/app/components/SpiritualBackground';

type View = 'hero' | 'conversation';

export default function App() {
  const [view, setView] = useState<View>('hero');
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // All possible questions for autocomplete
  const allQuestions = [
    "Who am I?",
    "What is the nature of the soul?",
    "What is bhakti?",
    "What is the difference between bhakti and Veda?",
    "What is my purpose in life?",
    "How do I find inner peace?",
    "What happens after death?",
    "What is karma?",
    "How can I overcome suffering?",
    "What is meditation?",
    "What is the difference between the body and soul?",
    "What is maya?",
    "How do I surrender to God?",
    "What are the three modes of nature?",
    "What is true knowledge?",
    "How do I practice detachment?",
    "What is the path to enlightenment?",
    "What is the Supreme Truth?",
    "How do I control my mind?",
    "What is the meaning of Om?"
  ];

  // Quick suggestions for different contexts
  const initialSuggestions = [
    "Who am I?",
    "What is bhakti?",
    "What is my purpose?",
    "How do I find inner peace?"
  ];

  const followUpSuggestions = [
    "Tell me more about this",
    "How can I practice this daily?",
    "What are the obstacles I might face?",
    "Can you explain this with an example?"
  ];

  const handleGetStarted = useCallback(() => {
    setView('conversation');
  }, []);

  const handleGoHome = useCallback(() => {
    setView('hero');
    setMessages([]);
    setQuestion('');
  }, []);

  const handleSubmit = useCallback(() => {
  if (!question.trim() || isLoading) return;

  // Add user message
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

  // Use async/await properly
  (async () => {
    try {
      const results = await findRelevantContent(currentQuestion);
      
      if (results.length > 0 && results[0]) {
        const topResult = results[0];
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: topResult.description,
          reference: topResult.reference,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        // No results found - provide helpful fallback
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: "I couldn't find a direct answer in the teachings. This may be a topic that requires deeper contemplation or may be addressed differently in Vedantic philosophy. Could you rephrase your question or ask about related concepts like the nature of the soul, dharma, or the path to liberation?",
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error('Search failed:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: "I apologize, but I encountered an error searching the teachings. Please try rephrasing your question or ask something fundamental like 'Who am I?' or 'What is the purpose of life?'",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  })();
}, [question, isLoading]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 relative overflow-hidden">
      {/* Animated spiritual background */}
      <SpiritualBackground />

      {/* Content */}
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
              {/* Header */}
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

              {/* Main conversation area */}
              <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
                {messages.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="max-w-2xl mx-auto"
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

                    <QuickSuggestions
                      suggestions={initialSuggestions}
                      onSelect={(q) => {
                        setQuestion(q);
                        setTimeout(handleSubmit, 100);
                      }}
                    />
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

              {/* Input area */}
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
                    suggestions={allQuestions}
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

      {/* Footer - only show on hero */}
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
