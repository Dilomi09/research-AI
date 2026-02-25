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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between p-5 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Settings</h2>
          <button onClick={onClose} className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
            <X size={18} />
          </button>
        </div>
        
        <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Search Provider
            </label>
            <select
              value={localSearchProvider}
              onChange={(e) => setLocalSearchProvider(e.target.value as any)}
              className="w-full px-3.5 py-2.5 border border-zinc-300 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-sm"
            >
              <option value="perplexity">Perplexity (Best Quality, $$)</option>
              <option value="tavily">Tavily (Good Quality, Free Tier)</option>
              <option value="none">None (Chat Only)</option>
            </select>
          </div>

          {localSearchProvider === 'perplexity' && (
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Perplexity API Key
              </label>
              <input
                type="password"
                value={localPerplexity}
                onChange={(e) => setLocalPerplexity(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-zinc-300 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-sm"
                placeholder="pplx-..."
              />
            </div>
          )}

          {localSearchProvider === 'tavily' && (
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                Tavily API Key
              </label>
              <input
                type="password"
                value={localTavily}
                onChange={(e) => setLocalTavily(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-zinc-300 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-sm"
                placeholder="tvly-..."
              />
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              OpenRouter API Key
            </label>
            <input
              type="password"
              value={localOpenRouter}
              onChange={(e) => setLocalOpenRouter(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-zinc-300 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-sm"
              placeholder="sk-or-..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              OpenRouter Model
            </label>
            <select
              value={['arcee-ai/trinity-large-preview:free', 'z-ai/glm-5', 'moonshotai/kimi-k2.5', 'google/gemini-3-flash-preview', 'minimax/minimax-m2.5'].includes(localModel) ? localModel : 'custom'}
              onChange={(e) => {
                if (e.target.value === 'custom') {
                  setLocalModel('');
                } else {
                  setLocalModel(e.target.value);
                }
              }}
              className="w-full px-3.5 py-2.5 border border-zinc-300 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-sm mb-2"
            >
              <option value="arcee-ai/trinity-large-preview:free">Trinity Large (Free)</option>
              <option value="z-ai/glm-5">GLM-5</option>
              <option value="moonshotai/kimi-k2.5">Kimi K2.5</option>
              <option value="google/gemini-3-flash-preview">Gemini 3 Flash</option>
              <option value="minimax/minimax-m2.5">Minimax m2.5</option>
              <option value="custom">Custom Model...</option>
            </select>
            
            {!['arcee-ai/trinity-large-preview:free', 'z-ai/glm-5', 'moonshotai/kimi-k2.5', 'google/gemini-3-flash-preview', 'minimax/minimax-m2.5'].includes(localModel) && (
              <input
                type="text"
                value={localModel}
                onChange={(e) => setLocalModel(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-zinc-300 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-sm"
                placeholder="e.g. anthropic/claude-3-opus"
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Custom System Prompt (Optional)
            </label>
            <textarea
              value={localSystemPrompt}
              onChange={(e) => setLocalSystemPrompt(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-zinc-300 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none shadow-sm"
              placeholder="e.g. Always answer like a pirate..."
              rows={3}
            />
          </div>
        </div>

        <div className="p-5 border-t border-zinc-200 dark:border-zinc-800 flex justify-end bg-zinc-50 dark:bg-zinc-900/50">
          <button
            onClick={handleSave}
            className="px-5 py-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl hover:bg-zinc-800 dark:hover:bg-white transition-colors text-sm font-medium shadow-sm"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
