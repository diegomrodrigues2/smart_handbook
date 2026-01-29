import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { SubjectMode } from '../types';

interface SubjectModeContextType {
    mode: SubjectMode;
    setMode: (mode: SubjectMode) => void;
    isMathMode: boolean;
    isComputingMode: boolean;
    isDataEngineeringMode: boolean;
}

const SubjectModeContext = createContext<SubjectModeContextType | null>(null);

const STORAGE_KEY = 'smart_handbook_subject_mode';

const isValidMode = (value: string | null): value is SubjectMode => {
    return value === 'computing' || value === 'mathematics' || value === 'data-engineering';
};

interface SubjectModeProviderProps {
    children: ReactNode;
}

export const SubjectModeProvider: React.FC<SubjectModeProviderProps> = ({ children }) => {
    const [mode, setModeState] = useState<SubjectMode>(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        return isValidMode(stored) ? stored : 'computing';
    });

    const setMode = useCallback((newMode: SubjectMode) => {
        setModeState(newMode);
        localStorage.setItem(STORAGE_KEY, newMode);
    }, []);

    const value: SubjectModeContextType = {
        mode,
        setMode,
        isMathMode: mode === 'mathematics',
        isComputingMode: mode === 'computing',
        isDataEngineeringMode: mode === 'data-engineering',
    };

    return (
        <SubjectModeContext.Provider value={value}>
            {children}
        </SubjectModeContext.Provider>
    );
};

export const useSubjectMode = (): SubjectModeContextType => {
    const context = useContext(SubjectModeContext);
    if (!context) {
        throw new Error('useSubjectMode must be used within a SubjectModeProvider');
    }
    return context;
};

export default useSubjectMode;
