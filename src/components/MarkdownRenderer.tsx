import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import React from 'react';

function flatten(text: string, child: any): string {
  if (typeof child === 'string' || typeof child === 'number') {
    return text + child;
  }
  if (child && child.props && child.props.children) {
    return React.Children.toArray(child.props.children).reduce(flatten, text) as string;
  }
  return text;
}

const HeadingRenderer = (props: any) => {
  const children = React.Children.toArray(props.children);
  const text = children.reduce(flatten, '') as string;
  const slug = String(text).toLowerCase().replace(/[^\w]+/g, '-');
  return React.createElement('h' + props.node.tagName.charAt(1), { id: slug, ...props }, props.children);
};

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
    <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none prose-headings:font-medium prose-a:text-blue-500 hover:prose-a:text-blue-600 dark:prose-a:text-blue-400 dark:hover:prose-a:text-blue-300 prose-pre:bg-zinc-100 dark:prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-zinc-200 dark:prose-pre:border-zinc-800">
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        components={{
          h1: HeadingRenderer,
          h2: HeadingRenderer,
          h3: HeadingRenderer,
          h4: HeadingRenderer,
          h5: HeadingRenderer,
          h6: HeadingRenderer,
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}
