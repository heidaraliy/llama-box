import React, { useState } from "react";
import { FileUpload } from "./FileUpload";

interface ServicesModalProps {
  onClose: () => void;
}

export const ServicesModal: React.FC<ServicesModalProps> = ({ onClose }) => {
  const [step, setStep] = useState<"upload" | "vectorize" | "complete">(
    "upload"
  );
  const [files, setFiles] = useState<string[]>([]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-[32rem] max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">RAG Builder</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-between mb-8">
          {["Upload", "Vectorize", "Complete"].map((s, i) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step === s.toLowerCase()
                    ? "bg-blue-500 text-white"
                    : step === "complete" && i < 2
                    ? "bg-green-500 text-white"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                {i + 1}
              </div>
              {i < 2 && <div className="w-24 h-1 bg-gray-200" />}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="mb-6">
          {step === "upload" && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Upload Documents</h3>
              <FileUpload
                onUploadComplete={(filename) => {
                  setFiles((prev) => [...prev, filename]);
                  setStep("vectorize");
                }}
              />
            </div>
          )}

          {step === "vectorize" && (
            <div>
              <h3 className="text-lg font-semibold mb-4">
                Vectorize Documents
              </h3>
              <p className="text-gray-600 mb-4">
                Ready to process {files.length} document(s). This will create
                embeddings for RAG.
              </p>
              <button
                onClick={() => setStep("complete")}
                className="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Start Vectorization
              </button>
            </div>
          )}

          {step === "complete" && (
            <div>
              <h3 className="text-lg font-semibold mb-4">
                RAG Created Successfully!
              </h3>
              <p className="text-gray-600 mb-4">
                Your documents have been processed and are ready to use. You can
                now select this RAG context in your conversation settings.
              </p>
              <button
                onClick={onClose}
                className="w-full py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
