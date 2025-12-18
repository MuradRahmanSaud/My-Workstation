import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Search, RefreshCw, Mail, Phone, Filter, User, Building2, Plus, Trash2, X, RotateCcw, ChevronDown, ChevronRight, CheckSquare, Square, Globe, AlertTriangle } from 'lucide-react';
import { useSheetData } from '../hooks/useSheetData';
import { useResponsivePagination } from '../hooks/useResponsivePagination';
import { DiuEmployeeRow } from '../types';
import { EditEntryModal } from '../components/EditEntryModal';
import { EmployeeDetailsPanel } from '../components/EmployeeDetailsPanel';
import { submitSheetData } from '../services/sheetService';
import { SHEET_NAMES, REF_SHEET_ID } from '../constants';

const FilterSection = ({ 
    title, items, selectedSet, onToggle, expandedSection, setExpandedSection 
}: {
    title: string, items: string[], selectedSet: Set<string>, onToggle: (item: string) => void, expandedSection: string | null, setExpandedSection: (s: string | null) => void
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const isExpanded = expandedSection === title;
    const filteredItems = items.filter(i => (i || '').toLowerCase().includes(searchTerm.toLowerCase()));
    return (
        <div className="border-b border-gray-100 last:border-0">
            <button onClick={() => setExpandedSection(isExpanded ? null : title)} className="w-full flex items-center justify-between py-2.5 px-3 hover:bg-gray-50 transition-colors group">
                <div className="flex items-center text-[11px] font-semibold text-gray-700">{title}{selectedSet.size > 0 && <span className="ml-2 px-1.5 py-0.5 rounded-full text-[9px] bg-blue-100 text-blue-700">{selectedSet.size}</span>}</div>
                {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-gray-400" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-400" />}
            </button>
            {isExpanded && (
                <div className="pb-3 px-3">
                    <div className="relative mb-2">
                        <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-7 pr-2 py-1 text-[10px] border border-gray-200 rounded focus:outline-none focus:border-blue-400 bg-gray-50 focus:bg-white" />
                    </div>
                    <div className="max-h-40 overflow-y-auto thin-scrollbar space-y-0.5">
                        {filteredItems.map(item => (
                            <div key={item} onClick={() => onToggle(item)} className={`flex items-center p-1.5 rounded cursor-pointer transition-colors ${selectedSet.has(item) ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                                <div className={`mr-2 ${selectedSet.has(item) ? 'text-blue-600' : 'text-gray-400'}`}>{selectedSet.has(item) ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}</div>
                                <span className="text-[10px] font-medium leading-tight truncate text-gray-800" title={item}>{item || '(Empty)'}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export const EmployeeView: React.FC = () => {
  const { diuEmployeeData, loading, reloadData, updateDiuEmployeeData } = useSheetData();
  
  // Fix: Added toggleSetItem helper function
  const toggleSetItem = (set: Set<string>, item: string, setter: (s: Set<string>) => void) => {
    const newSet = new Set(set);
    if (newSet.has(item)) {
        newSet.delete(item);
    } else {
        newSet.add(item);
    }
    setter(newSet);
  };

  // Fix: Added getImageUrl helper function
  const getImageUrl = (link: string | undefined) => {
    if (!link) return '';
    const cleanLink = link.trim();
    if (cleanLink.includes('drive.google.com') || cleanLink.includes('docs.google.com')) {
        const idMatch = cleanLink.match(/\/d\/([^/]+)/) || cleanLink.match(/id=([^&]+)/);
        if (idMatch && idMatch[1]) {
            return `https://lh3.googleusercontent.com/d/${idMatch[1]}`;
        }
    }
    return cleanLink;
  };

  // Fix: Added columnsToEdit constant for EditEntryModal
  const columnsToEdit = [
    'Employee ID',
    'Employee Name',
    'Administrative Designation',
    'Academic Designation',
    'Mobile',
    'IP-Ext',
    'E-mail',
    'Photo',
    'Facebook',
    'Linkedin',
    'Status',
    'Group Name',
    'Department'
  ];

  const [searchTerm, setSearchTerm] = useState('');
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>('Department');
  
  const [selectedDepartments, setSelectedDepartments] = useState<Set<string>>(new Set());
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [selectedAdminDesignations, setSelectedAdminDesignations] = useState<Set<string>>(new Set());
  const [selectedAcademicDesignations, setSelectedAcademicDesignations] = useState<Set<string>>(new Set());
  const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(new Set());
  const [selectedMissingFields, setSelectedMissingFields] = useState<Set<string>>(new Set());
  const [departmentBackup, setDepartmentBackup] = useState<Set<string> | null>(null);

  const [selectedEmployee, setSelectedEmployee] = useState<DiuEmployeeRow | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editMode, setEditMode] = useState<'add' | 'edit'>('add');
  const [editingRow, setEditingRow] = useState<DiuEmployeeRow | undefined>(undefined);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Fix: Added handlePanelUpdate function
  const handlePanelUpdate = (newData: DiuEmployeeRow) => {
    updateDiuEmployeeData(prev => prev.map(row => 
        row['Employee ID'] === newData['Employee ID'] ? { ...row, ...newData } : row
    ));
    setSelectedEmployee(prev => prev ? { ...prev, ...newData } : prev);
  };

  const { departments, groups, adminDesignations, academicDesignations, statuses, fieldOptions } = useMemo(() => {
    const depts = new Set<string>(), grps = new Set<string>(), adminDesigs = new Set<string>(), academicDesigs = new Set<string>(), stats = new Set<string>();
    diuEmployeeData.forEach(e => {
        if (e.Department) depts.add(e.Department);
        if (e['Group Name']) e['Group Name'].split(',').forEach(g => grps.add(g.trim()));
        if (e['Administrative Designation']) adminDesigs.add(e['Administrative Designation']);
        if (e['Academic Designation']) academicDesigs.add(e['Academic Designation']);
        if (e.Status) stats.add(e.Status);
    });
    const sortedDepts = Array.from(depts).sort();
    return { departments: sortedDepts, groups: Array.from(grps).sort().filter(Boolean), adminDesignations: Array.from(adminDesigs).sort(), academicDesignations: Array.from(academicDesigs).sort(), statuses: Array.from(stats).sort(), fieldOptions: { 'Department': sortedDepts, 'Administrative Designation': Array.from(adminDesigs).sort(), 'Academic Designation': Array.from(academicDesigs).sort(), 'Group Name': Array.from(grps).sort().filter(Boolean), 'Status': ['Active', 'Inactive', 'On Leave'] } };
  }, [diuEmployeeData]);

  const filteredData = useMemo(() => {
    return diuEmployeeData.filter(item => {
        if (selectedMissingFields.size > 0) {
            for (const field of selectedMissingFields) {
                let val = (field === 'Designation') ? (item['Administrative Designation'] || item['Academic Designation'] || '').trim() : (item[field as keyof DiuEmployeeRow] || '').trim();
                if (val !== '') return false;
            }
        }
        if (selectedDepartments.size > 0 && !selectedDepartments.has(item.Department)) return false;
        if (selectedGroups.size > 0 && !(item['Group Name'] || '').split(',').some(g => selectedGroups.has(g.trim()))) return false;
        if (selectedAdminDesignations.size > 0 && !selectedAdminDesignations.has(item['Administrative Designation'])) return false;
        if (selectedAcademicDesignations.size > 0 && !selectedAcademicDesignations.has(item['Academic Designation'])) return false;
        if (selectedStatuses.size > 0 && !selectedStatuses.has(item.Status)) return false;
        if (!searchTerm) return true;
        const lower = searchTerm.toLowerCase();
        return (item['Employee Name'] || '').toLowerCase().includes(lower) || (item['Employee ID'] || '').toLowerCase().includes(lower) || (item.Mobile || '').includes(lower) || (item['E-mail'] || '').toLowerCase().includes(lower);
    });
  }, [diuEmployeeData, searchTerm, selectedDepartments, selectedGroups, selectedAdminDesignations, selectedAcademicDesignations, selectedStatuses, selectedMissingFields]);

  const { currentPage, setCurrentPage, rowsPerPage, totalPages, paginatedData, containerRef } = useResponsivePagination(filteredData, { defaultRows: 12 });

  const handleDelete = async (e: React.MouseEvent, row: DiuEmployeeRow) => {
      e.stopPropagation(); 
      if (!window.confirm(`Delete ${row['Employee Name']}?`)) return;
      setIsDeleting(row['Employee ID']);
      try {
          const result = await submitSheetData('delete', SHEET_NAMES.EMPLOYEE, row, 'Employee ID', row['Employee ID'], REF_SHEET_ID);
          if (result.result === 'success') {
              updateDiuEmployeeData(prev => prev.filter(p => p['Employee ID'] !== row['Employee ID']));
              if (selectedEmployee?.['Employee ID'] === row['Employee ID']) setSelectedEmployee(null);
          } else alert('Failed: ' + result.message);
      } finally { setIsDeleting(null); }
  };

  const handleModalSuccess = (newData: any) => {
      if (!newData) return;
      if (editMode === 'add') updateDiuEmployeeData(prev => [newData, ...prev]);
      else {
          const originalId = editingRow?.['Employee ID'];
          if (originalId) {
              updateDiuEmployeeData(prev => prev.map(row => row['Employee ID'] === originalId ? { ...row, ...newData } : row));
              if (selectedEmployee?.['Employee ID'] === originalId) setSelectedEmployee({ ...selectedEmployee, ...newData });
          }
      }
  };

  const activeFilterCount = selectedDepartments.size + selectedGroups.size + selectedAdminDesignations.size + selectedAcademicDesignations.size + selectedStatuses.size + selectedMissingFields.size;
  const headerActionsTarget = document.getElementById('header-actions-area');
  const headerTitleTarget = document.getElementById('header-title-area');

  return (
    <div className="flex flex-col h-full p-2 space-y-2 bg-gray-50 relative">
      <div className={`fixed inset-y-0 left-0 w-56 bg-white shadow-2xl z-50 transform transition-transform duration-300 border-r flex flex-col ${isFilterPanelOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="px-4 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 shrink-0">
              <h2 className="text-sm font-bold text-gray-800">Filters</h2>
              <div className="flex items-center space-x-1">
                  <button onClick={() => { setSelectedDepartments(new Set()); setSelectedGroups(new Set()); setSelectedAdminDesignations(new Set()); setSelectedAcademicDesignations(new Set()); setSelectedStatuses(new Set()); setSelectedMissingFields(new Set()); }} className="p-1.5 hover:bg-white rounded text-gray-500"><RotateCcw className="w-4 h-4" /></button>
                  <button onClick={() => setIsFilterPanelOpen(false)} className="p-1.5 hover:bg-white rounded text-gray-500"><X className="w-5 h-5" /></button>
              </div>
          </div>
          <div className="flex-1 overflow-y-auto thin-scrollbar">
              <FilterSection title="Department" items={departments} selectedSet={selectedDepartments} onToggle={(item) => toggleSetItem(selectedDepartments, item, setSelectedDepartments)} expandedSection={expandedSection} setExpandedSection={setExpandedSection} />
              <FilterSection title="Group Name" items={groups} selectedSet={selectedGroups} onToggle={(item) => toggleSetItem(selectedGroups, item, setSelectedGroups)} expandedSection={expandedSection} setExpandedSection={setExpandedSection} />
              <FilterSection title="Status" items={statuses} selectedSet={selectedStatuses} onToggle={(item) => toggleSetItem(selectedStatuses, item, setSelectedStatuses)} expandedSection={expandedSection} setExpandedSection={setExpandedSection} />
          </div>
      </div>

      {headerTitleTarget && createPortal(
          <div className="flex items-center space-x-2 animate-in fade-in slide-in-from-left-2 duration-300">
             <div className="flex flex-col">
                <h2 className="text-[13px] md:text-sm font-bold text-gray-800 uppercase tracking-wide flex items-center truncate">Employee Directory</h2>
                <div className="flex items-center space-x-1">
                     <span className="text-[9px] font-bold text-gray-400 bg-gray-50 px-1 rounded border border-gray-200">{filteredData.length} Records</span>
                </div>
             </div>
          </div>,
          headerTitleTarget
      )}

      {headerActionsTarget && createPortal(
          <div className="flex items-center space-x-1 md:space-x-2 animate-in fade-in slide-in-from-right-2 duration-300 overflow-hidden">
            <button onClick={() => setIsFilterPanelOpen(true)} className={`flex items-center space-x-1 px-3 py-1.5 text-[11px] font-bold rounded-full border transition-all ${activeFilterCount > 0 ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'}`}>
                <Filter className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Filter</span>
                {activeFilterCount > 0 && <span className="bg-blue-600 text-white text-[9px] px-1.5 rounded-full ml-1 min-w-[14px] text-center">{activeFilterCount}</span>}
            </button>
            <div className="relative group hidden sm:block">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 focus:bg-white focus:border-blue-500 rounded-full text-xs focus:ring-0 w-32 md:w-48 lg:w-64 outline-none transition-all" />
            </div>
            <button onClick={() => { setEditMode('add'); setEditingRow(undefined); setIsEditModalOpen(true); }} className="hidden lg:flex items-center px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-[11px] font-bold transition-all shadow-sm"><Plus className="w-3 h-3 mr-1" />Add</button>
            <button onClick={() => reloadData('sections')} disabled={loading.status === 'loading'} className="p-1.5 text-gray-400 hover:text-blue-600 rounded-full transition-all"><RefreshCw className={`w-4 h-4 ${loading.status === 'loading' ? 'animate-spin' : ''}`} /></button>
          </div>,
          headerActionsTarget
      )}

      <div className="flex-1 overflow-hidden flex flex-row gap-2">
        <div className="flex-1 overflow-hidden bg-slate-50/50 rounded border border-gray-200 shadow-sm relative flex flex-col">
            <div className="flex-1 overflow-y-auto p-2" ref={containerRef}>
                <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 ${selectedEmployee ? 'xl:grid-cols-3' : 'xl:grid-cols-4'} gap-2`}>
                    {paginatedData.map((emp) => (
                        <div key={emp['Employee ID']} onClick={() => setSelectedEmployee(emp)} className={`bg-white rounded-lg border p-3 hover:shadow-md transition-all flex flex-col relative cursor-pointer ${selectedEmployee?.['Employee ID'] === emp['Employee ID'] ? 'ring-1 ring-blue-500 border-blue-500' : 'border-gray-200'}`}>
                            <div className="flex items-start space-x-3 mb-2">
                                <div className="w-12 h-12 rounded-full border border-gray-200 flex items-center justify-center shrink-0 overflow-hidden relative">
                                    {emp.Photo ? <img src={getImageUrl(emp.Photo)} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <User className="w-6 h-6 text-gray-300" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-[13px] font-bold text-slate-800 truncate leading-tight">{emp['Employee Name']}</h3>
                                    <div className="text-[11px] text-blue-600 font-bold truncate">{emp['Administrative Designation'] || emp['Academic Designation'] || '-'}</div>
                                    <div className="text-[10px] text-gray-400 font-mono">({emp['Employee ID']})</div>
                                </div>
                            </div>
                            <div className="space-y-1 mt-auto">
                                <div className="flex items-center text-[11px] text-gray-600 truncate"><Building2 className="w-3.5 h-3.5 mr-2 text-gray-400" />{emp.Department || '-'}</div>
                                <div className="flex items-center text-[11px] text-gray-600 truncate"><Phone className="w-3.5 h-3.5 mr-2 text-gray-400" />{emp.Mobile || '-'}</div>
                                <div className="flex items-center text-[11px] text-gray-600 truncate"><Mail className="w-3.5 h-3.5 mr-2 text-gray-400" />{emp['E-mail'] || '-'}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="bg-white px-3 py-1.5 border-t border-gray-200 flex justify-between items-center text-[10px] text-gray-500 font-medium">
                <span>{filteredData.length > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0}-{Math.min(currentPage * rowsPerPage, filteredData.length)} of {filteredData.length}</span>
                <div className="flex items-center space-x-1">
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-2 py-0.5 bg-white border border-gray-200 rounded disabled:opacity-40">Prev</button>
                    <span className="font-bold">{currentPage} / {totalPages}</span>
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-2 py-0.5 bg-white border border-gray-200 rounded disabled:opacity-40">Next</button>
                </div>
            </div>
        </div>
        {selectedEmployee && <EmployeeDetailsPanel employee={selectedEmployee} onClose={() => setSelectedEmployee(null)} onUpdate={handlePanelUpdate} fieldOptions={fieldOptions} />}
      </div>
      <EditEntryModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} mode={editMode} title={editMode === 'add' ? 'Add Employee' : 'Edit Employee'} sheetName={SHEET_NAMES.EMPLOYEE} columns={columnsToEdit} initialData={editingRow} keyColumn="Employee ID" spreadsheetId={REF_SHEET_ID} fieldOptions={fieldOptions} multiSelectFields={['Group Name']} onSuccess={handleModalSuccess} />
    </div>
  );
};