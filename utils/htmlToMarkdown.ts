/**
 * Simple HTML-to-Markdown converter for WYSIWYG editing.
 * Handles the common elements produced by contentEditable + execCommand.
 */
export function htmlToMarkdown(html: string): string {
    // Create a temporary DOM element to parse the HTML
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return nodeToMarkdown(doc.body).trim();
}

function nodeToMarkdown(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent || '';
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
        return '';
    }

    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    const children = Array.from(el.childNodes).map(nodeToMarkdown).join('');

    switch (tag) {
        case 'b':
        case 'strong':
            return `**${children}**`;

        case 'i':
        case 'em':
            return `*${children}*`;

        case 'u':
            return children; // Markdown doesn't have underline

        case 'strike':
        case 's':
        case 'del':
            return `~~${children}~~`;

        case 'code':
            return `\`${children}\``;

        case 'a': {
            const href = el.getAttribute('href') || '';
            return `[${children}](${href})`;
        }

        case 'h1':
            return `# ${children}\n\n`;
        case 'h2':
            return `## ${children}\n\n`;
        case 'h3':
            return `### ${children}\n\n`;
        case 'h4':
            return `#### ${children}\n\n`;

        case 'p':
            return `${children}\n\n`;

        case 'br':
            return '\n';

        case 'ul': {
            const items = Array.from(el.children)
                .filter(c => c.tagName.toLowerCase() === 'li')
                .map(li => `- ${nodeToMarkdown(li).trim()}`)
                .join('\n');
            return `${items}\n\n`;
        }

        case 'ol': {
            const items = Array.from(el.children)
                .filter(c => c.tagName.toLowerCase() === 'li')
                .map((li, i) => `${i + 1}. ${nodeToMarkdown(li).trim()}`)
                .join('\n');
            return `${items}\n\n`;
        }

        case 'li':
            return children;

        case 'blockquote':
            return children.split('\n').map(line => `> ${line}`).join('\n') + '\n\n';

        case 'pre': {
            const codeEl = el.querySelector('code');
            const lang = codeEl?.className?.match(/language-(\w+)/)?.[1] || '';
            const code = codeEl ? codeEl.textContent : el.textContent;
            return `\`\`\`${lang}\n${code}\n\`\`\`\n\n`;
        }

        case 'hr':
            return '---\n\n';

        case 'div':
            // div is often used by contentEditable for new lines
            return `${children}\n`;

        case 'img': {
            const src = el.getAttribute('src') || '';
            const alt = el.getAttribute('alt') || '';
            return `![${alt}](${src})`;
        }

        case 'table': {
            return convertTableToMarkdown(el);
        }

        default:
            return children;
    }
}

function convertTableToMarkdown(table: HTMLElement): string {
    const rows = Array.from(table.querySelectorAll('tr'));
    if (rows.length === 0) return '';

    const result: string[] = [];

    rows.forEach((row, rowIndex) => {
        const cells = Array.from(row.querySelectorAll('th, td'));
        const cellTexts = cells.map(cell => nodeToMarkdown(cell).trim());
        result.push(`| ${cellTexts.join(' | ')} |`);

        // Add separator after header row
        if (rowIndex === 0) {
            result.push(`| ${cells.map(() => '---').join(' | ')} |`);
        }
    });

    return result.join('\n') + '\n\n';
}
