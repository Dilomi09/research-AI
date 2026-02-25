import { useEffect, useState } from 'react';
import { Message } from '../lib/store';
import clsx from 'clsx';

interface TocItem {
  id: string;
  text: string;
  level: number;
}

export function TableOfContents({ messages }: { messages: Message[] }) {
  const [items, setItems] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    // Extract headings from assistant messages
    const newItems: TocItem[] = [];
    messages.forEach((msg) => {
      if (msg.role === 'assistant' && msg.content) {
        // Regex to match markdown headings
        const headingRegex = /^(#{1,3})\s+(.+)$/gm;
        let match;
        while ((match = headingRegex.exec(msg.content)) !== null) {
          const level = match[1].length;
          const text = match[2].replace(/<[^>]+>/g, '').trim();
          const id = text.toLowerCase().replace(/[^\w]+/g, '-');
          newItems.push({ id, text, level });
        }
      }
    });
    setItems(newItems);
  }, [messages]);

  useEffect(() => {
    const handleScroll = () => {
      const headingElements = items.map((item) => document.getElementById(item.id)).filter(Boolean);
      
      let currentActiveId = '';
      for (const element of headingElements) {
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top <= 100) {
            currentActiveId = element.id;
          } else {
            break;
          }
        }
      }
      
      if (currentActiveId) {
        setActiveId(currentActiveId);
      }
    };

    const container = document.getElementById('chat-scroll-container');
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [items]);

  if (items.length === 0) return null;

  return (
    <div className="hidden xl:block w-64 shrink-0 pl-6 border-l border-black/5 dark:border-white/5 overflow-y-auto h-full py-6">
      <h3 className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-4">
        On this page
      </h3>
      <ul className="space-y-2">
        {items.map((item, index) => (
          <li 
            key={`${item.id}-${index}`}
            style={{ paddingLeft: `${(item.level - 1) * 0.75}rem` }}
          >
            <a
              href={`#${item.id}`}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' });
              }}
              className={clsx(
                "block text-[13px] transition-colors truncate",
                activeId === item.id 
                  ? "text-blue-600 dark:text-blue-400 font-medium" 
                  : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
              )}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
