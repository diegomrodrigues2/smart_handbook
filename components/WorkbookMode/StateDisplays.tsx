import React from 'react';

export const LoadingState: React.FC = () => (
    <div className="h-full flex flex-col bg-gradient-to-br from-teal-50 via-emerald-50 to-green-50 rounded-lg overflow-hidden shadow-xl">
        <div className="flex-1 flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 flex items-center justify-center mb-6 animate-pulse">
                <i className="fa-solid fa-list-check text-white text-2xl"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Gerando Exercícios</h2>
            <p className="text-gray-500 mb-4">Criando uma lista de exercícios baseada no conteúdo...</p>
            <div className="flex items-center gap-2 text-teal-600">
                <i className="fa-solid fa-spinner fa-spin"></i>
                <span className="text-sm">Processando...</span>
            </div>
        </div>
    </div>
);

interface ErrorStateProps {
    onRetry: () => void;
    onClose: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ onRetry, onClose }) => (
    <div className="h-full flex flex-col bg-gradient-to-br from-red-50 via-orange-50 to-amber-50 rounded-lg overflow-hidden shadow-xl">
        <div className="flex-1 flex flex-col items-center justify-center p-8">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-6">
                <i className="fa-solid fa-triangle-exclamation text-red-500 text-2xl"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Erro ao Gerar Exercícios</h2>
            <p className="text-gray-500 mb-6 text-center">Não foi possível gerar a lista de exercícios. Tente novamente.</p>
            <div className="flex gap-3">
                <button
                    onClick={onRetry}
                    className="px-6 py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors flex items-center gap-2"
                >
                    <i className="fa-solid fa-arrows-rotate"></i>
                    Tentar Novamente
                </button>
                <button
                    onClick={onClose}
                    className="px-6 py-3 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-colors"
                >
                    Fechar
                </button>
            </div>
        </div>
    </div>
);
