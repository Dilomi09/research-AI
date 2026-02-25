import { useState, useRef, useEffect } from 'react';
import { Send, Search, Sparkles, AlertCircle, Link as LinkIcon, ChevronDown, Check, Square, Pencil, Download, ChevronRight } from 'lucide-react';
import { useStore, Message } from '../lib/store';
import { searchWithPerplexity, searchWithTavily, synthesizeWithOpenRouter } from '../lib/api';
import { MarkdownRenderer } from './MarkdownRenderer';
import clsx from 'clsx';

const MODELS = [
  { id: 'arcee-ai/trinity-large-preview:free', name: 'Trinity Large', description: 'Best for general tasks', price: 'Free' },
  { id: 'z-ai/glm-5', name: 'GLM-5', description: 'Best for balanced tasks', price: '$$' },
  { id: 'moonshotai/kimi-k2.5', name: 'Kimi K2.5', description: 'Best for long context', price: '$$$' },
  { id: 'google/gemini-3-flash-preview', name: 'Gemini 3 Flash', description: 'Best for speed and reasoning', price: '$$$$' },
  { id: 'minimax/minimax-m2.5', name: 'Minimax m2.5', description: 'Best for creative writing', price: '$$' },
];

export function ChatArea({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { 
    chats, 
    currentChatId, 
    createChat, 
    addMessage, 
    updateMessage,
    truncateChat,
    perplexityKey,
    openRouterKey,
    tavilyKey,
    searchProvider,
    systemPrompt,
    openRouterModel,
    deepResearch,
    setDeepResearch,
    setOpenRouterModel
  } = useStore();
  
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [expandedSearch, setExpandedSearch] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const currentChat = chats.find(c => c.id === currentChatId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentChat?.messages]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsModelDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    if (!openRouterKey) {
      alert('Please configure your OpenRouter API key in Settings first.');
      onOpenSettings();
      return;
    }

    if (searchProvider === 'perplexity' && !perplexityKey) {
      alert('Please configure your Perplexity API key in Settings first.');
      onOpenSettings();
      return;
    }

    if (searchProvider === 'tavily' && !tavilyKey) {
      alert('Please configure your Tavily API key in Settings first.');
      onOpenSettings();
      return;
    }

    let activeChatId = currentChatId;
    if (!activeChatId) {
      activeChatId = createChat();
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
    };

    const assistantMessageId = crypto.randomUUID();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      status: searchProvider !== 'none' ? 'searching' : 'synthesizing',
    };

    addMessage(activeChatId, userMessage);
    addMessage(activeChatId, assistantMessage);
    setInput('');
    setIsProcessing(true);

    abortControllerRef.current = new AbortController();

    try {
      let searchResults = '';
      let citations: string[] = [];

      if (searchProvider === 'perplexity') {
        const searchRes = await searchWithPerplexity(perplexityKey, userMessage.content, deepResearch);
        searchResults = searchRes.choices?.[0]?.message?.content || '';
        citations = searchRes.citations || [];
      } else if (searchProvider === 'tavily') {
        const searchRes = await searchWithTavily(tavilyKey, userMessage.content, deepResearch);
        searchResults = searchRes.content;
        citations = searchRes.citations;
      }

      updateMessage(activeChatId, assistantMessageId, { 
        status: 'synthesizing',
        citations,
        searchResults
      });

      // Prepare history for OpenRouter
      const currentChatState = useStore.getState().chats.find(c => c.id === activeChatId);
      const history = currentChatState?.messages
        .filter(m => m.id !== assistantMessageId && m.status === 'done')
        .map(m => ({ role: m.role, content: m.content })) || [];

      history.push({ role: 'user', content: userMessage.content });

      let fullContent = '';
      await synthesizeWithOpenRouter(
        openRouterKey,
        openRouterModel,
        history as any,
        searchResults,
        systemPrompt,
        (chunk) => {
          fullContent += chunk;
          updateMessage(activeChatId, assistantMessageId, { content: fullContent });
        },
        abortControllerRef.current.signal
      );

      updateMessage(activeChatId, assistantMessageId, { status: 'done' });
    } catch (error: any) {
      if (error.name === 'AbortError') {
        updateMessage(activeChatId, assistantMessageId, { status: 'done' });
      } else {
        console.error(error);
        updateMessage(activeChatId, assistantMessageId, { 
          status: 'error',
          content: error.message || 'An error occurred during processing.'
        });
      }
    } finally {
      setIsProcessing(false);
      abortControllerRef.current = null;
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleEdit = (messageId: string, content: string) => {
    if (!currentChatId || isProcessing) return;
    setInput(content);
    truncateChat(currentChatId, messageId);
  };

  const handleExport = () => {
    if (!currentChat) return;
    let md = `# ${currentChat.title}\n\n`;
    currentChat.messages.forEach(m => {
      md += `### ${m.role === 'user' ? 'You' : 'Assistant'}\n${m.content}\n\n`;
      if (m.citations && m.citations.length > 0) {
        md += `**Sources:**\n${m.citations.map((c, i) => `[${i + 1}] ${c}`).join('\n')}\n\n`;
      }
    });
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentChat.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!currentChatId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-white dark:bg-[#252525] text-gray-500 dark:text-gray-400">
        <Sparkles size={48} className="mb-4 opacity-50" />
        <h2 className="text-xl font-medium mb-2 text-gray-800 dark:text-gray-200">Mac AI Search</h2>
        <p className="max-w-md text-center">
          Search the web with Perplexity and synthesize answers with Minimax via OpenRouter.
        </p>
        <button 
          onClick={() => createChat()}
          className="mt-6 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
        >
          Start a New Chat
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-[#252525] h-full relative">
      <div className="h-14 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between px-4 md:px-6 shrink-0">
        <h2 className="font-medium text-gray-800 dark:text-gray-200 truncate pr-4">
          {currentChat?.title}
        </h2>
        <button
          onClick={handleExport}
          className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title="Export Chat to Markdown"
        >
          <Download size={18} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        {currentChat?.messages.map((msg) => (
          <div key={msg.id} className={clsx("flex flex-col max-w-3xl mx-auto group", msg.role === 'user' ? 'items-end' : 'items-start')}>
            {msg.role === 'user' ? (
              <div className="flex items-center space-x-2 max-w-[85%]">
                <button
                  onClick={() => handleEdit(msg.id, msg.content)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                  title="Edit and resubmit"
                >
                  <Pencil size={14} />
                </button>
                <div className="bg-gray-100 dark:bg-[#333333] text-gray-900 dark:text-gray-100 px-4 py-3 rounded-2xl rounded-tr-sm">
                  {msg.content}
                </div>
              </div>
            ) : (
              <div className="w-full">
                {msg.status === 'searching' && (
                  <div className="flex items-center space-x-2 text-blue-500 mb-2 font-medium text-sm">
                    <Search size={16} className="animate-pulse" />
                    <span>Searching the web with {searchProvider === 'tavily' ? 'Tavily' : 'Perplexity'}...</span>
                  </div>
                )}
                {msg.status === 'synthesizing' && (
                  <div className="flex items-center space-x-2 text-purple-500 mb-2 font-medium text-sm">
                    <Sparkles size={16} className="animate-pulse" />
                    <span>Synthesizing answer with {openRouterModel}...</span>
                  </div>
                )}
                {msg.status === 'error' && (
                  <div className="flex items-center space-x-2 text-red-500 mb-2 font-medium text-sm">
                    <AlertCircle size={16} />
                    <span>Error occurred</span>
                  </div>
                )}
                
                {msg.content && (
                  <div className="text-gray-800 dark:text-gray-200">
                    {msg.searchResults && (
                      <div className="mb-4 text-sm">
                        <button
                          onClick={() => setExpandedSearch(expandedSearch === msg.id ? null : msg.id)}
                          className="flex items-center space-x-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                        >
                          <ChevronRight size={14} className={clsx("transition-transform", expandedSearch === msg.id && "rotate-90")} />
                          <span>View Search Context</span>
                        </button>
                        {expandedSearch === msg.id && (
                          <div className="mt-2 p-3 bg-gray-50 dark:bg-[#1e1e1e] rounded-lg border border-gray-200 dark:border-gray-700 max-h-60 overflow-y-auto font-mono text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                            {msg.searchResults}
                          </div>
                        )}
                      </div>
                    )}
                    <MarkdownRenderer content={msg.content} citations={msg.citations} />
                  </div>
                )}

                {msg.citations && msg.citations.length > 0 && msg.status !== 'searching' && (
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                    <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center">
                      <LinkIcon size={12} className="mr-1" />
                      Sources
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {msg.citations.map((url, i) => {
                        try {
                          const domain = new URL(url).hostname.replace('www.', '');
                          return (
                            <a 
                              key={i} 
                              href={url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-2 py-1 bg-gray-50 dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-700 rounded text-xs text-gray-600 dark:text-gray-400 hover:text-blue-500 hover:border-blue-500 transition-colors truncate max-w-[200px]"
                              title={url}
                            >
                              <span className="mr-1 text-[10px] bg-gray-200 dark:bg-gray-700 w-4 h-4 rounded-full flex items-center justify-center">{i + 1}</span>
                              <span className="truncate">{domain}</span>
                            </a>
                          );
                        } catch (e) {
                          return null;
                        }
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white dark:bg-[#252525] border-t border-gray-100 dark:border-gray-800">
        <div className="max-w-3xl mx-auto relative">
          <div className="flex items-center space-x-2 mb-2">
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                className="flex items-center space-x-1 px-3 py-1.5 bg-gray-50 dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <span className="truncate max-w-[120px]">
                  {MODELS.find(m => m.id === openRouterModel)?.name || 'Select Model'}
                </span>
                <ChevronDown size={14} />
              </button>

              {isModelDropdownOpen && (
                <div className="absolute bottom-full left-0 mb-2 w-72 bg-white dark:bg-[#252525] border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden z-50">
                  <div className="p-2 space-y-1">
                    {MODELS.map((model) => (
                      <button
                        key={model.id}
                        onClick={() => {
                          setOpenRouterModel(model.id);
                          setIsModelDropdownOpen(false);
                        }}
                        className={clsx(
                          "w-full text-left px-3 py-2 rounded-lg flex items-start justify-between group transition-colors",
                          openRouterModel === model.id 
                            ? "bg-blue-50 dark:bg-blue-900/20" 
                            : "hover:bg-gray-50 dark:hover:bg-[#1e1e1e]"
                        )}
                      >
                        <div className="flex-1 pr-2">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className={clsx(
                              "text-sm font-medium",
                              openRouterModel === model.id ? "text-blue-600 dark:text-blue-400" : "text-gray-900 dark:text-gray-100"
                            )}>
                              {model.name}
                            </span>
                            <span className="text-xs font-mono text-gray-500">{model.price}</span>
                          </div>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">
                            {model.description}
                          </p>
                        </div>
                        {openRouterModel === model.id && (
                          <Check size={16} className="text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setDeepResearch(!deepResearch)}
              className={clsx(
                "flex items-center space-x-1.5 px-3 py-1.5 border rounded-lg text-xs font-medium transition-colors",
                deepResearch 
                  ? "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-400" 
                  : "bg-gray-50 dark:bg-[#1e1e1e] border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              )}
            >
              <Sparkles size={14} className={deepResearch ? "text-purple-500" : "text-gray-400"} />
              <span>Deep Research</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="relative flex items-end">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="Ask anything..."
              className="w-full bg-gray-50 dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-700 rounded-xl pl-4 pr-12 py-3 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[52px] max-h-48"
              rows={1}
              style={{
                height: 'auto',
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = `${Math.min(target.scrollHeight, 192)}px`;
              }}
            />
            <button
              type="submit"
              disabled={!input.trim() || isProcessing}
              className="absolute right-2 bottom-2 p-2 rounded-lg bg-blue-500 text-white disabled:opacity-50 disabled:bg-gray-300 dark:disabled:bg-gray-700 transition-colors"
            >
              <Send size={16} />
            </button>
          </form>
          <div className="text-center mt-2">
            <span className="text-[10px] text-gray-400 dark:text-gray-500">
              AI can make mistakes. Check important info.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
