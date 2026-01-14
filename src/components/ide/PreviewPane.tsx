/**
 * PreviewPane - Preview markdown and HTML files
 * 
 * Features:
 * - Live markdown rendering with GFM support
 * - Sandboxed HTML preview
 * - Syntax highlighting for code blocks
 */

import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

interface PreviewPaneProps {
  content: string;
  language: string;
  filename: string;
}

export function PreviewPane({ content, language, filename }: PreviewPaneProps) {
  const isMarkdown = language === "markdown" || 
                      filename.endsWith(".md") || 
                      filename.endsWith(".mdx");
  
  const isHtml = language === "html" || 
                  filename.endsWith(".html") || 
                  filename.endsWith(".htm");

  // For HTML, create a blob URL with sandboxing
  const htmlPreviewUrl = useMemo(() => {
    if (!isHtml) return null;
    
    // Wrap content in a basic HTML structure if it doesn't have one
    let htmlContent = content;
    if (!content.toLowerCase().includes("<!doctype") && !content.toLowerCase().includes("<html")) {
      htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 20px;
      margin: 0;
      background: #ffffff;
      color: #1e1e1e;
    }
  </style>
</head>
<body>
${content}
</body>
</html>`;
    }
    
    const blob = new Blob([htmlContent], { type: "text/html" });
    return URL.createObjectURL(blob);
  }, [content, isHtml]);

  if (isMarkdown) {
    return (
      <div className="h-full overflow-auto bg-[#1e1e1e] p-6">
        <article className="prose prose-invert max-w-none
          prose-headings:text-white prose-headings:font-semibold
          prose-h1:text-2xl prose-h1:border-b prose-h1:border-[#3c3c3c] prose-h1:pb-2
          prose-h2:text-xl prose-h2:mt-6 
          prose-h3:text-lg
          prose-p:text-[#d4d4d4] prose-p:leading-relaxed
          prose-a:text-[#7DD3FC] prose-a:no-underline hover:prose-a:underline
          prose-strong:text-white prose-strong:font-semibold
          prose-code:text-[#ce9178] prose-code:bg-[#252526] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none
          prose-pre:bg-[#252526] prose-pre:border prose-pre:border-[#3c3c3c] prose-pre:rounded-lg
          prose-blockquote:border-[#7DD3FC] prose-blockquote:text-[#9ca3af]
          prose-ul:text-[#d4d4d4] prose-ol:text-[#d4d4d4]
          prose-li:marker:text-[#6b7280]
          prose-hr:border-[#3c3c3c]
          prose-table:text-[#d4d4d4]
          prose-th:bg-[#252526] prose-th:text-white prose-th:px-3 prose-th:py-2
          prose-td:px-3 prose-td:py-2 prose-td:border-[#3c3c3c]
        ">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
          >
            {content}
          </ReactMarkdown>
        </article>
      </div>
    );
  }

  if (isHtml && htmlPreviewUrl) {
    return (
      <div className="h-full w-full bg-white">
        <iframe
          src={htmlPreviewUrl}
          className="h-full w-full border-0"
          sandbox="allow-scripts allow-same-origin"
          title={`Preview: ${filename}`}
        />
      </div>
    );
  }

  // Fallback - show raw content
  return (
    <div className="h-full overflow-auto bg-[#1e1e1e] p-4">
      <pre className="font-mono text-sm text-[#d4d4d4] whitespace-pre-wrap">
        {content}
      </pre>
    </div>
  );
}
