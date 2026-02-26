import { useState, useRef, useEffect } from 'react';
import { Send, Search, Sparkles, AlertCircle, Link as LinkIcon, ChevronDown, Check, Square, Pencil, Download, ChevronRight, Menu, Paperclip, X } from 'lucide-react';
import { Browser } from '@capacitor/browser';
import { useStore, Message, Attachment } from '../lib/store';
import { searchWithPerplexity, searchWithTavily, synthesizeWithOpenRouter, generateRelatedQuestions } from '../lib/api';
import { MarkdownRenderer } from './MarkdownRenderer';
import { TableOfContents } from './TableOfContents';
import { motion, AnimatePresence } from 'motion/react';
import clsx from 'clsx';

const MODELS = [
  { id: 'arcee-ai/trinity-large-preview:free', name: 'Trinity Large', description: 'Best for general tasks', price: 'Free' },
  { id: 'z-ai/glm-5', name: 'GLM-5', description: 'Best for balanced tasks', price: '$$' },
  { id: 'moonshotai/kimi-k2.5', name: 'Kimi K2.5', description: 'Best for long context', price: '$$$' },
  { id: 'google/gemini-3-flash-preview', name: 'Gemini 3 Flash', description: 'Best for speed and reasoning', price: '$$$$' },
  { id: 'minimax/minimax-m2.5', name: 'Minimax m2.5', description: 'Best for creative writing', price: '$$' },
  { id: 'custom', name: 'Custom Model...', description: 'Enter any OpenRouter model ID', price: '?' },
];

export function ChatArea({ onOpenSettings, onMenuClick }: { onOpenSettings: () => void, onMenuClick: () => void }) {
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
    searchDomain,
    setDeepResearch,
    setOpenRouterModel,
    setSearchDomain
  } = useStore();

  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [expandedSearch, setExpandedSearch] = useState<string | null>(null);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments: Attachment[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isText = file.type.startsWith('text/') || file.name.endsWith('.md') || file.name.endsWith('.csv') || file.name.endsWith('.json');

      try {
        const data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = reject;
          if (isText) {
            reader.readAsText(file);
          } else {
            reader.readAsDataURL(file);
          }
        });

        newAttachments.push({
          id: crypto.randomUUID(),
          name: file.name,
          type: file.type,
          data,
          isText
        });
      } catch (err) {
        console.error("Error reading file:", err);
      }
    }

    setAttachments(prev => [...prev, ...newAttachments]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && attachments.length === 0) || isProcessing) return;

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

    let query = input.trim();
    if (searchDomain) {
      query = `${input.trim()} site:${searchDomain}`;
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      attachments: attachments.length > 0 ? [...attachments] : undefined
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
    setAttachments([]);
    setIsProcessing(true);
    setIsAutoScrollEnabled(true);

    abortControllerRef.current = new AbortController();

    try {
      let searchResults = '';
      let citations: string[] = [];

      if (searchProvider === 'perplexity') {
        const searchRes = await searchWithPerplexity(perplexityKey, query, deepResearch);
        searchResults = searchRes.choices?.[0]?.message?.content || '';
        citations = searchRes.citations || [];
      } else if (searchProvider === 'tavily') {
        const searchRes = await searchWithTavily(tavilyKey, query, deepResearch);
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
        searchDomain,
        abortControllerRef.current.signal
      );

      updateMessage(activeChatId, assistantMessageId, { status: 'done' });

      // Generate suggested follow-up questions
      const suggestions = await generateRelatedQuestions(
        openRouterKey,
        openRouterModel,
        history as any,
        fullContent,
        searchDomain
      );

      if (suggestions.length > 0) {
        updateMessage(activeChatId, assistantMessageId, { suggestedQuestions: suggestions });
      }
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
    <div className="flex-1 flex flex-col bg-zinc-50 dark:bg-zinc-950 h-full relative overflow-hidden pt-[env(safe-area-inset-top,0px)]">
      <div className="h-14 border-b border-zinc-200 dark:border-zinc-800/50 flex items-center justify-between px-4 md:px-6 shrink-0 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-md z-10">
        <div className="flex items-center space-x-3 overflow-hidden">
          <button
            onClick={onMenuClick}
            className="md:hidden p-1.5 -ml-1.5 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <Menu size={18} />
          </button>
          <h2 className="font-medium text-zinc-900 dark:text-zinc-100 truncate pr-4 text-sm">
            {currentChat?.title}
          </h2>
        </div>
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
            <AnimatePresence initial={false}>
              {currentChat?.messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                  className={clsx("flex flex-col group", msg.role === 'user' ? 'items-end' : 'items-start')}
                >
                  {msg.role === 'user' ? (
                    <div className="flex items-center space-x-2 max-w-[85%]">
                      <button
                        onClick={() => handleEdit(msg.id, msg.content)}
                        className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        title="Edit and resubmit"
                      >
                        <Pencil size={14} />
                      </button>
                      <div className="bg-white dark:bg-[#222222] text-zinc-900 dark:text-zinc-100 px-5 py-3.5 rounded-3xl rounded-tr-sm text-[15px] leading-relaxed shadow-sm ring-1 ring-black/5 dark:ring-white/5">
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-4">
                            {msg.attachments.map(att => (
                              <div key={att.id} className="flex items-center space-x-2 bg-zinc-100 dark:bg-zinc-800/80 px-3 py-2 rounded-2xl text-[11px] font-bold text-zinc-600 dark:text-zinc-300 ring-1 ring-black/5 shadow-sm">
                                <div className="w-6 h-6 rounded-lg bg-white dark:bg-zinc-900 flex items-center justify-center shadow-inner">
                                  <Paperclip size={12} className="text-blue-500" />
                                </div>
                                <span className="truncate max-w-[150px]">{att.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {msg.content}
                      </div>
                    </div>
                  ) : (
                    <div className="w-full">
                      {msg.status === 'searching' && (
                        <div className="flex items-center space-x-3 text-blue-500 mb-3 font-medium text-sm bg-white dark:bg-[#222222] ring-1 ring-black/5 dark:ring-white/5 shadow-sm w-fit px-4 py-2 rounded-full">
                          <Search size={14} className="animate-pulse" />
                          <span>Searching the web with {searchProvider === 'tavily' ? 'Tavily' : 'Perplexity'}...</span>
                        </div>
                      )}
                      {msg.status === 'synthesizing' && (
                        <div className="flex items-center space-x-3 text-purple-500 mb-3 font-medium text-sm bg-white dark:bg-[#222222] ring-1 ring-black/5 dark:ring-white/5 shadow-sm w-fit px-4 py-2 rounded-full">
                          <Sparkles size={14} className="animate-pulse" />
                          <span>Synthesizing answer with {openRouterModel}...</span>
                        </div>
                      )}
                      {msg.status === 'error' && (
                        <div className="flex items-center space-x-3 text-red-500 mb-3 font-medium text-sm bg-white dark:bg-[#222222] ring-1 ring-black/5 dark:ring-white/5 shadow-sm w-fit px-4 py-2 rounded-full">
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
                                <div className="mt-3 p-4 bg-white dark:bg-[#111] rounded-xl border border-black/5 dark:border-white/5 max-h-80 overflow-y-auto font-mono text-[11px] text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap shadow-inner">
                                  {msg.searchResults}
                                </div>
                              )}
                            </div>
                          )}
                          <MarkdownRenderer content={msg.content} citations={msg.citations} />

                          {msg.suggestedQuestions && msg.suggestedQuestions.length > 0 && (
                            <div className="mt-8 space-y-3">
                              <div className="flex items-center space-x-2 px-1">
                                <Sparkles size={12} className="text-zinc-400" />
                                <h4 className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Suggested Follow-ups</h4>
                              </div>
                              <div className="flex flex-col space-y-2">
                                {msg.suggestedQuestions.map((q, idx) => (
                                  <button
                                    key={idx}
                                    onClick={() => {
                                      setInput(q);
                                      setTimeout(() => {
                                        const form = document.querySelector('form');
                                        if (form) {
                                          const event = new Event('submit', { cancelable: true, bubbles: true });
                                          form.dispatchEvent(event);
                                        }
                                      }, 50);
                                    }}
                                    className="w-full text-left px-4 py-3 bg-white dark:bg-[#222222] border border-black/5 dark:border-white/5 rounded-2xl text-[13px] text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-500/20 dark:hover:border-blue-500/30 hover:bg-blue-50/30 dark:hover:bg-blue-500/5 transition-all group flex items-center justify-between shadow-sm"
                                  >
                                    <span>{q}</span>
                                    <ChevronRight size={14} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-blue-500" />
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {msg.citations && msg.citations.length > 0 && (
                            <div className="mt-8 pt-6 border-t border-black/5 dark:border-white/5">
                              <div className="flex items-center justify-between mb-4">
                                <h4 className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-widest flex items-center">
                                  <LinkIcon size={12} className="mr-2 text-blue-500" /> Sources
                                </h4>
                                <div className="flex items-center space-x-1.5 px-2 py-0.5 bg-green-50 dark:bg-green-500/10 border border-green-200/50 dark:border-green-500/20 rounded-full text-[10px] font-bold text-green-600 dark:text-green-400 uppercase tracking-tight">
                                  <Check size={10} strokeWidth={3} />
                                  <span>Verified</span>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {msg.citations.map((url, i) => {
                                  try {
                                    const domain = new URL(url).hostname.replace('www.', '');
                                    return (
                                      <button
                                        key={i}
                                        onClick={async (e) => {
                                          e.preventDefault();
                                          await Browser.open({ url });
                                        }}
                                        className="group inline-flex items-center px-3 py-2 bg-white dark:bg-[#222222] border border-black/5 dark:border-white/5 rounded-xl text-xs text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-500/20 dark:hover:border-blue-500/30 hover:shadow-md hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all max-w-[220px]"
                                        title={url}
                                      >
                                        <span className="mr-2 text-[10px] bg-[#F9F9F9] dark:bg-[#111111] text-zinc-500 dark:text-zinc-400 w-5 h-5 rounded-full flex items-center justify-center shrink-0 group-hover:bg-blue-50 dark:group-hover:bg-blue-500/10 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors font-bold shadow-sm ring-1 ring-black/5">{i + 1}</span>
                                        <img src={`https://www.google.com/s2/favicons?domain=${domain}&sz=16`} alt="" className="w-3.5 h-3.5 mr-2 rounded-sm opacity-70 group-hover:opacity-100 transition-opacity shrink-0" />
                                        <span className="truncate font-medium">{domain}</span>
                                      </button>
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
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={messagesEndRef} className="h-48 shrink-0" />
          </div>
        </div>

        {/* Table of Contents Sidebar */}
        {currentChat?.messages && (
          <TableOfContents messages={currentChat.messages} />
        )}
      </div>

      {/* Floating Input Area */}
      <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 bg-gradient-to-t from-zinc-50 via-zinc-50/90 to-transparent dark:from-zinc-950 dark:via-zinc-950/90 dark:to-transparent pointer-events-none z-20">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
          className="max-w-3xl mx-auto relative pointer-events-auto"
        >
          <div className="flex items-center space-x-2 mb-3">
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors shadow-sm"
              >
                <span className="truncate max-w-[120px]">
                  {MODELS.find(m => m.id === openRouterModel)?.name || (openRouterModel ? 'Custom Model' : 'Select Model')}
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
                          if (model.id === 'custom') {
                            onOpenSettings();
                          } else {
                            setOpenRouterModel(model.id);
                          }
                          setIsModelDropdownOpen(false);
                        }}
                        className={clsx(
                          "w-full text-left px-3 py-2.5 rounded-xl flex items-start justify-between group transition-colors",
                          (openRouterModel === model.id || (model.id === 'custom' && !MODELS.find(m => m.id === openRouterModel && m.id !== 'custom')))
                            ? "bg-blue-50 dark:bg-blue-500/10"
                            : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                        )}
                      >
                        <div className="flex-1 pr-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className={clsx(
                              "text-sm font-medium",
                              (openRouterModel === model.id || (model.id === 'custom' && !MODELS.find(m => m.id === openRouterModel && m.id !== 'custom'))) ? "text-blue-600 dark:text-blue-400" : "text-zinc-900 dark:text-zinc-100"
                            )}>
                              {model.name}
                            </span>
                            <span className="text-[10px] font-mono text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">{model.price}</span>
                          </div>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-tight">
                            {model.description}
                          </p>
                        </div>
                        {(openRouterModel === model.id || (model.id === 'custom' && !MODELS.find(m => m.id === openRouterModel && m.id !== 'custom'))) && (
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

            <div className="flex items-center space-x-2 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest bg-white dark:bg-zinc-900 px-3 py-1.5 rounded-full ring-1 ring-black/5 dark:ring-white/5 shadow-sm">
              <Search size={10} />
              <input
                type="text"
                placeholder="Domain Filter (site:)"
                value={searchDomain}
                onChange={(e) => setSearchDomain(e.target.value)}
                className="bg-transparent border-none outline-none text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400/50 ml-1 w-32"
              />
              {searchDomain && (
                <button onClick={() => setSearchDomain('')} className="hover:text-red-500">
                  <X size={10} />
                </button>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="relative flex flex-col shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] rounded-3xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800/50 transition-all focus-within:ring-2 focus-within:ring-blue-500/20">
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 px-4 pt-4 pb-1">
                {attachments.map(att => (
                  <div key={att.id} className="flex items-center space-x-1.5 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-300">
                    <Paperclip size={12} />
                    <span className="truncate max-w-[150px]">{att.name}</span>
                    <button type="button" onClick={() => removeAttachment(att.id)} className="ml-1 hover:text-red-500 transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="relative flex items-end w-full">
              <input
                type="file"
                multiple
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute left-2.5 bottom-2.5 p-2 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                title="Attach files"
              >
                <Paperclip size={18} />
              </button>
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
                className="w-full bg-transparent rounded-3xl pl-12 pr-14 py-4 text-[15px] text-zinc-900 dark:text-zinc-100 focus:outline-none resize-none min-h-[56px] max-h-48 placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
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
                  disabled={!input.trim() && attachments.length === 0}
                  className="absolute right-2.5 bottom-2.5 p-2 rounded-xl bg-blue-600 text-white disabled:opacity-50 disabled:bg-zinc-200 dark:disabled:bg-zinc-800 transition-colors"
                >
                  <Send size={16} />
                </button>
              )}
            </div>
          </form>
          <div className="text-center mt-3">
            <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium tracking-wide">
              AI can make mistakes. Check important info.
            </span>
          </div>
        </motion.div>
      </div>
    </div >
  );
}
