
import React from 'react';
import { Users, User, ShieldCheck, GraduationCap } from 'lucide-react';
import { ProgramDataRow, DiuEmployeeRow } from '../types';
import { normalizeId } from '../services/sheetService';

interface ProgramRightPanelProps {
    program: ProgramDataRow;
    diuEmployeeData: DiuEmployeeRow[];
}

// Helper to resolve IDs to Employee Objects
const resolveEmployees = (idsStr: string | undefined, employeeData: DiuEmployeeRow[]) => {
    if (!idsStr) return [];
    const ids = idsStr.split(',').map(s => s.trim()).filter(Boolean);
    return ids.map(id => {
        const emp = employeeData.find(e => normalizeId(e['Employee ID']) === normalizeId(id));
        return { id, emp };
    });
};

// Helper to parse Theory/Lab values from strings like "Theory 90 Minutes, Lab 120 Minutes"
const parseMetric = (str: string | undefined) => {
    if (!str) return { theory: '-', lab: '-' };
    const theoryMatch = str.match(/Theory\s+(\d+)/i);
    const labMatch = str.match(/Lab\s+(\d+)/i);
    return {
        theory: theoryMatch ? theoryMatch[1] : '-',
        lab: labMatch ? labMatch[1] : '-'
    };
};

export const ProgramRightPanel: React.FC<ProgramRightPanelProps> = ({ program, diuEmployeeData }) => {
    const classDuration = parseMetric(program['Class Duration']);
    const classRequirement = parseMetric(program['Class Requirement']);

    const renderPersonnelSection = (title: string, idsStr: string | undefined) => {
        const list = resolveEmployees(idsStr, diuEmployeeData);
        if (list.length === 0) return null;
        return (
            <div className="mb-2.5 last:mb-0">
                <h5 className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center">
                    <User className="w-2.5 h-2.5 mr-1" />
                    {title}
                </h5>
                <div className="space-y-1">
                    {list.map(({ id, emp }, idx) => (
                        <div key={idx} className="flex items-start bg-white p-1.5 rounded border border-slate-100 shadow-sm hover:border-blue-200 transition-colors">
                            {emp ? (
                                <div className="flex-1 min-w-0">
                                    <div className="text-[11px] font-bold text-slate-800 leading-tight">{emp['Employee Name']}</div>
                                    <div className="text-[9px] text-slate-500 truncate leading-tight">{[emp['Administrative Designation'], emp['Academic Designation']].filter(Boolean).join(', ')}</div>
                                    <div className="text-[9px] text-blue-600 font-mono mt-0.5 leading-none">{id}</div>
                                </div>
                            ) : (
                                <div className="flex-1 min-w-0">
                                    <div className="text-[11px] font-bold text-slate-400">Unknown Employee</div>
                                    <div className="text-[9px] text-slate-400 font-mono">{id}</div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="w-full lg:w-[320px] xl:w-[340px] flex flex-col bg-white overflow-y-auto thin-scrollbar border-l border-slate-100 shrink-0 shadow-inner">
            {/* COMPACT & HIERARCHICAL HEADER SECTION */}
            <div className="pt-5 pb-3 border-b border-slate-100 bg-white">
                <div className="text-center px-4 space-y-1.5">
                    {/* Program Title */}
                    <h1 className="text-sm font-black text-slate-900 leading-tight uppercase tracking-tight">
                        {program['Program Full Name'] || 'Program Full Name'}
                    </h1>
                    
                    {/* Faculty Subtitle */}
                    <h2 className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                        {program['Faculty Full Name'] || 'Faculty Full Name'}
                    </h2>

                    {/* Semester Mode | Program Type */}
                    <div className="flex items-center justify-center space-x-2 text-[10px] font-bold text-slate-500 uppercase tracking-tighter pt-0.5">
                        <span>{program['Semester Type'] || '-'}</span>
                        <span className="text-slate-200">|</span>
                        <span>{program['Program Type'] || '-'}</span>
                    </div>

                    {/* Class Metrics: Duration & Requirement Headers */}
                    <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 mt-3 shadow-sm">
                        <div className="grid grid-cols-2 gap-4 divide-x divide-slate-200">
                            {/* Duration Metric */}
                            <div className="flex flex-col items-center">
                                <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1.5">Class Duration</span>
                                <div className="flex items-center space-x-2 text-[10px] font-bold text-slate-800">
                                    <div className="flex items-center">
                                        <span className="text-slate-400 font-medium mr-1 text-[9px]">T</span>
                                        {classDuration.theory}m
                                    </div>
                                    <div className="flex items-center">
                                        <span className="text-slate-400 font-medium mr-1 text-[9px]">L</span>
                                        {classDuration.lab}m
                                    </div>
                                </div>
                            </div>

                            {/* Requirement Metric */}
                            <div className="flex flex-col items-center">
                                <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1.5">Requirement</span>
                                <div className="flex items-center space-x-2 text-[10px] font-bold text-slate-800">
                                    <div className="flex items-center">
                                        <span className="text-slate-400 font-medium mr-1 text-[9px]">T</span>
                                        {classRequirement.theory}m
                                    </div>
                                    <div className="flex items-center">
                                        <span className="text-slate-400 font-medium mr-1 text-[9px]">L</span>
                                        {classRequirement.lab}m
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* LEADERSHIP SECTIONS */}
            <div className="p-3 space-y-3 bg-slate-50/20 flex-1">
                {/* Faculty Leadership */}
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-3">
                    <h4 className="text-[10px] font-bold text-slate-900 border-b border-slate-100 pb-1.5 mb-2.5 flex items-center uppercase tracking-widest">
                        <ShieldCheck className="w-3 h-3 mr-1.5 text-blue-600" />
                        Faculty Leadership
                    </h4>
                    <div className="space-y-1">
                        {renderPersonnelSection('Dean', program.Dean)}
                        {renderPersonnelSection('Associate Dean', program['Associate Dean'])}
                        {renderPersonnelSection('Administration', program['Faculty Administration'])}
                    </div>
                </div>

                {/* Program Leadership */}
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-3">
                    <h4 className="text-[10px] font-bold text-slate-900 border-b border-slate-100 pb-1.5 mb-2.5 flex items-center uppercase tracking-widest">
                        <GraduationCap className="w-3 h-3 mr-1.5 text-indigo-600" />
                        Program Leadership
                    </h4>
                    <div className="space-y-1">
                        {renderPersonnelSection('Head', program.Head)}
                        {renderPersonnelSection('Associate Head', program['Associate Head'])}
                        {renderPersonnelSection('Administration', program.Administration)}
                    </div>
                </div>
            </div>
        </div>
    );
};
