
import { Message, ConversationSummary } from './types';

/**
 * Service to handle AI operations via Puter.js API
 */
export const puterService = {
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
      const response = await window.puter.ai.chat(prompt, { model: "gpt-5-nano" });
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
      const response = await window.puter.ai.chat(prompt, { model: "gpt-5-nano" });
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
  }
};
