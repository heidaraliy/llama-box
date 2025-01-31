import { Conversation } from "../types";

interface DBSchema {
  conversations: {
    key: string;
    value: Conversation;
  };
  currentConversation: {
    key: "current";
    value: string | null;
  };
}

class DatabaseService {
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = "llama-box";
  private readonly VERSION = 1;

  async init() {
    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create conversations store
        if (!db.objectStoreNames.contains("conversations")) {
          db.createObjectStore("conversations", { keyPath: "id" });
        }

        // Create currentConversation store
        if (!db.objectStoreNames.contains("currentConversation")) {
          db.createObjectStore("currentConversation");
        }
      };
    });
  }

  async getAllConversations() {
    if (!this.db) await this.init();
    return new Promise<DBSchema["conversations"]["value"][]>(
      (resolve, reject) => {
        const transaction = this.db!.transaction("conversations", "readonly");
        const store = transaction.objectStore("conversations");
        const request = store.getAll();

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          console.log("Retrieved conversations:", request.result);
          const conversations = request.result.map((conv) => ({
            ...conv,
            timestamp: new Date(conv.timestamp),
            settings: conv.settings || { rolePrompt: "", temperature: 0.7 },
          }));
          resolve(conversations);
        };
      }
    );
  }

  async saveConversation(conversation: DBSchema["conversations"]["value"]) {
    if (!this.db) await this.init();
    return new Promise<void>((resolve, reject) => {
      const transaction = this.db!.transaction("conversations", "readwrite");
      const store = transaction.objectStore("conversations");
      console.log("Saving conversation:", conversation);
      const request = store.put(conversation);

      request.onerror = () => {
        console.error("Error saving conversation:", request.error);
        reject(request.error);
      };
      request.onsuccess = () => {
        console.log("Successfully saved conversation");
        resolve();
      };
    });
  }

  async getCurrentConversation() {
    if (!this.db) await this.init();
    return new Promise<string | null>((resolve, reject) => {
      const transaction = this.db!.transaction(
        "currentConversation",
        "readonly"
      );
      const store = transaction.objectStore("currentConversation");
      const request = store.get("current");

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async setCurrentConversation(id: string | null) {
    if (!this.db) await this.init();
    return new Promise<void>((resolve, reject) => {
      const transaction = this.db!.transaction(
        "currentConversation",
        "readwrite"
      );
      const store = transaction.objectStore("currentConversation");
      const request = store.put(id, "current");

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async deleteConversation(id: string) {
    if (!this.db) await this.init();
    return new Promise<void>((resolve, reject) => {
      const transaction = this.db!.transaction("conversations", "readwrite");
      const store = transaction.objectStore("conversations");
      const request = store.delete(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }
}

export const db = new DatabaseService();
