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
}
