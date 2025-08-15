import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '../auth/AuthContext';

interface Heading {
  level: number;
  text: string;
  id: string;
}

interface DocChunk {
    type: 'unrestricted' | 'restricted';
    permission?: string;
    content: string;
}

const slugify = (text: string) => text.toLowerCase().replace(/`/g, '').replace(/[?,:!'"()]/g, '').replace(/\s+/g, '-');

const getTextContent = (node: React.ReactNode): string => {
    if (typeof node === 'string') return node;
    if (Array.isArray(node)) return node.map(getTextContent).join('');
    if (React.isValidElement(node)) {
        const props = node.props as { children?: React.ReactNode };
        if (props.children) {
            return getTextContent(props.children);
        }
    }
    return '';
};

// This component can now handle both dynamic (permission-based) and static markdown
const IntelligentDocumentationRenderer: React.FC<{ staticMarkdown?: string }> = ({ staticMarkdown }) => {
  const { user, hasPermission } = useAuth();
  const [markdown, setMarkdown] = useState('');
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const observer = useRef<IntersectionObserver | null>(null);
  const visibleHeadings = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (staticMarkdown !== undefined) {
      setMarkdown(staticMarkdown);
      setIsLoading(false);
      return;
    }
    
    if (!user || user.role !== 'standard') {
      setError("Ce guide est destiné au personnel standard.");
      setIsLoading(false);
      return;
    }

    const docPath = `/docs/standard.md`;

    const fetchDocs = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(docPath);
        if (!response.ok) {
          throw new Error(`La documentation standard n'a pas été trouvée.`);
        }
        const text = await response.text();
        setMarkdown(text);
      } catch (e) {
        if (e instanceof Error) setError(e.message);
        else setError('Une erreur inconnue est survenue.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocs();
  }, [user, staticMarkdown]);

  const filteredChunks = React.useMemo(() => {
    if (!markdown) return [];
    
    const chunks: DocChunk[] = [];
    const permissionRegex = /<!--\s*permission:\s*([^>]+?)\s*-->(.*?)<!--\s*\/permission\s*-->/gs;
    let lastIndex = 0;
    let match;

    while ((match = permissionRegex.exec(markdown)) !== null) {
        if (match.index > lastIndex) {
            chunks.push({ type: 'unrestricted', content: markdown.substring(lastIndex, match.index) });
        }
        chunks.push({ type: 'restricted', permission: match[1].trim(), content: match[2] });
        lastIndex = match.index + match[0].length;
    }

    if (lastIndex < markdown.length) {
        chunks.push({ type: 'unrestricted', content: markdown.substring(lastIndex) });
    }

    return chunks.filter(chunk => chunk.type === 'unrestricted' || (chunk.permission && hasPermission(chunk.permission)));
  }, [markdown, hasPermission]);
  
  const visibleMarkdown = React.useMemo(() => {
      return filteredChunks.map(chunk => chunk.content).join('');
  }, [filteredChunks]);

  useEffect(() => {
    if (!visibleMarkdown) return;
    
    const extractedHeadings: Heading[] = [];
    const lines = visibleMarkdown.split('\n');
    lines.forEach(line => {
      const match = line.match(/^(#{1,3})\s(.+)/);
      if (match) {
        const level = match[1].length;
        const textContent = match[2].trim();
        const id = slugify(textContent);
        extractedHeadings.push({ level, text: textContent, id });
      }
    });
    setHeadings(extractedHeadings);
  }, [visibleMarkdown]);


  useEffect(() => {
    if (headings.length === 0 || isLoading) return;

    const handleObserver = (entries: IntersectionObserverEntry[]) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) visibleHeadings.current.add(entry.target.id);
        else visibleHeadings.current.delete(entry.target.id);
      });
      
      let newActiveId = '';
      for (const h of headings) { if (visibleHeadings.current.has(h.id)) newActiveId = h.id; }
      setActiveId(newActiveId);
    };
    
    observer.current = new IntersectionObserver(handleObserver, { rootMargin: "0px 0px -80% 0px" });
    const elements = headings.map(h => document.getElementById(h.id)).filter(Boolean);
    elements.forEach(elem => observer.current?.observe(elem!));

    return () => observer.current?.disconnect();
  }, [headings, isLoading]);

  const handleTocClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const href = e.currentTarget.getAttribute('href');
    if (href) {
        const id = href.substring(1);
        const element = document.getElementById(id);
        if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const CustomHeading = ({ level, children }: { level: number, children: React.ReactNode }) => {
      const id = slugify(getTextContent(children));
      const Tag = `h${level}` as keyof JSX.IntrinsicElements;
      const classNames: { [key: number]: string } = {
          1: "text-3xl lg:text-4xl font-bold text-slate-900 font-display mt-8 mb-6 border-b-2 border-slate-200 pb-3",
          2: "text-2xl font-bold text-blue-700 font-display mt-12 mb-4",
          3: "text-xl font-semibold text-slate-800 font-display mt-8 mb-3"
      };
      return <Tag id={id} className={classNames[level]}>{children}</Tag>;
  };
  
  const markdownComponents = {
      h1: ({node, children}: any) => <CustomHeading level={1}>{children}</CustomHeading>,
      h2: ({node, children}: any) => <CustomHeading level={2}>{children}</CustomHeading>,
      h3: ({node, children}: any) => <CustomHeading level={3}>{children}</CustomHeading>,
      p: ({ node, children, ...props }: any) => {
        if (node?.children.some((child: any) => child.type === 'element' && child.tagName === 'pre')) {
          return <>{children}</>;
        }
        return <p className="text-base text-slate-600 leading-relaxed my-4" {...props}>{children}</p>;
      },
      pre: ({node, ...props}: any) => <pre className="bg-slate-800 text-white p-4 rounded-lg overflow-x-auto text-sm my-4" {...props} />,
      code: ({node, inline, className, children, ...props}: any) => {
        if (inline) return <code className="bg-slate-200 text-slate-800 font-mono text-sm px-1.5 py-0.5 rounded-md" {...props}>{children}</code>;
        return <code className={`font-mono ${className || ''}`} {...props}>{children}</code>;
      },
      a: ({node, ...props}: any) => <a className="text-blue-600 font-medium hover:underline" {...props} />,
      ul: ({node, ...props}: any) => <ul className="list-disc list-inside space-y-2 pl-4 my-4" {...props} />,
      ol: ({node, ...props}: any) => <ol className="list-decimal list-inside space-y-2 pl-4 my-4" {...props} />,
      li: ({node, ...props}: any) => <li className="text-slate-600" {...props} />,
      blockquote: ({node, ...props}: any) => <blockquote className="border-l-4 border-blue-500 bg-blue-50 text-blue-800 p-4 italic my-6 rounded-r-lg" {...props} />
  };

  return (
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
        <aside className="lg:col-span-1">
            <div className="sticky top-24">
                <h2 className="text-lg font-semibold mb-4 font-display text-slate-800">Sommaire</h2>
                <ul className="space-y-1 border-l-2 border-slate-200">
                    {headings.map(h => (
                        <li key={h.id}>
                            <a href={`#${h.id}`} onClick={handleTocClick}
                              className={`block border-l-2 -ml-0.5 py-1 transition-colors text-sm ${activeId === h.id ? 'border-blue-600 font-semibold text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                              style={{ paddingLeft: `${(h.level - 1) * 1 + 1}rem` }}>
                                {h.text.replace(/`/g, '')}
                            </a>
                        </li>
                    ))}
                </ul>
            </div>
        </aside>
        <main className="lg:col-span-3 bg-white p-6 sm:p-10 rounded-xl shadow-lg">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents as any}>
                {visibleMarkdown}
            </ReactMarkdown>
        </main>
      </div>
  );
};

export default IntelligentDocumentationRenderer;