/**
 * Resolve a relative path from a base file path
 */
export const resolveRelativePath = (basePath: string, href: string): string => {
    const pathParts = basePath.split('/');
    pathParts.pop(); // remove current filename
    let currentParts = [...pathParts];

    // Normalize href
    const targetPath = href.startsWith('./') ? href.slice(2) : href;
    const parts = targetPath.split('/');

    for (const part of parts) {
        if (part === '..') {
            currentParts.pop();
        } else if (part !== '.' && part !== '') {
            currentParts.push(part);
        }
    }

    return currentParts.join('/');
};

/**
 * Get the directory path from a file path
 */
export const getDirectoryPath = (filePath: string): string => {
    const parts = filePath.split('/');
    parts.pop();
    return parts.join('/');
};

/**
 * Clean a source path (remove leading ./)
 */
export const cleanSourcePath = (src: string): string => {
    return src.startsWith('./') ? src.slice(2) : src;
};

/**
 * Build full path from directory and relative source
 */
export const buildFullPath = (currentDir: string, cleanSrc: string): string => {
    return currentDir ? `${currentDir}/${cleanSrc}` : cleanSrc;
};
