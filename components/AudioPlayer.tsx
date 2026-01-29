import React, { useState, useRef, useEffect } from 'react';

interface AudioPlayerProps {
    audioUrl: string;
    title?: string;
    onClose: () => void;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ audioUrl, title, onClose }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
        const handleLoadedMetadata = () => setDuration(audio.duration);
        const handleEnded = () => setIsPlaying(false);
        const handleError = (e: ErrorEvent) => {
            console.error('Audio error:', e);
            setError('Formato de áudio não suportado');
        };

        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('error', handleError as any);

        return () => {
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
            audio.removeEventListener('ended', handleEnded);
            audio.removeEventListener('error', handleError as any);
        };
    }, []);

    const togglePlay = () => {
        const audio = audioRef.current;
        if (!audio) return;

        if (isPlaying) {
            audio.pause();
        } else {
            audio.play().catch(err => {
                console.error('Play error:', err);
                setError('Erro ao reproduzir áudio');
            });
        }
        setIsPlaying(!isPlaying);
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const audio = audioRef.current;
        if (!audio) return;

        const time = parseFloat(e.target.value);
        audio.currentTime = time;
        setCurrentTime(time);
    };

    const handleSpeedChange = () => {
        const audio = audioRef.current;
        if (!audio) return;

        const speeds = [0.75, 1, 1.25, 1.5, 2];
        const currentIndex = speeds.indexOf(playbackRate);
        const nextIndex = (currentIndex + 1) % speeds.length;
        const newRate = speeds[nextIndex];

        audio.playbackRate = newRate;
        setPlaybackRate(newRate);
    };

    const skip = (seconds: number) => {
        const audio = audioRef.current;
        if (!audio) return;

        audio.currentTime = Math.max(0, Math.min(duration, audio.currentTime + seconds));
    };

    const formatTime = (time: number) => {
        if (!isFinite(time)) return '0:00';
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    return (
        <div className="bg-white border-t border-gray-200 px-4 py-3 shadow-lg">
            <audio ref={audioRef} src={audioUrl} />

            <div className="flex items-center gap-4">
                {/* Icon and Title */}
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                        <i className="fa-solid fa-microphone text-white"></i>
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">Explicação em Áudio</p>
                        <p className="text-xs text-gray-500 truncate">{title}</p>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => skip(-10)}
                        className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors flex items-center justify-center"
                        title="Voltar 10s"
                    >
                        <i className="fa-solid fa-rotate-left text-xs"></i>
                    </button>

                    <button
                        onClick={togglePlay}
                        className="w-12 h-12 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 transition-colors flex items-center justify-center shadow-md"
                    >
                        <i className={`fa-solid ${isPlaying ? 'fa-pause' : 'fa-play'} ${!isPlaying ? 'ml-0.5' : ''}`}></i>
                    </button>

                    <button
                        onClick={() => skip(10)}
                        className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors flex items-center justify-center"
                        title="Avançar 10s"
                    >
                        <i className="fa-solid fa-rotate-right text-xs"></i>
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="flex-1 flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-10 text-right">{formatTime(currentTime)}</span>
                    <input
                        type="range"
                        min="0"
                        max={duration || 0}
                        value={currentTime}
                        onChange={handleSeek}
                        className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                    <span className="text-xs text-gray-500 w-10">{formatTime(duration)}</span>
                </div>

                {/* Speed */}
                <button
                    onClick={handleSpeedChange}
                    className="w-10 h-8 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors flex items-center justify-center text-xs font-bold"
                    title="Velocidade"
                >
                    {playbackRate}x
                </button>

                {/* Close */}
                <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-red-500 transition-colors p-2"
                    title="Fechar"
                >
                    <i className="fa-solid fa-xmark"></i>
                </button>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mt-2 text-center text-sm text-red-500">
                    {error}
                </div>
            )}
        </div>
    );
};

export default AudioPlayer;
