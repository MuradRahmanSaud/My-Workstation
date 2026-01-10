
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { X, Copy, Check, Users, GripHorizontal, Download, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, UserCheck, UserX, UserMinus, PowerOff, Clock, Calculator, ShieldCheck, GraduationCap, Target, AlertCircle, MessageSquare, Search, FilterX, CheckCircle2, XCircle, Phone } from 'lucide-react';
import { StudentDataRow } from '../types';
import { useResponsivePagination } from '../hooks/useResponsivePagination';
import { useSheetData } from '../hooks/useSheetData';
import { normalizeId, normalizeSemesterString } from '../services/sheetService';

interface UnregisteredStudentsModalProps {
    isOpen: boolean;
    onClose: () => void;
    semester: string;
    programName: string;
    programId: string;
    targetSemester: string;
    students: StudentDataRow[];
    showProgramColumn?: boolean;
    programMap?: Map<string, string>;
    registrationLookup?: Map<string, Set<string>>;
    isInline?: boolean; 
    onRowClick?: (student: StudentDataRow) => void;
    listType?: 'all' | 'registered' | 'unregistered' | 'pdrop' | 'tdrop' | 'dropout' | 'crcom' | 'defense' | 'regPending' | 'followupTarget' | 'followup' | 'dues';
}

export const UnregisteredStudentsModal: React.FC<UnregisteredStudentsModalProps> = ({
    isOpen, onClose, semester, programName, programId, targetSemester, students, showProgramColumn = false, programMap, registrationLookup, isInline = false, onRowClick, listType = 'unregistered'
}) => {
    const [copySuccess, setCopySuccess] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Draggable State (Only for non-inline mode)
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const initialPos = useRef({ x: 0, y: 0 });
    const modalRef = useRef<HTMLDivElement>(null);
    const [hasInitialized, setHasInitialized] = useState(false);

    // Filtered Students based on Search Term
    const filteredStudentsBySearch = useMemo(() => {
        if (!searchTerm.trim()) return students;
        const lower = searchTerm.toLowerCase();
        return students.filter(s => 
            String(s['Student Name'] || '').toLowerCase().includes(lower) ||
            String(s['Student ID'] || '').toLowerCase().includes(lower)
        );
    }, [students, searchTerm]);

    // Sorting Logic: Student ID Ascending
    const sortedStudents = useMemo(() => {
        if (!filteredStudentsBySearch || filteredStudentsBySearch.length === 0) return [];
        return [...filteredStudentsBySearch].sort((a, b) => {
            return String(a['Student ID']).localeCompare(String(b['Student ID']));
        });
    }, [filteredStudentsBySearch]);

    const { currentPage, setCurrentPage, rowsPerPage, totalPages, paginatedData, containerRef } = useResponsivePagination<StudentDataRow>(sortedStudents);

    useEffect(() => {
        if (isOpen && !hasInitialized && !isInline) {
            const width = Math.min(950, window.innerWidth - 40); 
            const x = (window.innerWidth - width) / 2;
            const y = 80;
            setPosition({ x: Math.max(0, x), y });
            setHasInitialized(true);
        }
    }, [isOpen, hasInitialized, isInline]);

    useEffect(() => {
        if (isInline) return;
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;
            e.preventDefault(); 
            const dx = e.clientX - dragStart.current.x;
            const dy = e.clientY - dragStart.current.y;
            setPosition({ x: initialPos.current.x + dx, y: initialPos.current.y + dy });
        };
        const handleMouseUp = () => setIsDragging(false);
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, isInline]);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (isInline) return;
        dragStart.current = { x: e.clientX, y: e.clientY };
        initialPos.current = { x: position.x, y: position.y };
        setIsDragging(true);
    };

    const checkIsRegisteredInTarget = (studentId: string) => {
        if (!registrationLookup || !targetSemester) return false;
        const id = normalizeId(studentId);
        const registeredFor = registrationLookup.get(id);
        if (!registeredFor) return false;

        const targetNorm = normalizeSemesterString(targetSemester);
        return registeredFor.has(targetNorm);
    };

    const handleCopy = () => {
        let header = `Student ID\tName\tMobile\tStatus (${targetSemester})`;
        const rows = sortedStudents.map(s => {
            const isReg = checkIsRegisteredInTarget(s['Student ID']);
            return `${s['Student ID']}\t${s['Student Name']}\t${s.Mobile || '-'}\t${isReg ? 'Registered' : 'Not Registered'}`;
        }).join('\n');
        navigator.clipboard.writeText(`${header}\n${rows}`);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    };

    if (!isOpen) return null;

    const containerStyle: React.CSSProperties = isInline 
        ? { position: 'relative', width: '100%', height: '100%' }
        : { transform: `translate3d(${position.x}px, ${position.y}px, 0)`, top: 0, left: 0, position: 'fixed', zIndex: 200, width: window.innerWidth < 768 ? '95vw' : '900px', maxHeight: '85vh' };

    const containerClasses = isInline 
        ? "flex flex-col bg-white overflow-hidden h-full border-t border-gray-100"
        : "flex flex-col bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200";

    const isAllList = listType === 'all';
    
    return (
        <div ref={modalRef} style={containerStyle} className={containerClasses}>
            {!isInline && (
                <div className="absolute inset-0 -z-10 bg-slate-900/10 backdrop-blur-[2px] pointer-events-none fixed" style={{ width: '100vw', height: '100vh', left: -position.x, top: -position.y }}></div>
            )}
            
            {/* Modal Header */}
            <div 
                onMouseDown={handleMouseDown}
                className={`px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-slate-50 shrink-0 select-none h-[54px] gap-4 ${!isInline ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : ''}`}
            >
                <div className="flex items-center space-x-2 pointer-events-none shrink-0 min-w-0">
                    {!isInline && <GripHorizontal className="w-4 h-4 text-slate-400 shrink-0" />}
                    <div className="flex flex-col min-w-0">
                        <h3 className="text-[11px] font-black text-slate-800 flex items-center uppercase tracking-wider truncate">
                            <Users className="w-4 h-4 mr-2 text-blue-600 shrink-0" />
                            {isAllList ? 'Admission Registry' : 'Category List'}
                        </h3>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter truncate">Program: {programName}</p>
                    </div>
                </div>

                <div className="flex-1 flex justify-center max-w-sm" onMouseDown={(e) => e.stopPropagation()}>
                    <div className="relative w-full group">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        <input 
                            type="text"
                            placeholder="Search by ID or Name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-1.5 bg-white border border-slate-200 focus:border-blue-500 rounded-full text-[11px] outline-none transition-all font-bold h-9 shadow-sm"
                        />
                    </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0" onMouseDown={(e) => e.stopPropagation()}>
                    <div className="hidden md:flex flex-col items-end mr-2">
                        <span className="text-[8px] font-black text-slate-400 uppercase leading-none">Total Students</span>
                        <span className="text-[12px] font-black text-blue-600 leading-none">{sortedStudents.length}</span>
                    </div>
                    <button onClick={handleCopy} className="p-2 text-slate-500 hover:text-blue-600 transition-colors bg-white rounded-lg border border-slate-200 shadow-sm" title="Copy Table to Excel">{copySuccess ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}</button>
                    {!isInline && <button onClick={onClose} className="p-2 hover:bg-rose-50 hover:text-rose-600 rounded-lg text-slate-400 transition-all"><X className="w-5 h-5" /></button>}
                </div>
            </div>

            {/* Table Content */}
            <div className="flex-1 overflow-auto p-0 thin-scrollbar bg-white relative" ref={containerRef}>
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-800 sticky top-0 z-10 shadow-sm">
                        <tr>
                            <th className="px-4 py-2.5 text-[10px] font-black text-white w-12 text-center uppercase tracking-widest border-r border-slate-700">Sl</th>
                            <th className="px-4 py-2.5 text-[10px] font-black text-white uppercase tracking-widest w-36 border-r border-slate-700 text-center">Student ID</th>
                            <th className="px-4 py-2.5 text-[10px] font-black text-white uppercase tracking-widest border-r border-slate-700">Student Name</th>
                            {!isInline && (
                                <>
                                    <th className="px-4 py-2.5 text-[10px] font-black text-white uppercase tracking-widest w-36 border-r border-slate-700">Mobile</th>
                                    <th className="px-4 py-2.5 text-[10px] font-black text-white uppercase tracking-widest text-center w-48 bg-slate-900">
                                        <div className="flex flex-col items-center">
                                            <span className="text-blue-400">Reg. Status</span>
                                            <span className="text-[8px] opacity-60 font-bold tracking-normal">{targetSemester}</span>
                                        </div>
                                    </th>
                                </>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {paginatedData.map((student, idx) => {
                            const isRegistered = checkIsRegisteredInTarget(student['Student ID']);
                            const globalIdx = (currentPage - 1) * rowsPerPage + idx + 1;
                            
                            return (
                                <tr 
                                    key={student['Student ID'] || idx} 
                                    onClick={() => onRowClick && onRowClick(student)}
                                    className="transition-all text-[11px] h-[36px] hover:bg-blue-50/40 cursor-pointer group"
                                >
                                    <td className="px-4 py-1.5 text-center font-bold text-slate-400 border-r border-slate-50">{globalIdx}</td>
                                    <td className="px-4 py-1.5 font-black text-blue-600 font-mono tracking-tighter border-r border-slate-50 text-center">{student['Student ID']}</td>
                                    <td className="px-4 py-1.5 font-bold text-slate-800 truncate" title={student['Student Name']}>{student['Student Name']}</td>
                                    {!isInline && (
                                        <>
                                            <td className="px-4 py-1.5 text-slate-600 font-mono font-bold tracking-tighter border-r border-slate-50">
                                                <div className="flex items-center">
                                                    <Phone className="w-2.5 h-2.5 mr-1.5 text-slate-300" />
                                                    {student.Mobile || '-'}
                                                </div>
                                            </td>
                                            <td className="px-4 py-1.5 text-center bg-slate-50/30">
                                                {isRegistered ? (
                                                    <div className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 font-black text-[9px] uppercase tracking-tighter shadow-sm">
                                                        <CheckCircle2 className="w-3 h-3 mr-1" />
                                                        Registered
                                                    </div>
                                                ) : (
                                                    <div className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200 font-black text-[9px] uppercase tracking-tighter shadow-sm">
                                                        <XCircle className="w-3 h-3 mr-1" />
                                                        Not Registered
                                                    </div>
                                                )}
                                            </td>
                                        </>
                                    )}
                                </tr>
                            );
                        })}
                        {sortedStudents.length === 0 && (
                            <tr>
                                <td colSpan={isInline ? 3 : 5} className="py-24 text-center">
                                    <div className="flex flex-col items-center opacity-20">
                                        <FilterX className="w-12 h-12 mb-3 text-slate-400" />
                                        <span className="font-black uppercase tracking-[0.2em] text-slate-600">No Student Records Found</span>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Footer */}
            <div className="px-4 py-2 bg-slate-50 border-t border-gray-200 text-[10px] text-slate-500 flex justify-between items-center shrink-0 select-none h-[42px]">
                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1.5">
                        <div className="w-2 h-2 rounded-full bg-blue-500 shadow-sm"></div>
                        <span className="font-bold uppercase tracking-tight">Records: <span className="text-slate-900 font-black">{sortedStudents.length}</span></span>
                    </div>
                    <div className="h-3 w-px bg-slate-300"></div>
                    <div className="flex items-center space-x-1.5">
                        <Target className="w-3 h-3 text-indigo-500" />
                        <span className="font-bold uppercase tracking-tight">Checking: <span className="text-indigo-700 font-black">{targetSemester}</span></span>
                    </div>
                </div>
                
                <div className="flex items-center space-x-1.5">
                    <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="p-1.5 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg transition-all disabled:opacity-30"><ChevronsLeft className="w-4 h-4" /></button>
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg transition-all disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                    <div className="flex items-center space-x-1 px-3 py-1 bg-white border border-slate-200 rounded-lg shadow-sm font-black text-slate-700">
                        <span>{currentPage}</span>
                        <span className="text-slate-300">/</span>
                        <span>{totalPages}</span>
                    </div>
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="p-1.5 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg transition-all disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
                    <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages || totalPages === 0} className="p-1.5 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg transition-all disabled:opacity-30"><ChevronsRight className="w-4 h-4" /></button>
                </div>
            </div>
        </div>
    );
};
