
import React, { useState, useRef, useEffect } from 'react';
import { X, Copy, Check, Users, GripHorizontal, Download } from 'lucide-react';
import { StudentDataRow } from '../types';

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
}

export const UnregisteredStudentsModal: React.FC<UnregisteredStudentsModalProps> = ({
    isOpen, onClose, semester, programName, programId, targetSemester, students, showProgramColumn = false, programMap, registrationLookup
}) => {
    const [copySuccess, setCopySuccess] = useState(false);
    
    // Draggable State
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0 }); // Mouse position at start of drag
    const initialPos = useRef({ x: 0, y: 0 }); // Element position at start of drag
    const modalRef = useRef<HTMLDivElement>(null);
    const [hasInitialized, setHasInitialized] = useState(false);

    // Initialize position to center on first open
    useEffect(() => {
        if (isOpen && !hasInitialized) {
            const width = Math.min(950, window.innerWidth - 40); 
            const height = Math.min(600, window.innerHeight - 40);
            const x = (window.innerWidth - width) / 2;
            const y = (window.innerHeight - height) / 2;
            setPosition({ x: Math.max(0, x), y: Math.max(0, y) });
            setHasInitialized(true);
        }
    }, [isOpen, hasInitialized]);

    // Drag Event Listeners
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;
            e.preventDefault(); 
            
            const dx = e.clientX - dragStart.current.x;
            const dy = e.clientY - dragStart.current.y;
            
            // Use requestAnimationFrame for smoother visual updates if needed, 
            // but direct state update with transform is usually fast enough for simple DOM.
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
    }, [isDragging]);

    const handleMouseDown = (e: React.MouseEvent) => {
        // Only start drag if clicking the header area (and not buttons inside it)
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
        // Exclude the target semester if desired, or just show all
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
            if (showProgramColumn) {
                row['Program'] = getProgramLabel(s.PID);
            }
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
        (window as any).XLSX.utils.book_append_sheet(workbook, worksheet, "Unregistered Students");
        (window as any).XLSX.writeFile(workbook, `Unregistered_${semester}_${programName.replace(/\s+/g, '_')}.xlsx`);
    };

    return (
        <div 
            ref={modalRef}
            style={{ 
                transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
                top: 0,
                left: 0,
                position: 'fixed'
            }}
            className="z-[100] w-[95vw] md:w-[950px] flex flex-col bg-white rounded-lg shadow-[0_10px_40px_rgba(0,0,0,0.3)] border border-gray-300 max-h-[80vh] overflow-hidden animate-in zoom-in-95 duration-200"
        >
            {/* Header - Drag Handle */}
            <div 
                onMouseDown={handleMouseDown}
                className={`px-4 py-3 border-b border-gray-200 flex justify-between items-center bg-gray-100 shrink-0 select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
            >
                <div className="flex items-center space-x-2 pointer-events-none">
                    <GripHorizontal className="w-5 h-5 text-gray-400" />
                    <div>
                        <h3 className="text-sm font-bold text-gray-800 flex items-center">
                            <Users className="w-4 h-4 mr-2 text-red-600" />
                            Unregistered Students
                        </h3>
                        <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">
                            <span className="font-semibold text-gray-700">{programName}</span>
                            <span className="mx-1 text-gray-400">|</span>
                            Src: {semester}
                        </p>
                    </div>
                </div>
                <div className="flex items-center space-x-2" onMouseDown={(e) => e.stopPropagation()}>
                    <span className="text-[10px] font-bold bg-red-50 text-red-600 px-2 py-1 rounded border border-red-100">
                        {students.length}
                    </span>
                    
                    <button 
                        onClick={handleDownload}
                        className="flex items-center space-x-1 px-3 py-1 text-[10px] font-bold text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50 hover:text-green-600 transition-colors shadow-sm"
                        title="Download Excel"
                    >
                        <Download className="w-3 h-3" />
                        <span>Excel</span>
                    </button>

                    <button 
                        onClick={handleCopy}
                        className="flex items-center space-x-1 px-3 py-1 text-[10px] font-bold text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50 hover:text-blue-600 transition-colors shadow-sm"
                        title="Copy list to clipboard"
                    >
                        {copySuccess ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                        <span>{copySuccess ? 'Copied' : 'Copy'}</span>
                    </button>
                    
                    <button 
                        onClick={onClose} 
                        className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded text-gray-400 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto p-0 thin-scrollbar bg-white">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm border-b border-gray-200">
                        <tr>
                            <th className="px-3 py-2 text-[10px] font-bold text-gray-600 w-8 text-center bg-gray-50">SL</th>
                            {showProgramColumn && (
                                <th className="px-3 py-2 text-[10px] font-bold text-gray-600 bg-gray-50 whitespace-nowrap">Program</th>
                            )}
                            <th className="px-3 py-2 text-[10px] font-bold text-gray-600 bg-gray-50">Student ID</th>
                            <th className="px-3 py-2 text-[10px] font-bold text-gray-600 bg-gray-50">Student Name</th>
                            <th className="px-3 py-2 text-[10px] font-bold text-gray-600 bg-gray-50">Mobile</th>
                            <th className="px-3 py-2 text-[10px] font-bold text-gray-600 bg-gray-50">Email</th>
                            <th className="px-3 py-2 text-[10px] font-bold text-gray-600 bg-gray-50 w-48">Registered In</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {students.map((student, idx) => {
                            const registeredIn = getRegisteredSemesters(student['Student ID']);
                            return (
                                <tr key={idx} className="hover:bg-red-50/50 transition-colors group">
                                    <td className="px-3 py-1.5 text-[10px] text-center text-gray-500">{idx + 1}</td>
                                    {showProgramColumn && (
                                        <td className="px-3 py-1.5 text-[10px] text-gray-700 font-medium whitespace-nowrap">
                                            {getProgramLabel(student.PID)}
                                        </td>
                                    )}
                                    <td className="px-3 py-1.5 text-[10px] font-bold text-gray-800 font-mono select-all">{student['Student ID']}</td>
                                    <td className="px-3 py-1.5 text-[10px] text-gray-700">{student['Student Name']}</td>
                                    <td className="px-3 py-1.5 text-[10px] text-gray-600 font-mono select-all">{student.Mobile}</td>
                                    <td className="px-3 py-1.5 text-[10px] text-gray-600 select-all">{student.Email}</td>
                                    <td className="px-3 py-1.5 text-[10px] text-blue-600 font-medium whitespace-normal leading-tight" title={registeredIn}>
                                        {registeredIn}
                                    </td>
                                </tr>
                            );
                        })}
                        {students.length === 0 && (
                            <tr>
                                <td colSpan={showProgramColumn ? 7 : 6} className="px-4 py-8 text-center text-xs text-gray-400">
                                    No data found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            
            {/* Footer */}
            <div className="px-3 py-1.5 bg-gray-50 border-t border-gray-200 text-[10px] text-gray-400 flex justify-between shrink-0 select-none">
                <span>Not Registered in: <span className="font-medium text-gray-600">{targetSemester}</span></span>
                <span>Drag header to move</span>
            </div>
        </div>
    );
};
