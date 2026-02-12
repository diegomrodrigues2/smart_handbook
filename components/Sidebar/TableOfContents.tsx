import React, { useMemo } from 'react';

interface TocHeading {
    level: number;
    text: string;
    id: string;
}

interface TableOfContentsProps {
    content: string;
    onHeadingClick?: (headingId: string) => void;
}

/**
 * Generate a slug from heading text (same logic used in MarkdownViewer heading IDs).
 */
function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
}

/**
 * Parse markdown content and extract h1-h4 headings.
 * Only considers ATX-style headings (lines starting with #).
 */
function extractHeadings(content: string): TocHeading[] {
    const lines = content.split('\n');
    const headings: TocHeading[] = [];
    let inCodeBlock = false;

    for (const line of lines) {
        // Track code fences
        if (/^(`{3,}|~{3,})/.test(line.trim())) {
            inCodeBlock = !inCodeBlock;
            continue;
        }
        if (inCodeBlock) continue;

        const match = line.match(/^(#{1,4})\s+(.+)/);
        if (match) {
            const level = match[1].length;
            const text = match[2].replace(/\s*#+\s*$/, '').trim(); // Remove trailing #
            headings.push({
                level,
                text,
                id: `heading-${slugify(text)}`
            });
        }
    }

    return headings;
}

const levelStyles: Record<number, { paddingLeft: string; fontSize: string; fontWeight: string; color: string; icon: string }> = {
    1: { paddingLeft: '0px', fontSize: '13px', fontWeight: '700', color: '#1e293b', icon: '' },
    2: { paddingLeft: '12px', fontSize: '12.5px', fontWeight: '600', color: '#334155', icon: '' },
    3: { paddingLeft: '24px', fontSize: '12px', fontWeight: '500', color: '#64748b', icon: '' },
    4: { paddingLeft: '36px', fontSize: '11.5px', fontWeight: '400', color: '#94a3b8', icon: '' },
};

const TableOfContents: React.FC<TableOfContentsProps> = ({ content, onHeadingClick }) => {
    const headings = useMemo(() => extractHeadings(content), [content]);

    if (headings.length === 0) {
        return (
            <div className="p-4 text-center text-gray-400 text-xs mt-4">
                <i className="fa-solid fa-list-ol mr-1.5"></i>
                No headings found.
            </div>
        );
    }

    const handleClick = (headingId: string) => {
        // Try scrolling to the element directly
        const element = document.getElementById(headingId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        onHeadingClick?.(headingId);
    };

    return (
        <div className="py-2 toc-container">
            <div className="px-3 py-2 mb-1">
                <span className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold flex items-center gap-1.5">
                    <i className="fa-solid fa-list-ol text-[9px]"></i>
                    Table of Contents
                </span>
            </div>
            <nav>
                {headings.map((heading, index) => {
                    const style = levelStyles[heading.level] || levelStyles[4];
                    return (
                        <button
                            key={`${heading.id}-${index}`}
                            onClick={() => handleClick(heading.id)}
                            className="w-full text-left px-3 py-1.5 hover:bg-blue-50 transition-colors duration-150 group flex items-center gap-1.5 rounded-r-md border-l-2 border-transparent hover:border-indigo-400"
                            style={{ paddingLeft: `calc(12px + ${style.paddingLeft})` }}
                            title={heading.text}
                        >
                            {heading.level === 1 && (
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0"></span>
                            )}
                            {heading.level === 2 && (
                                <span className="w-1 h-1 rounded-full bg-indigo-400 flex-shrink-0"></span>
                            )}
                            {heading.level >= 3 && (
                                <span className="w-0.5 h-0.5 rounded-full bg-gray-400 flex-shrink-0"></span>
                            )}
                            <span
                                className="truncate group-hover:text-indigo-700 transition-colors duration-150"
                                style={{
                                    fontSize: style.fontSize,
                                    fontWeight: style.fontWeight,
                                    color: style.color,
                                }}
                            >
                                {heading.text}
                            </span>
                        </button>
                    );
                })}
            </nav>
        </div>
    );
};

export { slugify };
export default TableOfContents;
