
import React from 'react';
import { Search, ChevronRight, School, Calendar, Filter } from 'lucide-react';
import { ProgramDataRow } from '../types';

interface DropOutLeftPanelProps {
    searchTerm: string;
    setSearchTerm: (val: string) => void;
    selectedFaculty: string;
    setSelectedFaculty: (val: string) => void;
    faculties: string[];
    selectedType: string | null;
    setSelectedType: (val: string | null) => void;
    selectedSemesterMode: string | null;
    setSelectedSemesterMode: (val: string | null) => void;
    sortedGroupKeys: string[];
    groupedData: Record<string, ProgramDataRow[]>;
    selectedProgram: ProgramDataRow | null;
    onSelectProgram: (p: ProgramDataRow) => void;
    facultyColors: Record<string, string>;
    facultyHeaderColors: Record<string, string>;
    loading: boolean;
}

export const DropOutLeftPanel: React.FC<DropOutLeftPanelProps> = ({
    searchTerm, setSearchTerm, selectedFaculty, setSelectedFaculty, faculties,
    selectedType, setSelectedType, selectedSemesterMode, setSelectedSemesterMode,
    sortedGroupKeys, groupedData, selectedProgram, onSelectProgram,
    facultyColors, facultyHeaderColors, loading
}) => {
    return (
        <div className="w-full md:w-[200px] flex flex-col bg-white border-r border-gray-200 overflow-hidden shrink-0 h-full">
            <div className="p-2 space-y-2.5 shrink-0 bg-white border-b border-gray-100">
                <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar pb-1">
                    <button 
                        onClick={() => setSelectedFaculty('All')}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-all border ${selectedFaculty === 'All' ? 'bg-slate-700 text-white border-slate-800' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
                    >
                        All
                    </button>
                    {faculties.map(fac => (
                        <button 
                            key={fac}
                            onClick={() => setSelectedFaculty(fac)}
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-all border whitespace-nowrap ${selectedFaculty === fac ? 'ring-2 ring-blue-400 ring-offset-0' : ''} ${facultyColors[fac] || 'bg-gray-100 text-gray-700'}`}
                        >
                            {fac}
                        </button>
                    ))}
                </div>

                <div className="space-y-1.5 px-0.5">
                    <div className="flex flex-wrap gap-1">
                        {['Graduate', 'Undergraduate'].map((cat) => (
                            <button 
                                key={cat}
                                onClick={() => setSelectedType(selectedType === cat ? null : cat)}
                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold border transition-all 
                                    ${selectedType === cat 
                                        ? 'bg-blue-600 text-white border-blue-700' 
                                        : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                    <div className="flex flex-wrap gap-1">
                        {['Bi-Semester', 'Tri-Semester'].map((cat) => (
                            <button 
                                key={cat}
                                onClick={() => setSelectedSemesterMode(selectedSemesterMode === cat ? null : cat)}
                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold border transition-all 
                                    ${selectedSemesterMode === cat 
                                        ? 'bg-indigo-600 text-white border-indigo-700' 
                                        : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="relative group">
                    <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Search Program..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-7 pr-2 py-1.5 bg-gray-50 border border-gray-200 rounded-md text-[11px] outline-none focus:border-blue-500 transition-all placeholder:text-gray-400 font-medium"
                    />
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto thin-scrollbar bg-white">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-full space-y-3 opacity-50">
                        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : sortedGroupKeys.map((fac) => (
                    <div key={fac} className="mb-0">
                        <div className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${facultyHeaderColors[fac] || 'bg-gray-100 text-gray-600'} sticky top-0 z-10 border-b border-gray-100/50`}>
                          {fac}
                        </div>
                        <div className="py-0">
                          {groupedData[fac].map((row) => (
                                <div 
                                    key={row.PID}
                                    onClick={() => onSelectProgram(row)}
                                    className={`px-3 py-2 flex items-center group cursor-pointer transition-colors border-l-4 ${
                                        selectedProgram?.PID === row.PID 
                                        ? 'bg-blue-50/50 border-blue-600' 
                                        : 'bg-white border-transparent hover:bg-gray-50'
                                    }`}
                                >
                                    <div className="w-1 h-1 rounded-full bg-red-400 mr-2 shrink-0" />
                                    <div className="flex-1 min-w-0 flex items-baseline">
                                        <span className="text-[10px] font-bold text-gray-400 font-mono w-6 shrink-0">{row.PID}</span>
                                        <span className={`text-[11px] font-medium truncate ${selectedProgram?.PID === row.PID ? 'text-blue-900 font-bold' : 'text-gray-700'}`}>
                                            {row['Program Short Name']}
                                        </span>
                                    </div>
                                    <ChevronRight className={`w-3 h-3 ${selectedProgram?.PID === row.PID ? 'text-blue-600' : 'text-gray-300 opacity-0 group-hover:opacity-100'}`} />
                                </div>
                          ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
