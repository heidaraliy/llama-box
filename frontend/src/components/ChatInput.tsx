import React from "react";

interface ChatInputProps {
  input: string;
  setInput: (input: string) => void;
  onSend: () => void;
  onCancel?: () => void;
  isLoading: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  input,
  setInput,
  onSend,
  onCancel,
  isLoading,
}) => {
  return (
    <div className="w-full bg-white rounded-xs shadow-md p-2">
      <div className="flex flex-row gap-2">
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
          className="w-full p-2 border-2 rounded-xs resize-none focus:outline-none focus:border-blue-500 border-gray-400"
          rows={2}
          disabled={isLoading}
        />
        <div className="flex flex-row justify-between">
          <button
            onClick={isLoading ? onCancel : onSend}
            disabled={!input.trim() && !isLoading}
            className={`px-6 py-2 rounded-xs text-white font-medium ${
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
