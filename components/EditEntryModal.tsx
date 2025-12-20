
import React, { useState, useEffect, useRef } from 'react';
import { X, Save, AlertCircle, CheckCircle, ChevronDown, Plus } from 'lucide-react';
import { submitSheetData } from '../services/sheetService';

interface EditEntryModalProps {
    isOpen: boolean;
    onClose: () => void;
    mode: 'add' | 'edit';
    title: string;
    sheetName: string;
    columns: string[]; 
    initialData?: any; 
    keyColumn?: string; 
    spreadsheetId?: string; 
    fieldOptions?: Record<string, string[]>; 
    hiddenFields?: string[]; 
    multiSelectFields?: string[]; 
    transformData?: (data: any) => any; 
    onSuccess: (data?: any) => void;
    fileColumns?: string[]; 
    uploadFolderId?: string; 
}

export const MultiSearchableSelect = ({ 
    value, 
    onChange, 
    options, 
    placeholder, 
    disabled,
    onAddNew
}: { 
    value: string, 
    onChange: (val: string) => void, 
    options: string[], 
    placeholder?: string,
    disabled?: boolean,
    onAddNew?: (val: string) => void
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (value) {
            setSelectedItems(value.split(',').map(s => s.trim()).filter(Boolean));
        } else {
            setSelectedItems([]);
        }
    }, [value]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearch(''); 
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const updateValue = (newItems: string[]) => {
        const unique = Array.from(new Set(newItems));
        setSelectedItems(unique);
        onChange(unique.join(', '));
    };

    const handleSelect = (val: string) => {
        const trimmed = val.trim();
        if (!trimmed) return;
        if (!selectedItems.includes(trimmed)) {
            updateValue([...selectedItems, trimmed]);
        }
        setSearch('');
        inputRef.current?.focus();
    };

    const handleRemove = (val: string) => {
        if (disabled) return;
        updateValue(selectedItems.filter(item => item !== val));
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && search) {
            e.preventDefault();
            if (onAddNew && !options.some(opt => opt.toLowerCase().includes(search.toLowerCase()))) {
                onAddNew(search);
            } else {
                handleSelect(search);
            }
        }
        if (e.key === 'Backspace' && !search && selectedItems.length > 0) {
            handleRemove(selectedItems[selectedItems.length - 1]);
        }
    };

    const filteredOptions = options
        .filter(opt => opt.toLowerCase().includes(search.toLowerCase()) && !selectedItems.includes(opt))
        .slice(0, 50);
    
    const showAddOption = search && !options.some(opt => opt.toLowerCase() === search.toLowerCase()) && !selectedItems.includes(search);

    return (
        <div ref={wrapperRef} className="relative">
            <div 
                className={`w-full min-h-[42px] border border-gray-300 rounded-lg px-2 py-1.5 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all bg-white shadow-sm flex flex-wrap gap-1.5 items-center ${disabled ? 'opacity-70 cursor-not-allowed' : ''}`}
                onClick={() => !disabled && inputRef.current?.focus()}
            >
                {selectedItems.map(item => (
                    <span key={item} className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
                        {item}
                        {!disabled && (
                            <button 
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleRemove(item); }}
                                className="ml-1 hover:text-blue-900 rounded-full hover:bg-blue-200 p-0.5 transition-colors"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </span>
                ))}
                <input
                    ref={inputRef}
                    type="text"
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        if (!isOpen) setIsOpen(true);
                    }}
                    onFocus={() => !disabled && setIsOpen(true)}
                    onKeyDown={handleKeyDown}
                    className="flex-1 min-w-[80px] text-sm outline-none bg-transparent placeholder-gray-400 h-6"
                    placeholder={selectedItems.length === 0 ? placeholder : ''}
                    disabled={disabled}
                    autoComplete="off"
                />
                {!disabled && (
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                )}
            </div>
            {isOpen && !disabled && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto thin-scrollbar left-0">
                    {filteredOptions.length === 0 && !showAddOption && (
                        <div className="px-3 py-2 text-sm text-gray-400 italic">No matching options</div>
                    )}
                    {filteredOptions.map((opt) => (
                        <div
                            key={opt}
                            onClick={() => handleSelect(opt)}
                            className="px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 cursor-pointer transition-colors"
                        >
                            {opt}
                        </div>
                    ))}
                    {showAddOption && (
                        <div
                            onClick={() => onAddNew ? onAddNew(search) : handleSelect(search)}
                            className="px-3 py-2 text-sm text-blue-600 font-bold hover:bg-blue-50 cursor-pointer border-t border-gray-100 flex items-center bg-gray-50/50"
                        >
                            <Plus className="w-3.5 h-3.5 mr-1.5" />
                            Add "{search}"
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export const SearchableSelect = ({ 
    value, 
    onChange, 
    options, 
    placeholder, 
    disabled,
    onAddNew
}: { 
    value: string, 
    onChange: (val: string) => void, 
    options: string[], 
    placeholder?: string,
    disabled?: boolean,
    onAddNew?: (val: string) => void
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState(value || '');
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setSearch(value || '');
    }, [value]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                if (search !== value) {
                    onChange(search);
                }
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [value, search, onChange]);

    const handleSelect = (val: string) => {
        onChange(val);
        setSearch(val);
        setIsOpen(false);
    };

    const filteredOptions = options
        .filter(opt => opt.toLowerCase().includes(search.toLowerCase()))
        .slice(0, 50);
    
    const hasExactMatch = options.some(opt => opt.toLowerCase() === search.toLowerCase());
    const showAddOption = search && !hasExactMatch;

    return (
        <div ref={wrapperRef} className="relative">
            <div className="relative">
                <input
                    type="text"
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        onChange(e.target.value);
                        if (!isOpen) setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2.5 pr-8 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all bg-white text-gray-900 placeholder-gray-400 shadow-sm"
                    placeholder={placeholder}
                    disabled={disabled}
                    autoComplete="off"
                />
                <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            {isOpen && !disabled && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto thin-scrollbar left-0">
                    {filteredOptions.map((opt) => (
                        <div
                            key={opt}
                            onClick={() => handleSelect(opt)}
                            className="px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 cursor-pointer transition-colors"
                        >
                            {opt}
                        </div>
                    ))}
                    {filteredOptions.length === 0 && !showAddOption && (
                        <div className="px-3 py-2 text-sm text-gray-400 italic">No options found</div>
                    )}
                    {showAddOption && (
                        <div
                            onClick={() => onAddNew ? onAddNew(search) : handleSelect(search)}
                            className="px-3 py-2 text-sm text-blue-600 font-bold hover:bg-blue-50 cursor-pointer border-t border-gray-100 flex items-center bg-gray-50/50"
                        >
                            <span className="mr-1 bg-blue-100 text-blue-600 rounded w-4 h-4 flex items-center justify-center text-xs">+</span> 
                            Add "{search}"
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export const EditEntryModal: React.FC<EditEntryModalProps> = ({ 
    isOpen, onClose, mode, title, sheetName, columns, initialData, keyColumn, spreadsheetId, fieldOptions, hiddenFields = [], multiSelectFields = [], transformData, onSuccess, fileColumns, uploadFolderId 
}) => {
    const [formData, setFormData] = useState<any>({});
    const [insertAtFirstEmpty, setInsertAtFirstEmpty] = useState(true);

    useEffect(() => {
        if (isOpen) {
            setFormData(initialData || {});
            setInsertAtFirstEmpty(true);
        }
    }, [isOpen, initialData]);

    const handleChange = (key: string, value: string) => {
        setFormData((prev: any) => ({ ...prev, [key]: value }));
    };

    const handleFileChange = (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = () => {
                if (typeof reader.result === 'string') {
                    const base64String = reader.result.split(',')[1];
                    setFormData((prev: any) => ({
                        ...prev,
                        [key]: {
                            fileName: file.name,
                            mimeType: file.type,
                            base64: base64String,
                            folderId: uploadFolderId
                        }
                    }));
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        let keyValue = undefined;
        if (mode === 'edit' && keyColumn) {
            keyValue = initialData[keyColumn];
        }
        let payload = { ...formData };
        if (transformData) {
            payload = transformData(payload);
        }
        columns.forEach(col => {
            if (payload[col] === undefined) {
                payload[col] = '';
            }
        });

        onSuccess(payload);
        onClose();

        const apiAction = mode === 'edit' ? 'update' : 'add';
        (async () => {
            try {
                let result = await submitSheetData(apiAction, sheetName, payload, keyColumn, keyValue, spreadsheetId, { insertMethod: insertAtFirstEmpty ? 'first_empty' : 'append' });
                if (result.result === 'error' && mode === 'edit' && result.message && result.message.toLowerCase().includes('not found')) {
                    result = await submitSheetData('add', sheetName, payload, keyColumn, keyValue, spreadsheetId, { insertMethod: insertAtFirstEmpty ? 'first_empty' : 'append' });
                }
            } catch (error) {
                console.error("Background API Error:", error);
            }
        })();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full md:w-full md:max-w-lg md:rounded-lg rounded-t-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 md:zoom-in-95 duration-200 max-h-[90vh] md:max-h-[85vh]">
                <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-white shrink-0 sticky top-0 z-10">
                    <h3 className="text-lg font-bold text-gray-800">{title}</h3>
                    <button onClick={onClose} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-600" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-5 bg-gray-50/50">
                    <form id="edit-form" onSubmit={handleSubmit} className="space-y-4">
                        {columns.map((col) => {
                            if (hiddenFields.includes(col)) return null;
                            if (fileColumns && fileColumns.includes(col)) {
                                return (
                                    <div key={col}>
                                        <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">{col}</label>
                                        <div className="relative">
                                            <input type="file" onChange={(e) => handleFileChange(col, e)} className="w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-gray-200 rounded-lg bg-white" accept="image/*" />
                                        </div>
                                        {typeof formData[col] === 'string' && formData[col] && (
                                            <div className="text-[10px] text-gray-400 mt-1 truncate px-1" title={formData[col]}>Current: {formData[col]}</div>
                                        )}
                                    </div>
                                );
                            }
                            if (multiSelectFields.includes(col)) {
                                return (
                                    <div key={col}>
                                        <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">{col}</label>
                                        <MultiSearchableSelect value={formData[col] || ''} onChange={(val) => handleChange(col, val)} options={fieldOptions && fieldOptions[col] ? fieldOptions[col] : []} placeholder={`Select or add ${col}`} />
                                    </div>
                                );
                            }
                            const isDuration = col.toLowerCase().includes('duration');
                            const isRequirement = col.toLowerCase().includes('requirement');
                            const isMonths = col.toLowerCase().includes('semester duration');
                            return (
                                <div key={col}>
                                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">{col}</label>
                                    {fieldOptions && fieldOptions[col] ? (
                                        <SearchableSelect value={formData[col] || ''} onChange={(val) => handleChange(col, val)} options={fieldOptions[col]} placeholder={`Select or add ${col}`} />
                                    ) : (
                                        <div className="relative flex items-center">
                                            <input type={isDuration || isRequirement || isMonths ? "number" : "text"} value={formData[col] || ''} onChange={(e) => handleChange(col, e.target.value)} className={`w-full text-sm border border-gray-300 rounded-lg px-3 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all bg-white text-gray-900 placeholder-gray-400 shadow-sm ${(isDuration || isRequirement) ? 'pr-12' : (isMonths ? 'pr-16' : '')}`} placeholder={`Enter ${col}`} />
                                            {(isDuration || isRequirement) && !isMonths && (
                                                <span className="absolute right-3 text-[10px] font-bold text-gray-400 pointer-events-none uppercase">Min</span>
                                            )}
                                            {isMonths && (
                                                <span className="absolute right-3 text-[10px] font-bold text-gray-400 pointer-events-none uppercase">Months</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </form>
                </div>
                <div className="px-5 py-4 bg-white border-t border-gray-100 flex flex-col md:flex-row items-center justify-between shrink-0 gap-4 md:gap-0 pb-8 md:pb-4">
                    {mode === 'add' ? (
                        <div className="flex items-center space-x-2 w-full md:w-auto">
                            <input type="checkbox" id="fill-empty" checked={insertAtFirstEmpty} onChange={(e) => setInsertAtFirstEmpty(e.target.checked)} className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer" />
                            <label htmlFor="fill-empty" className="text-xs font-medium text-gray-600 cursor-pointer select-none">Fill first empty row</label>
                        </div>
                    ) : (
                        <div className="hidden md:block"></div> 
                    )}
                    <div className="flex space-x-3 w-full md:w-auto">
                        <button type="button" onClick={onClose} className="flex-1 md:flex-none px-5 py-2.5 text-sm font-bold text-gray-600 hover:text-gray-800 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">Cancel</button>
                        <button type="submit" form="edit-form" className="flex-1 md:flex-none px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center transform active:scale-95">
                            <Save className="w-4 h-4 mr-2" />
                            {mode === 'add' ? 'Add Entry' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
