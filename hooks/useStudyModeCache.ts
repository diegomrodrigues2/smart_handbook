import { useCallback, useRef } from 'react';

// Generic storage for any study mode state
interface StudyModeCache {
    sessions: Map<string, any>;
}

// Global cache that persists between component mounts
const globalCache: StudyModeCache = {
    sessions: new Map()
};

// Generic hook for any study mode state persistence
export function useStudyModePersistence<T>(tabId: string) {
    const getCachedState = useCallback((): T | null => {
        return globalCache.sessions.get(tabId) || null;
    }, [tabId]);

    const saveState = useCallback((state: T) => {
        globalCache.sessions.set(tabId, state);
    }, [tabId]);

    const clearState = useCallback(() => {
        globalCache.sessions.delete(tabId);
    }, [tabId]);

    const hasCache = useCallback((): boolean => {
        return globalCache.sessions.has(tabId);
    }, [tabId]);

    return {
        getCachedState,
        saveState,
        clearState,
        hasCache
    };
}

// Clear all sessions for a specific file
export function clearSessionsForFile(fileId: string) {
    const keysToDelete: string[] = [];
    globalCache.sessions.forEach((_, key) => {
        if (key.includes(fileId)) {
            keysToDelete.push(key);
        }
    });
    keysToDelete.forEach(key => globalCache.sessions.delete(key));
}

// Legacy exports for backward compatibility with ChallengeMode
export interface ChallengeSessionState {
    session: any | null;
    inputValue: string;
    selectedForDetail: any | null;
    activeView: 'chat' | 'draw';
    excalidrawScene: any | null;
    pendingImage: { url: string; base64: string; mimeType: string } | null;
}

export function useStudyModeCache() {
    return {
        clearSessionsForFile
    };
}

export function useChallengePersistence(tabId: string) {
    return useStudyModePersistence<ChallengeSessionState>(tabId);
}
