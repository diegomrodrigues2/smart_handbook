import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import python from 'react-syntax-highlighter/dist/esm/languages/hljs/python';
import java from 'react-syntax-highlighter/dist/esm/languages/hljs/java';
import cpp from 'react-syntax-highlighter/dist/esm/languages/hljs/cpp';
import typescript from 'react-syntax-highlighter/dist/esm/languages/hljs/typescript';
import go from 'react-syntax-highlighter/dist/esm/languages/hljs/go';
import rust from 'react-syntax-highlighter/dist/esm/languages/hljs/rust';
import sql from 'react-syntax-highlighter/dist/esm/languages/hljs/sql';
import scala from 'react-syntax-highlighter/dist/esm/languages/hljs/scala';
import { ProgrammingLanguage } from '../../types';

// Register languages
SyntaxHighlighter.registerLanguage('python', python);
SyntaxHighlighter.registerLanguage('java', java);
SyntaxHighlighter.registerLanguage('cpp', cpp);
SyntaxHighlighter.registerLanguage('typescript', typescript);
SyntaxHighlighter.registerLanguage('go', go);
SyntaxHighlighter.registerLanguage('rust', rust);
SyntaxHighlighter.registerLanguage('sql', sql);
SyntaxHighlighter.registerLanguage('scala', scala);

interface CodeEditorProps {
    code: string;
    language: ProgrammingLanguage;
    onChange: (code: string) => void;
    disabled?: boolean;
}

const LANGUAGE_LABELS: Record<ProgrammingLanguage, { name: string; color: string; hljs: string }> = {
    python: { name: 'Python', color: 'text-blue-500', hljs: 'python' },
    java: { name: 'Java', color: 'text-orange-500', hljs: 'java' },
    cpp: { name: 'C++', color: 'text-purple-500', hljs: 'cpp' },
    typescript: { name: 'TypeScript', color: 'text-blue-600', hljs: 'typescript' },
    go: { name: 'Go', color: 'text-cyan-500', hljs: 'go' },
    rust: { name: 'Rust', color: 'text-orange-600', hljs: 'rust' },
    sql: { name: 'SQL', color: 'text-emerald-500', hljs: 'sql' },
    pyspark: { name: 'PySpark', color: 'text-orange-400', hljs: 'python' },
    scala: { name: 'Scala', color: 'text-red-500', hljs: 'scala' }
};

const CodeEditor: React.FC<CodeEditorProps> = ({ code, language, onChange, disabled }) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const highlightRef = useRef<HTMLDivElement>(null);
    const [lineCount, setLineCount] = useState(1);

    useEffect(() => {
        const lines = code.split('\n').length;
        setLineCount(lines);
    }, [code]);

    const syncScroll = useCallback(() => {
        if (highlightRef.current && textareaRef.current) {
            highlightRef.current.scrollTop = textareaRef.current.scrollTop;
            highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
        }
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // Tab handling
        if (e.key === 'Tab') {
            e.preventDefault();
            const target = e.target as HTMLTextAreaElement;
            const start = target.selectionStart;
            const end = target.selectionEnd;
            const newValue = code.substring(0, start) + '    ' + code.substring(end);
            onChange(newValue);
            // Set cursor position after tab
            requestAnimationFrame(() => {
                target.selectionStart = target.selectionEnd = start + 4;
            });
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onChange(e.target.value);
    };

    const langInfo = LANGUAGE_LABELS[language];

    // Custom style to match our dark theme
    const customStyle = {
        ...atomOneDark,
        'hljs': {
            ...atomOneDark['hljs'],
            background: 'transparent',
            padding: '12px',
            fontSize: '14px',
            lineHeight: '24px',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        }
    };

    return (
        <div className="h-full flex flex-col bg-gray-900">
            {/* Editor Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
                <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    </div>
                    <span className="text-xs text-gray-400 ml-3">solution.{getExtension(language)}</span>
                </div>
                <span className={`text-xs font-medium ${langInfo.color}`}>
                    <i className="fa-solid fa-code mr-1"></i>
                    {langInfo.name}
                </span>
            </div>

            {/* Editor Body */}
            <div className="flex-1 flex overflow-hidden">
                {/* Line Numbers */}
                <div
                    className="bg-gray-800 text-gray-500 text-right pr-3 pl-2 pt-3 text-sm font-mono select-none overflow-hidden flex-shrink-0"
                    style={{ minWidth: '50px', lineHeight: '24px' }}
                >
                    {Array.from({ length: lineCount }, (_, i) => (
                        <div key={i + 1} style={{ height: '24px' }}>
                            {i + 1}
                        </div>
                    ))}
                </div>

                {/* Code Area with Overlay */}
                <div className="flex-1 relative overflow-hidden">
                    {/* Syntax Highlighted Background */}
                    <div
                        ref={highlightRef}
                        className="absolute inset-0 overflow-auto pointer-events-none"
                        aria-hidden="true"
                    >
                        <SyntaxHighlighter
                            language={langInfo.hljs}
                            style={customStyle}
                            customStyle={{
                                margin: 0,
                                minHeight: '100%',
                                whiteSpace: 'pre',
                                wordBreak: 'keep-all',
                                overflowWrap: 'normal',
                            }}
                            codeTagProps={{
                                style: {
                                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                                    fontSize: '14px',
                                    lineHeight: '24px',
                                }
                            }}
                        >
                            {code + '\n'}
                        </SyntaxHighlighter>
                    </div>

                    {/* Transparent Textarea for Input */}
                    <textarea
                        ref={textareaRef}
                        value={code}
                        onChange={handleChange}
                        onScroll={syncScroll}
                        onKeyDown={handleKeyDown}
                        disabled={disabled}
                        className={`
                            absolute inset-0 w-full h-full resize-none outline-none p-3
                            font-mono text-sm overflow-auto
                            bg-transparent text-transparent caret-blue-400
                            ${disabled ? 'cursor-not-allowed' : ''}
                        `}
                        style={{
                            lineHeight: '24px',
                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                            fontSize: '14px',
                        }}
                        spellCheck={false}
                        placeholder="// Analise e melhore este código..."
                    />
                </div>
            </div>

            {/* Status Bar */}
            <div className="flex items-center justify-between px-4 py-1.5 bg-gray-800 border-t border-gray-700 text-xs">
                <div className="flex items-center gap-4 text-gray-400">
                    <span>
                        <i className="fa-solid fa-code-branch mr-1"></i>
                        main
                    </span>
                    <span>
                        <i className="fa-solid fa-lines-leaning mr-1"></i>
                        {lineCount} linhas
                    </span>
                </div>
                <div className="flex items-center gap-3 text-gray-500">
                    <span>UTF-8</span>
                    <span>4 Spaces</span>
                </div>
            </div>
        </div>
    );
};

function getExtension(lang: ProgrammingLanguage): string {
    const extensions: Record<ProgrammingLanguage, string> = {
        python: 'py',
        java: 'java',
        cpp: 'cpp',
        typescript: 'ts',
        go: 'go',
        rust: 'rs',
        sql: 'sql',
        pyspark: 'py',
        scala: 'scala'
    };
    return extensions[lang];
}

export default CodeEditor;
