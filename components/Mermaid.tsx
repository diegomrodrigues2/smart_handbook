import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

interface MermaidProps {
    chart: string;
}

// Initialize mermaid
mermaid.initialize({
    startOnLoad: true,
    theme: 'default',
    securityLevel: 'loose',
    fontFamily: '"Outfit", "Inter", sans-serif',
});

const Mermaid: React.FC<MermaidProps> = ({ chart }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [copied, setCopied] = useState<'code' | 'image' | null>(null);
    const [svgContent, setSvgContent] = useState<string>('');

    useEffect(() => {
        if (ref.current) {
            // Clean previous content
            ref.current.innerHTML = '';

            // Unique ID for this diagram
            const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;

            try {
                mermaid.render(id, chart).then(({ svg }) => {
                    if (ref.current) {
                        ref.current.innerHTML = svg;
                        setSvgContent(svg);
                    }
                });
            } catch (error) {
                console.error('Mermaid rendering failed:', error);
                if (ref.current) {
                    ref.current.innerHTML = `<pre class="text-red-500 bg-red-50 p-4 rounded text-xs border border-red-100">${error}</pre>`;
                }
            }
        }
    }, [chart]);

    const handleCopyCode = async () => {
        try {
            await navigator.clipboard.writeText(chart);
            setCopied('code');
            setTimeout(() => setCopied(null), 2000);
        } catch (error) {
            console.error('Failed to copy code:', error);
        }
    };

    const handleCopyImage = async () => {
        if (!svgContent) return;

        try {
            // Create a canvas to convert SVG to PNG
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // Create an image from the SVG
            const img = new Image();
            const svgBlob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(svgBlob);

            img.onload = async () => {
                // Set canvas size with some padding
                const padding = 40;
                canvas.width = img.width + padding * 2;
                canvas.height = img.height + padding * 2;

                // Fill white background
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // Draw the image centered
                ctx.drawImage(img, padding, padding);

                URL.revokeObjectURL(url);

                // Convert to blob and copy to clipboard
                canvas.toBlob(async (blob) => {
                    if (blob) {
                        try {
                            await navigator.clipboard.write([
                                new ClipboardItem({ 'image/png': blob })
                            ]);
                            setCopied('image');
                            setTimeout(() => setCopied(null), 2000);
                        } catch (error) {
                            console.error('Failed to copy image to clipboard:', error);
                            // Fallback: download the image
                            const downloadUrl = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = downloadUrl;
                            a.download = 'mermaid-diagram.png';
                            a.click();
                            URL.revokeObjectURL(downloadUrl);
                        }
                    }
                }, 'image/png');
            };

            img.src = url;
        } catch (error) {
            console.error('Failed to copy image:', error);
        }
    };

    return (
        <div className="relative group my-8">
            {/* Copy buttons - visible on hover */}
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button
                    onClick={handleCopyCode}
                    className={`px-2 py-1 text-xs rounded-md transition-all flex items-center gap-1 ${copied === 'code'
                            ? 'bg-green-500 text-white'
                            : 'bg-white/90 hover:bg-white text-gray-600 hover:text-gray-800 border border-gray-200 shadow-sm'
                        }`}
                    title="Copiar código Mermaid"
                >
                    <i className={`fa-solid ${copied === 'code' ? 'fa-check' : 'fa-code'}`}></i>
                    <span className="hidden sm:inline">{copied === 'code' ? 'Copiado!' : 'Código'}</span>
                </button>
                <button
                    onClick={handleCopyImage}
                    className={`px-2 py-1 text-xs rounded-md transition-all flex items-center gap-1 ${copied === 'image'
                            ? 'bg-green-500 text-white'
                            : 'bg-white/90 hover:bg-white text-gray-600 hover:text-gray-800 border border-gray-200 shadow-sm'
                        }`}
                    title="Copiar como imagem PNG"
                >
                    <i className={`fa-solid ${copied === 'image' ? 'fa-check' : 'fa-image'}`}></i>
                    <span className="hidden sm:inline">{copied === 'image' ? 'Copiado!' : 'Imagem'}</span>
                </button>
            </div>

            {/* Mermaid diagram container */}
            <div
                className="flex justify-center p-6 bg-gray-50 rounded-xl border border-gray-100 shadow-sm overflow-hidden"
                ref={ref}
            />
        </div>
    );
};

export default Mermaid;

