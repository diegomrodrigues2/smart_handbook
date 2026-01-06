import React, { useState, useMemo } from 'react';
import FileTree from './components/FileTree';
import MarkdownViewer from './components/MarkdownViewer';
import ChatInterface from './components/ChatInterface';
import LearningMode from './components/LearningMode';
import { FileNode } from './types';

const App: React.FC = () => {
  const [fileStructure, setFileStructure] = useState<FileNode[]>([]);
  const [directoryHandle, setDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [imageHandles, setImageHandles] = useState<Map<string, FileSystemFileHandle>>(new Map());
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chatOpen, setChatOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [learningMode, setLearningMode] = useState(false);

  // Helper to find a node by ID recursively
  const findNode = (nodes: FileNode[], id: string): FileNode | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findNode(node.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const selectedFile = useMemo(() =>
    selectedFileId ? findNode(fileStructure, selectedFileId) : null
    , [fileStructure, selectedFileId]);

  // Search Logic
  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return fileStructure;

    const lowerQuery = searchQuery.toLowerCase();

    const filterNodes = (nodes: FileNode[]): FileNode[] => {
      return nodes.reduce<FileNode[]>((acc, node) => {
        if (node.type === 'file') {
          const matchName = node.name.toLowerCase().includes(lowerQuery);
          const matchContent = node.content?.toLowerCase().includes(lowerQuery);

          if (matchName || matchContent) {
            acc.push(node);
          }
        } else if (node.type === 'folder' && node.children) {
          const filteredChildren = filterNodes(node.children);
          if (filteredChildren.length > 0) {
            // Return a new node object with filtered children and forced open state
            acc.push({
              ...node,
              children: filteredChildren,
              isOpen: true
            });
          }
        }
        return acc;
      }, []);
    };

    return filterNodes(fileStructure);
  }, [fileStructure, searchQuery]);

  const handleToggleFolder = (id: string, isOpen: boolean) => {
    const updateNodes = (nodes: FileNode[]): FileNode[] => {
      return nodes.map((node) => {
        if (node.id === id) {
          return { ...node, isOpen };
        }
        if (node.children) {
          return { ...node, children: updateNodes(node.children) };
        }
        return node;
      });
    };
    setFileStructure((prev) => updateNodes(prev));
  };

  const updateFileContent = (newContent: string) => {
    if (!selectedFileId) return;

    const updateNodes = (nodes: FileNode[]): FileNode[] => {
      return nodes.map((node) => {
        if (node.id === selectedFileId) {
          return { ...node, content: newContent };
        }
        if (node.children) {
          return { ...node, children: updateNodes(node.children) };
        }
        return node;
      });
    };
    setFileStructure((prev) => updateNodes(prev));
  };

  const handleFileLinkClick = (href: string) => {
    if (!selectedFileId) return;

    const pathParts = selectedFileId.split('/');
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

    const resolvedPath = currentParts.join('/');

    const node = findNode(fileStructure, resolvedPath);
    if (node) {
      setSelectedFileId(resolvedPath);
    } else {
      // Try adding .md
      const mdPath = resolvedPath.endsWith('.md') ? resolvedPath : resolvedPath + '.md';
      if (findNode(fileStructure, mdPath)) {
        setSelectedFileId(mdPath);
      } else {
        alert(`Documento não encontrado: ${resolvedPath}`);
      }
    }
  };

  const resolveImage = async (src: string): Promise<string | null> => {
    if (!selectedFileId || !imageHandles.size) return null;

    if (src.startsWith('http') || src.startsWith('data:')) return src;

    const cleanSrc = src.startsWith('./') ? src.slice(2) : src;
    const pathParts = selectedFileId.split('/');
    pathParts.pop();
    const currentDir = pathParts.join('/');

    const fullPath = currentDir ? `${currentDir}/${cleanSrc}` : cleanSrc;
    const handle = imageHandles.get(fullPath);

    if (handle) {
      try {
        const file = await handle.getFile();
        return URL.createObjectURL(file);
      } catch (e) {
        console.error('Error loading image file:', e);
      }
    }
    return null;
  };

  const processDirectoryHandle = async (handle: any, parentPath: string = '', imgMap: Map<string, FileSystemFileHandle> = new Map()): Promise<FileNode> => {
    const currentPath = parentPath ? `${parentPath}/${handle.name}` : handle.name;
    const node: FileNode = {
      id: currentPath,
      name: handle.name,
      type: 'folder' as const,
      children: [],
      isOpen: false
    };

    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];

    for await (const entry of handle.values()) {
      const entryPath = `${currentPath}/${entry.name}`;
      if (entry.kind === 'file') {
        const lowerName = entry.name.toLowerCase();
        if (lowerName.endsWith('.md')) {
          const file = await entry.getFile();
          const content = await file.text();
          node.children!.push({
            id: entryPath,
            name: entry.name,
            type: 'file' as const,
            content
          });
        } else if (imageExtensions.some(ext => lowerName.endsWith(ext))) {
          imgMap.set(entryPath, entry);
        }
      } else if (entry.kind === 'directory') {
        const childFolder = await processDirectoryHandle(entry, currentPath, imgMap);
        if (childFolder.children && (childFolder.children.length > 0)) {
          node.children!.push(childFolder);
        }
      }
    }

    node.children!.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    return node;
  };

  const handleLoadDirectory = async () => {
    try {
      const handle = await (window as any).showDirectoryPicker();
      setDirectoryHandle(handle);
      const imgMap = new Map<string, FileSystemFileHandle>();
      const rootNode = await processDirectoryHandle(handle, '', imgMap);
      setImageHandles(imgMap);
      setFileStructure([rootNode]);

      const findFirst = (nodes: FileNode[]): string | null => {
        for (const n of nodes) {
          if (n.type === 'file') return n.id;
          if (n.children) {
            const found = findFirst(n.children);
            if (found) return found;
          }
        }
        return null;
      };

      const firstFile = findFirst([rootNode]);
      if (firstFile) setSelectedFileId(firstFile);
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Error loading directory:', error);
      }
    }
  };

  const handleRefresh = async () => {
    if (!directoryHandle) return;

    try {
      const openStates = new Map<string, boolean>();
      const capture = (nodes: FileNode[]) => {
        nodes.forEach(n => {
          if (n.type === 'folder' && n.isOpen) openStates.set(n.id, true);
          if (n.children) capture(n.children);
        });
      };
      capture(fileStructure);

      const rootImgMap = new Map<string, FileSystemFileHandle>();
      const rootNode = await processDirectoryHandle(directoryHandle, '', rootImgMap);
      setImageHandles(rootImgMap);

      const apply = (nodes: FileNode[]) => {
        nodes.forEach(n => {
          if (n.type === 'folder' && openStates.has(n.id)) n.isOpen = true;
          if (n.children) apply(n.children);
        });
      };
      apply([rootNode]);

      setFileStructure([rootNode]);
    } catch (error) {
      console.error('Error refreshing directory:', error);
    }
  };

  const createNewItem = (type: 'file' | 'folder') => {
    const newItem: FileNode = {
      id: Date.now().toString(),
      name: type === 'file' ? 'New Document.md' : 'New Folder',
      type,
      content: type === 'file' ? '# New Document\n\nWrite your content here.' : undefined,
      children: type === 'folder' ? [] : undefined,
      isOpen: false
    };

    setFileStructure(prev => {
      const newStruct = [...prev];
      if (newStruct[0] && newStruct[0].children) {
        newStruct[0].children.push(newItem);
      } else {
        newStruct.push(newItem);
      }
      return newStruct;
    });

    if (type === 'file') setSelectedFileId(newItem.id);
  };

  return (
    <div className="flex h-screen w-full bg-white overflow-hidden text-gray-800 font-sans">
      <div className={`${sidebarOpen ? 'w-64' : 'w-0'} transition-all duration-300 ease-in-out border-r border-gray-200 flex flex-col bg-gray-50 flex-shrink-0 relative`}>
        <div className="h-12 flex items-center px-4 border-b border-gray-200 flex-shrink-0">
          <i className="fa-solid fa-book-open text-blue-600 mr-2"></i>
          <span className="font-semibold text-gray-700 truncate">
            {fileStructure.length === 1 && fileStructure[0].type === 'folder' ? fileStructure[0].name : 'Smart Handbook'}
          </span>
        </div>

        <div className="p-2 border-b border-gray-100 bg-white">
          <div className="relative">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-gray-400 text-xs"></i>
            <input
              type="text"
              placeholder="Search documents..."
              className="w-full bg-gray-100 border-none rounded-md pl-8 pr-8 py-1.5 text-sm focus:ring-1 focus:ring-blue-500 outline-none text-gray-700"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-1 px-2 py-2 border-b border-gray-200 text-gray-500 flex-shrink-0">
          <button onClick={() => createNewItem('file')} className="p-1.5 hover:bg-gray-200 rounded transition-colors" title="New File"><i className="fa-regular fa-file"></i></button>
          <button onClick={() => createNewItem('folder')} className="p-1.5 hover:bg-gray-200 rounded transition-colors" title="New Folder"><i className="fa-regular fa-folder"></i></button>
          <button onClick={handleLoadDirectory} className="p-1.5 hover:bg-gray-200 rounded transition-colors text-blue-600" title="Load Directory"><i className="fa-solid fa-folder-plus"></i></button>
          {directoryHandle && <button onClick={handleRefresh} className="p-1.5 hover:bg-gray-200 rounded transition-colors text-green-600" title="Refresh Tree"><i className="fa-solid fa-rotate"></i></button>}
          <div className="flex-1"></div>
          <button onClick={() => setSidebarOpen(false)} className="p-1.5 hover:bg-gray-200 rounded transition-colors" title="Collapse Sidebar"><i className="fa-solid fa-angles-left"></i></button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredFiles.length > 0 ? (
            <FileTree nodes={filteredFiles} onSelectFile={(node) => setSelectedFileId(node.id)} onToggleFolder={handleToggleFolder} selectedFileId={selectedFileId} />
          ) : (
            <div className="p-4 text-center text-gray-400 text-xs mt-4">No documents found.</div>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0 bg-gray-100 relative">
        {!sidebarOpen && (
          <button onClick={() => setSidebarOpen(true)} className="absolute top-4 left-4 z-10 p-2 bg-white border border-gray-200 rounded-lg shadow-sm">
            <i className="fa-solid fa-bars"></i>
          </button>
        )}

        <div className="flex-1 p-4 overflow-hidden">
          {selectedFile && selectedFile.content !== undefined ? (
            learningMode ? (
              <LearningMode
                noteContent={selectedFile.content}
                noteName={selectedFile.name}
                noteId={selectedFile.id}
                onClose={() => setLearningMode(false)}
              />
            ) : (
              <MarkdownViewer
                content={selectedFile.content}
                fileName={selectedFile.name}
                onUpdateContent={updateFileContent}
                onClose={() => setSelectedFileId(null)}
                resolveImage={resolveImage}
                onSelectFile={handleFileLinkClick}
                onStartLearning={() => setLearningMode(true)}
              />
            )
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <i className="fa-regular fa-folder-open text-4xl mb-4"></i>
              <p>Select a document to view</p>
            </div>
          )}
        </div>
      </div>

      <div className={`${chatOpen ? 'w-[400px]' : 'w-0'} transition-all duration-300 ease-in-out flex-shrink-0 relative border-l border-gray-200 bg-white`}>
        {!chatOpen && (
          <button onClick={() => setChatOpen(true)} className="absolute top-4 -left-10 w-8 h-8 bg-blue-600 text-white rounded-l-lg flex items-center justify-center shadow-md z-20"><i className="fa-solid fa-brain"></i></button>
        )}
        <ChatInterface currentContext={selectedFile?.content || 'No document selected.'} isOpen={chatOpen} onClose={() => setChatOpen(false)} />
      </div>
    </div>
  );
};

export default App;