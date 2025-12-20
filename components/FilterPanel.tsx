
import React, { useMemo, useState, useEffect } from 'react';
import { ProgramDataRow } from '../types';
import { X, Search, RotateCcw, ChevronDown, ChevronRight, UserPlus, UserMinus, FileSpreadsheet, AlertTriangle } from 'lucide-react';
import { PdfConverterModal } from './PdfConverterModal';

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
    hideProgramTab?: boolean;
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

    missingDataOptions,
    selectedMissingFields,
    setSelectedMissingFields,

    vacancyOptions = [],
    selectedVacancies,
    setSelectedVacancies,
    extraSectionOptions = [],
    selectedExtraSections,
    setSelectedExtraSections,

    viewMode,
    admittedSemestersOptions,
    selectedAdmittedSemesters,
    onAdmittedSemesterChange,
    registeredSemestersOptions,
    registrationFilters,
    onRegistrationFilterChange,

    classroomOptions,
    selectedBuildings, setSelectedBuildings,
    selectedFloors, setSelectedFloors,
    selectedRoomTypes, setSelectedRoomTypes,
    roomCapacityMin, setRoomCapacityMin,
    roomCapacityMax, setRoomCapacityMax,

    onClearAll,
    hideProgramTab = false
}) => {
    const [activeTab, setActiveTab] = useState<'Program' | 'Attributes'>('Program');
    const [programSearch, setProgramSearch] = useState('');
    const [teacherSearch, setTeacherSearch] = useState('');
    const [expandedAttribute, setExpandedAttribute] = useState<string | null>(viewMode === 'classroom' ? 'Building' : 'Teacher');
    const [filterBackups, setFilterBackups] = useState<FilterBackups>({});
    const [isPdfConverterOpen, setIsPdfConverterOpen] = useState(false);

    useEffect(() => { if (hideProgramTab) setActiveTab('Attributes'); }, [hideProgramTab]);

    const toggleSetItem = (set: Set<string>, item: string, setter: (s: Set<string>) => void) => {
        const newSet = new Set(set);
        if (newSet.has(item)) newSet.delete(item);
        else newSet.add(item);
        setter(newSet);
    };

    const handleMissingDataToggle = (field: string) => {
        if (!selectedMissingFields || !setSelectedMissingFields) return;
        const newSet = new Set(selectedMissingFields);
        const isAdding = !newSet.has(field);
        if (isAdding) {
            newSet.add(field);
            const newBackups = { ...filterBackups };
            if (field === 'Course Type') { if (selectedCourseTypes.size > 0) newBackups.courseTypes = new Set(selectedCourseTypes); setSelectedCourseTypes(new Set()); }
            if (field === 'Teacher ID') { if (selectedTeachers.size > 0) newBackups.teachers = new Set(selectedTeachers); setSelectedTeachers(new Set()); }
            if (field === 'Capacity') {
                if (viewMode === 'classroom') { if (roomCapacityMin || roomCapacityMax) newBackups.roomCapacity = { min: roomCapacityMin || '', max: roomCapacityMax || '' }; setRoomCapacityMin?.(''); setRoomCapacityMax?.(''); }
                else { if (selectedCapacities.size > 0) newBackups.capacities = new Set(selectedCapacities); setSelectedCapacities(new Set()); }
            }
            setFilterBackups(newBackups);
        } else {
            newSet.delete(field);
            if (field === 'Course Type' && filterBackups.courseTypes) setSelectedCourseTypes(filterBackups.courseTypes);
            if (field === 'Teacher ID' && filterBackups.teachers) setSelectedTeachers(filterBackups.teachers);
        }
        setSelectedMissingFields(newSet);
    };

    const toggleAccordion = (section: string) => setExpandedAttribute(prev => prev === section ? null : section);

    const filteredTeachers: { id: string; name: string }[] = useMemo(() => {
        const teachers: { id: string; name: string }[] = Array.isArray(attributeOptions?.teachers) ? attributeOptions.teachers : [];
        if (!teacherSearch) return teachers;
        const lower = teacherSearch.toLowerCase();
        return teachers.filter(t => (t.name || '').toLowerCase().includes(lower) || (t.id || '').toLowerCase().includes(lower));
    }, [attributeOptions?.teachers, teacherSearch]);

    const handleReset = () => { if (onClearAll) { setFilterBackups({}); onClearAll(); } };

    const renderAccordionSection = (title: string, children: React.ReactNode, selectedCount: number = 0, isWarning: boolean = false) => {
        const isExpanded = expandedAttribute === title;
        return (
            <div className="border-b border-gray-100 last:border-0">
                <button onClick={() => toggleAccordion(title)} className="w-full flex items-center justify-between py-2.5 px-1 hover:bg-gray-50 transition-colors group">
                    <div className={`flex items-center text-[11px] font-semibold ${isWarning ? 'text-red-600' : 'text-gray-700'}`}>
                        {isWarning && <AlertTriangle className="w-3 h-3 mr-1.5" />}
                        {title}
                        {selectedCount > 0 && <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[9px] ${isWarning ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{selectedCount}</span>}
                    </div>
                    {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
                </button>
                {isExpanded && <div className="pb-3 px-1">{children}</div>}
            </div>
        );
    };

    return (
        <>
            <div className={`fixed inset-y-0 left-0 w-56 bg-white shadow-xl z-[100] transform transition-transform duration-300 border-r border-gray-200 flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="px-3 py-3 border-b border-gray-200 flex justify-between items-center bg-white shrink-0">
                    <h2 className="text-sm font-bold text-gray-800">{viewMode === 'classroom' ? 'Filter Rooms' : 'Filter Data'}</h2>
                    <div className="flex items-center space-x-1">
                        <button onClick={handleReset} className="p-1 hover:bg-gray-100 rounded text-gray-500 transition-colors"><RotateCcw className="w-3.5 h-3.5" /></button>
                        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded text-gray-500 transition-colors"><X className="w-4 h-4" /></button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2 thin-scrollbar">
                    {activeTab === 'Attributes' && (
                        <div className="space-y-1 h-full flex flex-col">
                            {missingDataOptions && selectedMissingFields && renderAccordionSection('Has Missing Data', (<div className="flex flex-wrap gap-1.5">{missingDataOptions.map(field => (<button key={field} onClick={() => handleMissingDataToggle(field)} className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${selectedMissingFields.has(field) ? 'bg-red-100 text-red-700 border-red-200' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>{field}</button>))}</div>), selectedMissingFields.size, true)}
                            {!viewMode?.includes('admitted') && viewMode !== 'classroom' && (
                                <>
                                    {renderAccordionSection('Teacher', (<div className="space-y-2"><div className="relative"><Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" /><input type="text" placeholder="Search..." value={teacherSearch} onChange={(e) => setTeacherSearch(e.target.value)} className="w-full pl-7 pr-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none" /></div><div className="max-h-40 overflow-y-auto thin-scrollbar space-y-0.5">{filteredTeachers.map((t) => (<div key={t.id} onClick={() => toggleSetItem(selectedTeachers, t.id, setSelectedTeachers)} className={`flex items-center p-1.5 rounded cursor-pointer text-[10px] ${selectedTeachers.has(t.id) ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-700'}`}><div className="flex-1 truncate"><span className="font-medium">{t.name}</span><span className="text-gray-400 ml-1 text-[9px]">({t.id})</span></div>{selectedTeachers.has(t.id) && <div className="w-1.5 h-1.5 bg-blue-500 rounded-full ml-1" />}</div>))}</div></div>), selectedTeachers.size)}
                                    {renderAccordionSection('Course Type', (<div className="flex flex-wrap gap-1.5">{attributeOptions.courseTypes.map(type => (<button key={type} onClick={() => toggleSetItem(selectedCourseTypes, type, setSelectedCourseTypes)} className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${selectedCourseTypes.has(type) ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>{type}</button>))}</div>), selectedCourseTypes.size)}
                                    {renderAccordionSection('Credit', (<div className="flex flex-wrap gap-1.5">{attributeOptions.credits.map(credit => (<button key={credit} onClick={() => toggleSetItem(selectedCredits, credit, setSelectedCredits)} className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${selectedCredits.has(credit) ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>{credit}</button>))}</div>), selectedCredits.size)}
                                </>
                            )}
                        </div>
                    )}
                </div>
                {viewMode?.includes('admitted') && (<div className="p-3 border-t border-gray-200 bg-gray-50"><button onClick={() => setIsPdfConverterOpen(true)} className="w-full flex items-center justify-center px-4 py-2 bg-white border border-gray-300 shadow-sm rounded text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors"><FileSpreadsheet className="w-4 h-4 mr-2 text-green-600" />PDF to Excel</button></div>)}
            </div>
            <PdfConverterModal isOpen={isPdfConverterOpen} onClose={() => setIsPdfConverterOpen(false)} />
        </>
    );
};
