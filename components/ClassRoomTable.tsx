
import React, { useMemo } from 'react';
import { ClassRoomDataRow, ProgramDataRow } from '../types';
import { Pencil } from 'lucide-react';

interface ClassRoomTableProps {
    data: ClassRoomDataRow[];
    programData?: ProgramDataRow[];
    onEdit?: (row: ClassRoomDataRow) => void;
}

export const ClassRoomTable: React.FC<ClassRoomTableProps> = ({ data, programData = [], onEdit }) => {
    
    // Create PID -> Program Short Name Map
    const programMap = useMemo(() => {
        const map = new Map<string, string>();
        programData.forEach(p => {
            if (p.PID) {
                // Normalize PID key
                const key = String(p.PID).replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
                map.set(key, p['Program Short Name']);
            }
        });
        return map;
    }, [programData]);

    const getProgramLabel = (pid: string) => {
        if (!pid) return '-';
        const key = String(pid).replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        const shortName = programMap.get(key);
        return shortName ? `${pid} ${shortName}` : pid;
    };

    const columns = [
        'Program', // Replaces PID
        'Building',
        'Floor',
        'Room',
        'Room Type',
        'Capacity',
        'Slot Duration',
        'Slot Per Room',
        'Shared Program'
    ];

    return (
        <table className="w-full text-left border-collapse">
            <thead className="bg-slate-100 sticky top-0 z-10 shadow-sm border-b border-gray-200">
                <tr>
                    {/* Action Column - Moved to Start (Left) */}
                    {onEdit && (
                        <th className="px-2 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center w-8 bg-slate-100 border-r border-gray-200">
                            Edit
                        </th>
                    )}
                    {columns.map((col) => (
                        <th key={col} className="px-2 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap text-left">
                            {col}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
                {data.map((row, idx) => (
                    <tr key={idx} className="hover:bg-blue-50/60 transition-colors group text-[11px] text-gray-700 leading-none h-[29px]">
                        
                        {/* Action Cell - Moved to Start (Left) */}
                        {onEdit && (
                            <td className="px-2 py-1 text-center border-r border-gray-100 bg-white group-hover:bg-blue-50/60 transition-colors">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onEdit(row); }}
                                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors hover:bg-blue-100 rounded"
                                    title="Edit Room"
                                >
                                    <Pencil className="w-3 h-3" />
                                </button>
                            </td>
                        )}

                        <td className="px-2 py-1 whitespace-nowrap border-r border-transparent group-hover:border-blue-100/50 font-medium text-gray-900">
                            {getProgramLabel(row.PID)}
                        </td>
                        <td className="px-2 py-1 whitespace-nowrap border-r border-transparent group-hover:border-blue-100/50 font-medium text-gray-600">{row.Building || '-'}</td>
                        <td className="px-2 py-1 whitespace-nowrap border-r border-transparent group-hover:border-blue-100/50">{row.Floor || '-'}</td>
                        <td className="px-2 py-1 whitespace-nowrap border-r border-transparent group-hover:border-blue-100/50 font-bold text-blue-600">{row.Room || '-'}</td>
                        <td className="px-2 py-1 whitespace-nowrap border-r border-transparent group-hover:border-blue-100/50">{row['Room Type'] || '-'}</td>
                        <td className="px-2 py-1 whitespace-nowrap border-r border-transparent group-hover:border-blue-100/50 font-bold text-gray-800">{row.Capacity || '-'}</td>
                        <td className="px-2 py-1 whitespace-nowrap border-r border-transparent group-hover:border-blue-100/50">{row['Slot Duration'] || '-'}</td>
                        <td className="px-2 py-1 whitespace-nowrap border-r border-transparent group-hover:border-blue-100/50 text-center font-medium text-gray-700">{row['Slot Per Room'] || '-'}</td>
                        <td className="px-2 py-1 whitespace-nowrap border-r border-transparent group-hover:border-blue-100/50 max-w-[200px] truncate" title={row['Shared Program']}>{row['Shared Program'] || '-'}</td>
                    </tr>
                ))}
                {data.length === 0 && (
                    <tr>
                        <td colSpan={columns.length + (onEdit ? 1 : 0)} className="px-4 py-8 text-center text-xs text-gray-400">
                            No rooms found.
                        </td>
                    </tr>
                )}
            </tbody>
        </table>
    );
};
