import React, { useState, useEffect } from "react";
import { ChatWindow } from "./components/ChatWindow";
import { ChatInput } from "./components/ChatInput";
import { Conversation, Message } from "./types";
import { ConversationList } from "./components/ConversationList";
import { db } from "./services/db";

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
  const [isConnected, setIsConnected] = useState(false);

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

  // Load conversations from IndexedDB on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const savedConversations = await db.getAllConversations();
        setConversations(savedConversations);

        const currentId = await db.getCurrentConversation();
        if (currentId) {
          setCurrentConversation(currentId);
          const currentConv = savedConversations.find(
            (c) => c.id === currentId
          );
          if (currentConv) {
            setMessages(currentConv.messages);
          }
        }
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };

    loadData();
  }, []);

  // Save conversation whenever it changes
  useEffect(() => {
    const saveData = async () => {
      try {
        for (const conversation of conversations) {
          await db.saveConversation(conversation);
        }
      } catch (error) {
        console.error("Error saving conversations:", error);
      }
    };

    saveData();
  }, [conversations]);

  // Save current conversation ID whenever it changes
  useEffect(() => {
    db.setCurrentConversation(currentConversation).catch((error) => {
      console.error("Error saving current conversation:", error);
    });
  }, [currentConversation]);

  const handleCancel = async () => {
    if (abortController) {
      // First abort the frontend request
      abortController.abort();
      setAbortController(null);
      setIsLoading(false);

      try {
        // Then tell the backend to cancel
        await fetch("http://localhost:3001/cancel", {
          method: "POST",
        });
      } catch (error) {
        console.error("Error cancelling request:", error);
      }
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    // Create a new conversation if none exists
    if (!currentConversation) {
      const newId = Date.now().toString();
      const newConv = {
        id: newId,
        title: input.trim().slice(0, 30) + (input.length > 30 ? "..." : ""),
        timestamp: new Date(),
        messages: [],
      };
      await db.saveConversation(newConv); // Save immediately
      setConversations((prev) => [newConv, ...prev]);
      setCurrentConversation(newId);
    }

    const userMessage = { role: "user" as const, content: input };

    // Update messages state
    setMessages((prev) => [...prev, userMessage]);

    // Update conversation in database
    const updatedConversation = conversations.find(
      (c) => c.id === currentConversation
    );
    if (updatedConversation) {
      const newConversation = {
        ...updatedConversation,
        messages: [...updatedConversation.messages, userMessage],
      };
      await db.saveConversation(newConversation);

      // Update conversations state
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === currentConversation ? newConversation : conv
        )
      );
    }

    const controller = new AbortController();
    setAbortController(controller);
    setIsLoading(true);

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

      // Update conversation messages as the response comes in
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

                // Update conversation in database
                const currentConv = conversations.find(
                  (c) => c.id === currentConversation
                );
                if (currentConv) {
                  const updatedConv = {
                    ...currentConv,
                    messages: newMessages,
                  };
                  db.saveConversation(updatedConv).catch(console.error);

                  // Update conversations state
                  setConversations((convs) =>
                    convs.map((conv) =>
                      conv.id === currentConversation ? updatedConv : conv
                    )
                  );
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

  // Update conversation selection to load messages
  const handleSelectConversation = async (id: string) => {
    try {
      const conversation = conversations.find((conv) => conv.id === id);
      if (conversation) {
        console.log("Loading conversation:", conversation);
        setCurrentConversation(id);
        setMessages(conversation.messages || []);
        await db.setCurrentConversation(id);
      }
    } catch (error) {
      console.error("Error selecting conversation:", error);
    }
  };

  const handleNewChat = () => {
    const newId = Date.now().toString();
    const newConv = {
      id: newId,
      title: "New Chat",
      timestamp: new Date(),
      messages: [],
    };
    setConversations((prev) => [newConv, ...prev]);
    setCurrentConversation(newId);
    setMessages([]);
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      // If we're deleting the current conversation, clear it
      if (id === currentConversation) {
        setCurrentConversation(null);
        setMessages([]);
      }

      // Remove from IndexedDB
      await db.deleteConversation(id);

      // Update state
      setConversations((prev) => prev.filter((conv) => conv.id !== id));
    } catch (error) {
      console.error("Error deleting conversation:", error);
    }
  };

  const checkConnection = async () => {
    try {
      const response = await fetch("http://localhost:3001/health");
      setIsConnected(response.ok);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      setIsConnected(false);
    }
  };

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-[#c8cbfe] tracking-tighter">
      <div className="flex-grow flex overflow-hidden p-4 gap-4">
        <div className="w-1/3 max-w-sm overflow-hidden">
          <ConversationList
            conversations={conversations}
            onSelect={handleSelectConversation}
            onNew={handleNewChat}
            onDelete={handleDeleteConversation}
            selectedId={currentConversation ?? undefined}
            isConnected={isConnected}
          />
        </div>
        <div className="flex-1 flex flex-col overflow-hidden">
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
