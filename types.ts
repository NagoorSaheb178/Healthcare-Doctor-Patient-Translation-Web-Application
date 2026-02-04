
export type Role = 'doctor' | 'patient';

export interface Language {
  code: string;
  name: string;
}

export interface Message {
  id: string;
  senderRole: Role;
  originalText: string;
  translatedText?: string;
  audioUrl?: string;
  timestamp: number;
  sourceLang: string;
  targetLang: string;
}

export interface ConversationSummary {
  symptoms: string[];
  diagnoses: string[];
  medications: string[];
  followUp: string[];
  overallSummary: string;
}

// Global Puter type definition
declare global {
  interface Window {
    puter: any;
  }
}
