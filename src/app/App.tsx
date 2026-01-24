import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, ArrowLeft, Plus, Key, Sparkles, Network } from 'lucide-react';
import { findRelevantContent } from '@/app/components/QuestionMapper';
import { HeroSection } from '@/app/components/HeroSection';
import { ConversationView, type Message } from '@/app/components/ConversationView';
import { AutocompleteInput } from '@/app/components/AutocompleteInput';
import { QuickSuggestions } from '@/app/components/QuickSuggestions';
import { SpiritualBackground } from '@/app/components/SpiritualBackground';
import { groqService } from '@/app/services/GroqService';

type View = 'hero' | 'conversation';

export default function App() {
  const [view, setView] = useState<View>('hero');
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [usedQuestionIds, setUsedQuestionIds] = useState<Set<string>>(new Set());
  const [aiEnabled, setAiEnabled] = useState(false);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [pendingAIRequest, setPendingAIRequest] = useState<{
    messageId: string;
    question: string;
    searchResults: any[];
  } | null>(null);

  useEffect(() => {
    loadDiverseQuestions();
    const envKey = import.meta.env.VITE_GROQ_API_KEY;
    if (envKey) {
      groqService.setApiKey(envKey);
      setAiEnabled(true);
    }
  }, []);

  const loadDiverseQuestions = async () => {
    try {
      const response = await fetch('/data/srimad-bhagavatam.json');
      const data = await response.json();
      
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

  const getConversationContext = () => {
    return messages
      .slice(-4)
      .map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));
  };

  const enhanceWithAI = async (
    messageId: string,
    question: string,
    searchResults: any[]
  ) => {
    setIsLoadingAI(true);
    
    try {
      const context = getConversationContext();
      const aiResponse = await groqService.queryAI(question, searchResults, context);

      if (!aiResponse.error || aiResponse.error === 'NO_API_KEY') {
        setMessages(prev => {
          const existingIndex = prev.findIndex(m => m.id === `${messageId}-ai`);
          const aiMessage: Message = {
            id: `${messageId}-ai`,
            type: 'assistant',
            content: aiResponse.content,
            reference: aiResponse.sourceVerses?.join(', '),
            timestamp: new Date(),
            isAI: true
          };

          if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex] = aiMessage;
            return updated;
          } else {
            return [...prev, aiMessage];
          }
        });
      } else {
        setMessages(prev => [...prev, {
          id: `${messageId}-ai-error`,
          type: 'assistant',
          content: aiResponse.content,
          timestamp: new Date(),
          isAI: true
        }]);
      }
    } catch (error) {
      console.error('AI enhancement error:', error);
      setMessages(prev => [...prev, {
        id: `${messageId}-ai-error`,
        type: 'assistant',
        content: "I encountered a difficulty accessing deeper insights. The scriptural teaching above offers authentic guidance.",
        timestamp: new Date(),
        isAI: true
      }]);
    } finally {
      setIsLoadingAI(false);
      setPendingAIRequest(null);
    }
  };

  const requestAIInsight = () => {
    if (pendingAIRequest) {
      enhanceWithAI(
        pendingAIRequest.messageId,
        pendingAIRequest.question,
        pendingAIRequest.searchResults
      );
    }
  };

  const buildContextualQuery = (currentQuestion: string, messageHistory: Message[]): string => {
    const lowerQuestion = currentQuestion.toLowerCase();
    
    const isMoreInfo = /tell me more|elaborate|explain more|go deeper|continue/i.test(lowerQuestion);
    const isPractice = /how.*practice|daily|implement|apply/i.test(lowerQuestion);
    const isExample = /example|illustration|story|demonstrate/i.test(lowerQuestion);
    const isObstacle = /obstacle|challenge|difficult|problem/i.test(lowerQuestion);
    
    const lastAssistant = messageHistory
      .filter(m => m.type === 'assistant')
      .slice(-1)[0];
    
    if (!lastAssistant) return currentQuestion;
    
    const topicWords = lastAssistant.content
      .toLowerCase()
      .split(/\W+/)
      .filter(word => word.length > 4)
      .filter(word => !['these', 'those', 'their', 'there', 'about', 'would', 'should', 'could', 'which', 'through'].includes(word))
      .slice(0, 3);
    
    if (isMoreInfo) {
      return `${topicWords.join(' ')} deeper explanation advanced understanding`;
    } else if (isPractice) {
      return `${topicWords.join(' ')} practice sadhana daily routine`;
    } else if (isExample) {
      return `${topicWords.join(' ')} example story illustration`;
    } else if (isObstacle) {
      return `${topicWords.join(' ')} obstacles challenges difficulties`;
    } else {
      return `${currentQuestion} ${topicWords.join(' ')}`;
    }
  };

  const handleGetStarted = useCallback(() => {
    setView('conversation');
  }, []);

  const handleGoHome = useCallback(() => {
    setView('hero');
    setMessages([]);
    setQuestion('');
    setUsedQuestionIds(new Set());
    setPendingAIRequest(null);
    setIsLoadingAI(false);
  }, []);

  const handleFollowUpSubmit = useCallback(async (followUpQuestion: string) => {
    if (!followUpQuestion.trim() || isLoading) return;

    setIsLoading(true);
    setPendingAIRequest(null);

    try {
      const searchQuery = buildContextualQuery(followUpQuestion, messages);
      const allResults = await findRelevantContent(searchQuery);
      
      const freshResults = allResults.filter(r => !usedQuestionIds.has(r.questionId));
      const resultsToUse = freshResults.length > 0 ? freshResults : allResults;
      
      if (resultsToUse.length > 0) {
        const topResult = resultsToUse[0];
        setUsedQuestionIds(prev => new Set([...prev, topResult.questionId]));
        
        const messageId = (Date.now() + 1).toString();
        const assistantMessage: Message = {
          id: messageId,
          type: 'assistant',
          content: topResult.description,
          reference: topResult.reference,
          timestamp: new Date(),
          confidence: topResult.confidence
        };
        
        setMessages(prev => [...prev, assistantMessage]);

        const confidence = topResult.confidence || 0;
        
        if (aiEnabled) {
          if (confidence < 30) {
            setTimeout(() => {
              enhanceWithAI(messageId, followUpQuestion, [topResult]);
            }, 100);
          } else if (confidence >= 30 && confidence <= 60) {
            setPendingAIRequest({
              messageId,
              question: followUpQuestion,
              searchResults: resultsToUse.slice(0, 3)
            });
          }
        }
        
      } else {
        const messageId = (Date.now() + 1).toString();
        const assistantMessage: Message = {
          id: messageId,
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
  }, [messages, isLoading, usedQuestionIds, aiEnabled]);

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
    setPendingAIRequest(null);

    try {
      const searchQuery = messages.length > 0 
        ? buildContextualQuery(currentQuestion, messages)
        : currentQuestion;

      const allResults = await findRelevantContent(searchQuery);
      
      const freshResults = allResults.filter(r => !usedQuestionIds.has(r.questionId));
      const resultsToUse = freshResults.length > 0 ? freshResults : allResults;
      
      if (resultsToUse.length > 0) {
        const topResult = resultsToUse[0];
        
        setUsedQuestionIds(prev => new Set([...prev, topResult.questionId]));
        
        const messageId = (Date.now() + 1).toString();
        const assistantMessage: Message = {
          id: messageId,
          type: 'assistant',
          content: topResult.description,
          reference: topResult.reference,
          timestamp: new Date(),
          confidence: topResult.confidence
        };
        
        setMessages(prev => [...prev, assistantMessage]);

        const confidence = topResult.confidence || 0;
        
        if (aiEnabled) {
          if (confidence < 30) {
            setTimeout(() => {
              enhanceWithAI(messageId, currentQuestion, [topResult]);
            }, 100);
          } else if (confidence >= 30 && confidence <= 60) {
            setPendingAIRequest({
              messageId,
              question: currentQuestion,
              searchResults: resultsToUse.slice(0, 3)
            });
          }
        }
        
      } else {
        const messageId = (Date.now() + 1).toString();
        const assistantMessage: Message = {
          id: messageId,
          type: 'assistant',
          content: "I couldn't find a direct answer in the teachings. This may be a topic that requires deeper contemplation. Could you rephrase your question or explore related concepts like the nature of the soul, dharma, karma, or devotional practice?",
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);

        if (aiEnabled) {
          setTimeout(() => {
            enhanceWithAI(messageId, currentQuestion, []);
          }, 100);
        }
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
  }, [question, isLoading, messages, usedQuestionIds, aiEnabled]);

  const initialSuggestions = [
    "Who am I beyond this body?",
    "What is the ultimate purpose of human life?",
    "What is bhakti-yoga and devotional service?",
    "How can I find inner peace and tranquility?",
    "What is the nature of God and the soul?",
    "How does karma and rebirth work?",
    "What is dharma and righteous living?",
    "How can I overcome material desires?",
    "What is the role of a spiritual teacher?",
    "How should I approach death?",
    "What is maya or illusion?",
    "Why is there suffering in the world?"
  ];

  const followUpSuggestions = [
    "Tell me more about this",
    "How can I practice this daily?",
    "What are the obstacles I might face?",
    "Can you explain this with an example?",
    "How does this apply to my life?",
    "What are the deeper insights?",
    "Are there practical techniques?",
    "What do the scriptures say?"
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

                    <div className="flex items-center gap-2">
                      {aiEnabled && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-green-50 text-green-700"
                        >
                          <Sparkles className="size-4" />
                          <span className="hidden sm:inline">AI Enhanced</span>
                        </motion.div>
                      )}

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
                    
                    {pendingAIRequest && !isLoadingAI && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex justify-center"
                      >
                        <button
                          onClick={requestAIInsight}
                          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105"
                        >
                          <Sparkles className="size-4" />
                          <span className="text-sm font-medium">Get AI Synthesis</span>
                        </button>
                      </motion.div>
                    )}

                    {isLoadingAI && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex justify-center items-center gap-2 text-sm text-slate-600"
                      >
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-600 border-t-transparent"></div>
                        <span>Synthesizing deeper wisdom...</span>
                      </motion.div>
                    )}
                    
                    {!isLoading && messages.length > 0 && (
                      <QuickSuggestions
                        suggestions={followUpSuggestions}
                        onSelect={(q) => {
                          setQuestion(q);
                          setTimeout(() => {
                            const userMessage: Message = {
                              id: Date.now().toString(),
                              type: 'user',
                              content: q,
                              timestamp: new Date()
                            };
                            setMessages(prev => [...prev, userMessage]);
                            handleFollowUpSubmit(q);
                          }, 50);
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
            <p className="text-center text-xs text-slate-500 mt-2">
              Responses are generated from curated teachings and may not be fully comprehensive
            </p>
          </div>
        </motion.footer>
      )}
      
      {view === 'conversation' && (
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative z-10 border-t border-white/20 bg-white/60 backdrop-blur-sm"
        >
          <div className="max-w-4xl mx-auto px-4 py-3">
            <p className="text-center text-xs text-slate-500">
              Responses are generated from curated teachings and may not be fully comprehensive
            </p>
          </div>
        </motion.footer>
      )}
    </div>
  );
}