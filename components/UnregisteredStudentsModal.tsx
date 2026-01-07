import React, { useState, useRef, useEffect, useMemo } from 'react';
import { X, Copy, Check, Users, GripHorizontal, Download, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, UserCheck, UserX, UserMinus, PowerOff, Clock, Calculator, ShieldCheck, GraduationCap, Target, AlertCircle, MessageSquare, Search, FilterX } from 'lucide-react';
import { StudentDataRow } from '../types';
import { useResponsivePagination } from '../hooks/useResponsivePagination';
import { useSheetData } from '../hooks/useSheetData';

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
    listType?: 'all' | 'registered' | 'unregistered' | 'pdrop' | 'tdrop' | 'dropout' | 'crcom' | 'defense' | 'regPending' | 'followupTarget' | 'followup';
}

const FIELD_SEP = ' ;; ';
const RECORD_SEP = ' || ';

export const UnregisteredStudentsModal: React.FC<UnregisteredStudentsModalProps> = ({
    isOpen, onClose, semester, programName, programId, targetSemester, students, showProgramColumn = false, programMap, registrationLookup, isInline = false, onRowClick, listType = 'unregistered'
}) => {
    const { studentFollowupData } = useSheetData();
    const [copySuccess, setCopySuccess] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
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

    // Sorting Logic: Sort by Latest Contact Date in Remarks
    const sortedStudents = useMemo(() => {
        if (!filteredStudentsBySearch || filteredStudentsBySearch.length === 0) return [];
        
        return [...filteredStudentsBySearch].sort((a, b) => {
            const getLatestDate = (s: StudentDataRow) => {
                const raw = s['Discussion Remark'];
                if (!raw || raw.trim() === '') return 0;
                
                const remarks = raw.split(RECORD_SEP).filter(Boolean);
                let latest = 0;
                
                remarks.forEach(r => {
                    const fields = r.split(FIELD_SEP);
                    const dateStr = fields[0]?.trim();
                    if (dateStr) {
                        const d = new Date(dateStr).getTime();
                        if (!isNaN(d) && d > latest) {
                            latest = d;
                        }
                    }
                });
                return latest;
            };

            const dateA = getLatestDate(a);
            const dateB = getLatestDate(b);

            // Sort Descending (Newest date first)
            if (dateA !== dateB) {
                return dateB - dateA;
            }

            // Fallback to ID sorting if dates are same
            return String(a['Student ID']).localeCompare(String(b['Student ID']));
        });
    }, [filteredStudentsBySearch]);

    // Responsive Pagination using sorted data
    const { currentPage, setCurrentPage, rowsPerPage, totalPages, paginatedData, containerRef } = useResponsivePagination<StudentDataRow>(sortedStudents);

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
        const rows = sortedStudents.map(s => {
            const regSems = getRegisteredSemesters(s['Student ID']);
            const basic = `${s['Student ID']}\t${s['Student Name']}\t${s.Mobile}\t${s.Email}\t${regSems}`;
            return showProgramColumn ? `${getProgramLabel(s.PID)}\t${basic}` : basic;
        }).join('\n');
        navigator.clipboard.writeText(`${header}\n${rows}`);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    };

    const handleDownload = () => {
        const exportData = sortedStudents.map(s => {
            const row: any = {};
            if (showProgramColumn) row['Program'] = getProgramLabel(s.PID);
            row['Student ID'] = s['Student ID']; row['Student Name'] = s['Student Name'];
            row['Mobile'] = s.Mobile; row['Email'] = s.Email;
            row['Registered In'] = getRegisteredSemesters(s['Student ID']);
            return row;
        });
        const worksheet = (window as any).XLSX.utils.json_to_sheet(exportData);
        const workbook = (window as any).XLSX.utils.book_new();
        const sheetNameStr = listType === 'registered' ? "Registered Students" : (listType === 'pdrop' ? "Permanent Dropout" : (listType === 'tdrop' ? "Temporary Dropout" : (listType === 'crcom' ? "Credit Completed Students" : (listType === 'defense' ? "Defense Registration" : (listType === 'regPending' ? "Reg. Pending Students" : "Unregistered Students")))));
        (window as any).XLSX.utils.book_append_sheet(workbook, worksheet, sheetNameStr);
        (window as any).XLSX.writeFile(workbook, `${sheetNameStr}_${semester}_${programName.replace(/\s+/g, '_')}.xlsx`);
    };

    if (!isOpen) return null;

    const containerStyle: React.CSSProperties = isInline 
        ? { position: 'relative', width: '100%', height: '100%' }
        : { transform: `translate3d(${position.x}px, ${position.y}px, 0)`, top: 0, left: 0, position: 'fixed', zIndex: 100, width: window.innerWidth < 768 ? '95vw' : '950px', maxHeight: '80vh' };

    const containerClasses = isInline 
        ? "flex flex-col bg-white overflow-hidden h-full"
        : "flex flex-col bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden animate-in zoom-in-95 duration-200";

    const isReg = listType === 'registered';
    const isPDrop = listType === 'pdrop' || (listType === 'dropout' && students.some(s => s['Dropout Classification']?.includes('Permanent')));
    const isTDrop = listType === 'tdrop' || (listType === 'dropout' && students.some(s => s['Dropout Classification']?.includes('Temporary')));
    const isCrCom = listType === 'crcom';
    const isDefense = listType === 'defense';
    const isRegPending = listType === 'regPending';
    const isFollowup = listType === 'followup';
    const isAll = listType === 'all';
    
    const HeaderIcon = isReg ? UserCheck : (isPDrop ? PowerOff : (isTDrop ? Clock : (isCrCom ? GraduationCap : (isDefense ? ShieldCheck : (isRegPending ? AlertCircle : (isFollowup ? MessageSquare : (isAll ? Users : UserX)))))));
    const accentColor = isReg ? 'text-emerald-600' : (isPDrop ? 'text-rose-700' : (isTDrop ? 'text-amber-600' : (isCrCom ? 'text-emerald-600' : (isDefense ? 'text-teal-600' : (isRegPending ? 'text-amber-600' : (isFollowup ? 'text-pink-600' : (isAll ? 'text-blue-600' : 'text-red-600')))))));
    const bgAccent = isReg ? 'bg-emerald-50' : (isPDrop ? 'bg-rose-50' : (isTDrop ? 'bg-amber-50' : (isCrCom ? 'bg-emerald-50' : (isDefense ? 'bg-teal-50' : (isRegPending ? 'bg-amber-50' : (isFollowup ? 'bg-pink-50' : (isAll ? 'bg-blue-50' : 'bg-red-50')))))));
    const borderAccent = isReg ? 'border-emerald-100' : (isPDrop ? 'border-rose-100' : (isTDrop ? 'border-amber-100' : (isCrCom ? 'border-emerald-100' : (isDefense ? 'border-teal-100' : (isRegPending ? 'border-amber-100' : (isFollowup ? 'border-pink-100' : (isAll ? 'border-blue-100' : 'border-red-100')))))));
    
    const titleLabel = isReg ? 'Registered List' : (isPDrop ? 'Permanent Dropout List' : (isTDrop ? 'Temporary Dropout List' : (isCrCom ? 'Credit Completed List' : (isDefense ? 'Defense Registration' : (isRegPending ? 'Reg. Pending List' : (isFollowup ? 'Follow-up List' : (isAll ? 'Enrolled Students' : 'Unregistered List')))))));

    return (
        <div ref={modalRef} style={containerStyle} className={containerClasses}>
            <div 
                onMouseDown={handleMouseDown}
                className={`px-3 py-1.5 border-b border-gray-200 flex items-center justify-between bg-slate-50 shrink-0 select-none h-[40px] gap-4 ${!isInline ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : ''}`}
            >
                {/* Left: Title */}
                <div className="flex items-center space-x-2 pointer-events-none shrink-0 min-w-0 max-w-[180px]">
                    {!isInline && <GripHorizontal className="w-4 h-4 text-gray-400 shrink-0" />}
                    <h3 className="text-[10px] font-bold text-gray-800 flex items-center uppercase tracking-wider truncate">
                        <HeaderIcon className={`w-3.5 h-3.5 mr-1.5 shrink-0 ${accentColor}`} />
                        {titleLabel}
                    </h3>
                </div>

                {/* Center: Search Bar */}
                <div className="flex-1 flex justify-center max-w-md" onMouseDown={(e) => e.stopPropagation()}>
                    <div className="relative w-full max-w-[260px] group">
                        <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                        <input 
                            type="text"
                            placeholder="Search by name or ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-7 pr-7 py-1 bg-white border border-gray-200 focus:border-blue-500 rounded text-[10px] outline-none transition-all font-medium h-7 shadow-sm"
                        />
                        {searchTerm && (
                            <button 
                                onClick={() => setSearchTerm('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"
                            >
                                <X className="w-2.5 h-2.5" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center space-x-1.5 shrink-0" onMouseDown={(e) => e.stopPropagation()}>
                    <span className={`text-[9px] font-bold ${bgAccent} ${accentColor} px-1.5 py-0.5 rounded border ${borderAccent} mr-1`}>{sortedStudents.length}</span>
                    <button onClick={handleDownload} className="p-1 text-gray-400 hover:text-green-600 transition-colors" title="Download Excel"><Download className="w-3.5 h-3.5" /></button>
                    <button onClick={handleCopy} className="p-1 text-gray-400 hover:text-blue-600 transition-colors" title="Copy to Clipboard">{copySuccess ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}</button>
                    {!isInline && <button onClick={onClose} className="p-1 hover:bg-red-50 hover:text-red-600 rounded text-gray-400 transition-colors"><X className="w-4 h-4" /></button>}
                </div>
            </div>

            <div className="flex-1 overflow-auto p-0 thin-scrollbar bg-white relative" ref={containerRef}>
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-700 sticky top-0 z-10 shadow-sm border-b border-gray-200">
                        <tr>
                            <th className="px-2 py-1.5 text-[10px] font-bold text-white w-8 text-center uppercase tracking-wider">Sl</th>
                            <th className="px-2 py-1.5 text-[10px] font-bold text-white uppercase tracking-wider">Student ID</th>
                            <th className="px-2 py-1.5 text-[10px] font-bold text-white uppercase tracking-wider">Student Name</th>
                            {!isInline && (
                                <>
                                    <th className="px-2 py-1.5 text-[10px] font-bold text-white uppercase tracking-wider">Mobile</th>
                                    <th className="px-2 py-1.5 text-[10px] font-bold text-white uppercase tracking-wider">Email</th>
                                    <th className="px-2 py-1.5 text-[10px] font-bold text-white uppercase tracking-wider w-48">Registered In</th>
                                </>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {paginatedData.map((student, idx) => {
                            const registeredIn = getRegisteredSemesters(student['Student ID']);
                            const globalIdx = (currentPage - 1) * rowsPerPage + idx + 1;
                            const isSelected = selectedId === student['Student ID'];
                            const hoverBg = isReg ? 'hover:bg-emerald-50/40' : (isPDrop ? 'hover:bg-rose-50/40' : (isTDrop ? 'hover:bg-amber-50/40' : (isCrCom ? 'hover:bg-emerald-50/40' : (isDefense ? 'hover:bg-teal-50/40' : (isRegPending ? 'hover:bg-amber-50/40' : 'hover:bg-red-50/40')))));
                            
                            const followupCount = (student['Discussion Remark'] || '').split(' || ').filter(Boolean).length;

                            return (
                                <tr 
                                    key={idx} 
                                    onClick={() => {
                                        setSelectedId(student['Student ID']);
                                        if (onRowClick) onRowClick(student);
                                    }}
                                    className={`transition-all text-[11px] h-[28px] cursor-pointer relative z-0 ${
                                        isSelected 
                                        ? 'bg-blue-100 ring-1 ring-blue-300 ring-inset shadow-[inset_0_0_0_1px_rgba(59,130,246,0.2)] z-10' 
                                        : (onRowClick ? 'hover:bg-blue-50/60' : hoverBg)
                                    }`}
                                >
                                    <td className={`px-2 py-1 text-center font-medium ${isSelected ? 'text-blue-700' : 'text-gray-400'}`}>{globalIdx}</td>
                                    <td className={`px-2 py-1 font-bold font-mono flex items-center space-x-1.5 ${isSelected ? 'text-blue-800' : 'text-blue-600'}`}>
                                        <span>{student['Student ID']}</span>
                                        {followupCount > 0 && (
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-pink-100 text-pink-700 text-[8px] font-black border border-pink-200 shadow-sm leading-none shrink-0" title={`Has ${followupCount} follow-up(s)`}>
                                                <MessageSquare className="w-2.5 h-2.5 mr-0.5" />
                                                {followupCount}
                                            </span>
                                        )}
                                    </td>
                                    <td className={`px-2 py-1 font-medium truncate max-w-[150px] ${isSelected ? 'text-blue-900' : 'text-gray-700'}`} title={student['Student Name']}>{student['Student Name']}</td>
                                    {!isInline && (
                                        <>
                                            <td className="px-2 py-1 text-gray-600 font-mono">{student.Mobile}</td>
                                            <td className="px-2 py-1 text-gray-500 truncate max-w-[150px]" title={student.Email}>{student.Email}</td>
                                            <td className="px-2 py-1 text-blue-600 font-medium truncate" title={registeredIn}>{registeredIn}</td>
                                        </>
                                    )}
                                </tr>
                            );
                        })}
                        {sortedStudents.length === 0 && (
                            <tr>
                                <td colSpan={isInline ? 3 : 6} className="py-12 text-center text-gray-400 italic text-[11px]">
                                    <div className="flex flex-col items-center">
                                        <FilterX className="w-8 h-8 mb-2 opacity-20" />
                                        <span>No students match "{searchTerm}"</span>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="px-3 py-1 bg-gray-50 border-t border-gray-200 text-[9px] text-gray-500 flex justify-between items-center shrink-0 select-none h-[32px]">
                <div className="flex items-center space-x-2">
                    {!isInline && <span>Target Check: <span className="font-medium text-gray-600">{targetSemester}</span></span>}
                    <div className="flex items-center space-x-1">
                        <span className="font-bold">{sortedStudents.length > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0}-{Math.min(currentPage * rowsPerPage, sortedStudents.length)}</span>
                        <span>of</span>
                        <span className="font-bold">{sortedStudents.length}</span>
                    </div>
                </div>
                <div className="flex items-center space-x-1">
                    <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="p-0.5 hover:bg-white rounded transition-colors disabled:opacity-30"><ChevronsLeft className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-0.5 hover:bg-white rounded transition-colors disabled:opacity-30"><ChevronLeft className="w-3.5 h-3.5" /></button>
                    <span className="min-w-[15px] text-center font-black">{currentPage}</span>
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="p-0.5 hover:bg-white rounded transition-colors disabled:opacity-30"><ChevronRight className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages || totalPages === 0} className="p-0.5 hover:bg-white rounded transition-colors disabled:opacity-30"><ChevronsRight className="w-3.5 h-3.5" /></button>
                </div>
            </div>
        </div>
    );
};
