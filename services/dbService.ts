
import { Message, PromptVersion } from '../types';
import { SYSTEM_PROMPT, DEFAULT_ENHANCER_PROMPT } from '../constants';

const DB_NAME = 'LogowizDB';
const DB_VERSION = 2;
const PROMPT_STORE = 'prompt_history';
const CHAT_STORE = 'chat_messages';

let dbInstance: IDBDatabase | null = null;

// Initialize the Database
export const initDB = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // If we already have a connection, verify it's not closed
    if (dbInstance) {
        resolve();
        return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Store for System Prompt History
      if (!db.objectStoreNames.contains(PROMPT_STORE)) {
        db.createObjectStore(PROMPT_STORE, { keyPath: 'id', autoIncrement: true });
      }

      // Store for Chat Messages (Session)
      if (!db.objectStoreNames.contains(CHAT_STORE)) {
        db.createObjectStore(CHAT_STORE, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
        dbInstance = (event.target as IDBOpenDBRequest).result;
        
        // Handle generic errors
        dbInstance.onversionchange = () => {
            dbInstance?.close();
            dbInstance = null;
        };
        
        resolve();
    };
    
    request.onerror = (event) => reject((event.target as IDBOpenDBRequest).error);
    request.onblocked = () => {
        console.warn("Database upgrade blocked. Please close other tabs.");
    };
  });
};

// --- SYSTEM PROMPT FUNCTIONS ---

export const savePromptVersion = async (
  content: string, 
  note: string, 
  source: 'user' | 'ai' | 'system',
  promptType: 'system' | 'enhancer' = 'system'
): Promise<number> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PROMPT_STORE], 'readwrite');
    const store = transaction.objectStore(PROMPT_STORE);
    
    const record: PromptVersion = {
      content,
      timestamp: Date.now(),
      note,
      source,
      promptType
    };

    const request = store.add(record);

    request.onsuccess = () => resolve(request.result as number);
    request.onerror = () => reject(request.error);
  });
};

export const getPromptHistory = async (promptType: 'system' | 'enhancer' = 'system'): Promise<PromptVersion[]> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PROMPT_STORE], 'readonly');
    const store = transaction.objectStore(PROMPT_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      const results = request.result as PromptVersion[];
      // Filter by type, defaulting undefined to 'system' for backwards compatibility
      const filtered = results.filter(r => (r.promptType || 'system') === promptType);
      resolve(filtered.sort((a, b) => b.timestamp - a.timestamp));
    };
    request.onerror = () => reject(request.error);
  });
};

export const getLatestPrompt = async (promptType: 'system' | 'enhancer' = 'system'): Promise<string | null> => {
  try {
      const history = await getPromptHistory(promptType);
      if (history.length > 0) {
        return history[0].content;
      }
      return null;
  } catch (error) {
      console.error("Error fetching latest prompt:", error);
      return null;
  }
};

// --- CHAT HISTORY FUNCTIONS ---

export const saveChatHistory = async (messages: Message[]): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([CHAT_STORE], 'readwrite');
    const store = transaction.objectStore(CHAT_STORE);
    // We store the whole array under a single key 'current_session' for simplicity
    const request = store.put({ id: 'current_session', messages, timestamp: Date.now() });
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getChatHistory = async (): Promise<Message[] | null> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    try {
        const transaction = db.transaction([CHAT_STORE], 'readonly');
        const store = transaction.objectStore(CHAT_STORE);
        const request = store.get('current_session');
        
        request.onsuccess = () => {
          const result = request.result;
          resolve(result ? result.messages : null);
        };
        request.onerror = () => reject(request.error);
    } catch (e) {
        reject(e);
    }
  });
};

export const clearChatHistory = async (): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([CHAT_STORE], 'readwrite');
        const store = transaction.objectStore(CHAT_STORE);
        const request = store.delete('current_session');
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
};

// --- HELPERS ---

const openDB = async (): Promise<IDBDatabase> => {
  if (dbInstance) return dbInstance;
  await initDB();
  if (!dbInstance) throw new Error("Failed to initialize database");
  return dbInstance;
};

export const seedInitialData = async () => {
  try {
      // Seed Main System Prompt
      const sysHistory = await getPromptHistory('system');
      if (sysHistory.length === 0) {
        await savePromptVersion(SYSTEM_PROMPT, "Default System Prompt", "system", "system");
      }

      // Seed Enhancer Prompt
      const enhancerHistory = await getPromptHistory('enhancer');
      if (enhancerHistory.length === 0) {
        await savePromptVersion(DEFAULT_ENHANCER_PROMPT, "Default Enhancer Prompt", "system", "enhancer");
      }

  } catch (e) {
      console.warn("Seeding failed or skipped:", e);
  }
};