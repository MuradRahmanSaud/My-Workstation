
// ... existing imports ...
import React, { useMemo, useState } from 'react';
import { ProgramDataRow } from '../types';
import { X, Search, RotateCcw, ChevronDown, ChevronRight, UserPlus, UserMinus, FileSpreadsheet, AlertTriangle } from 'lucide-react';
import { PdfConverterModal } from './PdfConverterModal';

// ... existing interfaces ...
interface AttributeOptions {
    teachers: { id: string; name: string }[];
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
    // ... existing props ...
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

    // Attributes
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

    // Missing Data
    missingDataOptions?: string[];
    selectedMissingFields?: Set<string>;
    setSelectedMissingFields?: (val: Set<string>) => void;

    // Aggregate Attributes (Total Vacancy / Extra Sections)
    vacancyOptions?: number[];
    selectedVacancies?: Set<number>;
    setSelectedVacancies?: (val: Set<number>) => void;
    
    extraSectionOptions?: number[];
    selectedExtraSections?: Set<number>;
    setSelectedExtraSections?: (val: Set<number>) => void;

    // View Mode Context
    viewMode?: string;

    // Admitted Configuration Props
    admittedSemestersOptions?: string[];
    selectedAdmittedSemesters?: Set<string>;
    onAdmittedSemesterChange?: (val: Set<string>) => void;
    
    registeredSemestersOptions?: string[];
    registrationFilters?: Map<string, 'registered' | 'unregistered'>;
    onRegistrationFilterChange?: (val: Map<string, 'registered' | 'unregistered'>) => void;

    // Class Room Specific Props
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
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
    isOpen,
    onClose,
    programData,
    semesterFilter,
    setSemesterFilter,
    uniqueSemesters,
    selectedFaculties,
    setSelectedFaculties,
    selectedProgramTypes,
    setSelectedProgramTypes,
    selectedSemesterTypes,
    setSelectedSemesterTypes,
    selectedPrograms,
    setSelectedPrograms,
    
    // Attribute Props
    attributeOptions,
    selectedTeachers, setSelectedTeachers,
    selectedCourseTypes, setSelectedCourseTypes,
    selectedTypes, setSelectedTypes,
    selectedCredits, setSelectedCredits,
    selectedCapacities, setSelectedCapacities,
    studentMin, setStudentMin,
    studentMax, setStudentMax,
    selectedStudentCounts, setSelectedStudentCounts,

    classTakenMin, setClassTakenMin,
    classTakenMax, setClassTakenMax,
    selectedClassTakens, setSelectedClassTakens,

    // Missing Data
    missingDataOptions,
    selectedMissingFields,
    setSelectedMissingFields,

    // Aggregate Props
    vacancyOptions = [],
    selectedVacancies,
    setSelectedVacancies,
    extraSectionOptions = [],
    selectedExtraSections,
    setSelectedExtraSections,

    // Admitted Config
    viewMode,
    admittedSemestersOptions,
    selectedAdmittedSemesters,
    onAdmittedSemesterChange,
    registeredSemestersOptions,
    registrationFilters,
    onRegistrationFilterChange,

    // Class Room Props
    classroomOptions,
    selectedBuildings, setSelectedBuildings,
    selectedFloors, setSelectedFloors,
    selectedRoomTypes, setSelectedRoomTypes,
    roomCapacityMin, setRoomCapacityMin,
    roomCapacityMax, setRoomCapacityMax,

    onClearAll
}) => {
    const [activeTab, setActiveTab] = useState<'Program' | 'Attributes'>('Program');
    const [programSearch, setProgramSearch] = useState('');
    const [teacherSearch, setTeacherSearch] = useState('');

    // Accordion State
    const [expandedAttribute, setExpandedAttribute] = useState<string | null>(viewMode === 'classroom' ? 'Building' : 'Teacher');
    
    // Filter Restore State
    const [filterBackups, setFilterBackups] = useState<FilterBackups>({});

    // PDF Converter Modal State
    const [isPdfConverterOpen, setIsPdfConverterOpen] = useState(false);

    const toggleSetItem = (set: Set<string>, item: string, setter: (s: Set<string>) => void) => {
        const newSet = new Set(set);
        if (newSet.has(item)) {
            newSet.delete(item);
        } else {
            newSet.add(item);
        }
        setter(newSet);
    };

    const toggleSetItemNumber = (set: Set<number>, item: number, setter: (s: Set<number>) => void) => {
        const newSet = new Set(set);
        if (newSet.has(item)) {
            newSet.delete(item);
        } else {
            newSet.add(item);
        }
        setter(newSet);
    };

    // Handler for Missing Data toggles to clear/restore conflicts
    const handleMissingDataToggle = (field: string) => {
        if (!selectedMissingFields || !setSelectedMissingFields) return;

        const newSet = new Set(selectedMissingFields);
        const isAdding = !newSet.has(field);

        if (isAdding) {
            newSet.add(field);
            
            // Backup current selections and Clear corresponding filters
            const newBackups = { ...filterBackups };

            if (field === 'Course Type') {
                if (selectedCourseTypes.size > 0) newBackups.courseTypes = new Set(selectedCourseTypes);
                setSelectedCourseTypes(new Set());
            }
            if (field === 'Teacher ID') {
                if (selectedTeachers.size > 0) newBackups.teachers = new Set(selectedTeachers);
                setSelectedTeachers(new Set());
            }
            if (field === 'Room Type' && setSelectedRoomTypes && selectedRoomTypes) {
                if (selectedRoomTypes.size > 0) newBackups.roomTypes = new Set(selectedRoomTypes);
                setSelectedRoomTypes(new Set());
            }
            
            if (field === 'Capacity') {
                if (viewMode === 'classroom') {
                    const hasRange = roomCapacityMin || roomCapacityMax;
                    if (hasRange) {
                        newBackups.roomCapacity = { min: roomCapacityMin || '', max: roomCapacityMax || '' };
                    }
                    if (setRoomCapacityMin) setRoomCapacityMin('');
                    if (setRoomCapacityMax) setRoomCapacityMax('');
                } else {
                    if (selectedCapacities.size > 0) newBackups.capacities = new Set(selectedCapacities);
                    setSelectedCapacities(new Set());
                }
            }

            if (field === 'Class Taken') {
                const hasData = selectedClassTakens.size > 0 || classTakenMin || classTakenMax;
                if (hasData) {
                    newBackups.classTaken = {
                        set: new Set(selectedClassTakens),
                        min: classTakenMin,
                        max: classTakenMax
                    };
                }
                setSelectedClassTakens(new Set());
                setClassTakenMin('');
                setClassTakenMax('');
            }

            setFilterBackups(newBackups);

        } else {
            newSet.delete(field);
            
            // Restore from backup
            if (field === 'Course Type' && filterBackups.courseTypes) {
                setSelectedCourseTypes(filterBackups.courseTypes);
            }
            if (field === 'Teacher ID' && filterBackups.teachers) {
                setSelectedTeachers(filterBackups.teachers);
            }
            if (field === 'Room Type' && setSelectedRoomTypes && filterBackups.roomTypes) {
                setSelectedRoomTypes(filterBackups.roomTypes);
            }
            if (field === 'Capacity') {
                if (viewMode === 'classroom' && filterBackups.roomCapacity) {
                    if (setRoomCapacityMin) setRoomCapacityMin(filterBackups.roomCapacity.min);
                    if (setRoomCapacityMax) setRoomCapacityMax(filterBackups.roomCapacity.max);
                } else if (filterBackups.capacities) {
                    setSelectedCapacities(filterBackups.capacities);
                }
            }
            if (field === 'Class Taken' && filterBackups.classTaken) {
                setSelectedClassTakens(filterBackups.classTaken.set);
                setClassTakenMin(filterBackups.classTaken.min);
                setClassTakenMax(filterBackups.classTaken.max);
            }
        }
        setSelectedMissingFields(newSet);
    };

    const toggleAccordion = (section: string) => {
        setExpandedAttribute(prev => prev === section ? null : section);
    };

    // ... Rest of existing component code (Admitted logic, render logic, return statement) ...
    // Admitted Configuration Helpers
    const toggleAdmitted = (sem: string) => {
        if (!selectedAdmittedSemesters || !onAdmittedSemesterChange) return;
        const newSet = new Set(selectedAdmittedSemesters);
        
        if (newSet.has(sem)) {
            newSet.delete(sem);
            if (registrationFilters && registrationFilters.has(sem) && onRegistrationFilterChange) {
                const newRegMap = new Map(registrationFilters);
                newRegMap.delete(sem);
                onRegistrationFilterChange(newRegMap);
            }
        } else {
            newSet.add(sem);
        }
        onAdmittedSemesterChange(newSet);
    };

    const toggleRegStatus = (sem: string, type: 'registered' | 'unregistered') => {
        if (!registrationFilters || !onRegistrationFilterChange) return;
        const newMap = new Map(registrationFilters);
        if (newMap.get(sem) === type) {
            newMap.delete(sem);
        } else {
            newMap.set(sem, type);
        }
        onRegistrationFilterChange(newMap);
    };

    const areTop12Selected = useMemo(() => {
        if (!selectedAdmittedSemesters || !admittedSemestersOptions) return false;
        const top12 = admittedSemestersOptions.slice(0, 12);
        if (top12.length === 0) return false;
        return top12.every(s => selectedAdmittedSemesters.has(s));
    }, [selectedAdmittedSemesters, admittedSemestersOptions]);

    const handleBatchToggleAdmitted = () => {
        if (!selectedAdmittedSemesters || !onAdmittedSemesterChange || !admittedSemestersOptions) return;
        
        const top12 = admittedSemestersOptions.slice(0, 12);
        const allSelected = top12.every(s => selectedAdmittedSemesters.has(s));

        const newSet = new Set(selectedAdmittedSemesters);
        let newRegMap = registrationFilters ? new Map(registrationFilters) : new Map();
        let regUpdated = false;

        if (allSelected) {
            top12.forEach(s => {
                newSet.delete(s);
                if (newRegMap.has(s)) {
                    newRegMap.delete(s);
                    regUpdated = true;
                }
            });
        } else {
            top12.forEach(s => newSet.add(s));
        }

        onAdmittedSemesterChange(newSet);
        if (regUpdated && onRegistrationFilterChange) {
            onRegistrationFilterChange(newRegMap);
        }
    };

    const normalize = (id: string) => id.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

    // Derived Data for Filter Options
    const { faculties, programTypes, semesterTypes, groupedPrograms } = useMemo(() => {
        const facs = new Set<string>();
        const pTypes = new Set<string>();
        const sTypes = new Set<string>();
        const grouped: Record<string, ProgramDataRow[]> = {};

        programData.forEach(p => {
            if (p['Faculty Short Name']) facs.add(p['Faculty Short Name']);
            if (p['Program Type']) pTypes.add(p['Program Type']);
            if (p['Semester Type']) sTypes.add(p['Semester Type']);

            const fac = p['Faculty Short Name'] || 'Other';
            if (!grouped[fac]) grouped[fac] = [];
            grouped[fac].push(p);
        });

        return {
            faculties: Array.from(facs).sort(),
            programTypes: Array.from(pTypes).sort(),
            semesterTypes: Array.from(sTypes).sort(),
            groupedPrograms: grouped
        };
    }, [programData]);

    const filteredGroupedPrograms = useMemo(() => {
        if (!programSearch) return groupedPrograms;
        const lowerSearch = programSearch.toLowerCase();
        const result: Record<string, ProgramDataRow[]> = {};
        
        Object.entries(groupedPrograms).forEach(([fac, progs]: [string, ProgramDataRow[]]) => {
            const matches = progs.filter(p => 
                p['Program Short Name'].toLowerCase().includes(lowerSearch) || 
                p.PID.includes(lowerSearch) ||
                p['Program Full Name'].toLowerCase().includes(lowerSearch)
            );
            if (matches.length > 0) {
                result[fac] = matches;
            }
        });
        return result;
    }, [groupedPrograms, programSearch]);

    const filteredTeachers = useMemo(() => {
        if (!teacherSearch) return attributeOptions.teachers;
        const lower = teacherSearch.toLowerCase();
        return attributeOptions.teachers.filter(t => 
            t.name.toLowerCase().includes(lower) || t.id.toLowerCase().includes(lower)
        );
    }, [attributeOptions.teachers, teacherSearch]);

    const getDotColor = (pid: string) => {
        const colors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500'];
        const index = pid.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
        return colors[index];
    };

    const handleReset = () => {
        if (onClearAll) {
            setFilterBackups({}); // Clear backups on reset
            onClearAll();
            return;
        }
    };

    const renderAccordionSection = (
        title: string, 
        children: React.ReactNode, 
        selectedCount: number = 0,
        isWarning: boolean = false
    ) => {
        const isExpanded = expandedAttribute === title;
        return (
            <div className="border-b border-gray-100 last:border-0">
                <button 
                    onClick={() => toggleAccordion(title)}
                    className="w-full flex items-center justify-between py-2.5 px-1 hover:bg-gray-50 transition-colors group"
                >
                    <div className={`flex items-center text-[11px] font-semibold ${isWarning ? 'text-red-600' : 'text-gray-700'}`}>
                        {isWarning && <AlertTriangle className="w-3 h-3 mr-1.5" />}
                        {title}
                        {selectedCount > 0 && (
                            <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[9px] ${isWarning ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                {selectedCount}
                            </span>
                        )}
                    </div>
                    {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600" />
                    ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600" />
                    )}
                </button>
                {isExpanded && (
                    <div className="pb-3 px-1">
                        {children}
                    </div>
                )}
            </div>
        );
    };

    return (
        <>
            <div className={`fixed inset-y-0 left-0 w-56 bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out border-r border-gray-200 flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                
                <div className="px-3 py-3 border-b border-gray-200 flex justify-between items-center bg-white shrink-0">
                    <h2 className="text-sm font-bold text-gray-800">
                        {viewMode === 'classroom' ? 'Filter Rooms' : 'Filter Sections'}
                    </h2>
                    <div className="flex items-center space-x-1">
                        <button 
                            onClick={handleReset} 
                            className="p-1 hover:bg-gray-100 rounded text-gray-500 transition-colors"
                            title="Reset Filters"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded text-gray-500 transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {viewMode !== 'admitted' && viewMode !== 'classroom' && (
                    <div className="px-3 py-2 border-b border-gray-100 bg-gray-50 shrink-0">
                        <label className="block text-[10px] font-semibold text-gray-500 mb-1">By Semester</label>
                        <select 
                            value={semesterFilter}
                            onChange={(e) => setSemesterFilter(e.target.value)}
                            className="w-full text-xs border-gray-300 rounded shadow-sm focus:border-blue-500 focus:border-blue-500 p-1"
                        >
                            {uniqueSemesters.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                )}

                <div className="flex border-b border-gray-200 shrink-0">
                    <button 
                        className={`flex-1 py-2 text-xs font-medium border-b-2 transition-colors ${activeTab === 'Program' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setActiveTab('Program')}
                    >
                        Program
                    </button>
                    <button 
                        className={`flex-1 py-2 text-xs font-medium border-b-2 transition-colors ${activeTab === 'Attributes' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        onClick={() => setActiveTab('Attributes')}
                    >
                        Attributes
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-2 thin-scrollbar">
                    {activeTab === 'Program' && (
                        <>
                            <div>
                                <h3 className="text-[10px] font-semibold text-gray-500 mb-1 uppercase">By Faculty</h3>
                                <div className="flex flex-wrap gap-1.5">
                                    {faculties.map(fac => (
                                        <button
                                            key={fac}
                                            onClick={() => toggleSetItem(selectedFaculties, fac, setSelectedFaculties)}
                                            className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${selectedFaculties.has(fac) ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                                        >
                                            {fac}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h3 className="text-[10px] font-semibold text-gray-500 mb-1 uppercase">By Type</h3>
                                <div className="flex flex-wrap gap-1.5">
                                    {programTypes.map(type => (
                                        <button
                                            key={type}
                                            onClick={() => toggleSetItem(selectedProgramTypes, type, setSelectedProgramTypes)}
                                            className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${selectedProgramTypes.has(type) ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h3 className="text-[10px] font-semibold text-gray-500 mb-1 uppercase">By Semester</h3>
                                <div className="flex flex-wrap gap-1.5">
                                    {semesterTypes.map(type => (
                                        <button
                                            key={type}
                                            onClick={() => toggleSetItem(selectedSemesterTypes, type, setSelectedSemesterTypes)}
                                            className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${selectedSemesterTypes.has(type) ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-2 border-t border-gray-100">
                                <div className="relative mb-2">
                                    <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input 
                                        type="text" 
                                        placeholder="Search programs..." 
                                        value={programSearch}
                                        onChange={(e) => setProgramSearch(e.target.value)}
                                        className="w-full pl-7 pr-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    />
                                </div>

                                <div className="space-y-3">
                                    {Object.entries(filteredGroupedPrograms).map(([fac, progs]: [string, ProgramDataRow[]]) => {
                                        if (selectedFaculties.size > 0 && !selectedFaculties.has(fac)) return null;

                                        return (
                                            <div key={fac}>
                                                <h4 className={`text-[10px] font-bold px-1.5 py-0.5 mb-1 rounded inline-block ${selectedFaculties.has(fac) ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600'}`}>
                                                    {fac}
                                                </h4>
                                                <div className="space-y-0.5">
                                                    {progs.map(p => {
                                                        const normPid = normalize(p.PID);
                                                        const isSelected = selectedPrograms.has(normPid);
                                                        return (
                                                            <div 
                                                                key={p.PID} 
                                                                onClick={() => toggleSetItem(selectedPrograms, normPid, setSelectedPrograms)}
                                                                className="flex items-center p-1 hover:bg-blue-50 rounded cursor-pointer group"
                                                            >
                                                                <div className={`w-1.5 h-1.5 rounded-full mr-2 shrink-0 ${getDotColor(p.PID)}`}></div>
                                                                <div className="flex-1 text-[10px] text-gray-700 leading-tight">
                                                                    <span className="font-mono text-gray-500 mr-1">{p.PID}</span>
                                                                    {p['Program Short Name']}
                                                                </div>
                                                                {isSelected && (
                                                                     <div className="w-1.5 h-1.5 bg-blue-600 rounded-full shrink-0 ml-1"></div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </>
                    )}
                    
                    {activeTab === 'Attributes' && (
                        <div className="space-y-1 h-full flex flex-col">
                            
                            {/* Missing Data Filter (Top for Visibility) */}
                            {missingDataOptions && selectedMissingFields && setSelectedMissingFields && (
                                renderAccordionSection('Has Missing Data', (
                                    <div className="flex flex-wrap gap-1.5">
                                        {missingDataOptions.map(field => (
                                            <button
                                                key={field}
                                                onClick={() => handleMissingDataToggle(field)}
                                                className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${selectedMissingFields.has(field) ? 'bg-red-100 text-red-700 border-red-200' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                                            >
                                                {field}
                                            </button>
                                        ))}
                                    </div>
                                ), selectedMissingFields.size, true)
                            )}

                            {/* ... Rest of existing component code (Room, Teachers, etc.) ... */}
                            {viewMode === 'classroom' ? (
                                <>
                                    {classroomOptions && (
                                        <>
                                            {renderAccordionSection('Building', (
                                                <div className="flex flex-wrap gap-1.5">
                                                    {classroomOptions.buildings.map(b => (
                                                        <button
                                                            key={b}
                                                            onClick={() => selectedBuildings && setSelectedBuildings && toggleSetItem(selectedBuildings, b, setSelectedBuildings)}
                                                            className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${selectedBuildings?.has(b) ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                                                        >
                                                            {b}
                                                        </button>
                                                    ))}
                                                </div>
                                            ), selectedBuildings?.size)}

                                            {renderAccordionSection('Floor', (
                                                <div className="flex flex-wrap gap-1.5">
                                                    {classroomOptions.floors.map(f => (
                                                        <button
                                                            key={f}
                                                            onClick={() => selectedFloors && setSelectedFloors && toggleSetItem(selectedFloors, f, setSelectedFloors)}
                                                            className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${selectedFloors?.has(f) ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                                                        >
                                                            {f}
                                                        </button>
                                                    ))}
                                                </div>
                                            ), selectedFloors?.size)}

                                            {renderAccordionSection('Room Type', (
                                                <div className="flex flex-wrap gap-1.5">
                                                    {classroomOptions.roomTypes.map(rt => (
                                                        <button
                                                            key={rt}
                                                            onClick={() => selectedRoomTypes && setSelectedRoomTypes && toggleSetItem(selectedRoomTypes, rt, setSelectedRoomTypes)}
                                                            className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${selectedRoomTypes?.has(rt) ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                                                        >
                                                            {rt}
                                                        </button>
                                                    ))}
                                                </div>
                                            ), selectedRoomTypes?.size)}

                                            {renderAccordionSection('Room Capacity', (
                                                <div className="space-y-3 p-1">
                                                    <div className="flex items-center space-x-2">
                                                        <input
                                                            type="number"
                                                            placeholder="Min"
                                                            value={roomCapacityMin || ''}
                                                            onChange={e => setRoomCapacityMin && setRoomCapacityMin(e.target.value)}
                                                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:border-blue-500 outline-none"
                                                        />
                                                        <span className="text-gray-400">-</span>
                                                        <input
                                                            type="number"
                                                            placeholder="Max"
                                                            value={roomCapacityMax || ''}
                                                            onChange={e => setRoomCapacityMax && setRoomCapacityMax(e.target.value)}
                                                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:border-blue-500 outline-none"
                                                        />
                                                    </div>
                                                </div>
                                            ), (roomCapacityMin || roomCapacityMax ? 1 : 0))}
                                        </>
                                    )}
                                </>
                            ) : 
                            
                            viewMode === 'admitted' ? (
                                <>
                                    <h3 className="text-[11px] font-bold text-gray-700 px-1 mb-2 uppercase tracking-wide">Semester Configuration</h3>
                                    
                                    <button
                                        onClick={handleBatchToggleAdmitted}
                                        className={`mx-1 mb-2 px-2 py-1.5 text-[10px] font-bold rounded shadow-sm transition-colors flex items-center justify-center ${
                                            areTop12Selected 
                                            ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100' 
                                            : 'bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100'
                                        }`}
                                    >
                                        {areTop12Selected ? (
                                            <>
                                                <UserMinus className="w-3 h-3 mr-1.5" />
                                                Deselect Latest 12
                                            </>
                                        ) : (
                                            <>
                                                <UserPlus className="w-3 h-3 mr-1.5" />
                                                Select Latest 12
                                            </>
                                        )}
                                    </button>

                                    {admittedSemestersOptions && (
                                        <div className="flex-1 overflow-y-auto thin-scrollbar pb-2">
                                            {admittedSemestersOptions.map(sem => {
                                                const isAdmitted = selectedAdmittedSemesters?.has(sem);
                                                const regStatus = registrationFilters?.get(sem);
                                                const canRegister = registeredSemestersOptions?.includes(sem);

                                                return (
                                                    <div key={sem} className="flex items-center py-1.5 border-b border-gray-50 last:border-0">
                                                        <button
                                                            onClick={() => toggleAdmitted(sem)}
                                                            className={`p-1 rounded text-[9px] font-bold border transition-colors flex items-center justify-center mr-2 shrink-0 ${
                                                                isAdmitted 
                                                                ? 'bg-teal-100 text-teal-700 border-teal-300' 
                                                                : 'bg-white text-gray-300 border-gray-200 hover:border-teal-200 hover:text-teal-600'
                                                            }`}
                                                            title="Toggle Admitted Source"
                                                        >
                                                            <UserPlus className="w-3 h-3" />
                                                        </button>
                                                        
                                                        <div className="flex-1 text-[10px] font-bold text-gray-700 truncate mr-1" title={sem}>
                                                            {sem}
                                                        </div>

                                                        {canRegister ? (
                                                            <div className="flex rounded shadow-sm shrink-0">
                                                                <button
                                                                    onClick={() => toggleRegStatus(sem, 'registered')}
                                                                    className={`px-1.5 py-0.5 text-[9px] font-bold border rounded-l transition-colors flex items-center ${
                                                                        regStatus === 'registered'
                                                                        ? 'bg-green-100 text-green-700 border-green-300 z-10'
                                                                        : 'bg-white text-gray-400 border-gray-200 hover:bg-green-50 hover:text-green-600'
                                                                    }`}
                                                                >
                                                                    Reg
                                                                </button>
                                                                <button
                                                                    onClick={() => toggleRegStatus(sem, 'unregistered')}
                                                                    className={`px-1.5 py-0.5 text-[9px] font-bold border-t border-b border-r rounded-r transition-colors flex items-center ${
                                                                        regStatus === 'unregistered'
                                                                        ? 'bg-red-100 text-red-700 border-red-300 z-10'
                                                                        : 'bg-white text-gray-400 border-gray-200 hover:bg-red-50 hover:text-red-600'
                                                                    }`}
                                                                >
                                                                    Unreg
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <span className="text-[9px] text-gray-300 italic">-</span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                            {admittedSemestersOptions.length === 0 && (
                                                <p className="text-[10px] text-gray-400 text-center py-2">No semesters available</p>
                                            )}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <>
                                    {renderAccordionSection('Teacher', (
                                        <div className="space-y-2">
                                            <div className="relative">
                                                <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                                                <input 
                                                    type="text" 
                                                    placeholder="Search teachers..." 
                                                    value={teacherSearch}
                                                    onChange={(e) => setTeacherSearch(e.target.value)}
                                                    className="w-full pl-7 pr-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none"
                                                />
                                            </div>
                                            <div className="max-h-40 overflow-y-auto thin-scrollbar space-y-0.5">
                                                {filteredTeachers.map(t => (
                                                    <div 
                                                        key={t.id}
                                                        onClick={() => toggleSetItem(selectedTeachers, t.id, setSelectedTeachers)}
                                                        className={`flex items-center p-1.5 rounded cursor-pointer text-[10px] ${selectedTeachers.has(t.id) ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-700'}`}
                                                    >
                                                        <div className="flex-1 truncate">
                                                            <span className="font-medium">{t.name}</span>
                                                            <span className="text-gray-400 ml-1 text-[9px]">({t.id})</span>
                                                        </div>
                                                        {selectedTeachers.has(t.id) && <div className="w-1.5 h-1.5 bg-blue-500 rounded-full ml-1 shrink-0" />}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ), selectedTeachers.size)}

                                    {renderAccordionSection('Course Type', (
                                        <div className="flex flex-wrap gap-1.5">
                                            {attributeOptions.courseTypes.map(type => (
                                                <button
                                                    key={type}
                                                    onClick={() => toggleSetItem(selectedCourseTypes, type, setSelectedCourseTypes)}
                                                    className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${selectedCourseTypes.has(type) ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                                                >
                                                    {type}
                                                </button>
                                            ))}
                                        </div>
                                    ), selectedCourseTypes.size)}

                                    {renderAccordionSection('Type', (
                                        <div className="flex flex-wrap gap-1.5">
                                            {attributeOptions.types.map(type => (
                                                <button
                                                    key={type}
                                                    onClick={() => toggleSetItem(selectedTypes, type, setSelectedTypes)}
                                                    className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${selectedTypes.has(type) ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                                                >
                                                    {type}
                                                </button>
                                            ))}
                                        </div>
                                    ), selectedTypes.size)}

                                    {renderAccordionSection('Credit', (
                                        <div className="flex flex-wrap gap-1.5">
                                            {attributeOptions.credits.map(credit => (
                                                <button
                                                    key={credit}
                                                    onClick={() => toggleSetItem(selectedCredits, credit, setSelectedCredits)}
                                                    className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${selectedCredits.has(credit) ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                                                >
                                                    {credit}
                                                </button>
                                            ))}
                                        </div>
                                    ), selectedCredits.size)}

                                    {renderAccordionSection('Section Capacity', (
                                        <div className="flex flex-wrap gap-1.5">
                                            {attributeOptions.capacities.map(cap => (
                                                <button
                                                    key={cap}
                                                    onClick={() => toggleSetItem(selectedCapacities, cap, setSelectedCapacities)}
                                                    className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${selectedCapacities.has(cap) ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                                                >
                                                    {cap}
                                                </button>
                                            ))}
                                        </div>
                                    ), selectedCapacities.size)}

                                    {renderAccordionSection('Student Count', (
                                        <div className="space-y-3 p-1">
                                            <div className="flex items-center space-x-2">
                                                <input
                                                    type="number"
                                                    placeholder="Min"
                                                    value={studentMin}
                                                    onChange={e => setStudentMin(e.target.value)}
                                                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:border-blue-500 outline-none"
                                                />
                                                <span className="text-gray-400">-</span>
                                                <input
                                                    type="number"
                                                    placeholder="Max"
                                                    value={studentMax}
                                                    onChange={e => setStudentMax(e.target.value)}
                                                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:border-blue-500 outline-none"
                                                />
                                            </div>
                                            <div className="max-h-40 overflow-y-auto thin-scrollbar pr-1">
                                                <div className="flex flex-wrap gap-1.5">
                                                    {attributeOptions.studentCounts.map(count => (
                                                        <button
                                                            key={count}
                                                            onClick={() => toggleSetItemNumber(selectedStudentCounts, count, setSelectedStudentCounts)}
                                                            className={`w-8 h-8 rounded-full border text-[10px] font-medium transition-all ${selectedStudentCounts.has(count) ? 'bg-blue-500 text-white border-blue-600 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
                                                        >
                                                            {count}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ), selectedStudentCounts.size + (studentMin || studentMax ? 1 : 0))}

                                    {renderAccordionSection('Classes Taken', (
                                        <div className="space-y-3 p-1">
                                            <div className="flex items-center space-x-2">
                                                <input
                                                    type="number"
                                                    placeholder="Min"
                                                    value={classTakenMin}
                                                    onChange={e => setClassTakenMin(e.target.value)}
                                                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:border-blue-500 outline-none"
                                                />
                                                <span className="text-gray-400">-</span>
                                                <input
                                                    type="number"
                                                    placeholder="Max"
                                                    value={classTakenMax}
                                                    onChange={e => setClassTakenMax(e.target.value)}
                                                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:border-blue-500 outline-none"
                                                />
                                            </div>
                                            <div className="max-h-40 overflow-y-auto thin-scrollbar pr-1">
                                                <div className="flex flex-wrap gap-1.5">
                                                    {attributeOptions.classTakenCounts.map(count => (
                                                        <button
                                                            key={count}
                                                            onClick={() => toggleSetItemNumber(selectedClassTakens, count, setSelectedClassTakens)}
                                                            className={`w-8 h-8 rounded-full border text-[10px] font-medium transition-all ${selectedClassTakens.has(count) ? 'bg-blue-500 text-white border-blue-600 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
                                                        >
                                                            {count}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ), selectedClassTakens.size + (classTakenMin || classTakenMax ? 1 : 0))}

                                     {renderAccordionSection('Total Vacancy (Course)', (
                                        <div className="space-y-3 p-1">
                                            <div className="max-h-40 overflow-y-auto thin-scrollbar pr-1">
                                                <div className="flex flex-wrap gap-1.5">
                                                    {vacancyOptions.map(count => (
                                                        <button
                                                            key={count}
                                                            onClick={() => selectedVacancies && setSelectedVacancies && toggleSetItemNumber(selectedVacancies, count, setSelectedVacancies)}
                                                            className={`min-w-[2rem] h-8 px-2 rounded-full border text-[10px] font-medium transition-all ${selectedVacancies && selectedVacancies.has(count) ? 'bg-blue-500 text-white border-blue-600 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
                                                        >
                                                            {count}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ), selectedVacancies ? selectedVacancies.size : 0)}

                                     {renderAccordionSection('Extra Sections (Course)', (
                                        <div className="space-y-3 p-1">
                                            <div className="max-h-40 overflow-y-auto thin-scrollbar pr-1">
                                                <div className="flex flex-wrap gap-1.5">
                                                    {extraSectionOptions.map(count => (
                                                        <button
                                                            key={count}
                                                            onClick={() => selectedExtraSections && setSelectedExtraSections && toggleSetItemNumber(selectedExtraSections, count, setSelectedExtraSections)}
                                                            className={`w-8 h-8 rounded-full border text-[10px] font-medium transition-all ${selectedExtraSections && selectedExtraSections.has(count) ? 'bg-blue-500 text-white border-blue-600 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
                                                        >
                                                            {count}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    ), selectedExtraSections ? selectedExtraSections.size : 0)}
                                </>
                            )}
                        </div>
                    )}
                </div>

                {viewMode === 'admitted' && (
                    <div className="p-3 border-t border-gray-200 bg-gray-50 shrink-0">
                        <button
                            onClick={() => setIsPdfConverterOpen(true)}
                            className="w-full flex items-center justify-center px-4 py-2 bg-white border border-gray-300 shadow-sm rounded text-xs font-bold text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors"
                        >
                            <FileSpreadsheet className="w-4 h-4 mr-2 text-green-600" />
                            PDF to Excel
                        </button>
                    </div>
                )}
            </div>

            <PdfConverterModal 
                isOpen={isPdfConverterOpen} 
                onClose={() => setIsPdfConverterOpen(false)} 
            />
        </>
    );
};
