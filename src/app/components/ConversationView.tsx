import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, BookOpen, Loader2, Sparkles, Network } from 'lucide-react';

export interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  reference?: string;
  timestamp: Date;
  isAI?: boolean;
  confidence?: number;
}

interface ConversationViewProps {
  messages: Message[];
  isLoading: boolean;
}

function parseAIContent(content: string): { text: string; concepts?: string[] } {
  // Extract key concepts for visualization
  const conceptPatterns = [
    /understanding ([\w\s-]+)/gi,
    /the ([\w\s-]+) is/gi,
    /cultivat(?:e|ing) ([\w\s-]+)/gi,
    /(self-realization|bhakti|devotional service|spiritual energy|eternal self)/gi
  ];

  const concepts = new Set<string>();
  conceptPatterns.forEach(pattern => {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      const concept = match[1]?.trim();
      if (concept && concept.length > 3 && concept.length < 40) {
        concepts.add(concept);
      }
    }
  });

  return {
    text: content,
    concepts: Array.from(concepts).slice(0, 6)
  };
}

export function ConversationView({ messages, isLoading }: ConversationViewProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (messages.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6 pb-6">
      <AnimatePresence mode="popLayout">
        {messages.map((message, index) => {
          const parsed = message.isAI ? parseAIContent(message.content) : null;

          return (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              className={`flex gap-4 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.type === 'assistant' && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: index * 0.05 + 0.2, type: "spring", stiffness: 200 }}
                  className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center shadow-lg"
                >
                  <BookOpen className="size-5 text-white" />
                </motion.div>
              )}

              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                transition={{ delay: index * 0.05 + 0.3 }}
                className={`max-w-[80%] ${message.type === 'user'
                    ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-3xl rounded-tr-md'
                    : 'bg-white border border-slate-200 rounded-3xl rounded-tl-md shadow-md'
                  } p-5`}
              >
                {message.type === 'assistant' && (
                  <div className="flex items-center gap-2 mb-3">
                    {message.isAI ? (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-100 to-indigo-100 rounded-full">
                        <Sparkles className="size-3.5 text-purple-600" />
                        <span className="text-xs font-semibold text-purple-700">AI Synthesis</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 rounded-full">
                        <BookOpen className="size-3.5 text-amber-600" />
                        <span className="text-xs font-semibtext-amber-700">Sacred Texts</span>
                      </div>
                    )}
                    {message.confidence !== undefined && !message.isAI && (
                      <span className="text-xs text-slate-400 font-medium">
                        {message.confidence}% match
                      </span>
                    )}
                  </div>
                )}
                {/* Concept map for AI responses */}
                {parsed && parsed.concepts && parsed.concepts.length > 3 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mb-4 p-4 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-200/50"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <Network className="size-4 text-purple-600" />
                      <span className="text-xs font-semibold text-purple-700">Key Concepts</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {parsed.concepts.map((concept, i) => (
                        <motion.div
                          key={i}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.4 + i * 0.1 }}
                          className="px-3 py-1.5 bg-white rounded-lg border border-purple-200 shadow-sm"
                        >
                          <span className="text-xs font-medium text-slate-700">{concept}</span>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}

                <div className={`text-sm leading-relaxed ${message.type === 'user' ? 'text-white' : 'text-slate-800'
                  }`}>
                  {message.content}
                </div>

                {message.reference && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.05 + 0.5 }}
                    className="mt-4 pt-3 border-t border-slate-200"
                  >
                    <div className="flex items-start gap-2">
                      <BookOpen className="size-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="text-xs font-semibold text-slate-600 block mb-1">
                          {message.isAI ? 'Source Verses' : 'Reference'}
                        </span>
                        <span className="text-xs text-slate-500 font-mono">
                          {message.reference}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>

              {message.type === 'user' && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: index * 0.05 + 0.2, type: "spring", stiffness: 200 }}
                  className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg"
                >
                  <User className="size-5 text-white" />
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>

      {isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-4"
        >
          <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center shadow-lg">
            <BookOpen className="size-5 text-white" />
          </div>
          <div className="bg-white border border-slate-200 rounded-3xl rounded-tl-md shadow-md p-5">
            <div className="flex items-center gap-2 text-slate-500">
              <Loader2 className="size-4 animate-spin" />
              <span className="text-sm">Searching ancient wisdom...</span>
            </div>
          </div>
        </motion.div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}