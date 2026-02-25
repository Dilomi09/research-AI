import { useState, useRef, useEffect } from 'react';
import { Send, Search, Sparkles, AlertCircle, Link as LinkIcon, ChevronDown, Check, Square, Pencil, Download, ChevronRight } from 'lucide-react';
import { useStore, Message } from '../lib/store';
import { searchWithPerplexity, searchWithTavily, synthesizeWithOpenRouter } from '../lib/api';
import { MarkdownRenderer } from './MarkdownRenderer';
import { TableOfContents } from './TableOfContents';
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
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const currentChat = chats.find(c => c.id === currentChatId);

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
    setIsAutoScrollEnabled(isAtBottom);
  };

  useEffect(() => {
    if (isAutoScrollEnabled) {
      messagesEndRef.current?.scrollIntoView({ behavior: isProcessing ? 'auto' : 'smooth' });
    }
  }, [currentChat?.messages, isProcessing, isAutoScrollEnabled]);

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
    setIsAutoScrollEnabled(true);

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
      <div className="flex-1 flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 text-zinc-500 dark:text-zinc-400">
        <Sparkles size={48} className="mb-4 opacity-50 text-blue-500" />
        <h2 className="text-2xl font-medium mb-2 text-zinc-900 dark:text-zinc-100 tracking-tight">Mac AI Search</h2>
        <p className="max-w-md text-center text-sm text-zinc-500 dark:text-zinc-400">
          Search the web with Perplexity or Tavily, and synthesize answers with top-tier models via OpenRouter.
        </p>
        <button 
          onClick={() => createChat()}
          className="mt-8 px-6 py-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-full hover:bg-zinc-800 dark:hover:bg-white transition-colors font-medium text-sm shadow-sm"
        >
          Start a New Chat
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-zinc-50 dark:bg-zinc-950 h-full relative overflow-hidden">
      <div className="h-14 border-b border-zinc-200 dark:border-zinc-800/50 flex items-center justify-between px-4 md:px-6 shrink-0 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-md z-10">
        <h2 className="font-medium text-zinc-900 dark:text-zinc-100 truncate pr-4 text-sm">
          {currentChat?.title}
        </h2>
        <button
          onClick={handleExport}
          className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          title="Export Chat to Markdown"
        >
          <Download size={16} />
        </button>
      </div>
      
      <div className="flex-1 flex overflow-hidden relative">
        <div 
          id="chat-scroll-container"
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-4 md:p-6 pb-32 scroll-smooth"
        >
          <div className="max-w-3xl mx-auto space-y-8">
            {currentChat?.messages.map((msg) => (
              <div key={msg.id} className={clsx("flex flex-col group", msg.role === 'user' ? 'items-end' : 'items-start')}>
                {msg.role === 'user' ? (
                  <div className="flex items-center space-x-2 max-w-[85%]">
                    <button
                      onClick={() => handleEdit(msg.id, msg.content)}
                      className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      title="Edit and resubmit"
                    >
                      <Pencil size={14} />
                    </button>
                    <div className="bg-zinc-200 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 px-5 py-3.5 rounded-3xl rounded-tr-sm text-[15px] leading-relaxed shadow-sm">
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  <div className="w-full">
                    {msg.status === 'searching' && (
                      <div className="flex items-center space-x-3 text-blue-500 mb-3 font-medium text-sm bg-blue-50 dark:bg-blue-500/10 w-fit px-4 py-2 rounded-full">
                        <Search size={14} className="animate-pulse" />
                        <span>Searching the web with {searchProvider === 'tavily' ? 'Tavily' : 'Perplexity'}...</span>
                      </div>
                    )}
                    {msg.status === 'synthesizing' && (
                      <div className="flex items-center space-x-3 text-purple-500 mb-3 font-medium text-sm bg-purple-50 dark:bg-purple-500/10 w-fit px-4 py-2 rounded-full">
                        <Sparkles size={14} className="animate-pulse" />
                        <span>Synthesizing answer with {openRouterModel}...</span>
                      </div>
                    )}
                    {msg.status === 'error' && (
                      <div className="flex items-center space-x-3 text-red-500 mb-3 font-medium text-sm bg-red-50 dark:bg-red-500/10 w-fit px-4 py-2 rounded-full">
                        <AlertCircle size={14} />
                        <span>Error occurred</span>
                      </div>
                    )}
                    
                    {msg.content && (
                      <div className="text-zinc-800 dark:text-zinc-200 text-[15px] leading-relaxed">
                        {msg.searchResults && (
                          <div className="mb-6 text-sm">
                            <button
                              onClick={() => setExpandedSearch(expandedSearch === msg.id ? null : msg.id)}
                              className="flex items-center space-x-1.5 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors font-medium bg-zinc-100 dark:bg-zinc-800/50 px-3 py-1.5 rounded-full"
                            >
                              <ChevronRight size={14} className={clsx("transition-transform", expandedSearch === msg.id && "rotate-90")} />
                              <span>View Search Context</span>
                            </button>
                            {expandedSearch === msg.id && (
                              <div className="mt-3 p-4 bg-white dark:bg-[#111] rounded-xl border border-zinc-200 dark:border-zinc-800/50 max-h-80 overflow-y-auto font-mono text-[11px] text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap shadow-sm">
                                {msg.searchResults}
                              </div>
                            )}
                          </div>
                        )}
                        <MarkdownRenderer content={msg.content} citations={msg.citations} />
                        
                        {msg.citations && msg.citations.length > 0 && (
                          <div className="mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-800/50">
                            <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider mb-3 flex items-center">
                              <LinkIcon size={12} className="mr-1.5" /> Sources
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
                                      className="inline-flex items-center px-2.5 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-500/50 dark:hover:border-blue-500/50 transition-all shadow-sm max-w-[200px]"
                                      title={url}
                                    >
                                      <span className="mr-2 text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 w-4 h-4 rounded-full flex items-center justify-center shrink-0">{i + 1}</span>
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
                )}
              </div>
            ))}
            <div ref={messagesEndRef} className="h-4" />
          </div>
        </div>

        {/* Table of Contents Sidebar */}
        {currentChat?.messages && (
          <TableOfContents messages={currentChat.messages} />
        )}
      </div>

      {/* Floating Input Area */}
      <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 bg-gradient-to-t from-zinc-50 via-zinc-50 to-transparent dark:from-zinc-950 dark:via-zinc-950 dark:to-transparent pointer-events-none">
        <div className="max-w-3xl mx-auto relative pointer-events-auto">
          <div className="flex items-center space-x-2 mb-3">
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors shadow-sm"
              >
                <span className="truncate max-w-[120px]">
                  {MODELS.find(m => m.id === openRouterModel)?.name || 'Select Model'}
                </span>
                <ChevronDown size={14} className="text-zinc-400" />
              </button>

              {isModelDropdownOpen && (
                <div className="absolute bottom-full left-0 mb-2 w-72 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden z-50">
                  <div className="p-2 space-y-1">
                    {MODELS.map((model) => (
                      <button
                        key={model.id}
                        onClick={() => {
                          setOpenRouterModel(model.id);
                          setIsModelDropdownOpen(false);
                        }}
                        className={clsx(
                          "w-full text-left px-3 py-2.5 rounded-xl flex items-start justify-between group transition-colors",
                          openRouterModel === model.id 
                            ? "bg-blue-50 dark:bg-blue-500/10" 
                            : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                        )}
                      >
                        <div className="flex-1 pr-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className={clsx(
                              "text-sm font-medium",
                              openRouterModel === model.id ? "text-blue-600 dark:text-blue-400" : "text-zinc-900 dark:text-zinc-100"
                            )}>
                              {model.name}
                            </span>
                            <span className="text-[10px] font-mono text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">{model.price}</span>
                          </div>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-tight">
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
                "flex items-center space-x-1.5 px-3.5 py-1.5 border rounded-full text-xs font-medium transition-colors shadow-sm",
                deepResearch 
                  ? "bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/30 text-purple-700 dark:text-purple-400" 
                  : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
              )}
            >
              <Sparkles size={14} className={deepResearch ? "text-purple-500" : "text-zinc-400"} />
              <span>Deep Research</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="relative flex items-end shadow-lg rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
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
              className="w-full bg-transparent rounded-2xl pl-5 pr-14 py-4 text-[15px] text-zinc-900 dark:text-zinc-100 focus:outline-none resize-none min-h-[56px] max-h-48 placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
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
            {isProcessing ? (
              <button
                type="button"
                onClick={handleStop}
                className="absolute right-2.5 bottom-2.5 p-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-white transition-colors"
                title="Stop generating"
              >
                <Square size={16} className="fill-current" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                className="absolute right-2.5 bottom-2.5 p-2 rounded-xl bg-blue-600 text-white disabled:opacity-50 disabled:bg-zinc-200 dark:disabled:bg-zinc-800 transition-colors"
              >
                <Send size={16} />
              </button>
            )}
          </form>
          <div className="text-center mt-3">
            <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium">
              AI can make mistakes. Check important info.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
