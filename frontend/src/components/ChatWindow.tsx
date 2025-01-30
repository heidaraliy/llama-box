import React, { useEffect, useRef } from "react";
import { ChatMessage } from "./ChatMessage";
import { Message } from "../types";

interface ChatWindowProps {
  messages: Message[];
  isLoading: boolean;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  messages,
  isLoading,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex-grow bg-white shadow-lg rounded-xs p-4 mb-4 overflow-y-auto">
      {messages.map((msg, idx) => (
        <ChatMessage
          key={idx}
          role={msg.role}
          content={msg.content}
          thinking={msg.thinking}
        />
      ))}
      {isLoading && (
        <div className="flex items-center justify-center space-x-2 text-gray-500">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};
