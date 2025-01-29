import React from "react";
import { ModelSelector } from "./ModelSelector";

interface ChatInputProps {
  input: string;
  setInput: (input: string) => void;
  onSend: () => void;
  onCancel?: () => void;
  isLoading: boolean;
  models: string[];
  selectedModel: string;
  onModelSelect: (model: string) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  input,
  setInput,
  onSend,
  onCancel,
  isLoading,
  models,
  selectedModel,
  onModelSelect,
}) => {
  return (
    <div className="w-full bg-white rounded-lg shadow-md p-2">
      <div className="flex flex-col gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          placeholder="Type your message..."
          className="w-full p-2 border rounded-lg resize-none focus:outline-none focus:border-blue-500"
          rows={2}
          disabled={isLoading}
        />
        <div className="flex justify-between items-center gap-2">
          <ModelSelector
            models={models}
            selectedModel={selectedModel}
            onModelSelect={onModelSelect}
            disabled={isLoading}
          />
          <button
            onClick={isLoading ? onCancel : onSend}
            disabled={!input.trim() && !isLoading}
            className={`px-4 py-1.5 rounded-lg text-white font-medium ${
              !input.trim() && !isLoading
                ? "bg-gray-300 cursor-not-allowed"
                : isLoading
                ? "bg-red-500 hover:bg-red-600"
                : "bg-blue-500 hover:bg-blue-600"
            } transition-colors`}
          >
            {isLoading ? "Cancel" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
};
