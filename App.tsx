import React, { useState, useMemo, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import MarkdownViewer from './components/MarkdownViewer';
import PDFViewer from './components/PDFViewer';
import ChatInterface from './components/ChatInterface';
import LearningMode from './components/LearningMode';
import LessonMode from './components/LessonMode';
import WorkbookMode from './components/WorkbookMode';
import ChallengeMode from './components/ChallengeMode';
import InterviewMode from './components/InterviewMode';
import PairProgrammingMode from './components/PairProgrammingMode';
import ConceptExtractionMode from './components/ConceptExtractionMode';
import NoteExcalidraw from './components/NoteExcalidraw';
import NoteDrawio from './components/NoteDrawio';
import ProjectSpecMode from './components/ProjectSpecMode';
import TabBar from './components/TabBar';
import SettingsModal from './components/SettingsModal';
import { FileNode, SubjectMode, StudyModeType, ProjectSpecType } from './types';
import { useFileSystem, useSidebarResize, useChatResize, useSubjectMode, useTabManager } from './hooks';
import { findNode, filterNodesByQuery, updateNodeById, filterNodesByFavorites } from './utils';
import { resolveRelativePath, getDirectoryPath, cleanSourcePath, buildFullPath } from './utils/pathUtils';
import { generateStudyScript } from './services/roteiroService';
import { loadFavorites, saveFavorites } from './services/favoritesService';
import { initializeSettings } from './services/settingsService';


// Wrapper component to load PDF data before passing to PDFViewer
const PDFViewerWrapper: React.FC<{
  pdfPath: string;
  pdfHandle?: FileSystemFileHandle;
  fileName: string;
  onClose: () => void;
  // Study Modes props
  mode?: SubjectMode;
  onStartLearning?: () => void;
  onStartLesson?: () => void;
  onStartWorkbook?: () => void;
  onStartChallenge?: () => void;
  onStartInterview?: () => void;
  onStartPairProgramming?: () => void;
  onStartConceptExtraction?: () => void;
  onStartProjectSpec?: (specType: ProjectSpecType) => void;
  // PDF data callback for study modes
  onPdfDataLoaded?: (data: ArrayBuffer) => void;
}> = ({
  pdfHandle,
  fileName,
  onClose,
  mode,
  onStartLearning,
  onStartLesson,
  onStartWorkbook,
  onStartChallenge,
  onStartInterview,
  onStartPairProgramming,
  onStartConceptExtraction,
  onStartProjectSpec,
  onPdfDataLoaded
}) => {
    const [pdfData, setPdfData] = React.useState<ArrayBuffer | null>(null);
    const [pdfDataCopy, setPdfDataCopy] = React.useState<ArrayBuffer | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);

    const onPdfDataLoadedRef = React.useRef(onPdfDataLoaded);
    onPdfDataLoadedRef.current = onPdfDataLoaded;

    React.useEffect(() => {
      const loadPDF = async () => {
        if (!pdfHandle) {
          console.error('No PDF handle provided');
          setIsLoading(false);
          return;
        }

        try {
          const file = await pdfHandle.getFile();
          const arrayBuffer = await file.arrayBuffer();
          // Create a copy for study modes and audio to avoid detached buffer issues if pdfjs transfers the original
          const studyData = arrayBuffer.slice(0);

          setPdfData(arrayBuffer);
          setPdfDataCopy(studyData);
          if (onPdfDataLoadedRef.current) {
            onPdfDataLoadedRef.current(studyData);
          }
          setIsLoading(false);
        } catch (error) {
          console.error('Error loading PDF:', error);
          setIsLoading(false);
        }
      };
      loadPDF();
    }, [pdfHandle]);

    if (isLoading || !pdfData) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-gray-400">
          <i className="fa-solid fa-spinner fa-spin text-4xl mb-4 text-blue-500"></i>
          <p className="text-gray-600">Carregando PDF...</p>
        </div>
      );
    }

    return (
      <PDFViewer
        fileUrl={pdfData}
        fileName={fileName}
        onClose={onClose}
        pdfData={pdfDataCopy}
        mode={mode}
        onStartLearning={onStartLearning}
        onStartLesson={onStartLesson}
        onStartWorkbook={onStartWorkbook}
        onStartChallenge={onStartChallenge}
        onStartInterview={onStartInterview}
        onStartPairProgramming={onStartPairProgramming}
        onStartConceptExtraction={onStartConceptExtraction}
        onStartProjectSpec={onStartProjectSpec}
      />
    );
  };


const App: React.FC = () => {
  const {
    fileStructure,
    setFileStructure,
    directoryHandle,
    imageHandles,
    pdfHandles,
    handleLoadDirectory,
    handleRefresh,
    deleteItems,
    moveItems,
    groupItemsInFolder,
    renameItem,
    createFileInFolder,
    saveFileContent,
    isRestoring
  } = useFileSystem();

  const { width: sidebarWidth, isResizing, startResizing } = useSidebarResize({
    minWidth: 256,
    maxWidth: 600,
    initialWidth: 256
  });

  const { width: chatWidth, isResizing: isChatResizing, startResizing: startChatResizing } = useChatResize({
    minWidth: 320,
    maxWidth: 700,
    initialWidth: 400
  });

  const { mode } = useSubjectMode();

  // Tab management
  const {
    tabs,
    activeTabId,
    openTab,
    closeTab,
    pinTab,
    setActiveTab,
    openStudyModeTab,
    closeStudyModeForFile,
    getActiveTab,
    getActiveFile
  } = useTabManager();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chatOpen, setChatOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pdfDataCache, setPdfDataCache] = useState<Map<string, ArrayBuffer>>(new Map());
  const [isGeneratingRoteiro, setIsGeneratingRoteiro] = useState(false);

  // Favorites state
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [showFavorites, setShowFavorites] = useState(false);

  // Project Spec Type state
  const [projectSpecType, setProjectSpecType] = useState<ProjectSpecType>('aws');

  // Settings modal state
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  // Initialize settings service on mount
  React.useEffect(() => {
    initializeSettings();
  }, []);

  // Load favorites when directory loads
  React.useEffect(() => {
    const loadFavs = async () => {
      if (directoryHandle) {
        const loadedFavorites = await loadFavorites(directoryHandle);
        setFavorites(loadedFavorites);
      } else {
        setFavorites(new Set());
      }
    };
    loadFavs();
  }, [directoryHandle]);

  // Excalidraw sessions state
  const [excalidrawSessions, setExcalidrawSessions] = useState<Map<string, { initialData: any | null, editingFileName?: string }>>(new Map());
  // Drawio sessions state
  const [drawioSessions, setDrawioSessions] = useState<Map<string, { initialXml: string | null, editingFileName?: string }>>(new Map());

  // Get active tab info
  const activeTab = useMemo(() => getActiveTab(), [getActiveTab, tabs, activeTabId]);
  const activeFileInfo = useMemo(() => getActiveFile(), [getActiveFile, tabs, activeTabId]);

  // Get selected file based on active tab
  const selectedFile = useMemo(() => {
    if (!activeTab) return null;
    return findNode(fileStructure, activeTab.fileId);
  }, [activeTab, fileStructure]);

  // Get selected file ID for highlighting in tree
  const selectedFileId = useMemo(() => {
    if (!activeTab) return null;
    return activeTab.fileId;
  }, [activeTab]);

  // Callback for when PDF data is loaded
  const handlePdfDataLoaded = useCallback((fileId: string, data: ArrayBuffer) => {
    setPdfDataCache(prev => new Map(prev).set(fileId, data));
  }, []);

  // Get PDF data for a file
  const getPdfData = useCallback((fileId: string) => {
    return pdfDataCache.get(fileId) || null;
  }, [pdfDataCache]);

  // Toggle favorite status
  const toggleFavorite = useCallback(async (fileId: string) => {
    if (!directoryHandle) return;

    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(fileId)) {
        newFavorites.delete(fileId);
      } else {
        newFavorites.add(fileId);
      }

      // Persist changes
      saveFavorites(directoryHandle, newFavorites).catch(console.error);

      return newFavorites;
    });
  }, [directoryHandle]);

  const filteredFiles = useMemo(
    () => {
      let result = filterNodesByQuery(fileStructure, searchQuery);
      if (showFavorites) {
        result = filterNodesByFavorites(result, favorites);
      }
      return result;
    },
    [fileStructure, searchQuery, showFavorites, favorites]
  );

  const sidebarTitle = useMemo(
    () => (fileStructure.length === 1 && fileStructure[0].type === 'folder'
      ? fileStructure[0].name
      : 'Smart Handbook'),
    [fileStructure]
  );

  // Handlers
  const handleToggleFolder = (id: string, isOpen: boolean) => {
    setFileStructure(prev => updateNodeById(prev, id, { isOpen }));
  };

  const updateFileContent = (newContent: string, fileId?: string) => {
    const targetId = fileId || selectedFileId;
    if (!targetId) return;
    setFileStructure(prev => updateNodeById(prev, targetId, { content: newContent }));
    // Persist to disk
    saveFileContent(targetId, newContent);
  };

  const handleFileLinkClick = (href: string) => {
    if (!selectedFileId) return;

    const resolvedPath = resolveRelativePath(selectedFileId, href);
    const node = findNode(fileStructure, resolvedPath);

    if (node) {
      openTab(node, true); // Open linked files as pinned
    } else {
      const mdPath = resolvedPath.endsWith('.md') ? resolvedPath : resolvedPath + '.md';
      const mdNode = findNode(fileStructure, mdPath);
      if (mdNode) {
        openTab(mdNode, true);
      } else {
        alert(`Documento não encontrado: ${resolvedPath}`);
      }
    }
  };

  const resolveImage = async (src: string): Promise<string | null> => {
    if (!selectedFileId || !imageHandles.size) return null;
    if (src.startsWith('http') || src.startsWith('data:')) return src;

    const cleanSrc = cleanSourcePath(src);
    const currentDir = getDirectoryPath(selectedFileId);
    const fullPath = buildFullPath(currentDir, cleanSrc);
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

  const resolvePDF = async (pdfPath: string): Promise<ArrayBuffer | null> => {
    if (!pdfHandles.size) return null;

    const handle = pdfHandles.get(pdfPath);
    if (handle) {
      try {
        const file = await handle.getFile();
        return await file.arrayBuffer();
      } catch (e) {
        console.error('Error loading PDF file:', e);
      }
    }
    return null;
  };

  // Load Excalidraw JSON data for editing existing drawings
  const loadExcalidrawData = async (jsonPath: string): Promise<any | null> => {
    if (!directoryHandle || !selectedFileId) return null;

    try {
      // Navigate to the correct directory based on note path
      const parts = selectedFileId.split(/[\\/]/);
      // Go up 2 levels (past 'definicoes', etc.) like other features
      const parentPath = parts.length >= 3 ? parts.slice(1, -2) : parts.slice(1, -1);

      let currentHandle = directoryHandle;
      for (const folderName of parentPath) {
        if (!folderName) continue;
        currentHandle = await currentHandle.getDirectoryHandle(folderName, { create: false });
      }

      // Get desenhos folder
      const desenhosHandle = await currentHandle.getDirectoryHandle('desenhos', { create: false });

      // Extract filename from path
      const pathParts = jsonPath.split('/');
      const fileName = pathParts[pathParts.length - 1];

      const fileHandle = await desenhosHandle.getFileHandle(fileName, { create: false });
      const file = await fileHandle.getFile();
      const text = await file.text();
      return JSON.parse(text);
    } catch (error) {
      console.error('Error loading Excalidraw data:', error);
      return null;
    }
  };

  // Load Drawio XML data for editing existing diagrams
  const loadDrawioData = async (xmlPath: string): Promise<string | null> => {
    if (!directoryHandle || !selectedFileId) return null;

    try {
      // Navigate to the correct directory based on note path
      const parts = selectedFileId.split(/[\\/]/);
      // Go up 2 levels (past 'definicoes', etc.) like other features
      const parentPath = parts.length >= 3 ? parts.slice(1, -2) : parts.slice(1, -1);

      console.log('loadDrawioData - selectedFileId:', selectedFileId);
      console.log('loadDrawioData - parts:', parts);
      console.log('loadDrawioData - parentPath:', parentPath);
      console.log('loadDrawioData - xmlPath:', xmlPath);

      let currentHandle = directoryHandle;
      for (const folderName of parentPath) {
        if (!folderName) continue;
        console.log('loadDrawioData - navigating to:', folderName);
        currentHandle = await currentHandle.getDirectoryHandle(folderName, { create: false });
      }

      // Get desenhos folder
      console.log('loadDrawioData - getting desenhos folder');
      const desenhosHandle = await currentHandle.getDirectoryHandle('desenhos', { create: false });

      // Extract filename from path
      const pathParts = xmlPath.split('/');
      const fileName = pathParts[pathParts.length - 1];
      console.log('loadDrawioData - fileName:', fileName);

      const fileHandle = await desenhosHandle.getFileHandle(fileName, { create: false });
      const file = await fileHandle.getFile();
      const text = await file.text();
      console.log('loadDrawioData - loaded successfully, length:', text.length);
      return text;
    } catch (error) {
      console.error('Error loading Drawio data:', error);
      return null;
    }
  };


  const onLoadDirectory = async () => {
    const firstFileId = await handleLoadDirectory();
    if (firstFileId) {
      const firstFile = findNode(fileStructure, firstFileId);
      if (firstFile) {
        openTab(firstFile, false);
      }
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
      if (newStruct[0]?.children) {
        newStruct[0].children.push(newItem);
      } else {
        newStruct.push(newItem);
      }
      return newStruct;
    });

    if (type === 'file') openTab(newItem, true);
  };

  // Handle file selection from sidebar (single/double click)
  const handleSelectFile = useCallback((node: FileNode, isPinned: boolean) => {
    openTab(node, isPinned);
  }, [openTab]);

  // Handle tab click
  const handleTabClick = useCallback((tabId: string) => {
    setActiveTab(tabId);
  }, [setActiveTab]);

  // Handle tab close
  const handleTabClose = useCallback((tabId: string) => {
    closeTab(tabId);
  }, [closeTab]);

  // Handle tab double click (pin the tab)
  const handleTabDoubleClick = useCallback((tabId: string) => {
    pinTab(tabId);
  }, [pinTab]);

  // Study mode handlers - now open as tabs
  const handleStartStudyMode = useCallback((modeType: StudyModeType) => {
    if (!selectedFile) return;
    openStudyModeTab(selectedFile, modeType);
  }, [selectedFile, openStudyModeTab]);

  // Project Spec handler with type
  const handleStartProjectSpec = useCallback((specType: ProjectSpecType) => {
    if (!selectedFile) return;
    setProjectSpecType(specType);
    openStudyModeTab(selectedFile, 'projectSpec');
  }, [selectedFile, openStudyModeTab]);

  // Close study mode handler
  const handleCloseStudyMode = useCallback(() => {
    if (!activeTab?.fileId) return;
    closeStudyModeForFile(activeTab.fileId);
  }, [activeTab, closeStudyModeForFile]);

  // Handle roteiro generation from context menu
  const handleGenerateRoteiro = useCallback(async (folderIds: string[]) => {
    if (!directoryHandle) {
      alert('Nenhum diretório carregado.');
      return;
    }

    if (isGeneratingRoteiro) {
      alert('Já existe uma geração em andamento.');
      return;
    }

    setIsGeneratingRoteiro(true);

    try {
      const result = await generateStudyScript(
        folderIds,
        directoryHandle,
        (msg) => console.log('[Roteiro]', msg)
      );

      if (result.success) {
        alert(result.message);
        // Refresh to show the new file
        handleRefresh();
      } else {
        alert(result.message);
      }
    } catch (error: any) {
      console.error('Error generating roteiro:', error);
      alert(`Erro ao gerar roteiro: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setIsGeneratingRoteiro(false);
    }
  }, [directoryHandle, isGeneratingRoteiro, handleRefresh]);

  const handleDeleteItems = useCallback(async (ids: string[]) => {
    await deleteItems(ids);
    // Clear selection if deleted items were selected
    setSelectedIds(prev => {
      const next = new Set(prev);
      ids.forEach(id => next.delete(id));
      return next;
    });
  }, [deleteItems]);

  const handleGroupInFolder = useCallback(async (ids: string[]) => {
    const folderName = window.prompt('Digite o nome da nova pasta:');
    if (folderName) {
      await groupItemsInFolder(ids, folderName);
    }
  }, [groupItemsInFolder]);

  const handleRenameItem = useCallback(async (id: string, name: string) => {
    const newName = window.prompt('Novo nome:', name);
    if (newName && newName !== name) {
      await renameItem(id, newName);
    }
  }, [renameItem]);

  const handleCreateNoteInFolder = useCallback(async (folderId: string) => {
    const fileName = window.prompt('Nome da nota (com extensão .md):', 'Nova Nota.md');
    if (fileName) {
      // Ensure extension
      const finalName = fileName.endsWith('.md') ? fileName : `${fileName}.md`;
      await createFileInFolder(folderId, finalName, '# Nova Nota\n\nComece a escrever...');
    }
  }, [createFileInFolder]);



  const handleStartExcalidraw = (initialData?: any | null, editingFileName?: string) => {
    if (!selectedFileId) return;
    const file = findNode(fileStructure, selectedFileId);
    if (file) {
      // Store session data
      setExcalidrawSessions(prev => {
        const next = new Map(prev);
        next.set(`${file.id}-excalidraw`, { initialData, editingFileName });
        return next;
      });
      // Open tab
      openStudyModeTab(file, 'excalidraw');
    }
  };

  const handleExcalidrawSaveInTab = async (fileId: string, imagePath: string, newContent: string) => {
    // 1. Refresh file system
    await handleRefresh();

    // 2. Update the file content in the structure
    updateFileContent(newContent, fileId);

    // 3. Close the drawing tab
    closeStudyModeForFile(fileId);
  };

  const handleStartDrawio = (initialXml?: string | null, editingFileName?: string) => {
    if (!selectedFileId) return;
    const file = findNode(fileStructure, selectedFileId);
    if (file) {
      // Store session data
      setDrawioSessions(prev => {
        const next = new Map(prev);
        next.set(`${file.id}-drawio`, { initialXml: initialXml || null, editingFileName });
        return next;
      });
      // Open tab
      openStudyModeTab(file, 'drawio');
    }
  };

  const handleDrawioSaveInTab = async (fileId: string, imagePath: string, newContent: string) => {
    // 1. Refresh file system
    await handleRefresh();

    // 2. Update the file content in the structure
    updateFileContent(newContent, fileId);

    // 3. Close the drawing tab
    closeStudyModeForFile(fileId);
  };

  const renderContent = () => {


    if (!selectedFile) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-gray-400">
          <i className="fa-regular fa-folder-open text-4xl mb-4"></i>
          <p>Select a document to view</p>
        </div>
      );
    }

    if (selectedFile.fileType === 'pdf') {
      return (
        <PDFViewerWrapper
          pdfHandle={pdfHandles.get(selectedFile.id)}
          fileName={selectedFile.name}
          onClose={() => handleTabClose(activeTabId!)}
          mode={mode}
          onStartLearning={() => handleStartStudyMode('learning')}
          onStartLesson={() => handleStartStudyMode('lesson')}
          onStartWorkbook={() => handleStartStudyMode('workbook')}
          onStartChallenge={() => handleStartStudyMode('challenge')}
          onStartInterview={() => handleStartStudyMode('interview')}
          onStartPairProgramming={() => handleStartStudyMode('pairProgramming')}
          onStartConceptExtraction={() => handleStartStudyMode('conceptExtraction')}
          onStartProjectSpec={handleStartProjectSpec}
          onPdfDataLoaded={(data) => handlePdfDataLoaded(selectedFile.id, data)}
        />
      );
    }

    if (selectedFile.content !== undefined) {
      return (
        <MarkdownViewer
          content={selectedFile.content}
          fileName={selectedFile.name}
          noteId={selectedFile.id}
          directoryHandle={directoryHandle}
          onUpdateContent={updateFileContent}
          onClose={() => handleTabClose(activeTabId!)}
          resolveImage={resolveImage}
          onSelectFile={handleFileLinkClick}
          onStartLearning={() => handleStartStudyMode('learning')}
          onStartLesson={() => handleStartStudyMode('lesson')}
          onStartWorkbook={() => handleStartStudyMode('workbook')}
          onStartChallenge={() => handleStartStudyMode('challenge')}
          onStartInterview={() => handleStartStudyMode('interview')}
          onStartPairProgramming={() => handleStartStudyMode('pairProgramming')}
          onStartConceptExtraction={() => handleStartStudyMode('conceptExtraction')}
          onStartExcalidraw={handleStartExcalidraw}
          loadExcalidrawData={loadExcalidrawData}
          onStartDrawio={handleStartDrawio}
          loadDrawioData={loadDrawioData}
          onRefresh={handleRefresh}
          onStartProjectSpec={handleStartProjectSpec}
        />
      );
    }

    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400">
        <i className="fa-regular fa-folder-open text-4xl mb-4"></i>
        <p>Select a document to view</p>
      </div>
    );
  };

  return (
    <div className="flex h-screen w-full bg-white overflow-hidden text-gray-800 font-sans">
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        width={sidebarWidth}
        isResizing={isResizing}
        onStartResizing={startResizing}
        title={sidebarTitle}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filteredFiles={filteredFiles}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onSelectFile={handleSelectFile}
        onToggleFolder={handleToggleFolder}
        onNewFile={() => createNewItem('file')}
        onNewFolder={() => createNewItem('folder')}
        onLoadDirectory={onLoadDirectory}
        onRefresh={handleRefresh}
        onCollapse={() => setSidebarOpen(false)}
        showRefresh={!!directoryHandle}
        onGenerateRoteiro={handleGenerateRoteiro}
        onDeleteItems={handleDeleteItems}
        onMoveItems={moveItems}
        onGroupInFolder={handleGroupInFolder}
        showFavorites={showFavorites}
        onToggleFavoritesView={() => setShowFavorites(prev => !prev)}
        favorites={favorites}
        onToggleFavorite={toggleFavorite}
        onRenameItem={handleRenameItem}
        onCreateNote={handleCreateNoteInFolder}
        onOpenSettings={() => setSettingsModalOpen(true)}
        activeNoteContent={selectedFile?.fileType !== 'pdf' ? selectedFile?.content : null}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-gray-100 relative">
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="absolute top-4 left-4 z-10 p-2 bg-white border border-gray-200 rounded-lg shadow-sm"
          >
            <i className="fa-solid fa-bars"></i>
          </button>
        )}

        {/* Tab Bar */}
        <TabBar
          tabs={tabs}
          activeTabId={activeTabId}
          onTabClick={handleTabClick}
          onTabClose={handleTabClose}
          onTabDoubleClick={handleTabDoubleClick}
        />

        {/* Content Area - renders all study mode tabs to preserve state */}
        <div className="flex-1 overflow-hidden relative">
          {/* Render all study mode tabs (hidden when not active) */}
          {tabs.filter(tab => tab.isStudyMode).map(tab => {
            const file = findNode(fileStructure, tab.fileId);
            if (!file) return null;

            const isActive = tab.id === activeTabId;
            const pdfData = file.fileType === 'pdf' ? getPdfData(file.id) : null;
            const noteContent = file.content || '';

            const commonProps = {
              noteContent,
              noteName: file.name,
              noteId: file.id,
              tabId: tab.id,
              directoryHandle,
              onClose: () => closeStudyModeForFile(file.id),
              pdfData
            };

            return (
              <div
                key={tab.id}
                className="absolute inset-0"
                style={{ display: isActive ? 'block' : 'none' }}
              >
                {tab.studyModeType === 'learning' && <LearningMode {...commonProps} />}
                {tab.studyModeType === 'lesson' && <LessonMode {...commonProps} />}
                {tab.studyModeType === 'workbook' && <WorkbookMode {...commonProps} />}
                {tab.studyModeType === 'challenge' && <ChallengeMode {...commonProps} />}
                {tab.studyModeType === 'interview' && <InterviewMode {...commonProps} />}
                {tab.studyModeType === 'pairProgramming' && <PairProgrammingMode {...commonProps} />}
                {tab.studyModeType === 'conceptExtraction' && <ConceptExtractionMode {...commonProps} mode={mode} />}
                {tab.studyModeType === 'excalidraw' && (
                  <NoteExcalidraw
                    {...commonProps}
                    initialData={excalidrawSessions.get(tab.id)?.initialData}
                    existingFileName={excalidrawSessions.get(tab.id)?.editingFileName}
                    onSave={(path, content) => handleExcalidrawSaveInTab(file.id, path, content)}
                    onCancel={() => closeTab(tab.id)}
                  />
                )}
                {tab.studyModeType === 'drawio' && (
                  <NoteDrawio
                    {...commonProps}
                    initialXml={drawioSessions.get(tab.id)?.initialXml || undefined}
                    existingFileName={drawioSessions.get(tab.id)?.editingFileName}
                    onSave={(path, content) => handleDrawioSaveInTab(file.id, path, content)}
                    onCancel={() => closeTab(tab.id)}
                  />
                )}
                {tab.studyModeType === 'projectSpec' && (
                  <ProjectSpecMode {...commonProps} specType={projectSpecType} />
                )}
              </div>
            );
          })}

          {/* Render active file content (only if not study mode) */}
          {(!activeTab?.isStudyMode) && (
            <div className="h-full">
              {renderContent()}
            </div>
          )}
        </div>
      </div>

      {/* Chat Panel */}
      <div
        className={`${chatOpen ? '' : 'w-0'} ${isChatResizing ? '' : 'transition-all duration-300 ease-in-out'} flex-shrink-0 relative border-l border-gray-200 bg-white`}
        style={{ width: chatOpen ? `${chatWidth}px` : 0 }}
      >
        {!chatOpen && (
          <button
            onClick={() => setChatOpen(true)}
            className="absolute top-4 -left-10 w-8 h-8 bg-blue-600 text-white rounded-l-lg flex items-center justify-center shadow-md z-20"
          >
            <i className="fa-solid fa-brain"></i>
          </button>
        )}
        <ChatInterface
          currentContext={selectedFile?.content || 'No document selected.'}
          isOpen={chatOpen}
          onClose={() => setChatOpen(false)}
          width={chatWidth}
          isResizing={isChatResizing}
          onStartResizing={startChatResizing}
        />
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
      />
    </div>
  );
};

export default App;