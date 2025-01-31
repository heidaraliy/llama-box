export interface ConversationSettings {
  rolePrompt: string;
  temperature: number;
  model?: string; // Optional, falls back to global selection if not set
  maxTokens?: number; // Optional limit on response length
  topP?: number; // Optional nucleus sampling parameter
}

export interface Message {
  role: "user" | "assistant";
  content: string;
  thinking?: string;
}

export interface Conversation {
  id: string;
  title: string;
  timestamp: Date;
  messages: Message[];
  settings: ConversationSettings;
}
