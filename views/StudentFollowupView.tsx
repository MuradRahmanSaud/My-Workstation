
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { MessageSquareQuote, Search, RefreshCw, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, FileText, Plus, Pencil, Trash2, CheckCircle2, Calendar, Loader2, Fingerprint, AlertCircle } from 'lucide-react';
import { useSheetData } from '../hooks/useSheetData';
import { useResponsivePagination } from '../hooks/useResponsivePagination';
import { EditEntryModal } from '../components/EditEntryModal';
import { SHEET_NAMES, STUDENT_LINK_SHEET_ID } from '../constants';
import { StudentFollowupRow } from '../types';
import { submitSheetData } from '../services/sheetService';

export const StudentFollowupView: React.FC = () => {
    const { studentFollowupData: contextData, loading, reloadData, loadStudentFollowupData } = useSheetData();
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editMode, setEditMode] = useState<'add' | 'edit'>('add');
    const [editingRow, setEditingRow] = useState<StudentFollowupRow | undefined>(undefined);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [showSuccessToast, setShowSuccessToast] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Local state for UI (Source of Truth for the Table)
    const [localData, setLocalData] = useState<StudentFollowupRow[]>([]);

    // Initial Load & Context Sync
    useEffect(() => {
        if (contextData.length > 0) {
            setLocalData(contextData);
        } else if (loading.status === 'idle') {
            loadStudentFollowupData();
        }
    }, [contextData, loadStudentFollowupData, loading.status]);

    const handleRefresh = useCallback(async () => {
        setLocalData([]);
        setErrorMessage(null);
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
        'Remark',
        'Re-follow up',
        'Status',
        'Contacted By'
    ], []);

    const handleAddClick = () => {
        setEditMode('add');
        setErrorMessage(null);
        const today = new Date().toISOString().split('T')[0];
        setEditingRow({
            'uniqueid': '', 
            'Date': today,
            'Student ID': '',
            'Student Name': '',
            'Remark': '',
            'Re-follow up': '',
            'Status': 'Pending',
            'Contacted By': ''
        });
        setIsModalOpen(true);
    };

    const handleEditClick = (row: StudentFollowupRow) => {
        setEditMode('edit');
        setErrorMessage(null);
        setEditingRow(row);
        setIsModalOpen(true);
    };

    /**
     * Deletes a record from both the local UI and the Google Sheet using 'uniqueid'
     */
    const handleDeleteClick = async (row: StudentFollowupRow) => {
        // Ensure we extract the uniqueid correctly
        const uid = row['uniqueid']?.toString().trim();
        
        if (!uid) {
            const errorMsg = "রেকর্ডটির জন্য 'uniqueid' পাওয়া যায়নি। দয়া করে রিফ্রেশ করে আবার চেষ্টা করুন।";
            setErrorMessage(errorMsg);
            alert(errorMsg);
            return;
        }

        if (!window.confirm(`আপনি কি নিশ্চিত যে ${row['Student Name'] || 'এই'} রেকর্ডটি ডিলিট করতে চান?`)) {
            return;
        }

        setIsDeleting(uid);
        setErrorMessage(null);
        
        // Save backup for rollback if needed
        const backupData = [...localData];
        // Optimistic UI Update
        setLocalData(prev => prev.filter(r => r['uniqueid']?.toString().trim() !== uid));

        try {
            console.log(`Initiating delete for uniqueid: ${uid} from sheet: ${SHEET_NAMES.FOLLOWUP}`);
            
            const result = await submitSheetData(
                'delete', 
                SHEET_NAMES.FOLLOWUP, 
                {}, // Empty object for delete
                'uniqueid', // Key column name in Google Sheet
                uid, // The ID to match
                STUDENT_LINK_SHEET_ID
            );

            if (result.result === 'success') {
                setShowSuccessToast(true);
                setTimeout(() => setShowSuccessToast(false), 3000);
                // Hard sync in background to confirm consistency
                reloadData('followup', true);
            } else {
                // Server returned error, rollback local UI
                setLocalData(backupData);
                const msg = result.message || "সার্ভার রিকোয়েস্ট প্রত্যাখ্যান করেছে। গুগল স্ক্রিপ্ট ঠিকমতো পাবলিশ করা হয়েছে কি না চেক করুন।";
                setErrorMessage(msg);
                alert(msg);
            }
        } catch (error: any) {
            // Network/Execution error, rollback local UI
            setLocalData(backupData);
            const msg = "সার্ভারের সাথে সংযোগ বিচ্ছিন্ন হয়েছে। আপনার ইন্টারনেট চেক করুন।";
            setErrorMessage(msg);
            console.error("Delete call failed:", error);
        } finally {
            setIsDeleting(null);
        }
    };

    const handleSuccess = (newData: any) => {
        if (editMode === 'add') {
            setLocalData(prev => [newData, ...prev]);
        } else {
            setLocalData(prev => prev.map(r => r['uniqueid'] === editingRow?.['uniqueid'] ? { ...r, ...newData } : r));
        }

        setIsModalOpen(false); 
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 3000);

        // Sync background
        setTimeout(() => {
            reloadData('followup', true);
        }, 1000);
    };

    const headerActionsTarget = document.getElementById('header-actions-area');
    const headerTitleTarget = document.getElementById('header-title-area');

    const isCurrentlyRefreshing = loading.status === 'loading' && localData.length === 0;

    return (
        <div className="flex flex-col h-full bg-gray-50 p-2 md:p-3 space-y-2 relative">
            {headerTitleTarget && createPortal(
                <div className="flex items-center space-x-2 animate-in fade-in slide-in-from-left-2 duration-300">
                    <MessageSquareQuote className="w-4 h-4 text-blue-600" />
                    <div className="flex flex-col">
                        <h2 className="text-[13px] md:text-sm font-bold text-gray-800 uppercase tracking-wide">
                            Follow-up Registry
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
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                        <input 
                            type="text" 
                            placeholder="Search records..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 focus:bg-white focus:border-blue-500 rounded-full text-xs focus:ring-0 w-32 md:w-48 lg:w-64 outline-none transition-all"
                        />
                    </div>
                    <button 
                        onClick={handleRefresh}
                        disabled={loading.status === 'loading'}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all disabled:opacity-50"
                        title="Sync with Google Sheets"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading.status === 'loading' ? 'animate-spin' : ''}`} />
                    </button>
                </div>,
                headerActionsTarget
            )}

            <div className="flex-1 overflow-hidden bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col relative">
                {errorMessage && (
                    <div className="bg-red-50 border-b border-red-100 p-2 px-4 flex items-center text-red-700 text-[10px] font-bold animate-in slide-in-from-top-2">
                        <AlertCircle className="w-3 h-3 mr-2 shrink-0" />
                        <span className="truncate">{errorMessage}</span>
                    </div>
                )}

                {isCurrentlyRefreshing ? (
                    <div className="absolute inset-0 z-20 bg-white/90 flex flex-col items-center justify-center space-y-3">
                        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                        <p className="text-xs text-blue-700 font-bold animate-pulse uppercase tracking-widest">গুগল শিট থেকে ডাটা সিঙ্ক হচ্ছে...</p>
                    </div>
                ) : filteredData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8 text-center">
                        <FileText className="w-12 h-12 mb-3 opacity-10" />
                        <p className="text-sm font-medium">কোনো রেকর্ড পাওয়া যায়নি।</p>
                        <button 
                            onClick={handleRefresh}
                            className="mt-4 text-xs font-bold text-blue-600 flex items-center hover:underline"
                        >
                            <RefreshCw className="w-3 h-3 mr-1" /> পুনরায় চেষ্টা করুন
                        </button>
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
                                {paginatedData.map((row, idx) => (
                                    <tr key={idx} className="hover:bg-blue-50/50 transition-colors group text-[11px] text-gray-700 h-[32px]">
                                        <td className="px-3 py-1 text-center whitespace-nowrap">
                                            <div className="flex items-center justify-center space-x-2">
                                                <button 
                                                    onClick={() => handleEditClick(row)}
                                                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors rounded hover:bg-blue-100"
                                                    title="Edit Record"
                                                >
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteClick(row)}
                                                    disabled={isDeleting === row['uniqueid']?.toString().trim()}
                                                    className="p-1 text-gray-400 hover:text-red-600 transition-colors rounded hover:bg-red-100 disabled:opacity-30"
                                                    title="Delete Record"
                                                >
                                                    {isDeleting === row['uniqueid']?.toString().trim() ? (
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
                                                {row['uniqueid'] || '-'}
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
                                                : 'bg-amber-50 text-amber-700 border-amber-200'
                                            }`}>
                                                {row.Status || 'Pending'}
                                            </span>
                                        </td>
                                        <td className="px-3 py-1 italic text-gray-500 whitespace-nowrap">
                                            {row['Contacted By'] || '-'}
                                        </td>
                                    </tr>
                                ))}
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
                        <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="p-1 hover:bg-white rounded disabled:opacity-30 transition-all"><ChevronsLeft className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1 hover:bg-white rounded disabled:opacity-30 transition-all"><ChevronLeft className="w-3.5 h-3.5" /></button>
                        <span className="min-w-[20px] text-center font-bold text-gray-700">{currentPage}</span>
                        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="p-1 hover:bg-white rounded disabled:opacity-30 transition-all"><ChevronRight className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages || totalPages === 0} className="p-1 hover:bg-white rounded disabled:opacity-30 transition-all"><ChevronsRight className="w-3.5 h-3.5" /></button>
                    </div>
                </div>
            </div>

            {/* Success Toast */}
            {showSuccessToast && (
                <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] animate-in slide-in-from-bottom-4 fade-in duration-300">
                    <div className="bg-emerald-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center space-x-2 border border-emerald-500">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase tracking-wide">সফলভাবে সম্পন্ন হয়েছে</span>
                    </div>
                </div>
            )}

            {/* Floating Action Button */}
            <button
                onClick={handleAddClick}
                className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 group z-30"
                title="নতুন ফলো-আপ যুক্ত করুন"
            >
                <Plus className="w-7 h-7 group-hover:rotate-90 transition-transform duration-300" />
            </button>

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
                fieldOptions={{ 'Status': ['Pending', 'Complete', 'Call Busy', 'Switched Off', 'Not Reachable', 'Waiting'] }}
                spreadsheetId={STUDENT_LINK_SHEET_ID}
                onSuccess={handleSuccess}
                closeOnSubmit={true} 
                transformData={(data) => {
                    const now = new Date();
                    const datePart = now.toISOString().split('T')[0];
                    const timePart = now.toTimeString().split(' ')[0];
                    return {
                        ...data,
                        'uniqueid': data['uniqueid'] || `SF-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                        Timestamp: data.Timestamp || `${datePart} ${timePart}`,
                        Date: data.Date || datePart
                    };
                }}
            />
        </div>
    );
};
