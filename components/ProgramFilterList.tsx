import React, { useState, useMemo } from 'react';
import { ProgramData } from '../types';
import { SearchIcon } from './icons/SearchIcon';

interface ProgramFilterListProps {
  programs: ProgramData[];
  selectedPid: string | null;
  onProgramSelect: (pid: string | null) => void;
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
        ? 'bg-secondary/10 border-secondary text-secondary dark:bg-secondary/20 dark:border-secondary'
        : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-accent'
    } ${className || ''}`}
  >
    {label}
  </button>
);


export const ProgramFilterList: React.FC<ProgramFilterListProps> = ({
  programs,
  selectedPid,
  onProgramSelect,
}) => {
  const [activeFaculty, setActiveFaculty] = useState('All');
  const [activeProgramTypes, setActiveProgramTypes] = useState<string[]>([]);
  const [activeSemesterTypes, setActiveSemesterTypes] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const faculties = useMemo(() => ['All', ...[...new Set(programs.map(p => p['Faculty Short Name']))].sort()], [programs]);

  const toggleFilter = (
    filterList: string[],
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    value: string
  ) => {
    const newFilterList = filterList.includes(value)
      ? filterList.filter(item => item !== value)
      : [...filterList, value];
    setter(newFilterList);
  };
  
  const filteredAndGroupedPrograms = useMemo(() => {
    const filtered = programs.filter(p => {
        const facultyMatch = activeFaculty === 'All' || p['Faculty Short Name'] === activeFaculty;
        const programTypeMatch = activeProgramTypes.length === 0 || activeProgramTypes.includes(p['Program Type']);
        const semesterTypeMatch = activeSemesterTypes.length === 0 || activeSemesterTypes.includes(p['Semester Type']);
        const searchMatch = p['Program Short Name'].toLowerCase().includes(searchTerm.toLowerCase()) || p['Program Full Name'].toLowerCase().includes(searchTerm.toLowerCase());
        return facultyMatch && programTypeMatch && semesterTypeMatch && searchMatch;
    });

    return filtered.reduce((acc, program) => {
        const key = program['Faculty Short Name'];
        if (!acc[key]) {
            acc[key] = [];
        }
        acc[key].push(program);
        return acc;
    }, {} as Record<string, ProgramData[]>);

  }, [programs, activeFaculty, activeProgramTypes, activeSemesterTypes, searchTerm]);


  return (
    <div className="bg-white dark:bg-dark-secondary rounded-lg shadow-md h-full flex flex-col">
      {/* Filters Header */}
      <div className="p-3 border-b dark:border-gray-700 space-y-3 flex-shrink-0">
        <div className="grid grid-cols-3 gap-2">
          {faculties.map(faculty => (
            <button
              key={faculty}
              onClick={() => setActiveFaculty(faculty)}
              className={`w-full text-center px-2 py-0.5 text-sm font-medium rounded-md cursor-pointer transition-colors ${
                activeFaculty === faculty
                  ? 'bg-gray-200 dark:bg-dark-accent text-gray-800 dark:text-gray-100'
                  : 'bg-transparent text-gray-500 hover:bg-gray-100 dark:hover:bg-dark-accent/50'
              }`}
            >
              {faculty}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
            <ToggleButton className="w-full text-center" label="Graduate" isActive={activeProgramTypes.includes('Graduate')} onClick={() => toggleFilter(activeProgramTypes, setActiveProgramTypes, 'Graduate')} />
            <ToggleButton className="w-full text-center" label="Undergraduate" isActive={activeProgramTypes.includes('Undergraduate')} onClick={() => toggleFilter(activeProgramTypes, setActiveProgramTypes, 'Undergraduate')} />
            <ToggleButton className="w-full text-center" label="Bi-Semester" isActive={activeSemesterTypes.includes('Bi-Semester')} onClick={() => toggleFilter(activeSemesterTypes, setActiveSemesterTypes, 'Bi-Semester')} />
            <ToggleButton className="w-full text-center" label="Tri-Semester" isActive={activeSemesterTypes.includes('Tri-Semester')} onClick={() => toggleFilter(activeSemesterTypes, setActiveSemesterTypes, 'Tri-Semester')} />
        </div>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <SearchIcon className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search programs..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-accent dark:bg-gray-700 dark:text-light"
          />
        </div>
      </div>

      {/* Program List */}
      <div className="flex-grow overflow-y-auto thin-scrollbar">
        {Object.keys(filteredAndGroupedPrograms).sort().map(facultyName => (
            <div key={facultyName}>
                <h3 className={`px-3 py-1 text-sm font-bold sticky top-0 ${facultyColors[facultyName] || facultyColors.DEFAULT}`}>
                    {facultyName}
                </h3>
                <ul>
                    {filteredAndGroupedPrograms[facultyName].map(program => (
                        <li key={program.PID}>
                           <button
                             onClick={() => onProgramSelect(selectedPid === program.PID ? null : program.PID)}
                             className={`w-full text-left flex items-center space-x-2 px-3 py-1.5 cursor-pointer hover:bg-gray-100 dark:hover:bg-dark-accent text-sm transition-colors ${
                                selectedPid === program.PID ? 'bg-secondary/10 dark:bg-secondary/20' : ''
                             }`}
                           >
                                <div className={`w-2 h-2 rounded-full ${facultyDotColors[facultyName] || facultyDotColors.DEFAULT}`}></div>
                                <span className="font-semibold text-gray-600 dark:text-gray-400 w-8">{program.PID}</span>
                                <span className="text-gray-800 dark:text-gray-200">{program['Program Short Name']}</span>
                           </button>
                        </li>
                    ))}
                </ul>
            </div>
        ))}
         {Object.keys(filteredAndGroupedPrograms).length === 0 && (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                <p>No programs match your criteria.</p>
            </div>
        )}
      </div>
    </div>
  );
};