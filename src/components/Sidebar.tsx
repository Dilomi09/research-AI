import { MessageSquare, Plus, Settings, Trash2, X, Folder, FolderPlus, MoreVertical, ChevronRight } from 'lucide-react';
import { useStore, Collection } from '../lib/store';
import clsx from 'clsx';
import { useState } from 'react';

export function Sidebar({ isOpen, onClose, onOpenSettings }: { isOpen: boolean; onClose: () => void; onOpenSettings: () => void }) {
  const {
    chats,
    currentChatId,
    createChat,
    setCurrentChatId,
    deleteChat,
    collections,
    createCollection,
    deleteCollection,
    moveChatToCollection,
    currentCollectionId,
    setCurrentCollectionId
  } = useStore();

  const [isCreatingCollection, setIsCreatingCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');

  const handleCreateCollection = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCollectionName.trim()) {
      createCollection(newCollectionName.trim());
      setNewCollectionName('');
      setIsCreatingCollection(false);
    }
  };

  const filteredChats = chats.filter(chat =>
    currentCollectionId === null ? !chat.collectionId : chat.collectionId === currentCollectionId
  );

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 dark:bg-black/40 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <div className={clsx(
        "fixed inset-y-0 left-0 z-50 w-64 bg-[#F9F9F9] dark:bg-[#111111] border-r border-black/5 dark:border-white/5 flex flex-col h-full shrink-0 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-4 flex items-center justify-between">
          <h1 className="font-bold text-zinc-900 dark:text-zinc-100 tracking-tight text-sm uppercase">Research AI</h1>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => {
                createChat();
                if (window.innerWidth < 768) onClose();
              }}
              className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors"
              title="New Chat"
            >
              <Plus size={16} className="text-zinc-600 dark:text-zinc-400" />
            </button>
            <button
              onClick={onClose}
              className="md:hidden p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors"
            >
              <X size={16} className="text-zinc-600 dark:text-zinc-400" />
            </button>
          </div>
        </div>

        <div className="px-3 mb-2">
          <div className="flex items-center justify-between px-2 mb-2">
            <h2 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Collections</h2>
            <button
              onClick={() => setIsCreatingCollection(true)}
              className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-full text-zinc-400 hover:text-blue-500 transition-all"
            >
              <FolderPlus size={12} />
            </button>
          </div>

          <div className="space-y-0.5">
            <button
              onClick={() => setCurrentCollectionId(null)}
              className={clsx(
                'w-full flex items-center space-x-2.5 p-2 rounded-lg text-[13px] transition-all',
                currentCollectionId === null
                  ? 'bg-white dark:bg-[#222222] text-zinc-900 dark:text-zinc-100 font-semibold shadow-sm ring-1 ring-black/5'
                  : 'text-zinc-500 hover:bg-black/5 dark:hover:bg-white/5'
              )}
            >
              <Folder size={14} className={currentCollectionId === null ? 'text-blue-500' : ''} />
              <span>All Chats</span>
            </button>

            {collections.map(col => (
              <div key={col.id} className="group flex items-center justify-between pr-1">
                <button
                  onClick={() => setCurrentCollectionId(col.id)}
                  className={clsx(
                    'flex-1 flex items-center space-x-2.5 p-2 rounded-lg text-[13px] transition-all truncate',
                    currentCollectionId === col.id
                      ? 'bg-white dark:bg-[#222222] text-zinc-900 dark:text-zinc-100 font-semibold shadow-sm ring-1 ring-black/5'
                      : 'text-zinc-500 hover:bg-black/5 dark:hover:bg-white/5'
                  )}
                >
                  <Folder size={14} className={currentCollectionId === col.id ? 'text-blue-500' : ''} />
                  <span className="truncate">{col.name}</span>
                </button>
                <button
                  onClick={() => deleteCollection(col.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-red-500 transition-opacity"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}

            {isCreatingCollection && (
              <form onSubmit={handleCreateCollection} className="px-2 py-1">
                <input
                  autoFocus
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  onBlur={() => !newCollectionName && setIsCreatingCollection(false)}
                  placeholder="Folder name..."
                  className="w-full bg-white dark:bg-[#222222] ring-1 ring-blue-500/50 rounded-lg px-2 py-1.5 text-[13px] text-zinc-900 dark:text-zinc-100 outline-none"
                />
              </form>
            )}
          </div>
        </div>

        <div className="px-3 mb-2 mt-4">
          <h2 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-2 mb-2">History</h2>
          <div className="flex-1 overflow-y-auto space-y-0.5">
            {filteredChats.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-[11px] text-zinc-400 dark:text-zinc-500">No chats in this folder.</p>
              </div>
            ) : (
              filteredChats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => {
                    setCurrentChatId(chat.id);
                    if (window.innerWidth < 768) onClose();
                  }}
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

                  <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    {collections.length > 0 && (
                      <select
                        className="bg-transparent text-[10px] text-zinc-400 hover:text-zinc-600 outline-none"
                        value={chat.collectionId || ''}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => moveChatToCollection(chat.id, e.target.value || undefined)}
                      >
                        <option value="">Ungrouped</option>
                        {collections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteChat(chat.id);
                      }}
                      className="p-1 text-zinc-400 hover:text-red-500 transition-colors ml-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-auto p-3 border-t border-black/5 dark:border-white/5">
          <button
            onClick={onOpenSettings}
            className="flex items-center space-x-2.5 w-full p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-zinc-600 dark:text-zinc-400 transition-colors"
          >
            <Settings size={16} />
            <span className="text-[13px] font-medium">Settings</span>
          </button>
        </div>
      </div>
    </>
  );
}
