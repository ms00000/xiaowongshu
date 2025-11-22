export interface DictionaryResult {
  word: string;
  reading: string; // Kana
  romaji: string;
  definition_cn: string;
  definition_jp: string;
  example_jp: string;
  example_cn: string;
}

export interface WordHistoryItem {
  id: string;
  word: string;
  reading: string;
  definition: string;
  definition_jp: string;
  example_jp: string;
  example_cn: string;
  timestamp: number;
}

export interface DictionaryState {
  data: DictionaryResult | null;
  imageUrl: string | null;
  
  // Loading States
  isLoadingText: boolean;
  isLoadingImage: boolean;
  isLoadingAudioWord: boolean;
  isLoadingAudioSentence: boolean;
  isAnalyzingImage: boolean; // For OCR
  isGeneratingStory: boolean;

  error: string | null;
  
  // New Features
  history: WordHistoryItem[];
  dailyStory: string | null;
}

export interface UserProfile {
  name: string;
  email: string;
  photoURL?: string;
}

export enum ViewMode {
  SEARCH = 'SEARCH',
  WORDBOOK = 'WORDBOOK'
}

export enum SearchMode {
  JP_TO_CN = 'JP_TO_CN',
  CN_TO_JP = 'CN_TO_JP' // Implicitly handled by AI
}