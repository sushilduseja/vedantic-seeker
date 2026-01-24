export interface AIResponse {
  content: string;
  model: string;
  sourceVerses?: string[];
  error?: string;
}

interface CachedResponse {
  response: AIResponse;
  timestamp: number;
}

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const CACHE_DURATION = 1000 * 60 * 60;
const MAX_OUTPUT_TOKENS = 600;

const MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'llama-4-maverick-17b-128e-instruct-fp8',
  'openai/gpt-oss-120b-128k'
];

class GroqService {
  private cache: Map<string, CachedResponse> = new Map();
  private apiKey: string | null = null;
  private currentModelIndex = 0;

  setApiKey(key: string) {
    this.apiKey = key;
  }

  getApiKey(): string | null {
    return this.apiKey;
  }

  private hashQuestion(question: string, context?: string): string {
    return `${question}:${context || ''}`.toLowerCase().replace(/\s+/g, ' ').trim();
  }

  private getCached(hash: string): AIResponse | null {
    const cached = this.cache.get(hash);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.response;
    }
    if (cached) {
      this.cache.delete(hash);
    }
    return null;
  }

  private setCached(hash: string, response: AIResponse) {
    this.cache.set(hash, { response, timestamp: Date.now() });
  }

  private buildSystemPrompt(): string {
    return `You are a distinguished Vedantic scholar, well-versed in Srimad Bhagavatam and Bhagavad Gita.

RESPONSE STRUCTURE:
1. Open with a warm, respectful greeting
2. Present core teaching in 2-3 clear, elegant paragraphs
3. Connect teachings to practical life when relevant
4. Use precise spiritual terminology with clarity
5. Cite exact verse references when quoting
6. Close with gentle encouragement for the spiritual journey

GUIDELINES:
- Ground all answers firmly in provided scriptural verses
- Never speculate beyond given context
- Explain complex concepts with crystal clarity
- Maintain reverence while being accessible
- Keep responses focused and spiritually enriching (under 600 tokens)
- If context insufficient, acknowledge this gracefully
- Weave multiple teachings into coherent synthesis
- Emphasize timeless wisdom and practical application

Your voice should be wise, compassionate, and deeply rooted in authentic Vedantic tradition.`;
  }

  private buildUserPrompt(
    question: string,
    searchResults?: Array<{ description: string; reference: string }>,
    conversationContext?: Array<{ role: string; content: string }>
  ): string {
    let prompt = '';

    if (searchResults && searchResults.length > 0) {
      prompt += '═══ Sacred Teachings from Srimad Bhagavatam ═══\n\n';
      searchResults.forEach((result, idx) => {
        prompt += `【${result.reference}】\n${result.description}\n\n`;
      });
      prompt += '═══════════════════════════════════════\n\n';
    }

    if (conversationContext && conversationContext.length > 0) {
      prompt += '━━━ Previous Exchange ━━━\n\n';
      conversationContext.slice(-2).forEach(msg => {
        const label = msg.role === 'user' ? '🙏 Seeker' : '📿 Teacher';
        prompt += `${label}: ${msg.content}\n\n`;
      });
      prompt += '━━━━━━━━━━━━━━━━━━━━━━\n\n';
    }

    prompt += `🙏 Current Question:\n${question}\n\n`;

    if (searchResults && searchResults.length > 0) {
      prompt += '📿 Please synthesize these teachings into a clear, spiritually enriching response. Structure your answer with:\n';
      prompt += '1. A warm opening that acknowledges the depth of the question\n';
      prompt += '2. Core teachings woven together coherently (2-3 paragraphs)\n';
      prompt += '3. Practical guidance for spiritual practice when relevant\n';
      prompt += '4. Gentle closing encouragement\n\n';
      prompt += 'Always cite verse references when directly referencing teachings.';
    } else {
      prompt += '📿 Please offer wisdom on this spiritual question. If specific scriptural references would strengthen the answer, acknowledge this gracefully.';
    }

    return prompt;
  }

  async queryAI(
    question: string,
    searchResults?: Array<{ description: string; reference: string }>,
    conversationContext?: Array<{ role: string; content: string }>
  ): Promise<AIResponse> {
    if (!this.apiKey) {
      return {
        content: "AI synthesis requires configuration. The sacred teaching above provides authentic guidance from our curated knowledge base.",
        model: 'none',
        error: 'NO_API_KEY'
      };
    }

    const cacheKey = this.hashQuestion(question, searchResults?.[0]?.description);
    const cached = this.getCached(cacheKey);
    if (cached) {
      return cached;
    }

    let lastError: string = '';

    for (let attempt = 0; attempt < MODELS.length; attempt++) {
      const modelIndex = (this.currentModelIndex + attempt) % MODELS.length;
      const model = MODELS[modelIndex];

      try {
        const response = await fetch(GROQ_API_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: 'system',
                content: this.buildSystemPrompt()
              },
              {
                role: 'user',
                content: this.buildUserPrompt(question, searchResults, conversationContext)
              }
            ],
            max_tokens: MAX_OUTPUT_TOKENS,
            temperature: 0.7,
            top_p: 0.9,
            frequency_penalty: 0.3,
            presence_penalty: 0.2
          })
        });

        if (response.status === 429) {
          lastError = 'RATE_LIMIT';
          continue;
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          lastError = errorData.error?.message || `HTTP ${response.status}`;

          if (response.status === 400 || response.status === 404) {
            continue;
          }

          throw new Error(lastError);
        }

        const data = await response.json();
        const aiContent = data.choices?.[0]?.message?.content || '';

        if (!aiContent) {
          lastError = 'EMPTY_RESPONSE';
          continue;
        }

        const sourceVerses = searchResults?.map(r => r.reference) || [];

        const aiResponse: AIResponse = {
          content: aiContent,
          model,
          sourceVerses
        };

        this.currentModelIndex = modelIndex;
        this.setCached(cacheKey, aiResponse);

        return aiResponse;

      } catch (error: any) {
        lastError = error.message || 'UNKNOWN_ERROR';
        console.error(`AI synthesis error with model ${model}:`, error);
        continue;
      }
    }

    return {
      content: this.getErrorMessage(lastError),
      model: 'none',
      error: lastError
    };
  }

  private getErrorMessage(errorType: string): string {
    switch (errorType) {
      case 'RATE_LIMIT':
        return "The AI is experiencing high demand. The sacred teaching above offers authentic wisdom. Please try AI synthesis again in a moment.";
      case 'NO_API_KEY':
        return "AI synthesis is not configured. The response above provides authentic wisdom from Srimad Bhagavatam.";
      case 'EMPTY_RESPONSE':
        return "I apologize for the difficulty. The scriptural teaching above offers valuable guidance for your spiritual journey.";
      default:
        return "I encountered a temporary challenge accessing deeper synthesis. The sacred teaching above provides authentic wisdom.";
    }
  }

  clearCache() {
    this.cache.clear();
  }
}

export const groqService = new GroqService();
