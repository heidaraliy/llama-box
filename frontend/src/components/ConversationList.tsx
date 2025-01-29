import React from "react";

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
  selectedId?: string;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  onSelect,
  onNew,
  selectedId,
}) => {
  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-md p-2">
      <button
        onClick={onNew}
        className="mb-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
      >
        New Chat
      </button>
      <div className="flex-grow overflow-y-auto">
        {conversations.map((conv) => (
          <button
            key={conv.id}
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
        ))}
      </div>
    </div>
  );
};
