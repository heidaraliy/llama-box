import React from "react";
import llamaBox from "../assets/llama-box.png";

interface Conversation {
  id: string;
  title: string;
  timestamp: Date;
  selected?: boolean;
}

interface ConversationListProps {
  conversations: Conversation[];
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  selectedId?: string;
  isConnected: boolean;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  onSelect,
  onNew,
  onDelete,
  selectedId,
  isConnected,
}) => {
  return (
    <div className="flex flex-col h-full bg-white rounded-xs shadow-md p-2">
      <div className="flex items-center justify-center">
        <img src={llamaBox} alt="llamaBox" className="w-72" />
      </div>
      <div className="flex items-center justify-center gap-2 mb-4">
        <div
          className={`w-2 h-2 rounded-full ${
            isConnected
              ? "bg-green-500 animate-pulse"
              : "bg-red-500 animate-ping"
          }`}
        />
        <span
          className={`text-sm ${
            isConnected ? "text-green-700" : "text-red-600"
          }`}
        >
          {isConnected ? "Connected to Ollama" : "Ollama Offline"}
        </span>
      </div>
      <hr className="border-1.5 border-gray-200 mb-4" />
      <button
        onClick={onNew}
        className="mb-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xs font-medium transition-colors"
      >
        New Chat
      </button>
      <div className="flex-grow overflow-y-auto">
        {conversations.map((conv) => (
          <div key={conv.id} className="relative group">
            <button
              onClick={() => onSelect(conv.id)}
              className={`w-full p-3 text-left rounded-lg mb-2 transition-colors ${
                conv.id === selectedId
                  ? "bg-blue-100 hover:bg-blue-200"
                  : "hover:bg-gray-100"
              }`}
            >
              <div className="font-medium truncate">{conv.title}</div>
              <div className="text-sm text-gray-500">
                {conv.timestamp.toLocaleDateString()}
              </div>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(conv.id);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-2 text-gray-500 hover:text-red-500 transition-opacity"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
