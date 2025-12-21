
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { ProgramDataRow } from '../types';
import { X, Search, RotateCcw, ChevronDown, ChevronRight, UserPlus, UserMinus, FileSpreadsheet, AlertTriangle, Check, Plus } from 'lucide-react';
import { PdfConverterModal } from './PdfConverterModal';

interface TeacherOption {
    id: string;
    name: string;
}

interface AttributeOptions {
    teachers: TeacherOption[];
    courseTypes: string[];
    types: string[];
    credits: string[];
    capacities: string[];
    studentCounts: number[];
    classTakenCounts: number[];
}

interface FilterBackups {
    courseTypes?: Set<string>;
    teachers?: Set<string>;
    roomTypes?: Set<string>;
    capacities?: Set<string>;
    roomCapacity?: { min: string, max: string };
    classTaken?: { set: Set<number>, min: string, max: string };
}

interface FilterPanelProps {
    isOpen: boolean;
    onClose: () => void;
    programData: ProgramDataRow[];
    semesterFilter: string;
    setSemesterFilter: (val: string) => void;
    uniqueSemesters: string[];
    selectedFaculties: Set<string>;
    setSelectedFaculties: (val: Set<string>) => void;
    selectedProgramTypes: Set<string>;
    setSelectedProgramTypes: (val: Set<string>) => void;
    selectedSemesterTypes: Set<string>;
    setSelectedSemesterTypes: (val: Set<string>) => void;
    selectedPrograms: Set<string>;
    setSelectedPrograms: (val: Set<string>) => void;
    attributeOptions: AttributeOptions;
    selectedTeachers: Set<string>;
    setSelectedTeachers: (val: Set<string>) => void;
    selectedCourseTypes: Set<string>;
    setSelectedCourseTypes: (val: Set<string>) => void;
    selectedTypes: Set<string>;
    setSelectedTypes: (val: Set<string>) => void;
    selectedCredits: Set<string>;
    setSelectedCredits: (val: Set<string>) => void;
    selectedCapacities: Set<string>;
    setSelectedCapacities: (val: Set<string>) => void;
    studentMin: string;
    setStudentMin: (val: string) => void;
    studentMax: string;
    setStudentMax: (val: string) => void;
    selectedStudentCounts: Set<number>;
    setSelectedStudentCounts: (val: Set<number>) => void;
    classTakenMin: string;
    setClassTakenMin: (val: string) => void;
    classTakenMax: string;
    setClassTakenMax: (val: string) => void;
    selectedClassTakens: Set<number>;
    setSelectedClassTakens: (val: Set<number>) => void;
    missingDataOptions?: string[];
    selectedMissingFields?: Set<string>;
    setSelectedMissingFields?: (val: Set<string>) => void;
    vacancyOptions?: number[];
    selectedVacancies?: Set<number>;
    setSelectedVacancies?: (val: Set<number>) => void;
    extraSectionOptions?: number[];
    selectedExtraSections?: Set<number>;
    setSelectedExtraSections?: (val: Set<number>) => void;
    viewMode?: string;
    admittedSemestersOptions?: string[];
    selectedAdmittedSemesters?: Set<string>;
    onAdmittedSemesterChange?: (val: Set<string>) => void;
    registeredSemestersOptions?: string[];
    registrationFilters?: Map<string, 'registered' | 'unregistered'>;
    onRegistrationFilterChange?: (val: Map<string, 'registered' | 'unregistered'>) => void;
    classroomOptions?: {
        buildings: string[];
        floors: string[];
        roomTypes: string[];
    };
    selectedBuildings?: Set<string>;
    setSelectedBuildings?: (val: Set<string>) => void;
    selectedFloors?: Set<string>;
    setSelectedFloors?: (val: Set<string>) => void;
    selectedRoomTypes?: Set<string>;
    setSelectedRoomTypes?: (val: Set<string>) => void;
    roomCapacityMin?: string;
    setRoomCapacityMin?: (val: string) => void;
    roomCapacityMax?: string;
    setRoomCapacityMax?: (val: string) => void;
    onClearAll?: () => void;
    hideProgramTab?: boolean;
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
    // Fixed: useRef is now properly imported from React
    const wrapperRef = useRef<HTMLDivElement>(null);

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

    const handleToggle = (val: string) => {
        const trimmed = val.trim();
        if (!trimmed) return;
        
        if (selectedItems.includes(trimmed)) {
            updateValue(selectedItems.filter(item => item !== trimmed));
        } else {
            updateValue([...selectedItems, trimmed]);
        }
    };

    const handleRemove = (val: string) => {
        if (disabled) return;
        updateValue(selectedItems.filter(item => item !== val));
    };

    const handleAddNewClick = () => {
        if (!search.trim()) return;
        const newVal = search.trim();
        
        // If an external add logic exists (like opening a registration form), call it
        if (onAddNew) {
            onAddNew(newVal);
            setIsOpen(false);
        } else {
            // Default behavior: just add as text
            if (!selectedItems.includes(newVal)) {
                updateValue([...selectedItems, newVal]);
            }
        }
        setSearch('');
    };

    const filteredOptions = useMemo(() => {
        const lowerSearch = search.toLowerCase();
        return options
            .filter(opt => opt.toLowerCase().includes(lowerSearch))
            .sort((a, b) => a.localeCompare(b))
            .slice(0, 100); 
    }, [options, search]);
    
    const showAddOption = search.trim() && !options.some(opt => opt.toLowerCase() === search.toLowerCase().trim());

    const isEmployeeList = options.length > 0 && options[0].includes(' - ');

    return (
        <div ref={wrapperRef} className="relative w-full">
            <div 
                className={`w-full min-h-[42px] border border-gray-300 rounded-lg px-2 py-1.5 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all bg-white shadow-sm flex flex-wrap gap-1.5 items-center cursor-pointer ${disabled ? 'opacity-70 cursor-not-allowed' : ''}`}
                onClick={() => !disabled && setIsOpen(!isOpen)}
            >
                {selectedItems.length === 0 ? (
                    <span className="text-[11px] md:text-xs text-gray-400 px-1">{placeholder || 'Select options...'}</span>
                ) : (
                    selectedItems.map(item => (
                        <span key={item} className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] md:text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
                            <span className="max-w-[120px] md:max-w-[200px] truncate">{item}</span>
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
                    ))
                )}
                <div className="ml-auto flex items-center shrink-0">
                    <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </div>

            {isOpen && !disabled && (
                <div className="absolute z-[110] w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden left-0 right-0 flex flex-col animate-in fade-in zoom-in-95 duration-150 border-t-0 rounded-t-none">
                    <div className="p-2 border-b border-gray-100 bg-gray-50/50">
                        <div className="relative">
                            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                autoFocus
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none"
                                placeholder="Search..."
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    </div>

                    <div className="p-2 max-h-[320px] overflow-y-auto thin-scrollbar">
                        <div className={isEmployeeList ? "flex flex-col gap-1" : "grid grid-cols-2 gap-1.5"}>
                            {filteredOptions.map((opt) => {
                                const isSelected = selectedItems.includes(opt);
                                
                                if (isEmployeeList) {
                                    const parts = opt.split(' - ');
                                    const name = parts[0];
                                    const subtext = parts[1] || '';

                                    return (
                                        <button
                                            key={opt}
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); handleToggle(opt); }}
                                            className={`flex items-center text-left p-2 rounded-lg transition-all border ${
                                                isSelected 
                                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                                                : 'bg-white text-gray-700 border-gray-100 hover:border-blue-300 hover:bg-blue-50'
                                            }`}
                                        >
                                            <div className="flex-1 min-w-0">
                                                <div className={`text-[11px] font-bold truncate ${isSelected ? 'text-white' : 'text-gray-900'}`}>{name}</div>
                                                <div className={`text-[9px] truncate ${isSelected ? 'text-blue-100' : 'text-gray-500'}`}>{subtext}</div>
                                            </div>
                                            {/* Fixed: Check icon is now properly imported from lucide-react */}
                                            {isSelected && <Check className="w-3.5 h-3.5 ml-2 shrink-0" />}
                                        </button>
                                    );
                                }

                                return (
                                    <button
                                        key={opt}
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); handleToggle(opt); }}
                                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-[10px] md:text-xs font-medium transition-all border ${
                                            isSelected 
                                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                                            : 'bg-white text-gray-700 border-gray-100 hover:border-blue-300 hover:bg-blue-50'
                                        }`}
                                    >
                                        <span className="truncate">{opt}</span>
                                        {/* Fixed: Check icon is now properly imported from lucide-react */}
                                        {isSelected && <Check className="w-3 h-3 ml-1 shrink-0" />}
                                    </button>
                                );
                            })}
                            
                            {showAddOption && (
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleAddNewClick(); }}
                                    className="flex items-center justify-center px-3 py-2 rounded-lg text-xs font-bold bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-all col-span-full mt-1 shadow-sm"
                                >
                                    {/* Fixed: Plus icon is now properly imported from lucide-react */}
                                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                                    Add "{search}"
                                </button>
                            )}

                            {filteredOptions.length === 0 && !showAddOption && (
                                <div className="col-span-full py-8 text-center">
                                    <p className="text-xs text-gray-400 italic">No results found</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="p-2 bg-gray-50 border-t border-gray-100 flex items-center justify-between shrink-0">
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest px-1">
                            {selectedItems.length} Selected
                        </span>
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setIsOpen(false); setSearch(''); }}
                            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all active:scale-95 flex items-center"
                        >
                            Done
                        </button>
                    </div>
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
    // Fixed: useRef is now properly imported from React
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

    const handleAddClick = () => {
        if (onAddNew) {
            onAddNew(search);
            setIsOpen(false);
        } else {
            handleSelect(search);
        }
    };

    const filteredOptions = useMemo(() => {
        const lowerSearch = search.toLowerCase();
        return options
            .filter(opt => opt.toLowerCase().includes(lowerSearch))
            .slice(0, 50);
    }, [options, search]);
    
    const hasExactMatch = options.some(opt => opt.toLowerCase() === search.toLowerCase());
    const showAddOption = search && !hasExactMatch;

    return (
        <div ref={wrapperRef} className="relative w-full">
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
                <div className="absolute z-[120] w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto thin-scrollbar left-0 right-0">
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
                            onClick={handleAddClick}
                            className="px-3 py-2 text-sm text-blue-600 font-bold hover:bg-blue-50 cursor-pointer border-t border-gray-100 flex items-center bg-gray-50/50 sticky bottom-0"
                        >
                            <span className="mr-2 bg-blue-100 text-blue-600 rounded w-4 h-4 flex items-center justify-center text-xs">+</span> 
                            Add "{search}"
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export const FilterPanel: React.FC<FilterPanelProps> = (props) => {
    const {
        isOpen, onClose, programData, semesterFilter, setSemesterFilter, uniqueSemesters,
        selectedFaculties, setSelectedFaculties, selectedProgramTypes, setSelectedProgramTypes,
        selectedPrograms, setSelectedPrograms, attributeOptions, selectedTeachers, setSelectedTeachers,
        selectedCourseTypes, setSelectedCourseTypes, selectedTypes, setSelectedTypes,
        selectedCredits, setSelectedCredits, selectedCapacities, setSelectedCapacities,
        studentMin, setStudentMin, studentMax, setStudentMax, selectedStudentCounts, setSelectedStudentCounts,
        classTakenMin, setClassTakenMin, classTakenMax, setClassTakenMax, selectedClassTakens, setSelectedClassTakens,
        missingDataOptions, selectedMissingFields, setSelectedMissingFields,
        viewMode, admittedSemestersOptions = [], selectedAdmittedSemesters = new Set(), onAdmittedSemesterChange,
        registeredSemestersOptions = [], registrationFilters = new Map(), onRegistrationFilterChange,
        classroomOptions, selectedBuildings = new Set(), setSelectedBuildings, selectedFloors = new Set(), setSelectedFloors,
        selectedRoomTypes = new Set(), setSelectedRoomTypes, roomCapacityMin = '', setRoomCapacityMin,
        roomCapacityMax = '', setRoomCapacityMax, onClearAll, hideProgramTab = false
    } = props;

    const [activeTab, setActiveTab] = useState<'Program' | 'Attributes'>('Program');
    const [programSearch, setProgramSearch] = useState('');
    const [teacherSearch, setTeacherSearch] = useState('');
    const [expandedAttribute, setExpandedAttribute] = useState<string | null>(viewMode === 'classroom' ? 'Building' : 'Teacher');
    const [filterBackups, setFilterBackups] = useState<FilterBackups>({});
    const [isPdfConverterOpen, setIsPdfConverterOpen] = useState(false);

    useEffect(() => { if (hideProgramTab) setActiveTab('Attributes'); }, [hideProgramTab]);

    const toggleSetItem = (set: Set<string>, item: string, setter: (s: Set<string>) => void) => {
        const newSet = new Set(set);
        if (newSet.has(item)) newSet.delete(item); else newSet.add(item);
        setter(newSet);
    };

    const handleMissingDataToggle = (field: string) => {
        if (!selectedMissingFields || !setSelectedMissingFields) return;
        const newSet = new Set(selectedMissingFields);
        const isAdding = !newSet.has(field);
        const newBackups = { ...filterBackups };

        if (isAdding) {
            newSet.add(field);
            if (field === 'Course Type' && selectedCourseTypes.size > 0) {
                newBackups.courseTypes = new Set(selectedCourseTypes);
                setSelectedCourseTypes(new Set());
            }
            if (field === 'Teacher ID' && selectedTeachers.size > 0) {
                newBackups.teachers = new Set(selectedTeachers);
                setSelectedTeachers(new Set());
            }
            if (field === 'Room Type' && selectedRoomTypes?.size) {
                newBackups.roomTypes = new Set(selectedRoomTypes);
                setSelectedRoomTypes?.(new Set());
            }
            if (field === 'Capacity') {
                if (viewMode === 'classroom') {
                    newBackups.roomCapacity = { min: roomCapacityMin || '', max: roomCapacityMax || '' };
                    setRoomCapacityMin?.(''); setRoomCapacityMax?.('');
                } else if (selectedCapacities.size) {
                    newBackups.capacities = new Set(selectedCapacities);
                    setSelectedCapacities(new Set());
                }
            }
            if (field === 'Class Taken') {
                newBackups.classTaken = { set: new Set(selectedClassTakens), min: classTakenMin, max: classTakenMax };
                setSelectedClassTakens(new Set()); setClassTakenMin(''); setClassTakenMax('');
            }
        } else {
            newSet.delete(field);
            if (field === 'Course Type' && newBackups.courseTypes) setSelectedCourseTypes(newBackups.courseTypes);
            if (field === 'Teacher ID' && newBackups.teachers) setSelectedTeachers(newBackups.teachers);
            if (field === 'Room Type' && newBackups.roomTypes) setSelectedRoomTypes?.(newBackups.roomTypes);
            if (field === 'Capacity') {
                if (viewMode === 'classroom' && newBackups.roomCapacity) {
                    setRoomCapacityMin?.(newBackups.roomCapacity.min); setRoomCapacityMax?.(newBackups.roomCapacity.max);
                } else if (newBackups.capacities) setSelectedCapacities(newBackups.capacities);
            }
            if (field === 'Class Taken' && newBackups.classTaken) {
                setSelectedClassTakens(newBackups.classTaken.set); setClassTakenMin(newBackups.classTaken.min); setClassTakenMax(newBackups.classTaken.max);
            }
        }
        setFilterBackups(newBackups);
        setSelectedMissingFields(newSet);
    };

    const normalize = (id: string) => id.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

    const facultiesMetadata = useMemo(() => {
        const facs = new Set<string>(), pTypes = new Set<string>(), grouped: Record<string, ProgramDataRow[]> = {};
        programData.forEach(p => {
            if (p['Faculty Short Name']) facs.add(p['Faculty Short Name']);
            if (p['Program Type']) pTypes.add(p['Program Type']);
            const fac = p['Faculty Short Name'] || 'Other';
            if (!grouped[fac]) grouped[fac] = [];
            grouped[fac].push(p);
        });
        return { faculties: Array.from(facs).sort(), programTypes: Array.from(pTypes).sort(), groupedPrograms: grouped };
    }, [programData]);

    const filteredGroupedPrograms = useMemo(() => {
        if (!programSearch) return facultiesMetadata.groupedPrograms;
        const lower = programSearch.toLowerCase();
        const result: Record<string, ProgramDataRow[]> = {};
        (Object.entries(facultiesMetadata.groupedPrograms) as [string, ProgramDataRow[]][]).forEach(([fac, progs]) => {
            const matches = progs.filter(p => p['Program Short Name'].toLowerCase().includes(lower) || p.PID.toLowerCase().includes(lower) || p['Program Full Name'].toLowerCase().includes(lower));
            if (matches.length > 0) result[fac] = matches;
        });
        return result;
    }, [facultiesMetadata.groupedPrograms, programSearch]);

    const filteredTeachers = useMemo<TeacherOption[]>(() => {
        const teachers = attributeOptions?.teachers || [];
        if (!teacherSearch) return teachers;
        const lower = teacherSearch.toLowerCase();
        return teachers.filter(t => (t.name || '').toLowerCase().includes(lower) || (t.id || '').toLowerCase().includes(lower));
    }, [attributeOptions, teacherSearch]);

    const handleReset = () => { setFilterBackups({}); onClearAll?.(); };

    const renderAccordionSection = (title: string, children: React.ReactNode, count: number = 0, isWarning: boolean = false) => {
        const isExpanded = expandedAttribute === title;
        return (
            <div className="border-b border-gray-100 last:border-0">
                <button onClick={() => setExpandedAttribute(isExpanded ? null : title)} className="w-full flex items-center justify-between py-2.5 px-1 hover:bg-gray-50 transition-colors group">
                    <div className={`flex items-center text-[11px] font-semibold ${isWarning ? 'text-red-600' : 'text-gray-700'}`}>
                        {isWarning && <AlertTriangle className="w-3 h-3 mr-1.5" />}
                        {title}
                        {count > 0 && <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[9px] ${isWarning ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{count}</span>}
                    </div>
                    {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600" />}
                </button>
                {isExpanded && <div className="pb-3 px-1">{children}</div>}
            </div>
        );
    };

    const renderProgramTab = () => (
        <div className="space-y-4">
            <div>
                <h3 className="text-[10px] font-bold text-gray-400 mb-2 uppercase">By Faculty</h3>
                <div className="flex flex-wrap gap-1.5">{facultiesMetadata.faculties.map(fac => (<button key={fac} onClick={() => toggleSetItem(selectedFaculties, fac, setSelectedFaculties)} className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${selectedFaculties.has(fac) ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>{fac}</button>))}</div>
            </div>
            <div className="pt-2 border-t border-gray-100">
                <div className="relative mb-2"><Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" /><input type="text" placeholder="Search programs..." value={programSearch} onChange={e => setProgramSearch(e.target.value)} className="w-full pl-7 pr-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none" /></div>
                <div className="space-y-3">{Object.entries(filteredGroupedPrograms).map(([fac, progs]) => (selectedFaculties.size && !selectedFaculties.has(fac)) ? null : (
                    <div key={fac}>
                        <h4 className={`text-[10px] font-bold px-1.5 py-0.5 mb-1 rounded inline-block ${selectedFaculties.has(fac) ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600'}`}>{fac}</h4>
                        <div className="space-y-0.5">{(progs as ProgramDataRow[]).map(p => { 
                            const normPid = normalize(p.PID); 
                            return (<div key={p.PID} onClick={() => toggleSetItem(selectedPrograms, normPid, setSelectedPrograms)} className="flex items-center p-1 hover:bg-blue-50 rounded cursor-pointer group"><div className="w-1.5 h-1.5 rounded-full mr-2 shrink-0 bg-blue-400"></div><div className="flex-1 text-[10px] text-gray-700 leading-tight"><span className="font-mono text-gray-400 mr-1">{p.PID}</span>{p['Program Short Name']}</div>{selectedPrograms.has(normPid) && <div className="w-1.5 h-1.5 bg-blue-600 rounded-full ml-1"></div>}</div>);
                        })}</div>
                    </div>
                ))}</div>
            </div>
        </div>
    );

    const renderStandardFilters = () => (
        <>
            {renderAccordionSection('Teacher', (
                <div className="space-y-2">
                    <div className="relative"><Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" /><input type="text" placeholder="Search..." value={teacherSearch} onChange={e => setTeacherSearch(e.target.value)} className="w-full pl-7 pr-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none" /></div>
                    <div className="max-h-40 overflow-y-auto thin-scrollbar space-y-0.5">
                        {(filteredTeachers as TeacherOption[]).map(t => (
                            <div key={t.id} onClick={() => toggleSetItem(selectedTeachers, t.id, setSelectedTeachers)} className={`flex items-center p-1.5 rounded cursor-pointer text-[10px] ${selectedTeachers.has(t.id) ? 'bg-blue-50 text-blue-700 font-bold' : 'hover:bg-gray-50 text-gray-700'}`}>
                                <div className="flex-1 truncate">
                                    <span>{t.name}</span>
                                    <span className="text-gray-400 ml-1 text-[9px]">({t.id})</span>
                                </div>
                                {selectedTeachers.has(t.id) && <div className="w-1.5 h-1.5 bg-blue-500 rounded-full ml-1 shrink-0" />}
                            </div>
                        ))}
                    </div>
                </div>
            ), selectedTeachers.size)}
            
            {renderAccordionSection('Course Type', (<div className="flex flex-wrap gap-1.5">{(Array.isArray(attributeOptions?.courseTypes) ? attributeOptions.courseTypes : []).map(t => (<button key={t} onClick={() => toggleSetItem(selectedCourseTypes, t, setSelectedCourseTypes)} className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${selectedCourseTypes.has(t) ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>{t}</button>))}</div>), selectedCourseTypes.size)}
            {renderAccordionSection('Credit', (<div className="flex flex-wrap gap-1.5">{(Array.isArray(attributeOptions?.credits) ? attributeOptions.credits : []).map(c => (<button key={c} onClick={() => toggleSetItem(selectedCredits, c, setSelectedCredits)} className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${selectedCredits.has(c) ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>{c}</button>))}</div>), selectedCredits.size)}
            {renderAccordionSection('Student Count', (<div className="flex items-center space-x-2 p-1"><input type="number" placeholder="Min" value={studentMin} onChange={e => setStudentMin(e.target.value)} className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:border-blue-500 outline-none" /><span className="text-gray-400">-</span><input type="number" placeholder="Max" value={studentMax} onChange={e => setStudentMax(e.target.value)} className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:border-blue-500 outline-none" /></div>), (studentMin || studentMax ? 1 : 0))}
        </>
    );

    const renderClassroomFilters = () => (
        <>
            {classroomOptions && (
                <>
                    {renderAccordionSection('Building', (<div className="flex flex-wrap gap-1.5">{(Array.isArray(classroomOptions.buildings) ? classroomOptions.buildings : []).map(b => (<button key={b} onClick={() => setSelectedBuildings && toggleSetItem(selectedBuildings, b, setSelectedBuildings)} className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${selectedBuildings.has(b) ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>{b}</button>))}</div>), selectedBuildings.size)}
                    {renderAccordionSection('Room Type', (<div className="flex flex-wrap gap-1.5">{(Array.isArray(classroomOptions.roomTypes) ? classroomOptions.roomTypes : []).map(rt => (<button key={rt} onClick={() => setSelectedRoomTypes && toggleSetItem(selectedRoomTypes, rt, setSelectedRoomTypes)} className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${selectedRoomTypes.has(rt) ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>{rt}</button>))}</div>), selectedRoomTypes.size)}
                    {renderAccordionSection('Capacity', (<div className="flex items-center space-x-2 p-1"><input type="number" placeholder="Min" value={roomCapacityMin} onChange={e => setRoomCapacityMin?.(e.target.value)} className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:border-blue-500 outline-none" /><span className="text-gray-400">-</span><input type="number" placeholder="Max" value={roomCapacityMax} onChange={e => setRoomCapacityMax?.(e.target.value)} className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:border-blue-500 outline-none" /></div>), (roomCapacityMin || roomCapacityMax ? 1 : 0))}
                </>
            )}
        </>
    );

    const renderAdmittedFilters = () => {
        const top12 = admittedSemestersOptions.slice(0, 12);
        const allSelected = top12.length > 0 && top12.every(s => selectedAdmittedSemesters.has(s));
        return (
            <>
                <h3 className="text-[11px] font-bold text-gray-700 px-1 mb-2 uppercase tracking-wide">Configuration</h3>
                <button onClick={() => {
                    const newSet = new Set(selectedAdmittedSemesters);
                    if (allSelected) top12.forEach(s => newSet.delete(s)); else top12.forEach(s => newSet.add(s));
                    onAdmittedSemesterChange?.(newSet);
                }} className={`mx-1 mb-2 w-full px-2 py-1.5 text-[10px] font-bold rounded border transition-colors flex items-center justify-center ${allSelected ? 'bg-red-50 text-red-600 border-red-200' : 'bg-blue-50 text-blue-600 border-blue-200'}`}>{allSelected ? <><UserMinus className="w-3 h-3 mr-1.5" />Deselect Latest 12</> : <><UserPlus className="w-3 h-3 mr-1.5" />Select Latest 12</>}</button>
                <div className="flex-1 overflow-y-auto thin-scrollbar pb-2">{admittedSemestersOptions.map(sem => (
                    <div key={sem} className="flex items-center py-1.5 border-b border-gray-50 last:border-0 px-1">
                        <button onClick={() => {
                            const newSet = new Set(selectedAdmittedSemesters);
                            if (newSet.has(sem)) newSet.delete(sem); else newSet.add(sem);
                            onAdmittedSemesterChange?.(newSet);
                        }} className={`p-1 rounded border transition-colors flex items-center justify-center mr-2 shrink-0 ${selectedAdmittedSemesters.has(sem) ? 'bg-teal-100 text-teal-700 border-teal-300' : 'bg-white text-gray-300 border-gray-200'}`}><UserPlus className="w-3 h-3" /></button>
                        <div className="flex-1 text-[10px] font-bold text-gray-700 truncate" title={sem}>{sem}</div>
                        {registeredSemestersOptions.includes(sem) ? (
                            <div className="flex rounded shadow-sm shrink-0"><button onClick={() => {
                                const newMap = new Map(registrationFilters);
                                if (newMap.get(sem) === 'registered') newMap.delete(sem); else newMap.set(sem, 'registered');
                                onRegistrationFilterChange?.(newMap);
                            }} className={`px-1.5 py-0.5 text-[9px] font-bold border rounded-l ${registrationFilters.get(sem) === 'registered' ? 'bg-green-100 text-green-700 border-green-300' : 'bg-white text-gray-400 border-gray-200'}`}>Reg</button><button onClick={() => {
                                const newMap = new Map(registrationFilters);
                                if (newMap.get(sem) === 'unregistered') newMap.delete(sem); else newMap.set(sem, 'unregistered');
                                onRegistrationFilterChange?.(newMap);
                            }} className={`px-1.5 py-0.5 text-[9px] font-bold border-t border-b border-r rounded-r ${registrationFilters.get(sem) === 'unregistered' ? 'bg-red-100 text-red-700 border-red-300' : 'bg-white text-gray-400 border-gray-200'}`}>Unreg</button></div>
                        ) : <span className="text-[9px] text-gray-300 italic">-</span>}
                    </div>
                ))}</div>
            </>
        );
    };

    return (
        <>
            <div className={`fixed inset-y-0 left-0 w-56 bg-white shadow-xl z-[100] transform transition-transform duration-300 border-r flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="px-3 py-3 border-b flex justify-between items-center bg-white shrink-0">
                    <h2 className="text-sm font-bold text-gray-800">{viewMode === 'classroom' ? 'Filter Rooms' : 'Filter Data'}</h2>
                    <div className="flex items-center space-x-1">
                        <button onClick={handleReset} className="p-1 hover:bg-gray-100 rounded text-gray-500" title="Reset Filters"><RotateCcw className="w-3.5 h-3.5" /></button>
                        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded text-gray-500"><X className="w-4 h-4" /></button>
                    </div>
                </div>
                {!viewMode?.includes('admitted') && viewMode !== 'classroom' && (
                    <div className="px-3 py-2 border-b bg-gray-50 shrink-0"><label className="block text-[10px] font-semibold text-gray-500 mb-1">By Semester</label><select value={semesterFilter} onChange={e => setSemesterFilter(e.target.value)} className="w-full text-xs border-gray-300 rounded p-1">{uniqueSemesters.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                )}
                {!hideProgramTab && (
                    <div className="flex border-b shrink-0">
                        <button className={`flex-1 py-2 text-xs font-medium border-b-2 ${activeTab === 'Program' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`} onClick={() => setActiveTab('Program')}>Program</button>
                        <button className={`flex-1 py-2 text-xs font-medium border-b-2 ${activeTab === 'Attributes' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`} onClick={() => setActiveTab('Attributes')}>Attributes</button>
                    </div>
                )}
                <div className="flex-1 overflow-y-auto p-3 thin-scrollbar">
                    {activeTab === 'Program' && !hideProgramTab ? renderProgramTab() : (
                        <div className="space-y-1 h-full flex flex-col">
                            {missingDataOptions && selectedMissingFields && renderAccordionSection('Has Missing Data', (<div className="flex flex-wrap gap-1.5">{missingDataOptions.map(f => (<button key={f} onClick={() => handleMissingDataToggle(f)} className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${selectedMissingFields.has(f) ? 'bg-red-100 text-red-700 border-red-200' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>{f}</button>))}</div>), selectedMissingFields.size, true)}
                            {viewMode === 'classroom' ? renderClassroomFilters() : viewMode?.includes('admitted') ? renderAdmittedFilters() : renderStandardFilters()}
                        </div>
                    )}
                </div>
                {viewMode?.includes('admitted') && (<div className="p-3 border-t bg-gray-50 shrink-0"><button onClick={() => setIsPdfConverterOpen(true)} className="w-full flex items-center justify-center px-4 py-2 bg-white border border-gray-300 shadow-sm rounded text-xs font-bold text-gray-700 hover:bg-gray-50 hover:text-blue-600"><FileSpreadsheet className="w-4 h-4 mr-2 text-green-600" />PDF to Excel</button></div>)}
            </div>
            <PdfConverterModal isOpen={isPdfConverterOpen} onClose={() => setIsPdfConverterOpen(false)} />
        </>
    );
};
