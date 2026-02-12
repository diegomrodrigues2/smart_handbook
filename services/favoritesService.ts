import { FileNode } from '../types';

const FAVORITES_FILENAME = 'favorites.json';

export interface FavoritesData {
    favorites: string[]; // List of file IDs (paths)
}

/**
 * Loads favorites from favorites.json in the root directory.
 */
export const loadFavorites = async (directoryHandle: FileSystemDirectoryHandle): Promise<Set<string>> => {
    try {
        const fileHandle = await directoryHandle.getFileHandle(FAVORITES_FILENAME, { create: false });
        const file = await fileHandle.getFile();
        const text = await file.text();
        const data: FavoritesData = JSON.parse(text);
        return new Set(data.favorites);
    } catch (error) {
        // If file doesn't exist or is invalid, return empty set
        return new Set();
    }
};

/**
 * Saves favorites to favorites.json in the root directory.
 */
export const saveFavorites = async (directoryHandle: FileSystemDirectoryHandle, favorites: Set<string>): Promise<void> => {
    try {
        const fileHandle = await directoryHandle.getFileHandle(FAVORITES_FILENAME, { create: true });
        const writable = await (fileHandle as any).createWritable();
        const data: FavoritesData = {
            favorites: Array.from(favorites)
        };
        await writable.write(JSON.stringify(data, null, 2));
        await writable.close();
    } catch (error) {
        console.error('Error saving favorites:', error);
        throw error;
    }
};
