import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Attachment {
  id: string;
  name: string;
  type: string;
  data: string; // base64 or raw text
  isText: boolean;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: string[];
  searchResults?: string;
  status?: 'searching' | 'synthesizing' | 'done' | 'error';
  attachments?: Attachment[];
  suggestedQuestions?: string[];
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
  collectionId?: string;
}

export interface Collection {
  id: string;
  name: string;
  updatedAt: number;
}

interface AppState {
  perplexityKey: string;
  openRouterKey: string;
  tavilyKey: string;
  openRouterModel: string;
  searchProvider: 'perplexity' | 'tavily' | 'none';
  systemPrompt: string;
  deepResearch: boolean;
  chats: Chat[];
  collections: Collection[];
  currentChatId: string | null;
  currentCollectionId: string | null;
  searchDomain: string;
  setPerplexityKey: (key: string) => void;
  setOpenRouterKey: (key: string) => void;
  setTavilyKey: (key: string) => void;
  setOpenRouterModel: (model: string) => void;
  setSearchProvider: (provider: 'perplexity' | 'tavily' | 'none') => void;
  setSystemPrompt: (prompt: string) => void;
  setDeepResearch: (enabled: boolean) => void;
  createChat: () => string;
  setCurrentChatId: (id: string | null) => void;
  addMessage: (chatId: string, message: Message) => void;
  updateMessage: (chatId: string, messageId: string, update: Partial<Message>) => void;
  truncateChat: (chatId: string, messageId: string) => void;
  deleteChat: (id: string) => void;
  createCollection: (name: string) => string;
  deleteCollection: (id: string) => void;
  updateCollection: (id: string, name: string) => void;
  moveChatToCollection: (chatId: string, collectionId: string | undefined) => void;
  setCurrentCollectionId: (id: string | null) => void;
  setSearchDomain: (domain: string) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      perplexityKey: '',
      openRouterKey: '',
      tavilyKey: '',
      openRouterModel: 'minimax/minimax-m2.5',
      searchProvider: 'perplexity',
      systemPrompt: '',
      deepResearch: false,
      chats: [],
      collections: [],
      currentChatId: null,
      currentCollectionId: null,
      searchDomain: '',
      setPerplexityKey: (key) => set({ perplexityKey: key }),
      setOpenRouterKey: (key) => set({ openRouterKey: key }),
      setTavilyKey: (key) => set({ tavilyKey: key }),
      setOpenRouterModel: (model) => set({ openRouterModel: model }),
      setSearchProvider: (provider) => set({ searchProvider: provider }),
      setSystemPrompt: (prompt) => set({ systemPrompt: prompt }),
      setDeepResearch: (enabled) => set({ deepResearch: enabled }),
      createChat: () => {
        const id = crypto.randomUUID();
        const newChat: Chat = {
          id,
          title: 'New Chat',
          messages: [],
          updatedAt: Date.now(),
        };
        set((state) => ({
          chats: [newChat, ...state.chats],
          currentChatId: id,
        }));
        return id;
      },
      setCurrentChatId: (id) => set({ currentChatId: id }),
      addMessage: (chatId, message) =>
        set((state) => ({
          chats: state.chats.map((chat) => {
            if (chat.id === chatId) {
              const isFirstUserMessage =
                message.role === 'user' && chat.messages.length === 0;
              return {
                ...chat,
                title: isFirstUserMessage ? message.content.slice(0, 30) + (message.content.length > 30 ? '...' : '') : chat.title,
                messages: [...chat.messages, message],
                updatedAt: Date.now(),
              };
            }
            return chat;
          }),
        })),
      updateMessage: (chatId, messageId, update) =>
        set((state) => ({
          chats: state.chats.map((chat) => {
            if (chat.id === chatId) {
              return {
                ...chat,
                messages: chat.messages.map((msg) =>
                  msg.id === messageId ? { ...msg, ...update } : msg
                ),
                updatedAt: Date.now(),
              };
            }
            return chat;
          }),
        })),
      truncateChat: (chatId, messageId) =>
        set((state) => ({
          chats: state.chats.map((chat) => {
            if (chat.id === chatId) {
              const index = chat.messages.findIndex((m) => m.id === messageId);
              if (index !== -1) {
                return {
                  ...chat,
                  messages: chat.messages.slice(0, index),
                  updatedAt: Date.now(),
                };
              }
            }
            return chat;
          }),
        })),
      deleteChat: (id) =>
        set((state) => ({
          chats: state.chats.filter((chat) => chat.id !== id),
          currentChatId: state.currentChatId === id ? null : state.currentChatId,
        })),
      createCollection: (name) => {
        const id = crypto.randomUUID();
        const newCol = { id, name, updatedAt: Date.now() };
        set((state) => ({ collections: [newCol, ...state.collections] }));
        return id;
      },
      deleteCollection: (id) =>
        set((state) => ({
          collections: state.collections.filter((c) => c.id !== id),
          chats: state.chats.map((chat) =>
            chat.collectionId === id ? { ...chat, collectionId: undefined } : chat
          ),
          currentCollectionId: state.currentCollectionId === id ? null : state.currentCollectionId,
        })),
      updateCollection: (id, name) =>
        set((state) => ({
          collections: state.collections.map((c) =>
            c.id === id ? { ...c, name, updatedAt: Date.now() } : c
          ),
        })),
      moveChatToCollection: (chatId, collectionId) =>
        set((state) => ({
          chats: state.chats.map((chat) =>
            chat.id === chatId ? { ...chat, collectionId, updatedAt: Date.now() } : chat
          ),
        })),
      setCurrentCollectionId: (id) => set({ currentCollectionId: id }),
      setSearchDomain: (domain) => set({ searchDomain: domain }),
    }),
    {
      name: 'mac-ai-search-storage',
    }
  )
);
