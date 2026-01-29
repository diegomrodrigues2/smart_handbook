import React from 'react';

interface LoadingStateProps { }

export const LoadingState: React.FC<LoadingStateProps> = () => {
    return (
        <div className="h-full flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50">
            <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center animate-pulse">
                    <i className="fa-solid fa-graduation-cap text-2xl text-white"></i>
                </div>
                <h2 className="text-xl font-semibold text-gray-700 mb-2">Preparando Modo Aprendizado</h2>
                <p className="text-gray-500 text-sm">Analisando conceitos da nota...</p>
            </div>
        </div>
    );
};

interface ErrorStateProps {
    onClose: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ onClose }) => {
    return (
        <div className="h-full flex flex-col items-center justify-center bg-gradient-to-br from-red-50 to-orange-50">
            <div className="text-center">
                <i className="fa-solid fa-exclamation-circle text-4xl text-red-400 mb-4"></i>
                <h2 className="text-xl font-semibold text-gray-700 mb-2">Não foi possível iniciar</h2>
                <p className="text-gray-500 text-sm mb-4">Não conseguimos extrair conceitos desta nota.</p>
                <button
                    onClick={onClose}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                    Voltar
                </button>
            </div>
        </div>
    );
};

interface CompletedStateProps {
    noteName: string;
    onClose: () => void;
}

export const CompletedState: React.FC<CompletedStateProps> = ({ noteName, onClose }) => {
    return (
        <div className="h-full flex flex-col items-center justify-center bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
            <div className="text-center max-w-md">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 flex items-center justify-center shadow-lg">
                    <i className="fa-solid fa-trophy text-3xl text-white"></i>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Parabéns! 🎉</h2>
                <p className="text-gray-600 mb-6">
                    Você completou todos os conceitos de <strong>{noteName}</strong>!
                </p>
                <div className="flex gap-3 justify-center">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all shadow-md"
                    >
                        Concluir
                    </button>
                </div>
            </div>
        </div>
    );
};
