import React, { useEffect, useRef } from 'react';
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

    return (
        <div className="flex justify-center my-8 p-6 bg-gray-50 rounded-xl border border-gray-100 shadow-sm overflow-hidden" ref={ref} />
    );
};

export default Mermaid;
