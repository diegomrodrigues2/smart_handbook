import React, { useState, useEffect } from 'react';
import {
    getApiKeys,
    getApiKeysInternal,
    getActiveKeyName,
    getSelectedModel,
    addApiKey,
    updateApiKey,
    removeApiKey,
    setActiveApiKey,
    setSelectedModel,
    subscribe,
    AppSettings
} from '../services/settingsService';
import './SettingsModal.css';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
    const [apiKeys, setApiKeys] = useState(getApiKeys());
    const [activeKeyName, setActiveKeyNameState] = useState(getActiveKeyName());
    const [selectedModel, setSelectedModelState] = useState<AppSettings['selectedModel']>(getSelectedModel());

    // Form state for adding/editing
    const [isAdding, setIsAdding] = useState(false);
    const [editingName, setEditingName] = useState<string | null>(null);
    const [formName, setFormName] = useState('');
    const [formKey, setFormKey] = useState('');
    const [error, setError] = useState('');

    // Subscribe to settings changes
    useEffect(() => {
        const unsubscribe = subscribe(() => {
            setApiKeys(getApiKeys());
            setActiveKeyNameState(getActiveKeyName());
            setSelectedModelState(getSelectedModel());
        });
        return unsubscribe;
    }, []);

    // Refresh state when modal opens
    useEffect(() => {
        if (isOpen) {
            setApiKeys(getApiKeys());
            setActiveKeyNameState(getActiveKeyName());
            setSelectedModelState(getSelectedModel());
            setIsAdding(false);
            setEditingName(null);
            setError('');
        }
    }, [isOpen]);

    const handleAddNew = () => {
        setIsAdding(true);
        setEditingName(null);
        setFormName('');
        setFormKey('');
        setError('');
    };

    const handleEdit = (name: string) => {
        const keys = getApiKeysInternal();
        const entry = keys.find(k => k.name === name);
        if (entry) {
            setIsAdding(false);
            setEditingName(name);
            setFormName(name);
            setFormKey(entry.key);
            setError('');
        }
    };

    const handleSave = () => {
        if (!formName.trim()) {
            setError('Nome é obrigatório');
            return;
        }
        if (!formKey.trim()) {
            setError('API Key é obrigatória');
            return;
        }

        if (isAdding) {
            const success = addApiKey(formName.trim(), formKey.trim());
            if (!success) {
                setError('Já existe uma key com esse nome');
                return;
            }
        } else if (editingName) {
            const success = updateApiKey(editingName, formKey.trim());
            if (!success) {
                setError('Erro ao atualizar key');
                return;
            }
        }

        setIsAdding(false);
        setEditingName(null);
        setFormName('');
        setFormKey('');
        setError('');
    };

    const handleCancel = () => {
        setIsAdding(false);
        setEditingName(null);
        setFormName('');
        setFormKey('');
        setError('');
    };

    const handleRemove = (name: string) => {
        if (apiKeys.length <= 1) {
            setError('Não é possível remover a única API key');
            return;
        }
        if (window.confirm(`Remover a API key "${name}"?`)) {
            removeApiKey(name);
        }
    };

    const handleSetActive = (name: string) => {
        setActiveApiKey(name);
    };

    const handleModelChange = (model: AppSettings['selectedModel']) => {
        setSelectedModel(model);
    };

    if (!isOpen) return null;

    return (
        <div className="settings-modal-overlay" onClick={onClose}>
            <div className="settings-modal" onClick={e => e.stopPropagation()}>
                <div className="settings-modal-header">
                    <h2>Configurações</h2>
                    <button className="settings-close-btn" onClick={onClose}>
                        <i className="fa-solid fa-times"></i>
                    </button>
                </div>

                <div className="settings-modal-content">
                    {/* Model Selection */}
                    <section className="settings-section">
                        <h3>Modelo Gemini</h3>
                        <div className="model-selector">
                            <label className={`model-option ${selectedModel === 'gemini-3-flash-preview' ? 'active' : ''}`}>
                                <input
                                    type="radio"
                                    name="model"
                                    value="gemini-3-flash-preview"
                                    checked={selectedModel === 'gemini-3-flash-preview'}
                                    onChange={() => handleModelChange('gemini-3-flash-preview')}
                                />
                                <div className="model-info">
                                    <span className="model-name">Gemini 3 Flash</span>
                                    <span className="model-desc">Rápido e eficiente</span>
                                </div>
                            </label>
                            <label className={`model-option ${selectedModel === 'gemini-3-pro-preview' ? 'active' : ''}`}>
                                <input
                                    type="radio"
                                    name="model"
                                    value="gemini-3-pro-preview"
                                    checked={selectedModel === 'gemini-3-pro-preview'}
                                    onChange={() => handleModelChange('gemini-3-pro-preview')}
                                />
                                <div className="model-info">
                                    <span className="model-name">Gemini 3 Pro</span>
                                    <span className="model-desc">Maior capacidade</span>
                                </div>
                            </label>
                        </div>
                    </section>

                    {/* API Keys Section */}
                    <section className="settings-section">
                        <div className="section-header">
                            <h3>API Keys</h3>
                            <button
                                className="add-key-btn"
                                onClick={handleAddNew}
                                disabled={isAdding || editingName !== null}
                            >
                                <i className="fa-solid fa-plus"></i>
                                Adicionar
                            </button>
                        </div>

                        {error && <div className="settings-error">{error}</div>}

                        {/* Add/Edit Form */}
                        {(isAdding || editingName) && (
                            <div className="key-form">
                                <input
                                    type="text"
                                    placeholder="Nome da key"
                                    value={formName}
                                    onChange={e => setFormName(e.target.value)}
                                    disabled={editingName !== null}
                                />
                                <input
                                    type="password"
                                    placeholder="API Key"
                                    value={formKey}
                                    onChange={e => setFormKey(e.target.value)}
                                />
                                <div className="form-actions">
                                    <button className="save-btn" onClick={handleSave}>
                                        Salvar
                                    </button>
                                    <button className="cancel-btn" onClick={handleCancel}>
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Keys List */}
                        <div className="keys-list">
                            {apiKeys.map(key => (
                                <div
                                    key={key.name}
                                    className={`key-item ${key.name === activeKeyName ? 'active' : ''}`}
                                >
                                    <div className="key-info" onClick={() => handleSetActive(key.name)}>
                                        <div className="key-radio">
                                            <input
                                                type="radio"
                                                name="activeKey"
                                                checked={key.name === activeKeyName}
                                                onChange={() => handleSetActive(key.name)}
                                            />
                                        </div>
                                        <div className="key-details">
                                            <span className="key-name">{key.name}</span>
                                            <span className="key-value">{key.maskedKey}</span>
                                        </div>
                                    </div>
                                    <div className="key-actions">
                                        <button
                                            className="edit-btn"
                                            onClick={() => handleEdit(key.name)}
                                            title="Editar"
                                        >
                                            <i className="fa-solid fa-pen"></i>
                                        </button>
                                        <button
                                            className="delete-btn"
                                            onClick={() => handleRemove(key.name)}
                                            title="Remover"
                                            disabled={apiKeys.length <= 1}
                                        >
                                            <i className="fa-solid fa-trash"></i>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                <div className="settings-modal-footer">
                    <p className="settings-note">
                        <i className="fa-solid fa-info-circle"></i>
                        Configurações são salvas automaticamente no navegador
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
