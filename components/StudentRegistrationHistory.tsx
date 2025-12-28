import React, { useState } from 'react';
import { History, X, ChevronRight, ChevronDown } from 'lucide-react';

const DUMMY_COURSE_DETAILS = [
    { code: 'CSE101', title: 'Introduction to Computer Science', section: 'A', gpa: '3.75', attend: '90%' },
    { code: 'CSE102', title: 'Discrete Mathematics', section: 'B', gpa: '3.50', attend: '85%' },
    { code: 'ENG101', title: 'English Composition', section: 'C1', gpa: '4.00', attend: '100%' },
    { code: 'MAT101', title: 'Calculus I', section: 'D', gpa: '3.25', attend: '80%' },
];

interface RegistrationHistoryProps {
    historyData: any[];
    onClose: () => void;
}

export const StudentRegistrationHistory: React.FC<RegistrationHistoryProps> = ({ historyData, onClose }) => {
    const [expandedSem, setExpandedSem] = useState<string | null>(null);

    return (
        <div className="bg-white rounded-xl shadow-lg border border-emerald-100 overflow-hidden flex flex-col h-full">
            <div className="px-4 py-2 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between shrink-0">
                <h4 className="text-[10px] font-black text-emerald-700 uppercase tracking-widest flex items-center">
                    <History className="w-3.5 h-3.5 mr-1.5" /> Registration History
                </h4>
                <button onClick={onClose} className="text-emerald-500 hover:text-emerald-700 p-1">
                    <X className="w-4 h-4" />
                </button>
            </div>
            <div className="flex-1 overflow-y-auto thin-scrollbar relative bg-white">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-700 sticky top-0 z-20 shadow-sm">
                        <tr>
                            <th className="px-3 py-2 text-[9px] font-black text-white uppercase border-r border-slate-600">Semester</th>
                            <th className="px-2 py-2 text-[9px] font-black text-white uppercase border-r border-slate-600 text-center">Taken</th>
                            <th className="px-2 py-2 text-[9px] font-black text-white uppercase border-r border-slate-600 text-center">Complete</th>
                            <th className="px-2 py-2 text-[9px] font-black text-white uppercase border-r border-slate-600 text-center">SGPA</th>
                            <th className="px-2 py-2 text-[9px] font-black text-white uppercase text-center">Dues</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {historyData.map(row => {
                            const isExpanded = expandedSem === row.semester;
                            return (
                                <React.Fragment key={row.semester}>
                                    <tr 
                                        onClick={() => row.isRegistered && setExpandedSem(isExpanded ? null : row.semester)} 
                                        className={`transition-colors h-[32px] ${row.isRegistered ? 'hover:bg-emerald-50/40 cursor-pointer' : 'opacity-60 bg-gray-50'}`}
                                    >
                                        <td className={`px-3 py-2 text-[11px] font-bold border-r border-slate-50 flex items-center ${row.isRegistered ? 'text-green-600' : 'text-red-500'}`}>
                                            {row.isRegistered && <ChevronRight className={`w-3 h-3 mr-1 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />}
                                            {row.semester}
                                        </td>
                                        <td className="px-2 py-2 text-[11px] text-center border-r border-slate-50 font-medium text-gray-700">{row.taken || '-'}</td>
                                        <td className="px-2 py-2 text-[11px] text-center border-r border-slate-50 font-medium text-gray-700">{row.complete || '-'}</td>
                                        <td className="px-2 py-2 text-[11px] text-center border-r border-slate-50 font-bold text-blue-600">{row.sgpa}</td>
                                        <td className={`px-2 py-2 text-[11px] text-center font-bold ${row.dues > 0 ? 'text-red-600' : 'text-green-600'}`}>{row.dues > 0 ? row.dues : '0'}</td>
                                    </tr>
                                    {isExpanded && (
                                        <tr>
                                            <td colSpan={5} className="p-0 bg-white">
                                                <div className="p-2 border-b border-emerald-100 bg-slate-50/50">
                                                    <table className="w-full text-left border-collapse bg-white rounded border border-slate-200 overflow-hidden shadow-sm text-[10px]">
                                                        <thead className="bg-slate-100 text-[9px] font-bold text-slate-500">
                                                            <tr>
                                                                <th className="px-2 py-1 border-r border-slate-200">Code</th>
                                                                <th className="px-2 py-1 border-r border-slate-200">Title</th>
                                                                <th className="px-2 py-1 border-r border-slate-200 text-center">GPA</th>
                                                                <th className="px-2 py-1 text-center">Attend</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-100">
                                                            {DUMMY_COURSE_DETAILS.map((course, cIdx) => (
                                                                <tr key={cIdx} className="hover:bg-slate-50">
                                                                    <td className="px-2 py-1 font-bold text-blue-600 border-r border-slate-100">{course.code}</td>
                                                                    <td className="px-2 py-1 text-slate-700 border-r border-slate-100 truncate max-w-[120px]">{course.title}</td>
                                                                    <td className="px-2 py-1 text-center font-black text-emerald-600 border-r border-slate-100">{course.gpa}</td>
                                                                    <td className="px-2 py-1 text-center text-slate-500">{course.attend}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                        {historyData.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-4 py-10 text-center text-[11px] text-gray-400 italic">
                                    No registration history found in the system.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};