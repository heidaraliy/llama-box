import React, { useState, useEffect } from "react";
import { ChatWindow } from "./components/ChatWindow";
import { ChatInput } from "./components/ChatInput";
import { Conversation, Message } from "./types";
import { ConversationList } from "./components/ConversationList";

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState("llama3.2:latest");
  const [abortController, setAbortController] =
    useState<AbortController | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<string | null>(
    null
  );

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await fetch("http://localhost:3001/models");
        const data = await response.json();
        setModels(data.models);
        if (data.models.length > 0) {
          setSelectedModel(data.models[0]);
        }
      } catch (error) {
        console.error("Error fetching models:", error);
      }
    };

    fetchModels();
  }, []);

  const handleCancel = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const controller = new AbortController();
    setAbortController(controller);
    setIsLoading(true);
    setMessages((prev) => [...prev, { role: "user", content: input }]);
    const userInput = input;
    setInput("");

    try {
      const response = await fetch("http://localhost:3001/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: userInput,
          context: "",
          modelName: selectedModel,
        }),
        signal: controller.signal,
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      const currentMessage = {
        role: "assistant" as const,
        content: "",
        thinking: "",
      };

      setMessages((prev) => [...prev, currentMessage]);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter(Boolean);

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(5);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);

              setMessages((prev) => {
                const newMessages = [...prev];
                const lastMessage = newMessages[newMessages.length - 1];

                if (parsed.type === "thinking") {
                  lastMessage.thinking = parsed.buffer;
                } else {
                  lastMessage.content = parsed.buffer;
                }

                return newMessages;
              });
            } catch (e) {
              console.error("Error parsing chunk:", e);
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        console.log("Request cancelled");
        return;
      }
      console.error("Error details:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Error: ${err instanceof Error ? err.message : String(err)}`,
        },
      ]);
    } finally {
      setIsLoading(false);
      setAbortController(null);
    }
  };

  const handleNewChat = () => {
    const newId = Date.now().toString();
    const newConv = {
      id: newId,
      title: "New Chat",
      timestamp: new Date(),
    };
    setConversations((prev) => [newConv, ...prev]);
    setCurrentConversation(newId);
    setMessages([]);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <div className="flex-grow flex overflow-hidden p-4 gap-4">
        <div className="w-1/3 max-w-sm overflow-hidden">
          <ConversationList
            conversations={conversations}
            onSelect={setCurrentConversation}
            onNew={handleNewChat}
            selectedId={currentConversation ?? undefined}
          />
        </div>
        <div className="flex-1 flex flex-col overflow-hidden">
          <h1 className="text-2xl font-bold mb-4">Llama-Box Chat</h1>
          <div className="flex flex-col flex-grow overflow-hidden">
            <ChatWindow messages={messages} isLoading={isLoading} />
            <ChatInput
              input={input}
              setInput={setInput}
              onSend={sendMessage}
              onCancel={handleCancel}
              isLoading={isLoading}
              models={models}
              selectedModel={selectedModel}
              onModelSelect={setSelectedModel}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
