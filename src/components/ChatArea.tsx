import { useState, useRef, useEffect } from 'react';
import { Send, Search, Sparkles, AlertCircle, Link as LinkIcon } from 'lucide-react';
import { useStore, Message } from '../lib/store';
import { searchWithPerplexity, synthesizeWithOpenRouter } from '../lib/api';
import { MarkdownRenderer } from './MarkdownRenderer';
import clsx from 'clsx';

export function ChatArea({ onOpenSettings }: { onOpenSettings: () => void }) {
  const { 
    chats, 
    currentChatId, 
    createChat, 
    addMessage, 
    updateMessage,
    perplexityKey,
    openRouterKey,
    openRouterModel
  } = useStore();
  
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentChat = chats.find(c => c.id === currentChatId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentChat?.messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;

    if (!perplexityKey || !openRouterKey) {
      alert('Please configure your API keys in Settings first.');
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
      status: 'searching',
    };

    addMessage(activeChatId, userMessage);
    addMessage(activeChatId, assistantMessage);
    setInput('');
    setIsProcessing(true);

    try {
      // Step 1: Search with Perplexity
      const searchRes = await searchWithPerplexity(perplexityKey, userMessage.content);
      const searchResults = searchRes.choices?.[0]?.message?.content || '';
      const citations = searchRes.citations || [];

      updateMessage(activeChatId, assistantMessageId, { 
        status: 'synthesizing',
        citations
      });

      // Step 2: Synthesize with OpenRouter (Minimax)
      let fullContent = '';
      await synthesizeWithOpenRouter(
        openRouterKey,
        openRouterModel,
        userMessage.content,
        searchResults,
        (chunk) => {
          fullContent += chunk;
          updateMessage(activeChatId, assistantMessageId, { content: fullContent });
        }
      );

      updateMessage(activeChatId, assistantMessageId, { status: 'done' });
    } catch (error: any) {
      console.error(error);
      updateMessage(activeChatId, assistantMessageId, { 
        status: 'error',
        content: error.message || 'An error occurred during processing.'
      });
    } finally {
      setIsProcessing(false);
    }
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
        <select
          value={openRouterModel}
          onChange={(e) => useStore.getState().setOpenRouterModel(e.target.value)}
          className="bg-gray-50 dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-700 rounded-md px-2 py-1.5 text-xs text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[150px] md:max-w-[200px] truncate"
        >
          <option value="arcee-ai/trinity-large-preview:free">Trinity Large (Free)</option>
          <option value="z-ai/glm-5">GLM-5</option>
          <option value="moonshotai/kimi-k2.5">Kimi K2.5</option>
          <option value="google/gemini-3-flash-preview">Gemini 3 Flash</option>
          <option value="minimax/minimax-m2.5">Minimax m2.5</option>
        </select>
      </div>
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        {currentChat?.messages.map((msg) => (
          <div key={msg.id} className={clsx("flex flex-col max-w-3xl mx-auto", msg.role === 'user' ? 'items-end' : 'items-start')}>
            {msg.role === 'user' ? (
              <div className="bg-gray-100 dark:bg-[#333333] text-gray-900 dark:text-gray-100 px-4 py-3 rounded-2xl rounded-tr-sm max-w-[85%]">
                {msg.content}
              </div>
            ) : (
              <div className="w-full">
                {msg.status === 'searching' && (
                  <div className="flex items-center space-x-2 text-blue-500 mb-2 font-medium text-sm">
                    <Search size={16} className="animate-pulse" />
                    <span>Searching the web with Perplexity...</span>
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
