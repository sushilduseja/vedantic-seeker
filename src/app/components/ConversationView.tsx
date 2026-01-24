import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, BookOpen, Loader2 } from 'lucide-react';

export interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  reference?: string;
  timestamp: Date;
}

interface ConversationViewProps {
  messages: Message[];
  isLoading: boolean;
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
        {messages.map((message, index) => (
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
              className={`max-w-[80%] ${
                message.type === 'user'
                  ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-3xl rounded-tr-md'
                  : 'bg-white border border-slate-200 rounded-3xl rounded-tl-md shadow-md'
              } p-5`}
            >
              <div className={`text-sm leading-relaxed ${
                message.type === 'user' ? 'text-white' : 'text-slate-800'
              }`}>
                {message.content}
              </div>
              
              {message.reference && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.05 + 0.5 }}
                  className="mt-3 pt-3 border-t border-slate-200 text-xs text-slate-500"
                >
                  <span className="font-medium">Reference:</span> {message.reference}
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
        ))}
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
