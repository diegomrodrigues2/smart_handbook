import React, { useState, useRef, useEffect } from 'react';
import { useSubjectMode } from '../hooks/useSubjectMode';
import { SubjectMode } from '../types';

const SubjectModeSelector: React.FC = () => {
    const { mode, setMode } = useSubjectMode();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const modes: { id: SubjectMode; label: string; icon: string; color: string }[] = [
        { id: 'computing', label: 'Computação', icon: 'fa-microchip', color: 'text-indigo-400' },
        { id: 'data-engineering', label: 'Engenharia de Dados', icon: 'fa-database', color: 'text-emerald-400' },
        { id: 'mathematics', label: 'Matemática', icon: 'fa-square-root-variable', color: 'text-purple-400' },
    ];

    const currentMode = modes.find(m => m.id === mode) || modes[0];

    const handleSelect = (newMode: SubjectMode) => {
        setMode(newMode);
        setIsOpen(false);
    };

    return (
        <div className="mode-selector" ref={dropdownRef}>
            <div className="relative w-full">
                <button
                    className={`dropdown-trigger ${isOpen ? 'active' : ''}`}
                    onClick={() => setIsOpen(!isOpen)}
                >
                    <div className="flex items-center gap-2">
                        <i className={`fa-solid ${currentMode.icon} ${currentMode.color}`}></i>
                        <span className="font-medium text-gray-200">{currentMode.label}</span>
                    </div>
                    <i className={`fa-solid fa-chevron-down text-xs text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}></i>
                </button>

                {isOpen && (
                    <div className="dropdown-menu">
                        {modes.map((m) => (
                            <button
                                key={m.id}
                                className={`dropdown-item ${mode === m.id ? 'selected' : ''}`}
                                onClick={() => handleSelect(m.id)}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`icon-container ${mode === m.id ? 'active' : ''}`}>
                                        <i className={`fa-solid ${m.icon} ${m.color}`}></i>
                                    </div>
                                    <span className={`${mode === m.id ? 'text-white font-medium' : 'text-gray-400'}`}>
                                        {m.label}
                                    </span>
                                </div>
                                {mode === m.id && <i className="fa-solid fa-check text-indigo-400 text-xs"></i>}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <style>{`
                .mode-selector {
                    padding: 12px;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                }

                .dropdown-trigger {
                    width: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 10px 12px;
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 10px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .dropdown-trigger:hover {
                    background: rgba(255, 255, 255, 0.08);
                    border-color: rgba(255, 255, 255, 0.2);
                }

                .dropdown-trigger.active {
                    background: rgba(255, 255, 255, 0.1);
                    border-color: rgba(99, 102, 241, 0.5);
                    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
                }

                .dropdown-menu {
                    position: absolute;
                    top: 100%;
                    left: 0;
                    right: 0;
                    margin-top: 6px;
                    background: #1e1e24; /* Dark background matching approximate theme */
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 12px;
                    padding: 6px;
                    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
                    z-index: 50;
                    animation: slideIn 0.2s ease-out;
                }

                @keyframes slideIn {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .dropdown-item {
                    width: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 10px 12px;
                    border: none;
                    background: transparent;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.15s ease;
                    margin-bottom: 2px;
                }

                .dropdown-item:last-child {
                    margin-bottom: 0;
                }

                .dropdown-item:hover {
                    background: rgba(255, 255, 255, 0.05);
                }

                .dropdown-item.selected {
                    background: rgba(99, 102, 241, 0.1);
                }

                .icon-container {
                    width: 24px;
                    height: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 6px;
                    background: rgba(255, 255, 255, 0.05);
                }

                .icon-container.active {
                    background: rgba(255, 255, 255, 0.1);
                }
            `}</style>
        </div>
    );
};

export default SubjectModeSelector;


