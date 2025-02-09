import React, { useState, useEffect } from "react";
import { ChatWindow } from "./components/ChatWindow";
import { ChatInput } from "./components/ChatInput";
import { Conversation, Message, ConversationSettings } from "./types";
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
  const [currentTitle, setCurrentTitle] = useState<string>("");

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

  // Load default model on mount
  useEffect(() => {
    const loadDefaultModel = async () => {
      try {
        const settings = await db.getGlobalSettings();
        setSelectedModel(settings.defaultModel);
      } catch (error) {
        console.error("Error loading default model:", error);
      }
    };

    // Create an event listener for storage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "llama-box-model-change") {
        loadDefaultModel();
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

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

  const generateTitle = async (message: string, model: string) => {
    try {
      const response = await fetch("http://localhost:3001/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt:
            "Generate a very brief (3-5 words) title for a conversation that starts with this message. Respond with ONLY the title, no quotes or extra text, and make sure that you ABIDE BY THE THREE - FIVE WORD LIMIT AT ALL COSTS! IF YOU FAIL TO DO THIS, YOU DIE. Here's the message: " +
            message,
          modelName: model,
          context:
            "You generate succinct, yet elegant and descriptive titles for conversations.",
          temperature: 0,
        }),
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let responseBuffer = "";

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
              if (parsed.type === "response") {
                // Instead of concatenating, always use the full buffer
                responseBuffer = parsed.buffer;
              }
            } catch (e) {
              console.error("Error parsing chunk:", e);
            }
          }
        }
      }

      // Clean up the title - remove any markdown formatting or extra whitespace
      const cleanTitle = responseBuffer
        .replace(/^[#\s*_~`]+|[#\s*_~`]+$/g, "") // Remove markdown characters from start/end
        .replace(/\n/g, " ") // Replace newlines with spaces
        .trim();

      return (
        cleanTitle || message.slice(0, 30) + (message.length > 30 ? "..." : "")
      );
    } catch (error) {
      console.error("Error generating title:", error);
      return message.slice(0, 30) + (message.length > 30 ? "..." : "");
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = { role: "user" as const, content: input };

    // Create a new conversation if none exists
    if (!currentConversation) {
      const newId = Date.now().toString();
      const newConv = {
        id: newId,
        title: input.trim().slice(0, 30) + (input.length > 30 ? "..." : ""),
        timestamp: new Date(),
        messages: [userMessage], // Include the first message
        settings: {
          rolePrompt: "",
          temperature: 0.7,
          model: selectedModel,
        },
      };
      await db.saveConversation(newConv); // Save immediately
      setConversations((prev) => [newConv, ...prev]);
      setCurrentConversation(newId);
      setMessages([userMessage]);

      // Generate title after conversation is created
      generateTitle(input, selectedModel).then((generatedTitle) => {
        if (generatedTitle) {
          const updatedConv = {
            ...newConv,
            title: generatedTitle,
          };
          setConversations((prev) =>
            prev.map((conv) => (conv.id === newId ? updatedConv : conv))
          );
          db.saveConversation(updatedConv).catch(console.error);
        }
      });
    } else {
      // Update messages state
      setMessages((prev) => [...prev, userMessage]);

      // Update conversation in database
      const currentConv = conversations.find(
        (c) => c.id === currentConversation
      );
      if (currentConv) {
        const updatedConv = {
          ...currentConv,
          messages: [...currentConv.messages, userMessage],
        };
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === currentConversation ? updatedConv : conv
          )
        );
        await db.saveConversation(updatedConv);

        // Generate title after message update if needed
        if (currentConv.title === "New Chat") {
          generateTitle(
            input,
            currentConv.settings.model || selectedModel
          ).then((generatedTitle) => {
            if (generatedTitle) {
              const withNewTitle = {
                ...updatedConv,
                title: generatedTitle,
              };
              setConversations((prev) =>
                prev.map((conv) =>
                  conv.id === currentConversation ? withNewTitle : conv
                )
              );
              db.saveConversation(withNewTitle).catch(console.error);
            }
          });
        }
      }
    }

    const controller = new AbortController();
    setAbortController(controller);
    setIsLoading(true);

    const userInput = input;
    setInput("");

    try {
      const currentConv = conversations.find(
        (c) => c.id === currentConversation
      );
      const response = await fetch("http://localhost:3001/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: userInput,
          context: currentConv?.settings?.rolePrompt || "",
          modelName: currentConv?.settings?.model || selectedModel,
          temperature: currentConv?.settings?.temperature || 0.7,
          maxTokens: currentConv?.settings?.maxTokens || 2048,
          topP: currentConv?.settings?.topP || 0.9,
          previousMessages: currentConv?.messages || [],
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
                    settings: currentConv.settings,
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

      // Now that the message response is complete, generate title if needed
      if (!currentConversation) {
        const generatedTitle = await generateTitle(userInput, selectedModel);
        if (generatedTitle) {
          const newConv = conversations.find(
            (c) => c.id === currentConversation
          );
          if (newConv) {
            const updatedConv = {
              ...newConv,
              title: generatedTitle,
            };
            setConversations((prev) =>
              prev.map((conv) =>
                conv.id === currentConversation ? updatedConv : conv
              )
            );
            await db.saveConversation(updatedConv);
          }
        }
      } else {
        const currentConv = conversations.find(
          (c) => c.id === currentConversation
        );
        if (currentConv?.title === "New Chat") {
          const generatedTitle = await generateTitle(
            userInput,
            currentConv.settings.model || selectedModel
          );
          if (generatedTitle) {
            const updatedConv = {
              ...currentConv,
              title: generatedTitle,
            };
            setConversations((prev) =>
              prev.map((conv) =>
                conv.id === currentConversation ? updatedConv : conv
              )
            );
            await db.saveConversation(updatedConv);
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
        setSelectedModel(conversation.settings.model || selectedModel);
        await db.setCurrentConversation(id);
      }
    } catch (error) {
      console.error("Error selecting conversation:", error);
    }
  };

  const handleNewChat = async () => {
    try {
      const settings = await db.getGlobalSettings();
      const defaultModel = settings.defaultModel;

      const newId = Date.now().toString();
      const newConv = {
        id: newId,
        title: "New Chat",
        timestamp: new Date(),
        messages: [],
        settings: {
          rolePrompt: "",
          temperature: 0.7,
          model: defaultModel,
        },
      };
      setConversations((prev) => [newConv, ...prev]);
      setCurrentConversation(newId);
      setSelectedModel(defaultModel);
      setMessages([]);
    } catch (error) {
      console.error("Error creating new chat:", error);
    }
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

  const handleUpdateTitle = (id: string, newTitle: string) => {
    setConversations((prev) =>
      prev.map((conv) => (conv.id === id ? { ...conv, title: newTitle } : conv))
    );
  };

  const handleUpdateSettings = (id: string, settings: ConversationSettings) => {
    setConversations((prev) =>
      prev.map((conv) => (conv.id === id ? { ...conv, settings } : conv))
    );
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

  const handleModelSelect = async (model: string) => {
    setSelectedModel(model);

    // Update current conversation's model if one exists
    if (currentConversation) {
      const updatedConversations = conversations.map((conv) => {
        if (conv.id === currentConversation) {
          return {
            ...conv,
            settings: {
              ...conv.settings,
              model: model,
            },
          };
        }
        return conv;
      });

      setConversations(updatedConversations);

      // Save the updated conversation
      const currentConv = updatedConversations.find(
        (c) => c.id === currentConversation
      );
      if (currentConv) {
        await db.saveConversation(currentConv);
      }
    }
  };

  // Add this effect to update the title when currentConversation changes
  useEffect(() => {
    const updateTitle = async () => {
      if (currentConversation) {
        const conv = conversations.find((c) => c.id === currentConversation);
        setCurrentTitle(conv?.title || "");
      } else {
        setCurrentTitle("Start a new conversation.");
      }
    };

    updateTitle();
  }, [currentConversation, conversations]);

  return (
    <div className="flex flex-col h-screen bg-[#c8cbfe] tracking-tighter">
      <div className="flex-grow flex overflow-hidden p-4 gap-4">
        <div className="w-1/3 max-w-sm overflow-hidden">
          <ConversationList
            conversations={conversations}
            onSelect={handleSelectConversation}
            onNew={handleNewChat}
            onDelete={handleDeleteConversation}
            onUpdateTitle={handleUpdateTitle}
            onUpdateSettings={handleUpdateSettings}
            selectedId={currentConversation ?? undefined}
            isConnected={isConnected}
            models={models}
          />
        </div>
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex flex-col flex-grow overflow-hidden">
            <ChatWindow
              messages={messages}
              isLoading={isLoading}
              models={models}
              selectedModel={selectedModel}
              onModelSelect={handleModelSelect}
              currentTitle={currentTitle}
            />
            <ChatInput
              input={input}
              setInput={setInput}
              onSend={sendMessage}
              onCancel={handleCancel}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
