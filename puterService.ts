
import { Message, ConversationSummary } from './types';

/**
 * Service to handle AI operations via Puter.js API
 */
export const puterService = {
  /**
   * Authentication methods
   */
  async signIn() {
    return await window.puter.auth.signIn();
  },

  async signOut() {
    return await window.puter.auth.signOut();
  },

  async getUser() {
    return await window.puter.auth.getUser();
  },

  async isSignedIn() {
    return window.puter.auth.isSignedIn();
  },

  /**
   * Cloud Storage (KV Store) for persistence
   */
  async saveConversations(messages: Message[]) {
    try {
      await window.puter.kv.set('medbridge_history', JSON.stringify(messages));
    } catch (error) {
      console.error('Save error:', error);
    }
  },

  async loadConversations(): Promise<Message[]> {
    try {
      const data = await window.puter.kv.get('medbridge_history');
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Load error:', error);
      return [];
    }
  },

  /**
   * Translates text between two languages using Puter.js AI
   */
  async translate(text: string, from: string, to: string, fromName: string, toName: string): Promise<string> {
    if (!text || from === to) return text;

    const prompt = `Act as a professional medical interpreter. Translate the following healthcare-related message from ${fromName} to ${toName}. 
    The source text is in ${fromName}. The result must be in ${toName}.
    Ensure medical terminology (symptoms, body parts, dosage) remains highly accurate. 
    Only return the translated text without any preamble or quotes.
    
    Message: "${text}"`;

    try {
      const response = await window.puter.ai.chat(prompt, { model: "gpt-4o" });
      return typeof response === 'string' ? response.trim() : response.toString().trim();
    } catch (error) {
      console.error('Translation error:', error);
      return text;
    }
  },

  /**
   * Generates a medical summary of the conversation
   */
  async summarize(messages: Message[]): Promise<ConversationSummary> {
    if (messages.length === 0) {
      throw new Error("No messages to summarize");
    }

    const convoText = messages
      .map(m => `[${m.senderRole.toUpperCase()}]: ${m.originalText}`)
      .join('\n');

    const prompt = `Task: Summarize the following doctor-patient consultation.
    Return ONLY a valid JSON object with the following structure:
    {
      "symptoms": ["list of symptoms"],
      "diagnoses": ["potential diagnoses"],
      "medications": ["medications and dosages"],
      "followUp": ["next steps"],
      "overallSummary": "concise clinical summary"
    }

    Consultation History:
    ${convoText}`;

    try {
      const response = await window.puter.ai.chat(prompt, { model: "gpt-4o" });
      const jsonStr = (typeof response === 'string' ? response : response.toString()).trim();

      // Attempt to extract JSON if there's any surrounding text
      const match = jsonStr.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("Empty or invalid response from AI");

      return JSON.parse(match[0]);
    } catch (error) {
      console.error('Summarization error:', error);
      return {
        symptoms: ["Analysis failed"],
        diagnoses: ["Could not process"],
        medications: ["Not extracted"],
        followUp: ["Consult doctor"],
        overallSummary: "AI summarization failed. Please review chat history."
      };
    }
  },

  /**
   * Transcribes audio file to text
   */
  async speech2txt(file: File | Blob): Promise<string> {
    try {
      const response = await window.puter.ai.speech2txt(file);
      return response.text || response;
    } catch (error) {
      console.error('Speech to text error:', error);
      return "";
    }
  },

  /**
   * Analyzes an uploaded document or simulated file text
   */
  async summarizeDocument(fileName: string, content: string): Promise<string> {
    try {
      const prompt = `Act as an expert medical analyst. A patient has uploaded a document named "${fileName}".
      Here is the extracted content of the document: 
      "${content}"

      Please provide a concise, professional clinical summary of this document. Focus on key medical findings, diagnoses, medications, or lab results. Keep it brief and well-formatted for the doctor.`;
      
      const response = await window.puter.ai.chat(prompt, { model: 'gpt-4o' });
      return response?.message?.content || response?.text || String(response);
    } catch (error) {
      console.error('Document summarization error:', error);
      return `Failed to summarize document ${fileName}. Please review it manually.`;
    }
  }
};
