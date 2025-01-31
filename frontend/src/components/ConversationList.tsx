import React, { useState } from "react";
import llamaBox from "../assets/llama-box.png";
import { Conversation, ConversationSettings } from "../types";

interface ConversationListProps {
  conversations: Conversation[];
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onUpdateTitle: (id: string, newTitle: string) => void;
  onUpdateSettings: (id: string, settings: ConversationSettings) => void;
  selectedId?: string;
  isConnected: boolean;
  models: string[];
}

interface SettingsModalProps {
  settings: ConversationSettings;
  onSave: (settings: ConversationSettings) => void;
  onClose: () => void;
  models: string[];
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onSave,
  onClose,
  models,
}) => {
  const [rolePrompt, setRolePrompt] = useState(settings.rolePrompt);
  const [temperature, setTemperature] = useState(settings.temperature);
  const [model, setModel] = useState(settings.model || "");
  const [maxTokens, setMaxTokens] = useState(settings.maxTokens || 2048);
  const [topP, setTopP] = useState(settings.topP || 0.9);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 max-h-[80vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4 top-0 bg-white pt-1">
          Conversation Settings
        </h2>
        <hr className="border-1.5 border-gray-200 mb-4" />
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Role Prompt</label>
          <textarea
            className="w-full p-2 border rounded"
            value={rolePrompt}
            onChange={(e) => setRolePrompt(e.target.value)}
            rows={3}
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Model</label>
          <select
            className="w-full p-2 border rounded"
            value={model}
            onChange={(e) => setModel(e.target.value)}
          >
            <option value="">Use Global Selection</option>
            {models.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">
            Temperature: {temperature}
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={temperature}
            onChange={(e) => setTemperature(Number(e.target.value))}
            className="w-full"
          />
          <p className="text-xs text-gray-500 mt-1">
            Lower values make responses more focused, while higher values make
            responses more creative.
          </p>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">
            Max Tokens: {maxTokens}
          </label>
          <input
            type="range"
            min="256"
            max="128000"
            step="256"
            value={maxTokens}
            onChange={(e) => setMaxTokens(Number(e.target.value))}
            className="w-full"
          />
          <p className="text-xs text-gray-500 mt-1">
            Controls the maximum length of the response.
          </p>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">
            Top P: {topP}
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={topP}
            onChange={(e) => setTopP(Number(e.target.value))}
            className="w-full"
          />
          <p className="text-xs text-gray-500 mt-1">
            Controls the diversity of a model's responses.
          </p>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onSave({
                rolePrompt,
                temperature,
                model: model || undefined,
                maxTokens,
                topP,
              });
              onClose();
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  onSelect,
  onNew,
  onDelete,
  onUpdateTitle,
  onUpdateSettings,
  selectedId,
  isConnected,
  models,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [settingsId, setSettingsId] = useState<string | null>(null);

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
              <div className="font-medium truncate">
                {editingId === conv.id ? (
                  <input
                    autoFocus
                    className="w-full px-2 py-1 rounded border"
                    value={conv.title}
                    onChange={(e) => onUpdateTitle(conv.id, e.target.value)}
                    onBlur={() => setEditingId(null)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        setEditingId(null);
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  conv.title
                )}
              </div>
              <div className="text-sm text-gray-500">
                {conv.timestamp.toLocaleDateString()}
              </div>
            </button>

            {/* Action buttons */}
            <div className="absolute right-2 -bottom-2 -translate-y-1/2 opacity-0 group-hover:opacity-100 flex items-center space-x-1">
              {/* Settings (gear) icon */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSettingsId(conv.id);
                }}
                className="p-2 text-gray-500 hover:text-blue-500 transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              {/* Edit (pencil) icon */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingId(conv.id);
                }}
                className="p-2 text-gray-500 hover:text-blue-500 transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                </svg>
              </button>

              {/* Existing delete button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(conv.id);
                }}
                className="p-2 text-gray-500 hover:text-red-500 transition-colors"
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
          </div>
        ))}
      </div>

      {/* Settings Modal */}
      {settingsId && (
        <SettingsModal
          settings={
            conversations.find((c) => c.id === settingsId)?.settings || {
              rolePrompt: "",
              temperature: 0.7,
            }
          }
          models={models}
          onSave={(newSettings) => {
            onUpdateSettings(settingsId, newSettings);
            setSettingsId(null);
          }}
          onClose={() => setSettingsId(null)}
        />
      )}
    </div>
  );
};
