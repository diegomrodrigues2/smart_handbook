import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import StudyModesMenu from '../StudyModesMenu';
import ProjectModesMenu from '../ProjectModesMenu';
import AudioPlayer from '../AudioPlayer';
import { generateAudioFromPDF, createAudioBlobUrl } from '../../services/audioService';
import { SubjectMode } from '../../types';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import './PDFViewer.css';

// Configurar worker do PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;


interface PDFViewerProps {
    fileUrl: string | ArrayBuffer;
    fileName: string;
    onClose: () => void;
    // PDF data for audio generation (should be a separate copy to avoid detached buffer issues)
    pdfData?: ArrayBuffer | null;
    // Study Modes props
    mode?: SubjectMode;
    onStartLearning?: () => void;
    onStartLesson?: () => void;
    onStartWorkbook?: () => void;
    onStartChallenge?: () => void;
    onStartInterview?: () => void;
    onStartPairProgramming?: () => void;
    onStartConceptExtraction?: () => void;
    onStartProjectSpec?: (specType: import('../../types').ProjectSpecType) => void;
}

const PDFViewer: React.FC<PDFViewerProps> = ({
    fileUrl,
    fileName,
    onClose,
    pdfData,
    mode = 'computing',
    onStartLearning,
    onStartLesson,
    onStartWorkbook,
    onStartChallenge,
    onStartInterview,
    onStartPairProgramming,
    onStartConceptExtraction,
    onStartProjectSpec
}) => {
    const [numPages, setNumPages] = useState<number>(0);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [scale, setScale] = useState<number>(1.5);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
    const [audioStatus, setAudioStatus] = useState('');
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [showPlayer, setShowPlayer] = useState(false);

    const onDocumentLoadSuccess = ({ numPages }: PDFDocumentProxy) => {
        setNumPages(numPages);
        setIsLoading(false);
    };

    const onDocumentLoadError = (error: Error) => {
        console.error('Error loading PDF:', error);
        setIsLoading(false);
    };

    const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.5, 3.0));
    const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.5, 0.75));
    const handleResetZoom = () => setScale(1.5);

    const goToPreviousPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
    const goToNextPage = () => setCurrentPage((prev) => Math.min(prev + 1, numPages));

    // Audio handlers
    const handleGenerateAudio = async () => {
        setIsGeneratingAudio(true);
        setAudioStatus('Preparando...');

        try {
            // Get PDF data as ArrayBuffer
            let audioSourceData: ArrayBuffer;

            if (pdfData) {
                // Use the provided pdfData copy (preferred)
                audioSourceData = pdfData;
            } else if (typeof fileUrl === 'string') {
                // Fetch the PDF if it's a URL
                const response = await fetch(fileUrl);
                audioSourceData = await response.arrayBuffer();
            } else {
                // Try to use fileUrl directly (may fail if detached)
                audioSourceData = fileUrl;
            }

            const result = await generateAudioFromPDF(audioSourceData, setAudioStatus);

            if (result) {
                const url = createAudioBlobUrl(result.audioBase64, result.mimeType);
                setAudioUrl(url);
                setShowPlayer(true);
            }
        } catch (error) {
            console.error('Error generating audio:', error);
            setAudioStatus('Erro ao gerar áudio');
        }

        setIsGeneratingAudio(false);
        setAudioStatus('');
    };

    const handleClosePlayer = () => {
        setShowPlayer(false);
        if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
            setAudioUrl(null);
        }
    };

    return (
        <div className="h-full flex flex-col bg-white shadow-sm border border-gray-200 overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center justify-end bg-gray-50 border-b border-gray-200 px-4 h-12 select-none gap-2">

                {/* Audio Explanation Button */}
                <button
                    onClick={handleGenerateAudio}
                    disabled={isGeneratingAudio || isLoading}
                    className="text-xs border border-amber-200 rounded-lg px-3 py-1.5 mr-2 transition-all bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 hover:from-amber-100 hover:to-orange-100 font-medium flex items-center gap-1.5 disabled:opacity-50"
                    title="Gerar Explicação em Áudio"
                >
                    {isGeneratingAudio ? (
                        <>
                            <i className="fa-solid fa-spinner fa-spin"></i>
                            <span>{audioStatus || 'Gerando...'}</span>
                        </>
                    ) : (
                        <>
                            <i className="fa-solid fa-headphones"></i>
                            <span>Ouvir</span>
                        </>
                    )}
                </button>

                {/* Study Modes Menu */}
                <StudyModesMenu
                    onStartLearning={onStartLearning}
                    onStartLesson={onStartLesson}
                    onStartWorkbook={onStartWorkbook}
                    onStartChallenge={onStartChallenge}
                    onStartInterview={onStartInterview}
                    onStartPairProgramming={onStartPairProgramming}
                    onStartConceptExtraction={onStartConceptExtraction}
                    mode={mode}
                />

                {/* Project Modes Menu */}
                <ProjectModesMenu
                    onStartProjectSpec={onStartProjectSpec}
                    mode={mode}
                />

                {/* Controles de navegação */}
                <div className="flex items-center gap-2 mr-4">
                    <button
                        onClick={goToPreviousPage}
                        disabled={currentPage <= 1}
                        className="px-2 py-1 text-sm border border-gray-200 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Página anterior"
                    >
                        <i className="fa-solid fa-chevron-left"></i>
                    </button>
                    <span className="text-sm text-gray-600 min-w-[80px] text-center">
                        {isLoading ? '...' : `${currentPage} / ${numPages}`}
                    </span>
                    <button
                        onClick={goToNextPage}
                        disabled={currentPage >= numPages}
                        className="px-2 py-1 text-sm border border-gray-200 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Próxima página"
                    >
                        <i className="fa-solid fa-chevron-right"></i>
                    </button>
                </div>

                {/* Controles de zoom */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleZoomOut}
                        disabled={scale <= 0.75}
                        className="px-2 py-1 text-sm border border-gray-200 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Diminuir zoom"
                    >
                        <i className="fa-solid fa-minus"></i>
                    </button>
                    <button
                        onClick={handleResetZoom}
                        className="px-3 py-1 text-xs font-mono border border-gray-200 rounded hover:bg-gray-100"
                        title="Resetar zoom"
                    >
                        {Math.round((scale / 1.5) * 100)}%
                    </button>
                    <button
                        onClick={handleZoomIn}
                        disabled={scale >= 3.0}
                        className="px-2 py-1 text-sm border border-gray-200 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Aumentar zoom"
                    >
                        <i className="fa-solid fa-plus"></i>
                    </button>
                </div>
            </div>

            {/* Área de visualização do PDF */}
            <div className="flex-1 overflow-auto bg-gray-100 p-4">
                <div className="max-w-full mx-auto flex justify-center">
                    {isLoading && (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                            <i className="fa-solid fa-spinner fa-spin text-4xl mb-4 text-blue-500"></i>
                            <p className="text-gray-600">Carregando PDF...</p>
                        </div>
                    )}

                    <Document
                        file={fileUrl}
                        onLoadSuccess={onDocumentLoadSuccess}
                        onLoadError={onDocumentLoadError}
                        loading={null}
                        externalLinkTarget="_blank"
                    >
                        <div className="relative bg-white shadow-lg">
                            <Page
                                key={`page_${currentPage}`}
                                pageNumber={currentPage}
                                scale={scale}
                                renderTextLayer={true}
                                renderAnnotationLayer={true}
                                loading={
                                    <div className="flex items-center justify-center h-96">
                                        <i className="fa-solid fa-spinner fa-spin text-2xl text-gray-400"></i>
                                    </div>
                                }
                            />
                        </div>
                    </Document>
                </div>
            </div>

            {/* Audio Player */}
            {showPlayer && audioUrl && (
                <AudioPlayer
                    audioUrl={audioUrl}
                    title={fileName}
                    onClose={handleClosePlayer}
                />
            )}
        </div>
    );
};

export default PDFViewer;
