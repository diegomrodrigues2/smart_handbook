// ============================================================================
// SETTINGS SERVICE
// Centralized configuration management for API keys and model selection
// ============================================================================

import { GoogleGenAI } from "@google/genai";

// Types
export interface ApiKeyEntry {
    name: string;
    key: string;
}

export interface AppSettings {
    apiKeys: ApiKeyEntry[];
    activeKeyName: string;
    selectedModel: 'gemini-3-flash-preview' | 'gemini-3-pro-preview';
}

// Constants
const STORAGE_KEY = 'smart_handbook_settings';
const DEFAULT_MODEL: AppSettings['selectedModel'] = 'gemini-3-flash-preview';

// Internal state
let settings: AppSettings = {
    apiKeys: [],
    activeKeyName: '',
    selectedModel: DEFAULT_MODEL
};

let client: GoogleGenAI | null = null;
let subscribers: Array<() => void> = [];

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize settings from localStorage or secrets.json fallback
 * Call this at app startup
 */
export async function initializeSettings(): Promise<void> {
    // Try localStorage first
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            if (parsed.apiKeys && parsed.apiKeys.length > 0) {
                settings = {
                    apiKeys: parsed.apiKeys,
                    activeKeyName: parsed.activeKeyName || parsed.apiKeys[0].name,
                    selectedModel: parsed.selectedModel || DEFAULT_MODEL
                };
                notifySubscribers();
                return;
            }
        } catch (e) {
            console.warn('Failed to parse stored settings:', e);
        }
    }

    // Fallback to secrets.json
    try {
        const response = await fetch('/secrets.json');
        if (response.ok) {
            const data = await response.json();
            if (data.apiKeys && data.apiKeys.length > 0) {
                settings = {
                    apiKeys: data.apiKeys,
                    activeKeyName: data.activeKeyName || data.apiKeys[0].name,
                    selectedModel: data.selectedModel || DEFAULT_MODEL
                };
                saveToStorage();
                notifySubscribers();
                return;
            }
        }
    } catch (e) {
        console.warn('Failed to load secrets.json:', e);
    }

    // Fallback to environment variable
    const envKey = (process.env as any).API_KEY || (process.env as any).GEMINI_API_KEY;
    if (envKey) {
        settings = {
            apiKeys: [{ name: 'Environment', key: envKey }],
            activeKeyName: 'Environment',
            selectedModel: DEFAULT_MODEL
        };
        notifySubscribers();
    }
}

// ============================================================================
// GETTERS
// ============================================================================

/**
 * Get the currently active API key
 */
export function getActiveApiKey(): string {
    const activeEntry = settings.apiKeys.find(k => k.name === settings.activeKeyName);
    return activeEntry?.key || '';
}

/**
 * Get the currently selected model
 */
export function getSelectedModel(): AppSettings['selectedModel'] {
    return settings.selectedModel;
}

/**
 * Get all API key entries (with masked keys for display)
 */
export function getApiKeys(): Array<{ name: string; maskedKey: string }> {
    return settings.apiKeys.map(k => ({
        name: k.name,
        maskedKey: k.key.length > 8
            ? k.key.substring(0, 4) + '...' + k.key.substring(k.key.length - 4)
            : '****'
    }));
}

/**
 * Get full API key entries (for internal use)
 */
export function getApiKeysInternal(): ApiKeyEntry[] {
    return [...settings.apiKeys];
}

/**
 * Get the name of the active API key
 */
export function getActiveKeyName(): string {
    return settings.activeKeyName;
}

/**
 * Get the GoogleGenAI client instance
 * Creates a new client if needed or if config changed
 */
export function getClient(): GoogleGenAI {
    const apiKey = getActiveApiKey();
    if (!client && apiKey) {
        client = new GoogleGenAI({ apiKey });
    }
    return client!;
}

/**
 * Reset the client (call when API key changes)
 */
export function resetClient(): void {
    client = null;
}

// ============================================================================
// SETTERS
// ============================================================================

/**
 * Add a new API key
 */
export function addApiKey(name: string, key: string): boolean {
    // Check for duplicate name
    if (settings.apiKeys.some(k => k.name === name)) {
        return false;
    }

    settings.apiKeys.push({ name, key });

    // If this is the first key, make it active
    if (settings.apiKeys.length === 1) {
        settings.activeKeyName = name;
        resetClient();
    }

    saveToStorage();
    notifySubscribers();
    return true;
}

/**
 * Update an existing API key
 */
export function updateApiKey(name: string, newKey: string): boolean {
    const entry = settings.apiKeys.find(k => k.name === name);
    if (!entry) return false;

    entry.key = newKey;

    // Reset client if this was the active key
    if (name === settings.activeKeyName) {
        resetClient();
    }

    saveToStorage();
    notifySubscribers();
    return true;
}

/**
 * Remove an API key
 */
export function removeApiKey(name: string): boolean {
    const index = settings.apiKeys.findIndex(k => k.name === name);
    if (index === -1) return false;

    // Don't allow removing the last key
    if (settings.apiKeys.length === 1) {
        return false;
    }

    settings.apiKeys.splice(index, 1);

    // If we removed the active key, switch to first available
    if (name === settings.activeKeyName) {
        settings.activeKeyName = settings.apiKeys[0].name;
        resetClient();
    }

    saveToStorage();
    notifySubscribers();
    return true;
}

/**
 * Set the active API key by name
 */
export function setActiveApiKey(name: string): boolean {
    if (!settings.apiKeys.some(k => k.name === name)) {
        return false;
    }

    settings.activeKeyName = name;
    resetClient();
    saveToStorage();
    notifySubscribers();
    return true;
}

/**
 * Set the selected model
 */
export function setSelectedModel(model: AppSettings['selectedModel']): void {
    settings.selectedModel = model;
    saveToStorage();
    notifySubscribers();
}

// ============================================================================
// SUBSCRIPTION
// ============================================================================

/**
 * Subscribe to settings changes
 * Returns unsubscribe function
 */
export function subscribe(callback: () => void): () => void {
    subscribers.push(callback);
    return () => {
        subscribers = subscribers.filter(s => s !== callback);
    };
}

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

function saveToStorage(): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
        console.error('Failed to save settings to localStorage:', e);
    }
}

function notifySubscribers(): void {
    subscribers.forEach(callback => {
        try {
            callback();
        } catch (e) {
            console.error('Error in settings subscriber:', e);
        }
    });
}
