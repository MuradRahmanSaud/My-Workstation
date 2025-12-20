import React, { useState, useRef, useEffect } from 'react';
import { X, Copy, Check, Users, GripHorizontal, Download, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';
import { StudentDataRow } from '../types';
import { useResponsivePagination } from '../hooks/useResponsivePagination';

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
    onStudentClick?: (student: StudentDataRow) => void;
}

export const UnregisteredStudentsModal: React.FC<UnregisteredStudentsModalProps> = ({
    isOpen, onClose, semester, programName, programId, targetSemester, students, showProgramColumn = false, programMap, registrationLookup, isInline = false, onStudentClick
}) => {
    const [copySuccess, setCopySuccess] = useState(false);
    
    // Draggable State (Only for non-inline mode)
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const initialPos = useRef({ x: 0, y: 0 });
    const modalRef = useRef<HTMLDivElement>(null);
    const [hasInitialized, setHasInitialized] = useState(false);

    // Responsive Pagination
    const { 
        currentPage, 
        setCurrentPage, 
        rowsPerPage, 
        totalPages, 
        paginatedData, 
        containerRef 
    } = useResponsivePagination(students, { 
        defaultRows: isInline ? 10 : 15,
        enableAutoResize: true 
    });

    // Reset page when students change
    useEffect(() => {
        setCurrentPage(1);
    }, [students, setCurrentPage]);

    // Initialize position to center on first open (Only for non-inline mode)
    useEffect(() => {
        if (isOpen && !hasInitialized && !isInline) {
            const width = Math.min(950, window.innerWidth - 40); 
            const height = Math.min(600, window.innerHeight - 40);
            const x = (window.innerWidth - width) / 2;
            const y = (window.innerHeight - height) / 2;
            setPosition({ x: Math.max(0, x), y: Math.max(0, y) });
            setHasInitialized(true);
        }
    }, [isOpen, hasInitialized, isInline]);

    // Drag Event Listeners (Only for non-inline mode)
    useEffect(() => {
        if (isInline) return;

        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;
            e.preventDefault(); 
            const dx = e.clientX - dragStart.current.x;
            const dy = e.clientY - dragStart.current.y;
            setPosition({ 
                x: initialPos.current.x + dx, 
                y: initialPos.current.y + dy 
            });
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

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

    if (!isOpen) return null;

    const getProgramLabel = (pid: string) => {
        if (!programMap) return pid;
        const normalize = (id: string) => String(id || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        const name = programMap.get(normalize(pid));
        return name ? `${pid} ${name}` : pid;
    };

    const getRegisteredSemesters = (id: string) => {
        if (!registrationLookup) return '-';
        const set = registrationLookup.get(String(id).trim());
        if (!set || set.size === 0) return '-';
        return Array.from(set).sort().join(', ');
    };

    const handleCopy = () => {
        let header = "Student ID\tName\tMobile\tEmail\tRegistered In";
        if (showProgramColumn) header = "Program\t" + header;
        const rows = students.map(s => {
            const regSems = getRegisteredSemesters(s['Student ID']);
            const basic = `${s['Student ID']}\t${s['Student Name']}\t${s.Mobile}\t${s.Email}\t${regSems}`;
            return showProgramColumn ? `${getProgramLabel(s.PID)}\t${basic}` : basic;
        }).join('\n');
        navigator.clipboard.writeText(`${header}\n${rows}`);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    };

    const handleDownload = () => {
        const exportData = students.map(s => {
            const row: any = {};
            if (showProgramColumn) row['Program'] = getProgramLabel(s.PID);
            row['Student ID'] = s['Student ID'];
            row['Student Name'] = s['Student Name'];
            row['Mobile'] = s.Mobile;
            row['Email'] = s.Email;
            row['Registered In'] = getRegisteredSemesters(s['Student ID']);
            return row;
        });
        const worksheet = (window as any).XLSX.utils.json_to_sheet(exportData);
        const workbook = (window as any).XLSX.utils.book_new();
        (window as any).XLSX.utils.book_append_sheet(workbook, worksheet, "Unregistered Students");
        (window as any).XLSX.writeFile(workbook, `Unregistered_${semester}_${programName.replace(/\s+/g, '_')}.xlsx`);
    };

    const containerStyle: React.CSSProperties = isInline 
        ? { position: 'relative', width: '100%', flex: 1, display: 'flex', flexDirection: 'column', minHeight: '300px' }
        : { 
            transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
            top: 0,
            left: 0,
            position: 'fixed',
            zIndex: 100,
            width: window.innerWidth < 768 ? '95vw' : '950px',
            height: '80vh',
            display: 'flex',
            flexDirection: 'column'
        };

    const containerClasses = `bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden animate-in ${isInline ? 'fade-in slide-in-from-top-1' : 'zoom-in-95'} duration-200`;

    return (
        <div ref={modalRef} style={containerStyle} className={containerClasses}>
            {/* Header */}
            <div 
                onMouseDown={handleMouseDown}
                className={`px-4 py-2.5 border-b border-gray-200 flex justify-between items-center bg-gray-50 shrink-0 select-none ${!isInline ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : ''}`}
            >
                <div className="flex items-center space-x-2 pointer-events-none">
                    {!isInline && <GripHorizontal className="w-4 h-4 text-gray-400" />}
                    <div>
                        <h3 className="text-xs font-bold text-gray-700 flex items-center uppercase tracking-tight">
                            <Users className="w-3.5 h-3.5 mr-2 text-red-600" />
                            Unregistered List
                        </h3>
                        <p className="text-[9px] text-gray-400 leading-tight uppercase tracking-widest font-bold">
                            {semester === 'ALL' ? 'Cumulative' : `${semester}`}
                        </p>
                    </div>
                </div>
                <div className="flex items-center space-x-1.5" onMouseDown={(e) => e.stopPropagation()}>
                    <span className="text-[10px] font-black bg-red-100 text-red-600 px-2 py-0.5 rounded-full border border-red-200 mr-1 shadow-sm">
                        {students.length}
                    </span>
                    <button onClick={handleDownload} className="p-1.5 text-gray-400 hover:text-green-600 transition-colors hover:bg-gray-100 rounded-full" title="Download Excel"><Download className="w-3.5 h-3.5" /></button>
                    <button onClick={handleCopy} className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors hover:bg-gray-100 rounded-full" title="Copy list">{copySuccess ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}</button>
                    {!isInline && <button onClick={onClose} className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded-full text-gray-400 transition-colors"><X className="w-4 h-4" /></button>}
                </div>
            </div>

            {/* Table Area */}
            <div className="flex-1 overflow-hidden relative bg-white" ref={containerRef}>
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm border-b border-slate-200">
                        <tr>
                            <th className="px-4 py-1.5 text-[10px] font-bold text-slate-500 w-8 text-center bg-slate-50 uppercase tracking-widest border-r border-slate-100">SL</th>
                            <th className="px-4 py-1.5 text-[10px] font-bold text-slate-500 bg-slate-50 uppercase tracking-widest border-r border-slate-100">Student ID</th>
                            <th className="px-4 py-1.5 text-[10px] font-bold text-slate-500 bg-slate-50 uppercase tracking-widest border-r border-slate-100">Student Name</th>
                            {!isInline && (
                                <>
                                    <th className="px-4 py-1.5 text-[10px] font-bold text-slate-500 bg-slate-50 uppercase tracking-widest border-r border-slate-100">Mobile</th>
                                    <th className="px-4 py-1.5 text-[10px] font-bold text-slate-500 bg-slate-50 uppercase tracking-widest">Email</th>
                                </>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {paginatedData.map((student, idx) => {
                            const actualIdx = (currentPage - 1) * rowsPerPage + idx;
                            return (
                                <tr 
                                    key={actualIdx} 
                                    onClick={() => onStudentClick?.(student)}
                                    className={`transition-colors text-[11px] h-[28px] ${onStudentClick ? 'cursor-pointer hover:bg-blue-50/50' : 'hover:bg-red-50/30'}`}
                                >
                                    <td className="px-4 py-1 text-center text-gray-400 border-r border-gray-50">{actualIdx + 1}</td>
                                    <td className="px-4 py-1 font-bold text-slate-700 font-mono border-r border-gray-50">{student['Student ID']}</td>
                                    <td className="px-4 py-1 text-slate-800 font-medium border-r border-gray-50">{student['Student Name']}</td>
                                    {!isInline && (
                                        <>
                                            <td className="px-4 py-1 text-gray-600 font-mono border-r border-gray-50">{student.Mobile}</td>
                                            <td className="px-4 py-1 text-gray-500 truncate max-w-[150px]" title={student.Email}>{student.Email}</td>
                                        </>
                                    )}
                                </tr>
                            );
                        })}
                        {students.length === 0 && (
                            <tr><td colSpan={isInline ? 3 : 5} className="px-4 py-10 text-center text-gray-400 italic text-xs">No records found</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
            
            {/* Pagination Footer */}
            <div className="px-3 py-1.5 bg-gray-50 border-t border-gray-200 text-[9px] text-gray-400 flex justify-between items-center shrink-0 select-none uppercase font-bold tracking-widest">
                <div className="flex items-center space-x-2">
                    <span>{students.length > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0}-{Math.min(currentPage * rowsPerPage, students.length)} of {students.length}</span>
                </div>
                
                <div className="flex items-center space-x-1">
                    <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="p-1 hover:bg-white rounded disabled:opacity-30 transition-all"><ChevronsLeft className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1 hover:bg-white rounded disabled:opacity-30 transition-all"><ChevronLeft className="w-3.5 h-3.5" /></button>
                    <span className="min-w-[20px] text-center text-gray-700 font-black">{currentPage} / {totalPages || 1}</span>
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="p-1 hover:bg-white rounded disabled:opacity-30 transition-all"><ChevronRight className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages || totalPages === 0} className="p-1 hover:bg-white rounded disabled:opacity-30 transition-all"><ChevronsRight className="w-3.5 h-3.5" /></button>
                </div>
            </div>
        </div>
    );
};
