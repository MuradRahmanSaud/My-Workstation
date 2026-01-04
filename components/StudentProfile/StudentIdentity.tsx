import React from 'react';
import { User, Pencil, Plus } from 'lucide-react';
import { StudentDataRow, ProgramDataRow } from '../../types';

interface StudentIdentityProps {
    student: StudentDataRow;
    program: ProgramDataRow;
    dropInfo: { label: string; color: string } | null;
    onDropClick: () => void;
}

export const StudentIdentity: React.FC<StudentIdentityProps> = React.memo(({ 
    student, program, dropInfo, onDropClick 
}) => {
    return (
        <div className="flex items-start space-x-4">
            <div className="w-12 h-12 rounded-full border-2 border-white shadow-md flex items-center justify-center bg-blue-50 ring-1 ring-blue-100 overflow-hidden shrink-0">
                <User className="w-6 h-6 text-blue-200" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                    <h2 className="text-[15px] font-bold text-slate-900 leading-tight tracking-tight truncate">
                        {student['Student Name']}
                    </h2>
                </div>
                <div className="flex items-center mt-0.5">
                    <p className="text-[9px] font-mono font-bold text-blue-600 tracking-wider flex items-center">
                        {student['Student ID']}
                        <button 
                            onClick={onDropClick}
                            className={`ml-2 px-1 py-0.5 rounded text-[7px] font-black uppercase tracking-tighter border transition-all flex items-center group/badge shadow-sm ${dropInfo ? `${dropInfo.color} border-current bg-white hover:bg-slate-50` : 'text-slate-400 border-dashed border-slate-200 hover:border-blue-400 hover:text-blue-500'}`}
                        >
                            {dropInfo ? (
                                <>
                                    <span>({dropInfo.label})</span>
                                    <Pencil className="w-2 h-2 ml-1 opacity-0 group-hover/badge:opacity-100 transition-opacity" />
                                </>
                            ) : (
                                <>
                                    <Plus className="w-2 h-2 mr-1" />
                                    <span>Set Drop Status</span>
                                </>
                            )}
                        </button>
                    </p>
                </div>
                <p className="text-[11px] font-semibold text-slate-700 mt-1 truncate">{program['Program Full Name']}</p>
                <p className="text-[9px] font-medium text-slate-400 mt-0.5 truncate uppercase tracking-tighter">{program['Faculty Full Name']}</p>
            </div>
        </div>
    );
});