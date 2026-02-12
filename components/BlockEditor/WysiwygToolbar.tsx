import React from 'react';

interface WysiwygToolbarProps {
    onFormat: (command: string, value?: string) => void;
    onSave: () => void;
    onCancel: () => void;
}

const TOOLBAR_BUTTONS = [
    { command: 'bold', icon: 'fa-solid fa-bold', title: 'Bold (Ctrl+B)', label: 'B' },
    { command: 'italic', icon: 'fa-solid fa-italic', title: 'Italic (Ctrl+I)', label: 'I' },
    { command: 'strikeThrough', icon: 'fa-solid fa-strikethrough', title: 'Strikethrough', label: 'S' },
    { command: 'divider' },
    { command: 'insertUnorderedList', icon: 'fa-solid fa-list-ul', title: 'Bullet List', label: '•' },
    { command: 'insertOrderedList', icon: 'fa-solid fa-list-ol', title: 'Numbered List', label: '1.' },
    { command: 'divider' },
    { command: 'formatBlock-h2', icon: 'fa-solid fa-heading', title: 'Heading', label: 'H' },
    { command: 'insertCode', icon: 'fa-solid fa-code', title: 'Inline Code', label: '</>' },
    { command: 'createLink', icon: 'fa-solid fa-link', title: 'Insert Link', label: '🔗' },
    { command: 'divider' },
    { command: 'formatBlock-blockquote', icon: 'fa-solid fa-quote-left', title: 'Blockquote', label: '"' },
];

const WysiwygToolbar: React.FC<WysiwygToolbarProps> = ({ onFormat, onSave, onCancel }) => {
    const handleClick = (command: string) => {
        if (command === 'formatBlock-h2') {
            onFormat('formatBlock', 'h2');
        } else if (command === 'formatBlock-blockquote') {
            onFormat('formatBlock', 'blockquote');
        } else if (command === 'createLink') {
            const url = prompt('Enter URL:');
            if (url) onFormat('createLink', url);
        } else if (command === 'insertCode') {
            // Wrap selection in <code>
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                const code = document.createElement('code');
                code.className = 'bg-gray-100 text-pink-600 px-1.5 py-0.5 rounded font-mono text-sm border border-gray-200';
                range.surroundContents(code);
            }
        } else {
            onFormat(command);
        }
    };

    return (
        <div className="flex items-center gap-0.5 bg-white border border-gray-200 rounded-lg shadow-lg px-1.5 py-1 mb-2">
            {TOOLBAR_BUTTONS.map((btn, i) => {
                if (btn.command === 'divider') {
                    return <div key={`div-${i}`} className="w-px h-5 bg-gray-200 mx-1"></div>;
                }
                return (
                    <button
                        key={btn.command}
                        onMouseDown={(e) => {
                            e.preventDefault(); // Keep focus in contentEditable
                            handleClick(btn.command);
                        }}
                        className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors text-xs font-medium"
                        title={btn.title}
                    >
                        <i className={btn.icon}></i>
                    </button>
                );
            })}

            <div className="w-px h-5 bg-gray-200 mx-1"></div>

            {/* Save / Cancel */}
            <button
                onMouseDown={(e) => { e.preventDefault(); onSave(); }}
                className="px-2.5 h-7 flex items-center justify-center text-white bg-indigo-500 hover:bg-indigo-600 rounded text-xs font-bold transition-colors gap-1"
                title="Save (Enter)"
            >
                <i className="fa-solid fa-check text-[10px]"></i>
                Save
            </button>
            <button
                onMouseDown={(e) => { e.preventDefault(); onCancel(); }}
                className="px-2 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded text-xs font-medium transition-colors"
                title="Cancel (Esc)"
            >
                <i className="fa-solid fa-xmark text-[10px]"></i>
            </button>
        </div>
    );
};

export default WysiwygToolbar;
