import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: string[];
  status?: 'searching' | 'synthesizing' | 'done' | 'error';
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
}

interface AppState {
  perplexityKey: string;
  openRouterKey: string;
  openRouterModel: string;
  deepResearch: boolean;
  chats: Chat[];
  currentChatId: string | null;
  setPerplexityKey: (key: string) => void;
  setOpenRouterKey: (key: string) => void;
  setOpenRouterModel: (model: string) => void;
  setDeepResearch: (enabled: boolean) => void;
  createChat: () => string;
  setCurrentChatId: (id: string | null) => void;
  addMessage: (chatId: string, message: Message) => void;
  updateMessage: (chatId: string, messageId: string, update: Partial<Message>) => void;
  deleteChat: (id: string) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      perplexityKey: '',
      openRouterKey: '',
      openRouterModel: 'minimax/minimax-m2.5',
      deepResearch: false,
      chats: [],
      currentChatId: null,
      setPerplexityKey: (key) => set({ perplexityKey: key }),
      setOpenRouterKey: (key) => set({ openRouterKey: key }),
      setOpenRouterModel: (model) => set({ openRouterModel: model }),
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
      deleteChat: (id) =>
        set((state) => ({
          chats: state.chats.filter((chat) => chat.id !== id),
          currentChatId: state.currentChatId === id ? null : state.currentChatId,
        })),
    }),
    {
      name: 'mac-ai-search-storage',
    }
  )
);
