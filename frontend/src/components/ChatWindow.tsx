import React, { useEffect, useRef } from "react";
import { ChatMessage } from "./ChatMessage";
import { Message } from "../types";
import { ModelSelector } from "./ModelSelector";

interface ChatWindowProps {
  messages: Message[];
  isLoading: boolean;
  models: string[];
  selectedModel: string;
  onModelSelect: (model: string) => void;
  currentTitle?: string;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  messages,
  isLoading,
  models,
  selectedModel,
  onModelSelect,
  currentTitle,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex-grow bg-white shadow-lg rounded-xs p-4 mb-4 overflow-y-auto">
      <div className="flex flex-row justify-between">
        <div className="content-center text-2xl font-bold text-gray-800 max-w-[60%]">
          <div className="line-clamp-2 break-words">{currentTitle}</div>
        </div>
        <div className="gap-1">
          <div className="text-xs text-gray-500 mb-1">Model</div>
          <ModelSelector
            models={models}
            selectedModel={selectedModel}
            onModelSelect={onModelSelect}
            disabled={isLoading}
          />
        </div>
      </div>
      <hr className="my-4 text-gray-300" />
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
