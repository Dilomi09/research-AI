import { MessageSquare, Plus, Settings, Trash2 } from 'lucide-react';
import { useStore } from '../lib/store';
import clsx from 'clsx';

export function Sidebar({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { chats, currentChatId, createChat, setCurrentChatId, deleteChat } = useStore();

  return (
    <div className="w-64 bg-[#f5f5f5] dark:bg-[#1e1e1e] border-r border-gray-200 dark:border-gray-800 flex flex-col h-full">
      <div className="p-4 flex items-center justify-between">
        <h1 className="font-semibold text-gray-800 dark:text-gray-200">Mac AI Search</h1>
        <button
          onClick={() => createChat()}
          className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
          title="New Chat"
        >
          <Plus size={18} className="text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 space-y-1">
        {chats.map((chat) => (
          <div
            key={chat.id}
            onClick={() => setCurrentChatId(chat.id)}
            className={clsx(
              'group flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors',
              currentChatId === chat.id
                ? 'bg-blue-500 text-white'
                : 'hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
            )}
          >
            <div className="flex items-center space-x-2 overflow-hidden">
              <MessageSquare size={16} className="shrink-0" />
              <span className="truncate text-sm">{chat.title}</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteChat(chat.id);
              }}
              className={clsx(
                'p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity',
                currentChatId === chat.id
                  ? 'hover:bg-blue-600 text-white'
                  : 'hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400'
              )}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-gray-200 dark:border-gray-800">
        <button
          onClick={onOpenSettings}
          className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors w-full p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-800"
        >
          <Settings size={16} />
          <span>Settings</span>
        </button>
      </div>
    </div>
  );
}
