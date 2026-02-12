// ============================================================================
// NOTE METADATA SERVICE
// Manages .meta.json files alongside markdown notes
// Stores source file references, concept suggestions, etc.
// ============================================================================

import { NoteMetadata } from "../types";

/**
 * Derives the .meta.json filename from a note filename.
 * e.g., "my_concept.md" -> "my_concept.meta.json"
 */
function getMetaFileName(noteFileName: string): string {
    return noteFileName.replace(/\.md$/i, '.meta.json');
}

/**
 * Navigates to the directory containing a note file, given its full ID path.
 * Returns the directory handle and the note's base filename.
 */
async function navigateToNoteDirectory(
    directoryHandle: FileSystemDirectoryHandle,
    noteId: string
): Promise<{ dirHandle: FileSystemDirectoryHandle; fileName: string } | null> {
    try {
        const parts = noteId.split('/');
        const fileName = parts[parts.length - 1];

        // Skip the root folder name (index 0) and the filename (last)
        const pathSegments = parts.slice(1, -1);

        let currentHandle = directoryHandle;
        for (const folderName of pathSegments) {
            if (!folderName) continue;
            currentHandle = await currentHandle.getDirectoryHandle(folderName);
        }

        return { dirHandle: currentHandle, fileName };
    } catch (error) {
        console.error("Error navigating to note directory:", error);
        return null;
    }
}

/**
 * Loads the metadata JSON for a given note.
 */
export async function loadNoteMetadata(
    directoryHandle: FileSystemDirectoryHandle,
    noteId: string
): Promise<NoteMetadata | null> {
    try {
        const nav = await navigateToNoteDirectory(directoryHandle, noteId);
        if (!nav) return null;

        const metaFileName = getMetaFileName(nav.fileName);

        try {
            const fileHandle = await nav.dirHandle.getFileHandle(metaFileName, { create: false });
            const file = await fileHandle.getFile();
            const text = await file.text();
            return JSON.parse(text) as NoteMetadata;
        } catch {
            // File doesn't exist yet — that's fine
            return null;
        }
    } catch (error) {
        console.error("Error loading note metadata:", error);
        return null;
    }
}

/**
 * Saves metadata JSON for a given note.
 */
export async function saveNoteMetadata(
    directoryHandle: FileSystemDirectoryHandle,
    noteId: string,
    metadata: NoteMetadata
): Promise<boolean> {
    try {
        const nav = await navigateToNoteDirectory(directoryHandle, noteId);
        if (!nav) return false;

        const metaFileName = getMetaFileName(nav.fileName);
        const fileHandle = await nav.dirHandle.getFileHandle(metaFileName, { create: true });
        const writable = await (fileHandle as any).createWritable();
        await writable.write(JSON.stringify(metadata, null, 2));
        await writable.close();

        return true;
    } catch (error) {
        console.error("Error saving note metadata:", error);
        return false;
    }
}

/**
 * Loads the text content of a source file referenced by metadata.
 * Used to provide full context to LLM when performing actions on concept definitions.
 */
export async function loadSourceContent(
    directoryHandle: FileSystemDirectoryHandle,
    sourceFilePath: string
): Promise<string | null> {
    try {
        const parts = sourceFilePath.split('/');
        const fileName = parts[parts.length - 1];
        const pathSegments = parts.slice(1, -1); // skip root, skip filename

        let currentHandle = directoryHandle;
        for (const folderName of pathSegments) {
            if (!folderName) continue;
            currentHandle = await currentHandle.getDirectoryHandle(folderName);
        }

        const fileHandle = await currentHandle.getFileHandle(fileName, { create: false });
        const file = await fileHandle.getFile();
        return await file.text();
    } catch (error) {
        console.error("Error loading source content:", error);
        return null;
    }
}
