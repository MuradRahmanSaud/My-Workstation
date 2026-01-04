
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MessageSquareQuote, Search, RefreshCw, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, FileText, Plus, Pencil, Trash2, CheckCircle2, Calendar, Loader2, Fingerprint, AlertCircle, Target } from 'lucide-react';
import { useSheetData } from '../hooks/useSheetData';
import { useResponsivePagination } from '../hooks/useResponsivePagination';
import { EditEntryModal } from '../components/EditEntryModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { SHEET_NAMES, STUDENT_LINK_SHEET_ID } from '../constants';
import { StudentFollowupRow } from '../types';
import { submitSheetData, normalizeId } from '../services/sheetService';

export const StudentFollowupView: React.FC = () => {
    const { studentFollowupData: contextData, diuEmployeeData, teacherData, loading, reloadData, loadStudentFollowupData } = useSheetData();
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editMode, setEditMode] = useState<'add' | 'edit'>('add');
    const [editingRow, setEditingRow] = useState<StudentFollowupRow | undefined>(undefined);
    const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
    const [showSuccessToast, setShowSuccessToast] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    
    // Confirmation state
    const [rowToConfirmDelete, setRowToConfirmDelete] = useState<StudentFollowupRow | null>(null);

    // Local state to manage UI updates before sheet confirmation
    const [localData, setLocalData] = useState<StudentFollowupRow[]>([]);
    // Ref to track if we should temporarily ignore incoming context data (to prevent stale overwrite)
    const ignoreContextSyncUntil = useRef<number>(0);

    // Compute employee options for the dropdown
    const employeeOptions = useMemo(() => {
        const map = new Map<string, string>();
        diuEmployeeData.forEach(e => { 
            const id = e['Employee ID']?.trim();
            if (!id) return;
            map.set(normalizeId(id), `${e['Employee Name']} - ${[e['Administrative Designation'], e['Academic Designation']].filter(Boolean).join('/')} (${id})`); 
        });
        teacherData.forEach(t => {
            const id = t['Employee ID']?.trim();
            if (!id) return;
            const normId = normalizeId(id);
            if (!map.has(normId)) map.set(normId, `${t['Employee Name']} - ${t.Designation} (${id})`);
        });
        return Array.from(map.values()).sort();
    }, [diuEmployeeData, teacherData]);

    // Compute dynamic Response Status options from history
    const statusOptions = useMemo(() => {
        const defaults = ['Call Busy', 'Switched Off', 'Not Reachable', 'Department Change', 'University Change'];
        const used = new Set<string>();
        contextData.forEach(f => {
            if (f.Status && f.Status.trim()) used.add(f.Status.trim());
        });
        return Array.from(new Set([...defaults, ...used])).sort();
    }, [contextData]);

    // Robust field discovery (case-insensitive)
    const getRowUidValue = useCallback((row: any) => {
        if (!row) return null;
        const keys = Object.keys(row);
        const targetKey = keys.find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '') === 'uniqueid');
        return targetKey ? String(row[targetKey]).trim() : null;
    }, []);

    // Sync context data to local state
    useEffect(() => {
        if (contextData.length > 0) {
            const now = Date.now();
            // Only sync if we aren't protecting a recent local update or if local is empty
            if (localData.length === 0 || now > ignoreContextSyncUntil.current) {
                setLocalData(contextData);
            }
        } else if (loading.status === 'idle') {
            loadStudentFollowupData();
        }
    }, [contextData, loadStudentFollowupData, loading.status, localData.length]);

    const handleRefresh = useCallback(async () => {
        setLocalData([]);
        setErrorMessage(null);
        ignoreContextSyncUntil.current = 0; // Reset protection on manual refresh
        await reloadData('followup', true);
    }, [reloadData]);

    const filteredData = useMemo(() => {
        if (!searchTerm) return localData;
        const lower = searchTerm.toLowerCase();
        return localData.filter(row => 
            Object.values(row).some(val => String(val).toLowerCase().includes(lower))
        );
    }, [localData, searchTerm]);

    const { currentPage, setCurrentPage, rowsPerPage, totalPages, paginatedData, containerRef } = useResponsivePagination(filteredData);

    const columns = useMemo(() => [
        'uniqueid',
        'Date',
        'Student ID',
        'Student Name',
        'Target Semester', // Added new column
        'Remark',
        'Re-follow up',
        'Status',
        'Contacted By'
    ], []);

    const handleAddClick = () => {
        setEditMode('add');
        setErrorMessage(null);
        
        // Get local date in YYYY-MM-DD format for date input
        const now = new Date();
        const datePart = now.toISOString().split('T')[0];

        setEditingRow({
            'uniqueid': '', 
            'Date': datePart,
            'Student ID': '',
            'Student Name': '',
            'Target Semester': '', // New field
            'Remark': '',
            'Re-follow up': '',
            'Status': 'Call Busy',
            'Contacted By': ''
        });
        setIsModalOpen(true);
    };

    const handleEditClick = (row: StudentFollowupRow) => {
        setEditMode('edit');
        setErrorMessage(null);
        
        // Sanitize Contact Date for the date input
        const cleanDate = (row.Date || '').split(' ')[0].split('T')[0];
        // Sanitize Re-follow up for the date input
        const cleanReFollowup = (row['Re-follow up'] || '').split(' ')[0].split('T')[0];

        setEditingRow({ 
            ...row, 
            Date: cleanDate, 
            'Re-follow up': cleanReFollowup 
        });
        setIsModalOpen(true);
    };

    const handleDeleteRow = async (row: StudentFollowupRow) => {
        const uid = getRowUidValue(row);
        if (!uid) return;

        setRowToConfirmDelete(null);
        const previousData = [...localData];
        setIsDeletingId(uid);
        setLocalData(prev => prev.filter(r => getRowUidValue(r) !== uid));

        try {
            const result = await submitSheetData('delete', SHEET_NAMES.FOLLOWUP, {}, 'uniqueid', uid, STUDENT_LINK_SHEET_ID);
            if (result.result === 'success') {
                setShowSuccessToast(true);
                setTimeout(() => setShowSuccessToast(false), 3000);
                ignoreContextSyncUntil.current = Date.now() + 5000;
                reloadData('followup', false);
            } else {
                setLocalData(previousData);
                alert(result.message || "Failed to delete record.");
            }
        } catch (err) {
            setLocalData(previousData);
        } finally {
            setIsDeletingId(null);
        }
    };

    const handleModalSuccess = (newData: any) => {
        ignoreContextSyncUntil.current = Date.now() + 5000;

        if (editMode === 'add') {
            setLocalData(prev => [newData, ...prev]);
        } else {
            const editingUid = getRowUidValue(editingRow);
            if (editingUid) {
                setLocalData(prev => prev.map(r => 
                    getRowUidValue(r) === editingUid ? { ...r, ...newData } : r
                ));
            }
        }

        setIsModalOpen(false); 
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 3000);
        
        reloadData('followup', false);
    };

    const headerActionsTarget = document.getElementById('header-actions-area');
    const headerTitleTarget = document.getElementById('header-title-area');

    const isRefreshing = loading.status === 'loading' && localData.length === 0;

    return (
        <div className="flex flex-col h-full bg-gray-50 p-2 md:p-3 space-y-2 relative font-sans">
            {headerTitleTarget && createPortal(
                <div className="flex items-center space-x-2 animate-in fade-in slide-in-from-left-2 duration-300">
                    <MessageSquareQuote className="w-4 h-4 text-blue-600" />
                    <div className="flex flex-col">
                        <h2 className="text-[13px] md:text-sm font-bold text-gray-800 uppercase tracking-wide">
                            Follow-up Tracking
                        </h2>
                        <span className="text-[9px] font-bold text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200 w-fit">
                            {filteredData.length} Records
                        </span>
                    </div>
                </div>,
                headerTitleTarget
            )}

            {headerActionsTarget && createPortal(
                <div className="flex items-center space-x-2 animate-in fade-in slide-in-from-right-2 duration-300">
                    <div className="relative group hidden sm:block">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="Search ID or Name..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 focus:bg-white focus:border-blue-500 rounded-full text-xs outline-none transition-all w-32 md:w-48 lg:w-64"
                        />
                    </div>
                    <button 
                        onClick={handleRefresh}
                        disabled={loading.status === 'loading'}
                        className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Sync Sheet"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading.status === 'loading' ? 'animate-spin' : ''}`} />
                    </button>
                </div>,
                headerTitleTarget
            )}

            <div className="flex-1 overflow-hidden bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col relative">
                {errorMessage && (
                    <div className="bg-red-50 border-b border-red-100 p-2 px-4 flex items-center text-red-700 text-[10px] font-bold">
                        <AlertCircle className="w-3 h-3 mr-2 shrink-0" />
                        <span className="truncate">{errorMessage}</span>
                    </div>
                )}

                {isRefreshing ? (
                    <div className="absolute inset-0 z-20 bg-white/80 flex flex-col items-center justify-center space-y-3">
                        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                        <p className="text-xs text-blue-700 font-bold uppercase tracking-widest px-10">Loading...</p>
                    </div>
                ) : (
                    <div className="flex-1 overflow-auto thin-scrollbar relative" ref={containerRef}>
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-100 sticky top-0 z-10 border-b border-gray-200">
                                <tr>
                                    <th className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center w-16">
                                        Actions
                                    </th>
                                    {columns.map((col) => (
                                        <th key={col} className={`px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap ${col === 'uniqueid' ? 'text-center w-32 bg-slate-50' : ''}`}>
                                            {col}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {paginatedData.map((row, idx) => {
                                    const rowUid = getRowUidValue(row);
                                    const isDeleting = isDeletingId === rowUid;
                                    return (
                                        <tr key={rowUid || idx} className="hover:bg-blue-50/50 transition-colors group text-[11px] text-gray-700 h-[32px]">
                                            <td className="px-3 py-1 text-center whitespace-nowrap">
                                                <div className="flex items-center justify-center space-x-2">
                                                    <button 
                                                        onClick={() => handleEditClick(row)}
                                                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors rounded hover:bg-blue-100"
                                                        title="Edit"
                                                    >
                                                        <Pencil className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button 
                                                        onClick={() => setRowToConfirmDelete(row)}
                                                        disabled={isDeleting}
                                                        className="p-1 text-gray-400 hover:text-red-600 transition-colors rounded hover:bg-red-100 disabled:opacity-30"
                                                        title="Delete"
                                                    >
                                                        {isDeleting ? (
                                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                        ) : (
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        )}
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-3 py-1 text-gray-400 font-mono text-[9px] text-center whitespace-nowrap bg-gray-50/30">
                                                <div className="flex items-center justify-center">
                                                    <Fingerprint className="w-2.5 h-2.5 mr-1 opacity-50" />
                                                    {rowUid || '-'}
                                                </div>
                                            </td>
                                            <td className="px-3 py-1 text-gray-500 font-medium whitespace-nowrap">
                                                {row.Date || '-'}
                                            </td>
                                            <td className="px-3 py-1 font-bold text-blue-600">
                                                {row['Student ID'] || '-'}
                                            </td>
                                            <td className="px-3 py-1 font-medium text-gray-900 whitespace-nowrap">
                                                {row['Student Name'] || '-'}
                                            </td>
                                            <td className="px-3 py-1 text-center whitespace-nowrap">
                                                {row['Target Semester'] ? (
                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-600 text-white text-[9px] font-black uppercase shadow-sm">
                                                        <Target className="w-2.5 h-2.5 mr-1" />
                                                        {row['Target Semester']}
                                                    </span>
                                                ) : <span className="text-gray-300">-</span>}
                                            </td>
                                            <td className="px-3 py-1 max-w-[250px] truncate" title={row.Remark}>
                                                {row.Remark || '-'}
                                            </td>
                                            <td className="px-3 py-1 text-orange-600 font-medium">
                                                {row['Re-follow up'] || '-'}
                                            </td>
                                            <td className="px-3 py-1">
                                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                                                    row.Status?.toLowerCase() === 'complete' 
                                                    ? 'bg-green-50 text-green-700 border-green-200' 
                                                    : 'bg-amber-50 text-amber-700 border-amber-100'
                                                }`}>
                                                    {row.Status || 'Pending'}
                                                </span>
                                            </td>
                                            <td className="px-3 py-1 italic text-gray-500 whitespace-nowrap">
                                                {row['Contacted By'] || '-'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="bg-slate-50 px-2 py-1 border-t border-gray-200 flex justify-between items-center text-[10px] text-gray-500 font-medium select-none shrink-0 h-[32px]">
                    <div className="flex items-center space-x-2">
                        <span>
                            {filteredData.length > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0}-
                            {Math.min(currentPage * rowsPerPage, filteredData.length)} of {filteredData.length}
                        </span>
                    </div>

                    <div className="flex items-center space-x-1">
                        <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="p-1 hover:bg-white rounded disabled:opacity-30"><ChevronsLeft className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1 hover:bg-white rounded disabled:opacity-30"><ChevronLeft className="w-3.5 h-3.5" /></button>
                        <span className="min-w-[20px] text-center font-bold text-gray-700">{currentPage}</span>
                        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="p-1 hover:bg-white rounded disabled:opacity-30"><ChevronRight className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages || totalPages === 0} className="p-1 hover:bg-white rounded disabled:opacity-30"><ChevronsRight className="w-3.5 h-3.5" /></button>
                    </div>
                </div>
            </div>

            {/* Success Toast */}
            {showSuccessToast && (
                <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] animate-in slide-in-from-bottom-4 fade-in duration-300">
                    <div className="bg-emerald-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center space-x-2 border border-emerald-500">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-wide">Successfully updated</span>
                    </div>
                </div>
            )}

            {/* Floating Action Button */}
            <button
                onClick={handleAddClick}
                className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 group z-30"
                title="Add New Record"
            >
                <Plus className="w-7 h-7 group-hover:rotate-90 transition-transform duration-300" />
            </button>

            <ConfirmDialog 
                isOpen={!!rowToConfirmDelete}
                title="Delete Record?"
                message="Are you sure you want to permanently delete this followup record from the database? This action cannot be undone."
                onConfirm={() => rowToConfirmDelete && handleDeleteRow(rowToConfirmDelete)}
                onCancel={() => setRowToConfirmDelete(null)}
            />

            <EditEntryModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                mode={editMode}
                title={editMode === 'add' ? "New Student Follow-up" : "Update Record"}
                sheetName={SHEET_NAMES.FOLLOWUP}
                columns={columns}
                initialData={editingRow}
                keyColumn="uniqueid"
                hiddenFields={['uniqueid', 'Timestamp']} 
                fieldOptions={{ 
                    'Status': statusOptions,
                    'Contacted By': employeeOptions 
                }}
                spreadsheetId={STUDENT_LINK_SHEET_ID}
                onSuccess={handleModalSuccess}
                closeOnSubmit={true} 
                transformData={(data) => {
                    const now = new Date();
                    const datePart = now.toISOString().split('T')[0];
                    const timePart = now.toTimeString().split(' ')[0]; 
                    
                    const contactedByText = data['Contacted By'] || '';
                    const idMatch = contactedByText.match(/\(([^)]+)\)$/);
                    const contactedById = idMatch ? idMatch[1] : contactedByText;

                    const reFollowupClean = (data['Re-follow up'] || '').split(' ')[0].split('T')[0];

                    return {
                        ...data,
                        'uniqueid': data['uniqueid'] || `SF-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                        Timestamp: data.Timestamp || `${datePart} ${timePart}`,
                        Date: `${data.Date} ${timePart}`,
                        'Re-follow up': reFollowupClean,
                        'Contacted By': contactedById
                    };
                }}
            />
        </div>
    );
};
