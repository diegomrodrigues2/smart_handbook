export interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  children?: FileNode[];
  content?: string;
  isOpen?: boolean; // For folders
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  isThinking?: boolean;
  thinkingSteps?: string[];
}

export interface AppState {
  currentFileId: string | null;
  sidebarOpen: boolean;
  chatOpen: boolean;
}