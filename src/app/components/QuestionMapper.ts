// Advanced semantic search for Srimad Bhagavatam knowledge base

export interface SearchResult {
  title: string;
  reference: string;
  description: string;
  excerpt: string;
  confidence: number;
  questionId: string;
}

interface BhagavatamData {
  metadata: {
    version: string;
    totalQuestions: number;
    totalCantos: number;
  };
  cantos: Array<{
    id: number;
    name: string;
    themes: string[];
  }>;
  questions: Array<{
    id: string;
    cantoId: number;
    question: string;
    answer: string;
    verseRefs: string[];
    themes: string[];
    keywords: string[];
    difficulty: string;
    popularity: number;
  }>;
  verses: Record<string, {
    text: string;
    translation: string;
    themes: string[];
  }>;
  synonyms: Record<string, string[]>;
  searchIndex: Record<string, {
    questionIds: string[];
    frequency: number;
    importance: number;
  }>;
}

const cachedData: Record<string, BhagavatamData | null> = {
  en: null,
  hi: null
};

async function loadData(lang: 'en' | 'hi' = 'en'): Promise<BhagavatamData> {
  if (cachedData[lang]) return cachedData[lang]!;

  const filename = lang === 'hi' ? '/data/srimad-bhagavatam-hi.json' : '/data/srimad-bhagavatam.json';

  try {
    const response = await fetch(filename);
    if (!response.ok) throw new Error(`Failed to load data for ${lang}`);
    
    const text = await response.text();
    console.log(`Fetched ${filename}, text length: ${text.length}, starts with: ${text.substring(0, 50)}`);
    
    let data;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      console.error(`JSON parse failed for ${filename}. Ends with:`, text.substring(Math.max(0, text.length - 100)));
      throw parseError;
    }
    
    cachedData[lang] = data;
    return cachedData[lang]!;
  } catch (error) {
    console.error(`Error loading Bhagavatam data (${lang}):`, error);
    // Fallback to English if Hindi fails to load
    if (lang === 'hi') {
      console.log('Falling back to English data load');
      return loadData('en');
    }
    throw error;
  }
}



function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-\u0900-\u097F]/g, ' ')
    .replace(/\s+/g, ' ');
}

function extractKeywords(query: string): string[] {
  const normalized = normalizeText(query);
  const words = normalized.split(' ');

  // Remove common stop words
  const stopWords = new Set([
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should',
    'could', 'can', 'may', 'might', 'must', 'what', 'when', 'where', 'who',
    'why', 'how', 'which', 'this', 'that', 'these', 'those', 'i', 'you',
    'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
    'my', 'your', 'his', 'its', 'our', 'their', 'about', 'to', 'from',
    'in', 'on', 'at', 'by', 'for', 'with', 'of'
  ]);

  return words.filter(word => word.length > 2 && !stopWords.has(word));
}

function expandSynonyms(keywords: string[], synonyms: Record<string, string[]>): Set<string> {
  const expanded = new Set(keywords);

  for (const keyword of keywords) {
    // Find synonyms for this keyword
    for (const [key, values] of Object.entries(synonyms)) {
      if (key === keyword || values.includes(keyword)) {
        expanded.add(key);
        values.forEach(v => expanded.add(v));
      }
    }
  }

  return expanded;
}

function calculateKeywordScore(
  query: string,
  question: BhagavatamData['questions'][0],
  expandedKeywords: Set<string>
): number {
  let score = 0;
  const queryNorm = normalizeText(query);
  const questionNorm = normalizeText(question.question);
  const answerNorm = normalizeText(question.answer);

  // Direct substring match (highest weight)
  if (questionNorm.includes(queryNorm)) {
    score += 100;
  }

  // Keyword matches in question keywords
  for (const keyword of question.keywords) {
    if (expandedKeywords.has(normalizeText(keyword))) {
      score += 15;
    }
  }

  // Keyword matches in question text
  for (const keyword of expandedKeywords) {
    if (questionNorm.includes(keyword)) {
      score += 10;
    }
    if (answerNorm.includes(keyword)) {
      score += 5;
    }
  }

  // Theme overlap
  for (const theme of question.themes) {
    if (expandedKeywords.has(normalizeText(theme))) {
      score += 12;
    }
  }

  return score;
}

function calculateSemanticSimilarity(
  query: string,
  question: BhagavatamData['questions'][0],
  expandedKeywords: Set<string>
): number {
  const queryWords = new Set(normalizeText(query).split(' '));
  const questionWords = new Set(normalizeText(question.question).split(' '));

  // Jaccard similarity
  const intersection = [...queryWords].filter(w => questionWords.has(w) || expandedKeywords.has(w));
  const union = new Set([...queryWords, ...questionWords]);

  const jaccard = intersection.length / union.size;

  // Bonus for question structure similarity
  const isQuestion = query.includes('?') ||
    query.match(/^(what|who|where|when|why|how)/i);
  const bonus = isQuestion ? 0.1 : 0;

  return (jaccard + bonus) * 100;
}

function calculateSearchIndexBoost(
  expandedKeywords: Set<string>,
  searchIndex: BhagavatamData['searchIndex'],
  questionId: string
): number {
  let boost = 0;

  for (const keyword of expandedKeywords) {
    const entry = searchIndex[keyword];
    if (entry && entry.questionIds.includes(questionId)) {
      boost += entry.importance * 10;
    }
  }

  return boost;
}

function scoreQuestion(
  query: string,
  question: BhagavatamData['questions'][0],
  expandedKeywords: Set<string>,
  searchIndex: BhagavatamData['searchIndex']
): number {
  const keywordScore = calculateKeywordScore(query, question, expandedKeywords);
  const semanticScore = calculateSemanticSimilarity(query, question, expandedKeywords);
  const indexBoost = calculateSearchIndexBoost(expandedKeywords, searchIndex, question.id);
  const popularityBoost = question.popularity / 10;

  // Weighted combination
  const totalScore =
    keywordScore * 0.35 +
    semanticScore * 0.40 +
    indexBoost * 0.15 +
    popularityBoost * 0.10;

  return totalScore;
}

function formatSearchResult(
  question: BhagavatamData['questions'][0],
  verses: BhagavatamData['verses'],
  score: number
): SearchResult {
  // Get verse translation for excerpt
  const verseRef = question.verseRefs[0];
  const verse = verses[verseRef];

  const excerpt = verse
    ? `${question.answer}\n\nVerse: "${verse.translation}" (${verseRef})`
    : question.answer;

  return {
    title: question.question,
    reference: verseRef || `Srimad Bhagavatam Canto ${question.cantoId}`,
    description: question.answer.replace(/\s*\(\s*SB\s*[\d.]+\s*\)\.?\s*$/i, ''),
    excerpt: excerpt,
    confidence: Math.min(100, Math.round(score)),
    questionId: question.id
  };
}

export async function findRelevantContent(query: string, lang: 'en' | 'hi' = 'en'): Promise<SearchResult[]> {
  if (!query || query.trim().length === 0) {
    return [];
  }

  try {
    const data = await loadData(lang);

    // Extract and expand keywords
    const keywords = extractKeywords(query);
    if (keywords.length === 0) {
      // Return popular foundational questions
      return data.questions
        .filter(q => q.difficulty === 'foundational' || q.difficulty === 'मूलभूत')
        .sort((a, b) => b.popularity - a.popularity)
        .slice(0, 5)
        .map(q => formatSearchResult(q, data.verses, 50));
    }

    const expandedKeywords = expandSynonyms(keywords, data.synonyms);

    // Score all questions
    const scoredQuestions = data.questions.map(question => ({
      question,
      score: scoreQuestion(query, question, expandedKeywords, data.searchIndex)
    }));

    // Sort by score and filter low scores
    const topResults = scoredQuestions
      .filter(sq => sq.score > 1) // Lower threshold to catch more results
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    // If no good matches
    if (topResults.length === 0) {
      // Try fallback to English only if in Hindi mode
      if (lang === 'hi') {
        try {
          // Load English data directly to avoid recursion
          const enData = await loadData('en');
          const enKeywords = extractKeywords(query);
          const enExpandedKeywords = expandSynonyms(enKeywords, enData.synonyms);
          const enScoredQuestions = enData.questions.map(question => ({
            question,
            score: scoreQuestion(query, question, enExpandedKeywords, enData.searchIndex)
          }));
          const enTopResults = enScoredQuestions
            .filter(sq => sq.score > 1)
            .sort((a, b) => b.score - a.score)
            .slice(0, 5);
          if (enTopResults.length > 0) {
            console.log('Using English fallback for Hindi query:', query);
            return enTopResults.map(({ question, score }) =>
              formatSearchResult(question, enData.verses, score)
            );
          }
        } catch (fallbackError) {
          console.error('Fallback to English data failed:', fallbackError);
        }
      }

      return data.questions
        .sort((a, b) => b.popularity - a.popularity)
        .slice(0, 5)
        .map(q => formatSearchResult(q, data.verses, 30));
    }

    return topResults.map(({ question, score }) =>
      formatSearchResult(question, data.verses, score)
    );

  } catch (error) {
    console.error('Search error:', error);
    // Return fallback results instead of empty array
    return [];
  }
}

// Legacy compatibility export
export interface MappedContent {
  title: string;
  reference: string;
  keywords: string[];
  description: string;
  excerpt: string;
}

export const contentDatabase: MappedContent[] = [];