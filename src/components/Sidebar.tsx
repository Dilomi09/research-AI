import { MessageSquare, Plus, Settings, Trash2 } from 'lucide-react';
import { useStore } from '../lib/store';
import clsx from 'clsx';

export function Sidebar({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { chats, currentChatId, createChat, setCurrentChatId, deleteChat } = useStore();

  return (
    <div className="w-64 bg-zinc-50 dark:bg-[#0A0A0A] border-r border-zinc-200 dark:border-zinc-800/50 flex flex-col h-full shrink-0">
      <div className="p-4 flex items-center justify-between">
        <h1 className="font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">Mac AI Search</h1>
        <button
          onClick={() => createChat()}
          className="p-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          title="New Chat"
        >
          <Plus size={18} className="text-zinc-600 dark:text-zinc-400" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {chats.map((chat) => (
          <div
            key={chat.id}
            onClick={() => setCurrentChatId(chat.id)}
            className={clsx(
              'group flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors',
              currentChatId === chat.id
                ? 'bg-zinc-200 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 font-medium'
                : 'hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-400'
            )}
          >
            <div className="flex items-center space-x-3 overflow-hidden">
              <MessageSquare size={16} className={clsx("shrink-0", currentChatId === chat.id ? "text-blue-500" : "text-zinc-400")} />
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
                  ? 'hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-400'
                  : 'hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400'
              )}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800/50">
        <button
          onClick={onOpenSettings}
          className="flex items-center space-x-3 w-full p-2.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-400 transition-colors"
        >
          <Settings size={18} />
          <span className="text-[13px] font-medium">Settings</span>
        </button>
      </div>
    </div>
  );
}
