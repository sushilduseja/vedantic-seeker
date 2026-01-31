import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, ArrowLeft, Plus, Sparkles, Globe, Compass } from 'lucide-react';
import { findRelevantContent } from '@/app/components/ContentMapper';
import { HeroSection } from '@/app/components/HeroSection';
import { ConversationView, type Message } from '@/app/components/ConversationView';
import { AutocompleteInput } from '@/app/components/AutocompleteInput';
import { QuickSuggestions } from '@/app/components/QuickSuggestions';
import { SpiritualBackground } from '@/app/components/SpiritualBackground';
import { WisdomAtlas } from '@/app/components/WisdomAtlas';
import { ModeSelector, type AppMode } from '@/app/components/ModeSelector';
import { DivineNamesMode } from '@/app/components/DivineNamesMode';
import { groqService } from '@/app/services/GroqService';
import { type Language, t } from '@/app/translations';

type View = 'hero' | 'conversation';

export default function App() {
  const [view, setView] = useState<View>('hero');
  const [mode, setMode] = useState<AppMode>('teachings');
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [usedQuestionIds, setUsedQuestionIds] = useState<Set<string>>(new Set());
  const [aiEnabled, setAiEnabled] = useState(false);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [dynamicSuggestions, setDynamicSuggestions] = useState<string[]>([]);
  const [currentDomain, setCurrentDomain] = useState<string>('General');
  const [lang, setLang] = useState<Language>('hi');

  useEffect(() => {
    loadDiverseQuestions();

    // @ts-ignore
    const envKey = import.meta.env.VITE_GROQ_API_KEY;
    if (envKey) {
      groqService.setApiKey(envKey);
      setAiEnabled(true);
    }

    // Load last used mode
    const savedMode = localStorage.getItem('appMode');
    if (savedMode === 'names') {
      setMode('names');
    }
  }, [lang]);

  // Persist mode changes
  const handleModeChange = useCallback((newMode: AppMode) => {
    setMode(newMode);
    localStorage.setItem('appMode', newMode);
    // When switching modes, ensure we're on the hero view initially
    if (view === 'conversation') { // Optional: decide if we want to reset view
      // setView('hero'); 
    }
  }, [view]);

  const handleBackToAtlas = useCallback(() => {
    setMessages([]); // Clears conversation to show Atlas
    setQuestion('');
    setIsLoadingAI(false);
    setDynamicSuggestions([]);
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



  const requestSynthesize = async (messageId: string) => {
    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;

    const message = messages[messageIndex];
    // Find verse refs from the message or previous context
    // The reference string usually contains "SB 1.2.3, SB 4.5.6"
    const verseRefs = message.reference ? message.reference.split(',').map(r => r.trim()) : [];

    setIsLoadingAI(true);
    try {
      const response = await groqService.synthesizeDeeperInsights(message.content, verseRefs, lang);

      const synthesisMessage: Message = {
        id: `${messageId}-syn`,
        type: 'assistant',
        content: response.content || "Synthesis not available.",
        isAI: true,
        reference: response.sourceVerses?.join(', '),
        timestamp: new Date()
      };

      // Insert after the current message
      setMessages(prev => {
        const newMessages = [...prev];
        // If the next message is already a synthesis (optional check), replace it? 
        // For now, just append after
        const idx = newMessages.findIndex(m => m.id === messageId);
        newMessages.splice(idx + 1, 0, synthesisMessage);
        return newMessages;
      });

      // Generate new follow-on questions based on this new synthesis
      generateDynamicQuestions(synthesisMessage.content);

    } catch (error) {
      console.error("Synthesis error:", error);
    } finally {
      setIsLoadingAI(false);
    }
  };

  const generateDynamicQuestions = async (contextContent: string) => {
    // We use the last few messages as context
    const recentHistory = messages.slice(-2).map(m => ({
      role: m.type,
      content: m.content
    }));
    // Add the new content to history for the prompt
    recentHistory.push({ role: 'assistant', content: contextContent });

    try {
      const questions = await groqService.generateFollowUpQuestions(recentHistory, currentDomain, lang);
      if (questions && questions.length > 0) {
        setDynamicSuggestions(questions);
      }
    } catch (e) {
      console.error("Failed to generate dynamic questions", e);
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
    setIsLoadingAI(false);
    setDynamicSuggestions([]);
  }, []);

  const handleSubmit = useCallback(async (overrideQuestion?: string, domain?: string) => {
    if (domain) setCurrentDomain(domain);

    const questionToSubmit = overrideQuestion || question;
    if (!questionToSubmit.trim() || isLoading) return;

    let displayQuestion = questionToSubmit;
    setIsLoading(true);

    // Translate if Hindi
    if (lang === 'hi' && /^[A-Za-z0-9\s.,!?'"()\-:;]+$/.test(questionToSubmit.slice(0, 50))) {
      try { displayQuestion = await groqService.translateText(questionToSubmit, 'hi'); } catch { }
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: displayQuestion,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setQuestion('');
    setDynamicSuggestions([]);

    // Determine query context
    const searchQuery = messages.length > 0
      ? buildContextualQuery(displayQuestion, messages)
      : displayQuestion;

    // 1. Get Ground Truth Context First
    const allResults = await findRelevantContent(searchQuery, lang);
    const freshResults = allResults.filter(r => !usedQuestionIds.has(r.questionId));
    const resultsToUse = freshResults.length > 0 ? freshResults : allResults;

    // Zero-Found Fallback
    if (resultsToUse.length === 0) {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: lang === 'hi'
          ? "मुझे धर्मग्रंथों में इस प्रश्न का सीधा उत्तर नहीं मिला।"
          : "I couldn't find a direct answer in the teachings.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
      setIsLoading(false);
      return;
    }

    const topResult = resultsToUse[0];
    setUsedQuestionIds(prev => new Set([...prev, topResult.questionId]));

    // 2. AI Generation (Primary)
    try {
      if (!aiEnabled) throw new Error('AI_DISABLED');

      const aiResponse = await groqService.generateGroundedAnswer(
        displayQuestion,
        topResult,
        currentDomain,
        lang
      );

      if (aiResponse.error || !aiResponse.content) {
        throw new Error('AI_FAILURE');
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: aiResponse.content,
        timestamp: new Date(),
        isAI: true,
        sourceVerses: aiResponse.sourceVerses
      };
      setMessages(prev => [...prev, assistantMessage]);
      generateDynamicQuestions(aiResponse.content);

    } catch (error) {
      // 3. Fallback to Static Content (Graceful)
      console.warn('Fallback to static content:', error);

      let displayContent = topResult.description;

      // Auto-translate fallback if needed
      if (lang === 'hi' && /^[A-Za-z0-9\s.,!?'"()\-:;]+$/.test(displayContent.slice(0, 50))) {
        try {
          displayContent = await groqService.translateText(displayContent, 'hi');
        } catch { }
      }

      const fallbackMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: displayContent,
        timestamp: new Date(),
        isAI: false,
        reference: topResult.reference,
        confidence: topResult.confidence
      };
      setMessages(prev => [...prev, fallbackMessage]);
      generateDynamicQuestions(displayContent);
    } finally {
      setIsLoading(false);
    }
  }, [question, lang, messages, isLoading, usedQuestionIds, currentDomain, aiEnabled]);

  const handleFollowUpSubmit = useCallback((followUpQuestion: string) => {
    handleSubmit(followUpQuestion);
  }, [handleSubmit]);




  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 relative overflow-hidden">
      <SpiritualBackground />

      {/* Global Language Toggle */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="fixed top-4 right-4 z-50 flex items-center gap-4"
      >
        <ModeSelector
          mode={mode}
          onModeChange={handleModeChange}
          lang={lang}
        />
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
          {mode === 'names' ? (
            <motion.div
              key="names-mode"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="min-h-screen pt-20"
            >
              <DivineNamesMode lang={lang} aiEnabled={aiEnabled} />
            </motion.div>
          ) : view === 'hero' ? (
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
                    <ConversationView
                      messages={messages}
                      isLoading={isLoading}
                      lang={lang}
                      onSynthesize={requestSynthesize}
                    />

                    {/* Legacy AI button removed */}

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

                    {!isLoading && messages.length > 0 && dynamicSuggestions.length > 0 && (
                      <QuickSuggestions
                        suggestions={dynamicSuggestions}
                        lang={lang}
                        onSelect={(q) => {
                          setQuestion('');
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
