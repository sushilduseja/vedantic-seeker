export interface AIResponse {
  content: string;
  model: string;
  sourceVerses?: string[];
  error?: string;
}

export type Language = 'en' | 'hi';

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

  private hashQuestion(question: string, context?: string, lang?: string): string {
    return `${lang || 'en'}:${question}:${context || ''}`.toLowerCase().replace(/\s+/g, ' ').trim();
  }

  private detectLanguage(text: string): Language {
    return /[\u0900-\u097F]/.test(text) ? 'hi' : 'en';
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

  private buildSystemPrompt(lang: Language = 'en'): string {
    if (lang === 'hi') {
      return `आप एक प्रतिष्ठित वैदांतिक विद्वान हैं। श्रीमद्भागवतम् से शिक्षाओं का संश्लेषण करें।

महत्वपूर्ण नियम:
- सभी प्रमुख अंतर्दृष्टि के लिए बुलेट पॉइंट (•) का उपयोग करें
- प्रति उत्तर अधिकतम 5-7 बुलेट
- प्रत्येक बुलेट: एक स्पष्ट विचार (8-15 शब्द)
- श्लोक संदर्भ कोष्ठक में: (SB 1.2.10)
- गुणात्मक गहराई, मात्रा नहीं

संरचना:
प्रारंभ: एक गहन कथन (10-15 शब्द)
मुख्य बुलेट: 3-5 आवश्यक अंतर्दृष्टि
समापन: एक व्यावहारिक मार्गदर्शन

सटीक रहें। गहन रहें। संक्षिप्त रहें।`;
    }

    return `You are a distinguished Vedantic scholar. Synthesize teachings with precision.

CRITICAL FORMATTING:
- Use bullet points (•) for ALL insights
- Max 5-7 bullets per response
- Each bullet: 1 clear thought (8-15 words)
- Cite verses in parentheses: (SB 1.2.10)
- Qualitative depth over quantity

STRUCTURE:
Opening: One profound statement (10-15 words)
Core Bullets: 3-5 essential insights
Closing: One actionable guidance

Be precise. Be profound. Be concise.`;
  }

  private buildNamesSystemPrompt(lang: Language = 'en'): string {
    if (lang === 'hi') {
      return `आप एक संस्कृत विद्वान और भक्त हैं। विष्णु के दिव्य नामों के गहन आध्यात्मिक महत्व को श्रद्धा और गहराई से समझाएं।

महत्वपूर्ण नियम:
- सभी अंतर्दृष्टि के लिए बुलेट पॉइंट (•) का उपयोग करें
- प्रति उत्तर अधिकतम 5-7 बुलेट
- प्रत्येक बुलेट: एक स्पष्ट विचार (8-15 शब्द)
- शास्त्र संदर्भ कोष्ठक में

संरचना:
• धार्मिक अर्थ (विष्णु के स्वभाव से संबंध)
• व्यावहारिक महत्व (यह गुण कैसे प्रकट होता है)
• भक्ति संदर्भ (भक्ति में भूमिका)

श्रद्धापूर्ण, गहन और संक्षिप्त रहें।`;
    }

    return `You are a Sanskrit scholar and devoted bhakta. Explain the profound spiritual significance of Vishnu's divine names with reverence and depth.

CRITICAL FORMATTING:
- Use bullet points (•) for ALL insights
- Max 5-7 bullets per response
- Each bullet: 1 clear thought (8-15 words)
- Cite scriptural sources in parentheses

STRUCTURE:
• Theological meaning (connection to Vishnu's nature)
• Practical significance (how this quality manifests)
• Devotional context (role in bhakti)

Be reverent. Be profound. Be concise.`;
  }

  private buildUserPrompt(
    question: string,
    searchResults?: Array<{ description: string; reference: string }>,
    conversationContext?: Array<{ role: string; content: string }>,
    lang: Language = 'en'
  ): string {
    let prompt = '【 Sacred Teachings 】\n\n';

    searchResults?.forEach((r, i) =>
      prompt += `${i + 1}. [${r.reference}]\n${r.description}\n\n`
    );

    if (conversationContext?.length) {
      prompt += '\n【 Context 】\n';
      conversationContext.slice(-2).forEach(m =>
        prompt += `${m.role === 'user' ? 'Q' : 'A'}: ${m.content.slice(0, 100)}...\n`
      );
    }

    prompt += `\n【 Question 】\n${question}\n\n`;
    prompt += 'Synthesize into 5-7 bullets. Be profound and precise.';

    if (lang === 'hi') {
      prompt += '\n\n【अति महत्वपूर्ण】\nसंपूर्ण उत्तर हिंदी में दें। अंग्रेजी शिक्षाओं को हिंदी में अनुवाद करें। श्लोक संदर्भ (SB X.Y.Z) वैसे ही रखें। बुलेट पॉइंट • का उपयोग करें।';
    }

    return prompt;
  }

  async queryAI(
    question: string,
    searchResults?: Array<{ description: string; reference: string }>,
    conversationContext?: Array<{ role: string; content: string }>,
    langOverride?: Language
  ): Promise<AIResponse> {
    if (!this.apiKey) {
      return {
        content: 'AI synthesis requires configuration.',
        model: 'none',
        error: 'NO_API_KEY'
      };
    }

    const lang = langOverride || this.detectLanguage(question);
    const cacheKey = this.hashQuestion(question, searchResults?.[0]?.description, lang);
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
                content: this.buildSystemPrompt(lang)
              },
              {
                role: 'user',
                content: this.buildUserPrompt(question, searchResults, conversationContext, lang)
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

  async queryNameAI(
    nameData: {
      sanskrit: string;
      transliteration: string;
      translation: string;
      meaning: string;
      etymology: string;
      benefits: string;
    },
    lang: Language = 'en'
  ): Promise<AIResponse> {
    if (!this.apiKey) {
      return {
        content: 'AI synthesis requires configuration.',
        model: 'none',
        error: 'NO_API_KEY'
      };
    }

    const cacheKey = this.hashQuestion(nameData.transliteration, nameData.meaning, lang);
    const cached = this.getCached(cacheKey);
    if (cached) {
      return cached;
    }

    const userPrompt = `【 Divine Name 】
Sanskrit: ${nameData.sanskrit}
Transliteration: ${nameData.transliteration}
Translation: ${nameData.translation}
Meaning: ${nameData.meaning}
Etymology: ${nameData.etymology}
Benefits: ${nameData.benefits}

Provide a deeper spiritual understanding of this divine name. Explain its theological significance, how devotees can meditate on this quality, and its role in bhakti. Be reverent and profound.${lang === 'hi' ? '\n\n【अति महत्वपूर्ण】\nसंपूर्ण उत्तर हिंदी में दें।' : ''
      }`;

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
                content: this.buildNamesSystemPrompt(lang)
              },
              {
                role: 'user',
                content: userPrompt
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

        const aiResponse: AIResponse = {
          content: aiContent,
          model,
          sourceVerses: []
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

  clearCache() {
    this.cache.clear();
  }
  async translateText(text: string, targetLang: 'hi' | 'en'): Promise<string> {
    // Simple cache for translations
    const cacheKey = `trans:${targetLang}:${text.slice(0, 50)}`;
    const cached = this.getCached(cacheKey);
    if (cached) return cached.content;

    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
      const response = await fetch(url);

      if (!response.ok) return text;

      const data = await response.json();
      // Google Translate returns structure: [[["Translated", "Original", ...], ...], ...]
      const translation = data[0].map((item: any) => item[0]).join('');

      this.setCached(cacheKey, {
        content: translation,
        model: 'google-gtx',
        sourceVerses: []
      });

      return translation;
    } catch (e) {
      console.error('Translation error:', e);
      return text;
    }
  }
}

export const groqService = new GroqService();
