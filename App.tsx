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
import { FileNode, SubjectMode } from './types';
import { useFileSystem, useSidebarResize, useSubjectMode } from './hooks';
import { findNode, filterNodesByQuery, updateNodeById } from './utils';
import { resolveRelativePath, getDirectoryPath, cleanSourcePath, buildFullPath } from './utils/pathUtils';


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
  onPdfDataLoaded
}) => {
    const [pdfData, setPdfData] = React.useState<ArrayBuffer | null>(null);
    const [pdfDataCopy, setPdfDataCopy] = React.useState<ArrayBuffer | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);

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
          if (onPdfDataLoaded) {
            onPdfDataLoaded(studyData);
          }
          setIsLoading(false);
        } catch (error) {
          console.error('Error loading PDF:', error);
          setIsLoading(false);
        }
      };
      loadPDF();
    }, [pdfHandle, onPdfDataLoaded]);

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
    isRestoring
  } = useFileSystem();

  const { width: sidebarWidth, isResizing, startResizing } = useSidebarResize({
    minWidth: 256,
    maxWidth: 600,
    initialWidth: 256
  });

  const { mode } = useSubjectMode();

  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chatOpen, setChatOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [learningMode, setLearningMode] = useState(false);
  const [lessonMode, setLessonMode] = useState(false);
  const [workbookMode, setWorkbookMode] = useState(false);
  const [challengeMode, setChallengeMode] = useState(false);
  const [interviewMode, setInterviewMode] = useState(false);
  const [pairProgrammingMode, setPairProgrammingMode] = useState(false);
  const [conceptExtractionMode, setConceptExtractionMode] = useState(false);
  const [currentPdfData, setCurrentPdfData] = useState<ArrayBuffer | null>(null);

  // Check if any study mode is active
  const isAnyStudyModeActive = learningMode || lessonMode || workbookMode ||
    challengeMode || interviewMode || pairProgrammingMode || conceptExtractionMode;

  // Callback for when PDF data is loaded
  const handlePdfDataLoaded = useCallback((data: ArrayBuffer) => {
    setCurrentPdfData(data);
  }, []);

  // Derived state
  const selectedFile = useMemo(
    () => (selectedFileId ? findNode(fileStructure, selectedFileId) : null),
    [fileStructure, selectedFileId]
  );

  const filteredFiles = useMemo(
    () => filterNodesByQuery(fileStructure, searchQuery),
    [fileStructure, searchQuery]
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

  const updateFileContent = (newContent: string) => {
    if (!selectedFileId) return;
    setFileStructure(prev => updateNodeById(prev, selectedFileId, { content: newContent }));
  };

  const handleFileLinkClick = (href: string) => {
    if (!selectedFileId) return;

    const resolvedPath = resolveRelativePath(selectedFileId, href);
    const node = findNode(fileStructure, resolvedPath);

    if (node) {
      setSelectedFileId(resolvedPath);
    } else {
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



  const onLoadDirectory = async () => {
    const firstFileId = await handleLoadDirectory();
    if (firstFileId) setSelectedFileId(firstFileId);
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

    if (type === 'file') setSelectedFileId(newItem.id);
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
        selectedFileId={selectedFileId}
        onSelectFile={(node) => setSelectedFileId(node.id)}
        onToggleFolder={handleToggleFolder}
        onNewFile={() => createNewItem('file')}
        onNewFolder={() => createNewItem('folder')}
        onLoadDirectory={onLoadDirectory}
        onRefresh={handleRefresh}
        onCollapse={() => setSidebarOpen(false)}
        showRefresh={!!directoryHandle}
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

        <div className="flex-1 p-4 overflow-hidden">
          {isRestoring ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <i className="fa-solid fa-spinner fa-spin text-4xl mb-4 text-indigo-500"></i>
              <p className="text-gray-600">Restaurando última pasta...</p>
            </div>
          ) : selectedFile?.fileType === 'pdf' ? (
            // PDF is selected - check if any study mode is active
            isAnyStudyModeActive && currentPdfData ? (
              // Show study mode with PDF data
              workbookMode ? (
                <WorkbookMode
                  noteContent=""
                  noteName={selectedFile.name}
                  noteId={selectedFile.id}
                  directoryHandle={directoryHandle}
                  onClose={() => setWorkbookMode(false)}
                  pdfData={currentPdfData}
                />
              ) : lessonMode ? (
                <LessonMode
                  noteContent=""
                  noteName={selectedFile.name}
                  noteId={selectedFile.id}
                  directoryHandle={directoryHandle}
                  onClose={() => setLessonMode(false)}
                  pdfData={currentPdfData}
                />
              ) : learningMode ? (
                <LearningMode
                  noteContent=""
                  noteName={selectedFile.name}
                  noteId={selectedFile.id}
                  directoryHandle={directoryHandle}
                  onClose={() => setLearningMode(false)}
                  pdfData={currentPdfData}
                />
              ) : challengeMode ? (
                <ChallengeMode
                  noteContent=""
                  noteName={selectedFile.name}
                  noteId={selectedFile.id}
                  directoryHandle={directoryHandle}
                  onClose={() => setChallengeMode(false)}
                  pdfData={currentPdfData}
                />
              ) : interviewMode ? (
                <InterviewMode
                  noteContent=""
                  noteName={selectedFile.name}
                  noteId={selectedFile.id}
                  directoryHandle={directoryHandle}
                  onClose={() => setInterviewMode(false)}
                  pdfData={currentPdfData}
                />
              ) : pairProgrammingMode ? (
                <PairProgrammingMode
                  noteContent=""
                  noteName={selectedFile.name}
                  noteId={selectedFile.id}
                  directoryHandle={directoryHandle}
                  onClose={() => setPairProgrammingMode(false)}
                  pdfData={currentPdfData}
                />
              ) : conceptExtractionMode ? (
                <ConceptExtractionMode
                  noteContent=""
                  noteName={selectedFile.name}
                  noteId={selectedFile.id}
                  directoryHandle={directoryHandle}
                  onClose={() => setConceptExtractionMode(false)}
                  pdfData={currentPdfData}
                  mode={mode}
                />
              ) : null
            ) : (
              // Show PDF viewer with study modes menu
              <PDFViewerWrapper
                pdfHandle={pdfHandles.get(selectedFile.id)}
                fileName={selectedFile.name}
                onClose={() => setSelectedFileId(null)}
                mode={mode}
                onStartLearning={() => setLearningMode(true)}
                onStartLesson={() => setLessonMode(true)}
                onStartWorkbook={() => setWorkbookMode(true)}
                onStartChallenge={() => setChallengeMode(true)}
                onStartInterview={() => setInterviewMode(true)}
                onStartPairProgramming={() => setPairProgrammingMode(true)}
                onStartConceptExtraction={() => setConceptExtractionMode(true)}
                onPdfDataLoaded={handlePdfDataLoaded}
              />
            )
          ) : selectedFile?.content !== undefined ? (
            workbookMode ? (
              <WorkbookMode
                noteContent={selectedFile.content}
                noteName={selectedFile.name}
                noteId={selectedFile.id}
                directoryHandle={directoryHandle}
                onClose={() => setWorkbookMode(false)}
              />
            ) : lessonMode ? (
              <LessonMode
                noteContent={selectedFile.content}
                noteName={selectedFile.name}
                noteId={selectedFile.id}
                directoryHandle={directoryHandle}
                onClose={() => setLessonMode(false)}
              />
            ) : learningMode ? (
              <LearningMode
                noteContent={selectedFile.content}
                noteName={selectedFile.name}
                noteId={selectedFile.id}
                directoryHandle={directoryHandle}
                onClose={() => setLearningMode(false)}
              />
            ) : challengeMode ? (
              <ChallengeMode
                noteContent={selectedFile.content}
                noteName={selectedFile.name}
                noteId={selectedFile.id}
                directoryHandle={directoryHandle}
                onClose={() => setChallengeMode(false)}
              />
            ) : interviewMode ? (
              <InterviewMode
                noteContent={selectedFile.content}
                noteName={selectedFile.name}
                noteId={selectedFile.id}
                directoryHandle={directoryHandle}
                onClose={() => setInterviewMode(false)}
              />
            ) : pairProgrammingMode ? (
              <PairProgrammingMode
                noteContent={selectedFile.content}
                noteName={selectedFile.name}
                noteId={selectedFile.id}
                directoryHandle={directoryHandle}
                onClose={() => setPairProgrammingMode(false)}
              />
            ) : conceptExtractionMode ? (
              <ConceptExtractionMode
                noteContent={selectedFile.content}
                noteName={selectedFile.name}
                noteId={selectedFile.id}
                directoryHandle={directoryHandle}
                onClose={() => setConceptExtractionMode(false)}
                mode={mode}
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
                onStartLesson={() => setLessonMode(true)}
                onStartWorkbook={() => setWorkbookMode(true)}
                onStartChallenge={() => setChallengeMode(true)}
                onStartInterview={() => setInterviewMode(true)}
                onStartPairProgramming={() => setPairProgrammingMode(true)}
                onStartConceptExtraction={() => setConceptExtractionMode(true)}
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

      {/* Chat Panel */}
      <div className={`${chatOpen ? 'w-[400px]' : 'w-0'} transition-all duration-300 ease-in-out flex-shrink-0 relative border-l border-gray-200 bg-white`}>
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
        />
      </div>
    </div>
  );
};

export default App;