import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, ArrowLeft, Plus, Sparkles, Globe, Compass } from 'lucide-react';
import { findRelevantContent } from '@/app/components/QuestionMapper';
import { HeroSection } from '@/app/components/HeroSection';
import { ConversationView, type Message } from '@/app/components/ConversationView';
import { AutocompleteInput } from '@/app/components/AutocompleteInput';
import { QuickSuggestions } from '@/app/components/QuickSuggestions';
import { SpiritualBackground } from '@/app/components/SpiritualBackground';
import { WisdomAtlas } from '@/app/components/WisdomAtlas';
import { groqService } from '@/app/services/GroqService';
import { type Language, t } from '@/app/translations';

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
  const [lang, setLang] = useState<Language>('hi');

  useEffect(() => {
    loadDiverseQuestions();

    const envKey = import.meta.env.VITE_GROQ_API_KEY;
    if (envKey) {
      groqService.setApiKey(envKey);
      setAiEnabled(true);
    }
  }, [lang]);

  const handleBackToAtlas = useCallback(() => {
    setMessages([]); // Clears conversation to show Atlas
    setQuestion('');
    setPendingAIRequest(null);
    setIsLoadingAI(false);
    // View remains 'conversation'
  }, []);
  const loadDiverseQuestions = async () => {
    console.log('loadDiverseQuestions called with lang:', lang);
    try {
      // Always use English JSON for knowledge base (content is language-neutral)
      const filename = '/data/srimad-bhagavatam.json';
      console.log('Fetching:', filename);
      const response = await fetch(filename);
      if (!response.ok) throw new Error(`Failed to fetch ${filename}: ${response.status}`);

      const text = await response.text();
      console.log('Response text length:', text.length, 'First 100 chars:', text.substring(0, 100));

      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error('JSON parse error. Response starts with:', text.substring(0, 50), 'Response ends with:', text.substring(Math.max(0, text.length - 50)));
        throw parseError;
      }

      if (!data.questions || !Array.isArray(data.questions)) {
        throw new Error(`Invalid questions array in ${filename}`);
      }
      console.log('Loaded data with', data.questions.length, 'questions from', filename);

      const getDifficulty = (level: 'foundational' | 'intermediate' | 'advanced') => {
        if (lang === 'en') return level;
        const map = {
          'foundational': 'मूलभूत',
          'intermediate': 'मध्यवर्ती',
          'advanced': 'उन्नत'
        };
        return map[level];
      };

      const foundational = data.questions
        .filter((q: any) => q.difficulty === getDifficulty('foundational'))
        .sort((a: any, b: any) => b.popularity - a.popularity)
        .slice(0, 5);
      console.log('Found foundational:', foundational.length, 'with difficulty:', getDifficulty('foundational'));

      const intermediate = data.questions
        .filter((q: any) => q.difficulty === getDifficulty('intermediate'))
        .sort((a: any, b: any) => b.popularity - a.popularity)
        .slice(0, 5);
      console.log('Found intermediate:', intermediate.length);

      const advanced = data.questions
        .filter((q: any) => q.difficulty === getDifficulty('advanced'))
        .sort((a: any, b: any) => b.popularity - a.popularity)
        .slice(0, 3);
      console.log('Found advanced:', advanced.length);

      const allQuestions = [...foundational, ...intermediate, ...advanced]
        .map((q: any) => q.question);

      console.log('Setting suggested questions:', allQuestions.length);
      if (allQuestions.length > 0) {
        setSuggestedQuestions(allQuestions);
      } else {
        throw new Error('No questions found for current language');
      }
    } catch (error) {
      console.error('Failed to load questions for language', lang, ':', error);
      if (lang === 'hi') {
        try {
          const response = await fetch('/data/srimad-bhagavatam.json');
          if (!response.ok) throw new Error(`Fallback fetch failed: ${response.status}`);
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
          if (allQuestions.length > 0) {
            console.log('Using English fallback questions');
            // Translate fallback questions to Hindi
            const translatedQuestions = await Promise.all(
              allQuestions.map(async (q) => {
                try {
                  return await groqService.translateText(q, 'hi');
                } catch (e) {
                  return q;
                }
              })
            );
            setSuggestedQuestions(translatedQuestions);
          }
        } catch (fallbackError) {
          console.error('Fallback to English questions failed:', fallbackError);
        }
      }
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
      const aiResponse = await groqService.queryAI(question, searchResults, context, lang);

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
      const allResults = await findRelevantContent(searchQuery, lang);

      const freshResults = allResults.filter(r => !usedQuestionIds.has(r.questionId));
      const resultsToUse = freshResults.length > 0 ? freshResults : allResults;

      if (resultsToUse.length > 0) {
        const topResult = resultsToUse[0];
        setUsedQuestionIds(prev => new Set([...prev, topResult.questionId]));

        const messageId = (Date.now() + 1).toString();
        let displayContent = topResult.description;

        // Auto-translate if in Hindi mode and content looks like English
        // We check for typical English characters at the start
        if (lang === 'hi' && /^[A-Za-z0-9\s.,!?'"()\-:;]+$/.test(displayContent.slice(0, 50))) {
          try {
            displayContent = await groqService.translateText(displayContent, 'hi');
          } catch (e) {
            console.error('Translation failed:', e);
          }
        }

        const assistantMessage: Message = {
          id: messageId,
          type: 'assistant',
          content: displayContent,
          reference: topResult.reference,
          timestamp: new Date(),
          confidence: topResult.confidence
        };

        setMessages(prev => [...prev, assistantMessage]);

        const confidence = topResult.confidence || 0;

        if (aiEnabled) {
          if (confidence < 30) {
            setTimeout(() => {
              // Pass the content to AI context
              const resultForAI = { ...topResult, description: displayContent };
              enhanceWithAI(messageId, followUpQuestion, [resultForAI]);
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
  }, [question, lang, messages, isLoading, usedQuestionIds, aiEnabled]);

  const handleSubmit = useCallback(async (overrideQuestion?: string) => {
    const questionToSubmit = overrideQuestion || question;
    if (!questionToSubmit.trim() || isLoading) return;

    let displayQuestion = questionToSubmit;

    // Translate question to Hindi if needed
    if (lang === 'hi' && /^[A-Za-z0-9\s.,!?'"()\-:;]+$/.test(questionToSubmit.slice(0, 50))) {
      try {
        displayQuestion = await groqService.translateText(questionToSubmit, 'hi');
      } catch (e) {
        console.error('Question translation failed:', e);
      }
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: displayQuestion,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);

    const currentQuestion = questionToSubmit;
    setQuestion('');
    setIsLoading(true);
    setPendingAIRequest(null);

    try {
      const searchQuery = messages.length > 0
        ? buildContextualQuery(questionToSubmit, messages)
        : questionToSubmit;

      const allResults = await findRelevantContent(searchQuery, lang);

      const freshResults = allResults.filter(r => !usedQuestionIds.has(r.questionId));
      const resultsToUse = freshResults.length > 0 ? freshResults : allResults;

      if (resultsToUse.length > 0) {
        const topResult = resultsToUse[0];

        setUsedQuestionIds(prev => new Set([...prev, topResult.questionId]));

        const messageId = (Date.now() + 1).toString();
        let displayContent = topResult.description;
        if (lang === 'hi' && /^[A-Za-z0-9\s.,!?'"()\-:;]+$/.test(displayContent.slice(0, 50))) {
          try {
            displayContent = await groqService.translateText(displayContent, 'hi');
          } catch (e) {
            console.error('Translation failed:', e);
          }
        }

        const assistantMessage: Message = {
          id: messageId,
          type: 'assistant',
          content: displayContent,
          reference: topResult.reference,
          timestamp: new Date(),
          confidence: topResult.confidence
        };

        setMessages(prev => [...prev, assistantMessage]);

        const confidence = topResult.confidence || 0;

        if (aiEnabled) {
          if (confidence < 30) {
            setTimeout(() => {
              const resultForAI = { ...topResult, description: displayContent };
              enhanceWithAI(messageId, currentQuestion, [resultForAI]);
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
  }, [question, lang, messages, isLoading, usedQuestionIds, aiEnabled]);



  const initialSuggestionsTranslated = [
    t(lang, 'suggestion1'),
    t(lang, 'suggestion2'),
    t(lang, 'suggestion3'),
    t(lang, 'suggestion4'),
    t(lang, 'suggestion5'),
    t(lang, 'suggestion6'),
    t(lang, 'suggestion7'),
    t(lang, 'suggestion8'),
    t(lang, 'suggestion9'),
    t(lang, 'suggestion10'),
    t(lang, 'suggestion11'),
    t(lang, 'suggestion12')
  ];

  const followUpSuggestions = [
    t(lang, 'tellMeMore'),
    t(lang, 'practiceDaily'),
    t(lang, 'obstacles'),
    t(lang, 'example'),
    t(lang, 'applyLife'),
    t(lang, 'deeperInsights'),
    t(lang, 'practicalTechniques'),
    t(lang, 'scripturesSay')
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 relative overflow-hidden">
      <SpiritualBackground />

      {/* Global Language Toggle */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="fixed top-4 right-4 z-50"
      >
        <motion.button
          onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 px-4 py-2 text-sm rounded-full bg-white/90 backdrop-blur-md shadow-lg border border-amber-200/50 text-amber-700 hover:bg-amber-50 transition-colors"
        >
          <Globe className="size-4" />
          <span className="font-medium">{lang === 'en' ? 'हि' : 'EN'}</span>
        </motion.button>
      </motion.div>

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
              <HeroSection onGetStarted={handleGetStarted} lang={lang} />
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
                          {t(lang, 'appName')}
                        </h1>
                        <p className="text-xs text-slate-500">
                          {t(lang, 'appTagline')}
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
                          <span className="hidden sm:inline">{t(lang, 'aiEnabled')}</span>
                        </motion.div>
                      )}

                      {messages.length > 0 && (
                        <motion.button
                          onClick={handleBackToAtlas}
                          whileHover={{ scale: 1.05, x: -2 }}
                          whileTap={{ scale: 0.95 }}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:text-slate-900 transition-colors bg-white/50 rounded-lg border border-slate-200/50"
                        >
                          <Compass className="size-4 text-amber-600" />
                          <span className="hidden sm:inline font-medium text-amber-700">{lang === 'en' ? 'Atlas' : 'मानचित्र'}</span>
                        </motion.button>
                      )}

                      <motion.button
                        onClick={handleGoHome}
                        whileHover={{ scale: 1.05, x: -2 }}
                        whileTap={{ scale: 0.95 }}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
                      >
                        <ArrowLeft className="size-4" />
                        <span className="hidden sm:inline">{t(lang, 'backToHome')}</span>
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
                    className="max-w-4xl mx-auto"
                  >
                    <div className="text-center mb-8">
                      <div className="relative inline-block">
                        <motion.h2
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                          className="text-2xl md:text-3xl font-bold mb-2 bg-gradient-to-r from-amber-600 via-orange-600 to-purple-600 bg-clip-text text-transparent animate-gradient-x relative z-10"
                        >
                          {lang === 'en' ? 'Explore the Wisdom Atlas' : 'ज्ञान मानचित्र का अन्वेषण करें'}
                        </motion.h2>
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_3s_infinite] skew-x-12 pointer-events-none"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 1 }}
                        />
                      </div>
                      <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="text-slate-800 font-semibold text-lg"
                      >
                        {lang === 'en' ? 'Click a domain to explore, or wander randomly' : 'किसी क्षेत्र पर क्लिक करें, या यादृच्छिक भ्रमण करें'}
                      </motion.p>
                    </div>

                    <WisdomAtlas onSelectQuestion={handleSubmit} lang={lang} />
                  </motion.div>
                ) : (
                  <div className="space-y-6">
                    <ConversationView messages={messages} isLoading={isLoading} lang={lang} />

                    {pendingAIRequest && !isLoadingAI && messages.filter(m => m.type === 'assistant').length >= 4 && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex justify-center"
                      >
                        <div className="relative group">
                          <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-600 to-purple-600 rounded-full blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
                          <button
                            onClick={requestAIInsight}
                            className="relative flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white rounded-full shadow-2xl hover:shadow-3xl transition-all hover:scale-105 overflow-hidden"
                          >
                            <div className="absolute inset-0 bg-white/20 skew-x-12 animate-[shimmer_2s_infinite] -translate-x-full"></div>
                            <Sparkles className="size-5 animate-pulse" />
                            <span className="text-base font-bold tracking-wide">{t(lang, 'getAISynthesis')}</span>
                          </button>
                        </div>
                      </motion.div>
                    )}

                    {isLoadingAI && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex justify-center items-center gap-2 text-sm text-slate-600"
                      >
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-600 border-t-transparent"></div>
                        <span>{t(lang, 'synthesizing')}</span>
                      </motion.div>
                    )}

                    {!isLoading && messages.length > 0 && (
                      <QuickSuggestions
                        suggestions={followUpSuggestions}
                        lang={lang}
                        onSelect={(q) => {
                          setQuestion('');

                          const userMessage: Message = {
                            id: Date.now().toString(),
                            type: 'user',
                            content: q,
                            timestamp: new Date()
                          };
                          setMessages(prev => [...prev, userMessage]);
                          handleFollowUpSubmit(q);
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
                    placeholder={t(lang, 'placeholder')}
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
                        <span>{t(lang, 'newConversation')}</span>
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
              {t(lang, 'footerMain')}
            </p>
            <p className="text-center text-xs text-slate-500 mt-2">
              {t(lang, 'footerDisclaimer')}
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
              {t(lang, 'footerDisclaimer')}
            </p>
          </div>
        </motion.footer>
      )}
    </div>
  );
}
