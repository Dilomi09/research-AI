import { MessageSquare, Plus, Settings, Trash2 } from 'lucide-react';
import { useStore } from '../lib/store';
import clsx from 'clsx';

export function Sidebar({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { chats, currentChatId, createChat, setCurrentChatId, deleteChat } = useStore();

  return (
    <div className="w-64 bg-[#F9F9F9] dark:bg-[#111111] border-r border-black/5 dark:border-white/5 flex flex-col h-full shrink-0">
      <div className="p-4 flex items-center justify-between">
        <h1 className="font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight text-sm">Mac AI Search</h1>
        <button
          onClick={() => createChat()}
          className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors"
          title="New Chat"
        >
          <Plus size={16} className="text-zinc-600 dark:text-zinc-400" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
        {chats.map((chat) => (
          <div
            key={chat.id}
            onClick={() => setCurrentChatId(chat.id)}
            className={clsx(
              'group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all duration-200',
              currentChatId === chat.id
                ? 'bg-white dark:bg-[#222222] text-zinc-900 dark:text-zinc-100 font-medium shadow-sm ring-1 ring-black/5 dark:ring-white/5'
                : 'hover:bg-black/5 dark:hover:bg-white/5 text-zinc-600 dark:text-zinc-400'
            )}
          >
            <div className="flex items-center space-x-2.5 overflow-hidden">
              <MessageSquare size={14} className={clsx("shrink-0", currentChatId === chat.id ? "text-blue-500" : "text-zinc-400")} />
              <span className="truncate text-[13px]">{chat.title}</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteChat(chat.id);
              }}
              className={clsx(
                'p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity',
                currentChatId === chat.id
                  ? 'hover:bg-black/5 dark:hover:bg-white/10 text-zinc-500 dark:text-zinc-400'
                  : 'hover:bg-black/5 dark:hover:bg-white/10 text-zinc-400'
              )}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-black/5 dark:border-white/5">
        <button
          onClick={onOpenSettings}
          className="flex items-center space-x-2.5 w-full p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-zinc-600 dark:text-zinc-400 transition-colors"
        >
          <Settings size={16} />
          <span className="text-[13px] font-medium">Settings</span>
        </button>
      </div>
    </div>
  );
}
