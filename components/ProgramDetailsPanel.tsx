import React, { useState, useEffect, useMemo } from 'react';
import { ProgramDataRow, DiuEmployeeRow } from '../types';
import { School, Users, Clock, User, GraduationCap, Building2 } from 'lucide-react';

interface ProgramDetailsPanelProps {
    program: ProgramDataRow;
    allPrograms: ProgramDataRow[]; // For deriving dropdown options
    diuEmployeeData: DiuEmployeeRow[];
    onClose: () => void;
    onUpdate: (data: ProgramDataRow) => void;
}

// Helper to resolve IDs to Employee Objects
const resolveEmployees = (idsStr: string | undefined, employeeData: DiuEmployeeRow[]) => {
    if (!idsStr) return [];
    const ids = idsStr.split(',').map(s => s.trim()).filter(Boolean);
    return ids.map(id => {
        const emp = employeeData.find(e => e['Employee ID'] === id);
        return { id, emp };
    });
};

export const ProgramDetailsPanel: React.FC<ProgramDetailsPanelProps> = ({ program, allPrograms, diuEmployeeData, onClose, onUpdate }) => {
    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) onClose();
    };

    const renderPersonnelSection = (title: string, idsStr: string | undefined) => {
        const list = resolveEmployees(idsStr, diuEmployeeData);
        if (list.length === 0) return null;
        return (
            <div className="mb-4">
                <h5 className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2 flex items-center">
                    <User className="w-3 h-3 mr-1.5" />
                    {title}
                </h5>
                <div className="space-y-2">
                    {list.map(({ id, emp }, idx) => (
                        <div key={idx} className="flex items-start bg-white p-2 rounded border border-gray-100 shadow-sm">
                            {emp ? (
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs font-bold text-gray-800">{emp['Employee Name']}</div>
                                    <div className="text-[10px] text-gray-500 truncate">{[emp['Administrative Designation'], emp['Academic Designation']].filter(Boolean).join(', ')}</div>
                                    <div className="text-[10px] text-blue-600 font-mono mt-0.5">{id}</div>
                                </div>
                            ) : (
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs font-bold text-gray-400">Unknown Employee</div>
                                    <div className="text-[10px] text-gray-400 font-mono">{id}</div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div 
            onClick={handleBackdropClick}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-0 md:static md:z-auto md:bg-transparent md:backdrop-blur-none md:flex md:h-full md:flex-1 shrink-0 transition-all duration-300 animate-in fade-in"
        >
            <div className="w-[90vw] h-[90vh] md:w-full md:h-full bg-white flex flex-col overflow-hidden md:rounded-none font-sans transform transition-all animate-in zoom-in-95 duration-200 md:animate-none">
                
                <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 thin-scrollbar bg-slate-50/50">
                    <div className="max-w-4xl mx-auto w-full space-y-6">
                        {/* Summary Grid */}
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="grid grid-cols-2 divide-x divide-gray-100 border-b border-gray-100">
                                <div className="p-4 text-center">
                                    <div className="text-[11px] text-gray-400 font-bold uppercase mb-1 tracking-wider">Short Name</div>
                                    <div className="text-base font-extrabold text-gray-800">{program['Program Short Name'] || '-'}</div>
                                </div>
                                <div className="p-4 text-center">
                                    <div className="text-[11px] text-gray-400 font-bold uppercase mb-1 tracking-wider">Department</div>
                                    <div className="text-base font-extrabold text-gray-800">{program['Department Name'] || '-'}</div>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 divide-x divide-gray-100">
                                <div className="p-4 text-center">
                                    <div className="text-[11px] text-gray-400 font-bold uppercase mb-1 tracking-wider">Type</div>
                                    <div className="text-sm font-semibold text-gray-700">{program['Program Type'] || '-'}</div>
                                </div>
                                <div className="p-4 text-center">
                                    <div className="text-[11px] text-gray-400 font-bold uppercase mb-1 tracking-wider">Semesters</div>
                                    <div className="text-sm font-semibold text-gray-700">{program['Semester Type'] || '-'}</div>
                                </div>
                                <div className="p-4 text-center">
                                    <div className="text-[11px] text-gray-400 font-bold uppercase mb-1 tracking-wider">Duration</div>
                                    <div className="text-sm font-semibold text-gray-700">{program['Semester Duration'] || '-'}</div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Class Info */}
                            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                                <h4 className="text-sm font-bold text-gray-900 border-b pb-3 mb-4 flex items-center">
                                    <Clock className="w-4 h-4 mr-2 text-purple-600" />
                                    Class Configuration
                                </h4>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-500 font-medium">Class Duration</span>
                                        <span className="text-sm font-bold text-gray-800">{program['Class Duration'] || '-'}</span>
                                    </div>
                                    <div className="flex justify-between items-start">
                                        <span className="text-sm text-gray-500 font-medium mt-0.5">Requirement</span>
                                        <span className="text-sm font-medium text-gray-800 text-right max-w-[60%]">{program['Class Requirement'] || '-'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Personnel */}
                            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                                <h4 className="text-sm font-bold text-gray-900 border-b pb-3 mb-4 flex items-center">
                                    <Users className="w-4 h-4 mr-2 text-orange-600" />
                                    Personnel
                                </h4>
                                {renderPersonnelSection('Head of Program', program.Head)}
                                {renderPersonnelSection('Associate Head', program['Associate Head'])}
                                {renderPersonnelSection('Administration', program.Administration)}
                                {!program.Head && !program['Associate Head'] && !program.Administration && (
                                    <div className="text-center text-xs text-gray-400 italic py-2">No personnel assigned</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};