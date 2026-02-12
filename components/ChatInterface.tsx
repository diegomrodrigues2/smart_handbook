import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import { github } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import Mermaid from './Mermaid';
import { ChatMessage } from '../types';
import { streamGeminiResponse } from '../services/geminiService';
import { useSubjectMode } from '../hooks';

interface ChatInterfaceProps {
  currentContext: string;
  isOpen: boolean;
  onClose: () => void;
  width?: number;
  isResizing?: boolean;
  onStartResizing?: (e: React.MouseEvent) => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  currentContext,
  isOpen,
  onClose,
  width = 400,
  isResizing = false,
  onStartResizing
}) => {
  const { mode, isMathMode } = useSubjectMode();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [thinkingSteps, setThinkingSteps] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, thinkingSteps]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    setThinkingSteps(['Analisando o contexto...', 'Identificando referências chave...']);

    // Mock thinking delay for visual effect seen in image
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setThinkingSteps((prev) => [...prev, 'Planejando a resposta...']);

    const responseId = (Date.now() + 1).toString();
    let fullResponse = '';

    // Pass the last 3 Q&A pairs (last 6 messages)
    const history = messages.slice(-6);

    await streamGeminiResponse(userMsg.text, currentContext, history, mode, (chunk) => {
      fullResponse += chunk;
      setMessages((prev) => {
        const existing = prev.find(m => m.id === responseId);
        if (existing) {
          return prev.map(m => m.id === responseId ? { ...m, text: fullResponse } : m);
        } else {
          return [...prev, {
            id: responseId,
            role: 'model',
            text: fullResponse,
            timestamp: new Date(),
            isThinking: false
          }];
        }
      });
      setThinkingSteps([]); // Clear thinking once streaming starts
    });

    setIsLoading(false);
  };

  const handleClear = () => {
    if (window.confirm('Tem certeza que deseja limpar o histórico da conversa?')) {
      setMessages([]);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="h-full bg-white flex flex-col shadow-xl z-10 absolute right-0 top-0 lg:relative lg:shadow-none"
      style={{ width: `${width}px` }}
    >
      {/* Resize Handle */}
      {onStartResizing && (
        <div
          className={`absolute left-0 top-0 w-1 h-full cursor-col-resize hover:bg-blue-400 transition-colors ${isResizing ? 'bg-blue-500' : 'bg-transparent hover:bg-blue-300'}`}
          onMouseDown={onStartResizing}
          title="Arrastar para redimensionar"
        />
      )}

      {/* Header */}
      <div className="h-12 border-b border-gray-200 flex items-center justify-between px-4 bg-gray-50">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <span className="font-semibold text-sm text-gray-700">Cognitive Agent Interface</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleClear}
            className="text-gray-400 hover:text-red-500 transition-colors p-1"
            title="Limpar Conversa"
          >
            <i className="fa-solid fa-trash-can text-xs"></i>
          </button>
          <div className="text-[10px] text-gray-500 font-mono hidden sm:block">Gemini 3</div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 transition-colors p-1" title="Colapsar Chat">
            <i className="fa-solid fa-angles-right"></i>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="text-center mt-20 text-gray-400">
            <i className={`fa-solid ${isMathMode ? 'fa-calculator' : 'fa-code'} text-4xl mb-3 opacity-20`}></i>
            <p className="text-sm">Assistente de {isMathMode ? 'Matemática' : 'Computação'} (Gemini 3)<br />Pronto para ajudar.</p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`mb-6 ${msg.role === 'user' ? 'flex justify-end' : ''}`}>
            {msg.role === 'model' && (
              <div className="flex items-center gap-2 mb-1 text-xs font-semibold text-blue-600">
                <i className="fa-solid fa-brain"></i> Assistente
              </div>
            )}
            <div
              className={`max-w-[90%] rounded-lg p-3 text-sm leading-relaxed shadow-sm ${msg.role === 'user'
                ? 'bg-blue-600 text-white rounded-br-none'
                : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'
                }`}
            >
              <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{
                  p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                  code: ({ node, className, children, ...props }: any) => {
                    const match = /language-(\w+)/.exec(className || '');
                    const language = match ? match[1] : '';
                    const codeString = String(children).replace(/\n$/, '');
                    const isBlock = className || codeString.includes('\n');

                    // Render Mermaid diagrams
                    if (isBlock && language === 'mermaid') {
                      return <Mermaid chart={codeString} />;
                    }

                    return !isBlock ? (
                      <code className="bg-gray-100 text-pink-600 px-1.5 py-0.5 rounded font-mono text-xs border border-gray-200" {...props}>
                        {children}
                      </code>
                    ) : (
                      <div className="my-2 rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                        {language && (
                          <div className="bg-gray-50 border-b border-gray-200 px-3 py-1.5 text-xs font-mono text-gray-500 flex items-center gap-2">
                            <i className="fa-solid fa-code text-gray-400"></i>
                            {language}
                          </div>
                        )}
                        <SyntaxHighlighter
                          style={github}
                          language={language || 'text'}
                          PreTag="div"
                          customStyle={{
                            margin: 0,
                            padding: '0.5rem 0.75rem',
                            fontSize: '0.75rem',
                            lineHeight: '1.4',
                            background: '#f6f8fa',
                            borderRadius: 0,
                          }}
                          codeTagProps={{
                            style: {
                              fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
                            }
                          }}
                          {...props}
                        >
                          {codeString}
                        </SyntaxHighlighter>
                      </div>
                    );
                  }
                }}
              >
                {msg.text}
              </ReactMarkdown>
            </div>
          </div>
        ))}

        {/* Thinking State */}
        {(isLoading && thinkingSteps.length > 0) && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-1 text-xs font-semibold text-blue-600">
              <i className="fa-solid fa-brain animate-pulse"></i> Assistente pensando...
            </div>
            <div className="bg-gray-100 rounded-lg p-3 border border-gray-200 animate-pulse">
              {thinkingSteps.map((step, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs text-gray-500 mb-1 last:mb-0">
                  <i className="fa-solid fa-circle-check text-green-500"></i>
                  {step}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="relative">
          <textarea
            className="w-full resize-none border border-gray-300 rounded-xl py-3 pl-4 pr-12 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none scrollbar-hide bg-gray-50"
            rows={2}
            placeholder="Pergunte ao agente ou digite um comando..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className={`absolute right-2 bottom-2 p-1.5 rounded-lg transition-colors ${input.trim() ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-400'
              }`}
          >
            <i className="fa-solid fa-paper-plane text-xs"></i>
          </button>
        </div>
        <div className="flex justify-between mt-2 text-[10px] text-gray-400">
          <span>Status: Local-First (Seguro)</span>
          <span>IA: Pronto | Último salvamento: 14:32</span>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
