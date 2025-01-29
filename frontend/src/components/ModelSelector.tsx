import React from "react";

interface ModelSelectorProps {
  models: string[];
  selectedModel: string;
  onModelSelect: (model: string) => void;
  disabled?: boolean;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  models,
  selectedModel,
  onModelSelect,
  disabled,
}) => {
  return (
    <select
      value={selectedModel}
      onChange={(e) => onModelSelect(e.target.value)}
      disabled={disabled}
      className={`px-3 py-2 border rounded-lg text-sm ${
        disabled
          ? "bg-gray-100 cursor-not-allowed"
          : "bg-white hover:border-blue-500"
      }`}
    >
      {models.map((model) => (
        <option key={model} value={model}>
          {model}
        </option>
      ))}
    </select>
  );
};
