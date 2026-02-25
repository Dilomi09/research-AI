import { X } from 'lucide-react';
import { useStore } from '../lib/store';
import { useState, useEffect } from 'react';

export function SettingsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { 
    perplexityKey, openRouterKey, tavilyKey, openRouterModel, searchProvider, systemPrompt,
    setPerplexityKey, setOpenRouterKey, setTavilyKey, setOpenRouterModel, setSearchProvider, setSystemPrompt 
  } = useStore();
  
  const [localPerplexity, setLocalPerplexity] = useState(perplexityKey);
  const [localOpenRouter, setLocalOpenRouter] = useState(openRouterKey);
  const [localTavily, setLocalTavily] = useState(tavilyKey);
  const [localModel, setLocalModel] = useState(openRouterModel);
  const [localSearchProvider, setLocalSearchProvider] = useState(searchProvider);
  const [localSystemPrompt, setLocalSystemPrompt] = useState(systemPrompt);

  useEffect(() => {
    if (isOpen) {
      setLocalPerplexity(perplexityKey);
      setLocalOpenRouter(openRouterKey);
      setLocalTavily(tavilyKey);
      setLocalModel(openRouterModel);
      setLocalSearchProvider(searchProvider);
      setLocalSystemPrompt(systemPrompt);
    }
  }, [isOpen, perplexityKey, openRouterKey, tavilyKey, openRouterModel, searchProvider, systemPrompt]);

  if (!isOpen) return null;

  const handleSave = () => {
    setPerplexityKey(localPerplexity);
    setOpenRouterKey(localOpenRouter);
    setTavilyKey(localTavily);
    setOpenRouterModel(localModel);
    setSearchProvider(localSearchProvider);
    setSystemPrompt(localSystemPrompt);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-[#252525] rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">Settings</h2>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X size={18} />
          </button>
        </div>
        
        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Search Provider
            </label>
            <select
              value={localSearchProvider}
              onChange={(e) => setLocalSearchProvider(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-transparent text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="perplexity">Perplexity (Best Quality, $$)</option>
              <option value="tavily">Tavily (Good Quality, Free Tier)</option>
              <option value="none">None (Chat Only)</option>
            </select>
          </div>

          {localSearchProvider === 'perplexity' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Perplexity API Key
              </label>
              <input
                type="password"
                value={localPerplexity}
                onChange={(e) => setLocalPerplexity(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-transparent text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="pplx-..."
              />
            </div>
          )}

          {localSearchProvider === 'tavily' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tavily API Key
              </label>
              <input
                type="password"
                value={localTavily}
                onChange={(e) => setLocalTavily(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-transparent text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="tvly-..."
              />
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              OpenRouter API Key
            </label>
            <input
              type="password"
              value={localOpenRouter}
              onChange={(e) => setLocalOpenRouter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-transparent text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="sk-or-..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              OpenRouter Model
            </label>
            <select
              value={localModel}
              onChange={(e) => setLocalModel(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-transparent text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="arcee-ai/trinity-large-preview:free">Trinity Large (Free)</option>
              <option value="z-ai/glm-5">GLM-5</option>
              <option value="moonshotai/kimi-k2.5">Kimi K2.5</option>
              <option value="google/gemini-3-flash-preview">Gemini 3 Flash</option>
              <option value="minimax/minimax-m2.5">Minimax m2.5</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Custom System Prompt (Optional)
            </label>
            <textarea
              value={localSystemPrompt}
              onChange={(e) => setLocalSystemPrompt(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-transparent text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="e.g. Always answer like a pirate..."
              rows={3}
            />
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex justify-end">
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm font-medium"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
