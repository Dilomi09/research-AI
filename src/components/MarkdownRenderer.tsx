import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function MarkdownRenderer({ content, citations }: { content: string, citations?: string[] }) {
  let processedContent = content;
  
  if (citations && citations.length > 0) {
    // Replace [1] or [1, 2] with markdown links, ignoring if already a link
    processedContent = content.replace(/\[([\d,\s]+)\](?!\()/g, (match, p1) => {
      const numbers = p1.split(',').map(n => n.trim());
      let hasValidLink = false;
      const formattedLinks = numbers.map(n => {
        const index = parseInt(n, 10) - 1;
        if (!isNaN(index) && citations[index]) {
          hasValidLink = true;
          return `[${n}](${citations[index]})`;
        }
        return n;
      });
      
      if (hasValidLink) {
        return `[${formattedLinks.join(', ')}]`;
      }
      return match;
    });
  }

  return (
    <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}
