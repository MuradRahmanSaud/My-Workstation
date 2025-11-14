import React, { useState, useMemo } from 'react';
import { XIcon } from './icons/XIcon';
import { ProgramData, SectionData, AttributeFilters } from '../types';
import { SearchIcon } from './icons/SearchIcon';
import { MultiSelectDropdown } from './MultiSelectDropdown';

interface FilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  programs: ProgramData[];
  selectedPids: string[];
  onProgramSelect: (pids: string[]) => void;
  sheetData: SectionData[];
  attributeFilters: AttributeFilters;
  onAttributeFiltersChange: (filters: AttributeFilters) => void;
  sortedSemesters: string[];
  selectedSemesters: string[];
  setSelectedSemesters: (semesters: string[]) => void;
  onResetFilters: () => void;
}

const facultyColors: { [key: string]: string } = {
    'FBE': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    'FE': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    'FHLS': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    'FHSS': 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300',
    'FSIT': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    'DEFAULT': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

const facultyDotColors: { [key: string]: string } = {
    'FBE': 'bg-red-500',
    'FE': 'bg-amber-500',
    'FHLS': 'bg-emerald-500',
    'FHSS': 'bg-sky-500',
    'FSIT': 'bg-orange-500',
    'DEFAULT': 'bg-gray-500',
};

const ToggleButton: React.FC<{
  label: string;
  isActive: boolean;
  onClick: () => void;
  className?: string;
}> = ({ label, isActive, onClick, className }) => (
  <button
    onClick={onClick}
    className={`px-2.5 py-0.5 text-xs border rounded-full transition-colors ${
      isActive
        ? 'bg-secondary/10 border-secondary text-secondary dark:bg-secondary/20 dark:border-secondary font-semibold'
        : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-accent'
    } ${className || ''}`}
  >
    {label}
  </button>
);

const ProgramFilterContent: React.FC<Pick<FilterPanelProps, 'programs' | 'selectedPids' | 'onProgramSelect'>> = ({
    programs, selectedPids, onProgramSelect
}) => {
    const [searchTerm, setSearchTerm] = useState('');

    const faculties = useMemo(() => [...new Set(programs.map(p => p['Faculty Short Name']))].sort(), [programs]);
    const programTypes = useMemo(() => [...new Set(programs.map(p => p['Program Type']))].sort(), [programs]);
    const semesterTypes = useMemo(() => [...new Set(programs.map(p => p['Semester Type']))].sort(), [programs]);

    const handleGroupSelect = (key: keyof ProgramData, value: string) => {
        const pidsInGroup = programs.filter(p => p[key] === value).map(p => p.PID);
        if (pidsInGroup.length === 0) return;

        const allCurrentlySelected = pidsInGroup.every(pid => selectedPids.includes(pid));
        
        const otherPids = selectedPids.filter(pid => !pidsInGroup.includes(pid));
        
        if (allCurrentlySelected) {
            onProgramSelect(otherPids); // Deselect group
        } else {
            onProgramSelect([...otherPids, ...pidsInGroup]); // Select group
        }
    };
    
    const isGroupFullySelected = (key: keyof ProgramData, value: string) => {
        const pidsInGroup = programs.filter(p => p[key] === value);
        if (pidsInGroup.length === 0) return false;
        return pidsInGroup.every(p => selectedPids.includes(p.PID));
    };

    const handleIndividualProgramSelect = (pid: string) => {
        const newPids = selectedPids.includes(pid)
            ? selectedPids.filter(p => p !== pid)
            : [...selectedPids, pid];
        onProgramSelect(newPids);
    };

    const filteredAndGroupedPrograms = useMemo(() => {
        return programs
            .filter(p => p['Program Short Name'].toLowerCase().includes(searchTerm.toLowerCase()) || p['Program Full Name'].toLowerCase().includes(searchTerm.toLowerCase()))
            .reduce((acc, program) => {
                const key = program['Faculty Short Name'];
                if (!acc[key]) acc[key] = [];
                acc[key].push(program);
                return acc;
            }, {} as Record<string, ProgramData[]>);
    }, [programs, searchTerm]);

    return (
        <>
            <div className="p-3 border-b dark:border-gray-700 space-y-3 flex-shrink-0">
                <div className="space-y-1">
                    <p className="text-xs font-semibold text-gray-500">By Faculty</p>
                    <div className="flex flex-wrap gap-1.5">
                        {faculties.map(faculty => (
                            <ToggleButton key={faculty} label={faculty} isActive={isGroupFullySelected('Faculty Short Name', faculty)} onClick={() => handleGroupSelect('Faculty Short Name', faculty)} />
                        ))}
                    </div>
                </div>
                 <div className="space-y-1">
                    <p className="text-xs font-semibold text-gray-500">By Program Type</p>
                    <div className="flex flex-wrap gap-1.5">
                        {programTypes.map(type => (
                             <ToggleButton key={type} label={type} isActive={isGroupFullySelected('Program Type', type)} onClick={() => handleGroupSelect('Program Type', type)} />
                        ))}
                    </div>
                </div>
                 <div className="space-y-1">
                    <p className="text-xs font-semibold text-gray-500">By Semester Type</p>
                    <div className="flex flex-wrap gap-1.5">
                        {semesterTypes.map(type => (
                             <ToggleButton key={type} label={type} isActive={isGroupFullySelected('Semester Type', type)} onClick={() => handleGroupSelect('Semester Type', type)} />
                        ))}
                    </div>
                </div>
                <div className="relative pt-2">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input type="text" placeholder="Search individual programs..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-accent dark:bg-gray-700" />
                </div>
            </div>
            <div className="flex-grow">
                {Object.keys(filteredAndGroupedPrograms).sort().map(facultyName => (
                    <div key={facultyName}>
                        <h3 className={`px-3 py-1 text-sm font-bold sticky top-0 ${facultyColors[facultyName] || facultyColors.DEFAULT}`}>{facultyName}</h3>
                        <ul>
                            {filteredAndGroupedPrograms[facultyName].map(program => (
                                <li key={program.PID}>
                                    <button onClick={() => handleIndividualProgramSelect(program.PID)}
                                        className={`w-full text-left flex items-center space-x-2 px-3 py-1.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-dark-accent text-sm ${selectedPids.includes(program.PID) ? 'bg-secondary/10' : ''}`}>
                                        <div className={`w-2 h-2 rounded-full ${facultyDotColors[facultyName] || facultyDotColors.DEFAULT}`}></div>
                                        <span className="font-semibold text-gray-600 dark:text-gray-400 w-8">{program.PID}</span>
                                        <span className="text-gray-800 dark:text-gray-200">{program['Program Short Name']}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </>
    );
};

const FilterSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="p-3 border-b dark:border-gray-700">
        <h3 className="text-sm font-semibold mb-2 text-gray-600 dark:text-gray-300">{title}</h3>
        {children}
    </div>
);

const MultiSelectTabGroup: React.FC<{ options: string[], selected: string[], onChange: (value: string) => void }> = ({ options, selected, onChange }) => (
    <div className="flex flex-wrap gap-1.5">
        {options.map(option => (
            <ToggleButton key={option} label={option} isActive={selected.includes(option)} onClick={() => onChange(option)} />
        ))}
    </div>
);

const MinMaxInputGroup: React.FC<{ min: string; max: string; onMinChange: (value: string) => void; onMaxChange: (value: string) => void; }> = ({ min, max, onMinChange, onMaxChange }) => (
    <div className="flex items-center space-x-2">
        <input type="number" placeholder="Min" value={min} onChange={e => onMinChange(e.target.value)} className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-accent dark:bg-gray-700 py-1 px-2" />
        <span className="text-gray-400">-</span>
        <input type="number" placeholder="Max" value={max} onChange={e => onMaxChange(e.target.value)} className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-accent dark:bg-gray-700 py-1 px-2" />
    </div>
);


const AttributeFilterContent: React.FC<Pick<FilterPanelProps, 'sheetData' | 'attributeFilters' | 'onAttributeFiltersChange'>> = ({ sheetData, attributeFilters, onAttributeFiltersChange }) => {

    const filterOptions = useMemo(() => {
        const teachers = [...new Set(sheetData.map(d => d['Teacher Name']).filter(Boolean))].sort();
        
        // Course Types - Check for empty values and add an '(Empty)' option if present
        const allCourseTypes = [...new Set(sheetData.map(d => d['Course Type']))];
        const hasEmptyCourseType = allCourseTypes.some(ct => !ct);
        const courseTypes = allCourseTypes.filter((ct): ct is string => !!ct).sort();
        if (hasEmptyCourseType) {
            courseTypes.unshift('(Empty)');
        }

        const types = [...new Set(sheetData.map(d => d.Type).filter(Boolean))].sort();
        const credits = [...new Set(sheetData.map(d => d.Credit).filter(Boolean))].sort((a: string,b: string) => parseFloat(a) - parseFloat(b));
        
        // Section Capacities - Check for empty values and add an '(Empty)' option if present
        const allCapacities = [...new Set(sheetData.map(d => d['Section Capacity']))];
        const hasEmptyCapacity = allCapacities.some(c => !c);
        const capacities = allCapacities.filter((c): c is string => !!c).sort((a: string,b: string) => parseInt(a) - parseInt(b));
        if (hasEmptyCapacity) {
            capacities.unshift('(Empty)');
        }

        return { teachers, courseTypes, types, credits, capacities };
    }, [sheetData]);

    // FIX: Replaced the previous implementation with a more type-safe version using an Array.isArray guard.
    // This resolves potential TypeScript inference issues when dealing with complex object types and union keys.
    const handleMultiSelectChange = (key: keyof Omit<AttributeFilters, 'studentCount' | 'classesTaken'>, value: string) => {
        const currentValues = attributeFilters[key];
        if (Array.isArray(currentValues)) {
            const newValues = currentValues.includes(value)
                ? currentValues.filter((item) => item !== value)
                : [...currentValues, value];
            
            onAttributeFiltersChange({
                ...attributeFilters,
                [key]: newValues,
            });
        }
    };
    
    const handleMinMaxChange = (key: 'studentCount' | 'classesTaken', field: 'min' | 'max', value: string) => {
        onAttributeFiltersChange({
            ...attributeFilters,
            [key]: { ...attributeFilters[key], [field]: value }
        });
    };

    return (
        <div className="space-y-1">
            <FilterSection title="Teacher">
                <MultiSelectDropdown 
                    options={filterOptions.teachers}
                    selectedOptions={attributeFilters.teachers}
                    onChange={selected => onAttributeFiltersChange({...attributeFilters, teachers: selected})}
                    placeholder="Select teachers"
                />
            </FilterSection>
            <FilterSection title="Course Type">
                <MultiSelectTabGroup options={filterOptions.courseTypes} selected={attributeFilters.courseTypes} onChange={value => handleMultiSelectChange('courseTypes', value)} />
            </FilterSection>
             <FilterSection title="Type">
                <MultiSelectTabGroup options={filterOptions.types} selected={attributeFilters.types} onChange={value => handleMultiSelectChange('types', value)} />
            </FilterSection>
            <FilterSection title="Credit">
                <MultiSelectTabGroup options={filterOptions.credits} selected={attributeFilters.credits} onChange={value => handleMultiSelectChange('credits', value)} />
            </FilterSection>
            <FilterSection title="Section Capacity">
                <MultiSelectTabGroup options={filterOptions.capacities} selected={attributeFilters.capacities} onChange={value => handleMultiSelectChange('capacities', value)} />
            </FilterSection>
            <FilterSection title="Student Count">
                <MinMaxInputGroup 
                    min={attributeFilters.studentCount.min} 
                    max={attributeFilters.studentCount.max}
                    onMinChange={value => handleMinMaxChange('studentCount', 'min', value)}
                    onMaxChange={value => handleMinMaxChange('studentCount', 'max', value)}
                />
            </FilterSection>
             <FilterSection title="Classes Taken">
                <MinMaxInputGroup 
                    min={attributeFilters.classesTaken.min} 
                    max={attributeFilters.classesTaken.max}
                    onMinChange={value => handleMinMaxChange('classesTaken', 'min', value)}
                    onMaxChange={value => handleMinMaxChange('classesTaken', 'max', value)}
                />
            </FilterSection>
        </div>
    );
};

export const FilterPanel: React.FC<FilterPanelProps> = ({ isOpen, onClose, onResetFilters, sortedSemesters, selectedSemesters, setSelectedSemesters, ...props }) => {
  const [activeTab, setActiveTab] = useState<'program' | 'attributes'>('program');
  const [showConfirmClose, setShowConfirmClose] = useState(false);

  const handleCloseRequest = () => {
    setShowConfirmClose(true);
  };
  
  const handleResetAndClose = () => {
    onResetFilters();
    setShowConfirmClose(false);
    onClose();
  };

  const handleCloseWithoutReset = () => {
    setShowConfirmClose(false);
    onClose();
  };

  const TabButton: React.FC<{ name: string, current: string, onClick: () => void }> = ({ name, current, onClick }) => (
      <button
        onClick={onClick}
        className={`flex-1 px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${
            current === name.toLowerCase().split(' ')[1] 
            ? 'bg-gray-200 dark:bg-dark-accent text-gray-800 dark:text-gray-100' 
            : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-dark-accent/50'
        }`}
        >
        {name}
      </button>
  );

  return (
    <div className={`relative flex flex-col bg-white dark:bg-dark-secondary shadow-lg transition-all duration-300 border-r dark:border-gray-700 ${isOpen ? 'w-64' : 'w-0'} overflow-hidden`}>
      <div className="w-64 flex flex-col h-full">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">Filter Sections</h2>
            <button onClick={handleCloseRequest} className="p-1 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700" aria-label="Close panel">
                <XIcon className="h-5 w-5" />
            </button>
        </div>

        <div className="p-3 border-b dark:border-gray-700 flex-shrink-0">
          <h3 className="text-sm font-semibold mb-2 text-gray-600 dark:text-gray-300">By Semester</h3>
          {sortedSemesters.length > 0 ? (
            <MultiSelectDropdown
              options={sortedSemesters}
              selectedOptions={selectedSemesters}
              onChange={setSelectedSemesters}
              placeholder="Select Semesters"
            />
          ) : (
             <div className="text-sm text-gray-400">Loading semesters...</div>
          )}
        </div>

        <div className="flex-shrink-0 border-b dark:border-gray-700 p-1 bg-gray-50 dark:bg-dark-primary/50">
            <div className="flex bg-gray-100 dark:bg-dark-secondary p-0.5 rounded-lg">
                <TabButton name="By Program" current={activeTab} onClick={() => setActiveTab('program')} />
                <TabButton name="By Attributes" current={activeTab} onClick={() => setActiveTab('attributes')} />
            </div>
        </div>

        <div className="flex-grow overflow-y-auto thin-scrollbar">
            {activeTab === 'program' && <ProgramFilterContent {...props} />}
            {activeTab === 'attributes' && <AttributeFilterContent {...props} />}
        </div>
      </div>
      {showConfirmClose && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-dark-secondary rounded-lg shadow-xl p-5 w-full text-center">
            <h3 className="text-md font-semibold text-gray-800 dark:text-gray-100 mb-2">Reset Filters?</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Do you want to reset all filters before closing?
            </p>
            <div className="flex flex-col space-y-2">
              <button onClick={handleResetAndClose} className="w-full px-4 py-1.5 text-sm font-semibold text-white bg-red-600 rounded-md hover:bg-red-700">
                Reset & Close
              </button>
              <button onClick={handleCloseWithoutReset} className="w-full px-4 py-1.5 text-sm font-semibold text-white bg-secondary rounded-md hover:bg-primary">
                Close without Resetting
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};