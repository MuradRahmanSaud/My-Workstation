
import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Search, RefreshCw, Mail, Phone, Filter, User, Building2, Plus, Trash2, X, RotateCcw, ChevronDown, ChevronRight, CheckSquare, Square, Globe, AlertTriangle } from 'lucide-react';
import { useSheetData } from '../hooks/useSheetData';
import { useResponsivePagination } from '../hooks/useResponsivePagination';
import { DiuEmployeeRow, TeacherDataRow } from '../types';
import { EmployeeAddEditModal } from '../components/EmployeeAddEditModal';
import { EmployeeDetailsPanel } from '../components/EmployeeDetailsPanel';
import { submitSheetData, normalizeId } from '../services/sheetService';
import { SHEET_NAMES, REF_SHEET_ID } from '../constants';

// Helper to check if a value from a sheet is effectively empty
export const isValEmpty = (val: any): boolean => {
    if (val === null || val === undefined) return true;
    const s = String(val).trim().toLowerCase();
    return s === '' || s === 'none' || s === '-' || s === 'null' || s === 'n/a';
};

// Robust field extraction to handle variations in spreadsheet headers
const findField = (row: any, patterns: string[]): string => {
    if (!row) return '';
    const keys = Object.keys(row);
    for (const pattern of patterns) {
        const found = keys.find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '') === pattern.toLowerCase().replace(/[^a-z0-9]/g, ''));
        if (found && !isValEmpty(row[found])) return String(row[found]).trim();
    }
    return '';
};

export const getImageUrl = (link: string | undefined) => {
    if (isValEmpty(link)) return '';
    let cleanLink = link!.trim();
    
    // Remove potential wrapping quotes from CSV artifacts
    cleanLink = cleanLink.replace(/^["']|["']$/g, '');
    
    if (!cleanLink) return '';
    
    // Handle Google Drive / Docs links
    if (cleanLink.includes('drive.google.com') || cleanLink.includes('docs.google.com')) {
        const idMatch = cleanLink.match(/\/d\/([^/]+)/) || cleanLink.match(/id=([^&]+)/);
        if (idMatch && idMatch[1]) {
            return `https://lh3.googleusercontent.com/d/${idMatch[1]}`;
        }
    }
    
    // Return direct image link or fallback
    return cleanLink;
};

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
                        <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
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
  const { diuEmployeeData, teacherData, loading, reloadData, updateDiuEmployeeData } = useSheetData();
  
  const toggleSetItem = (set: Set<string>, item: string, setter: (s: Set<string>) => void) => {
    const newSet = new Set(set);
    if (newSet.has(item)) newSet.delete(item);
    else newSet.add(item);
    setter(newSet);
  };

  // Merge teacherData (Teacher_DB) with diuEmployeeData (Employee_DB)
  const combinedEmployees = useMemo(() => {
    const map = new Map<string, DiuEmployeeRow>();
    
    // 1. Add people from the primary Employee database first
    diuEmployeeData.forEach(emp => {
      const id = normalizeId(emp['Employee ID']);
      if (id) map.set(id, { ...emp });
    });

    // 2. Merge/Enrich data from the Teacher database
    teacherData.forEach(t => {
      const id = normalizeId(t['Employee ID']);
      if (!id) return;
      
      const teacherPhoto = findField(t, ['Photo', 'Photo URL', 'Photo Link', 'Image', 'Picture']);
      const teacherEmail = findField(t, ['Email', 'E-mail', 'Email Address']);
      const teacherMobile = findField(t, ['Mobile', 'Mobile Number', 'Mobile No', 'Phone', 'Cell']);
      const teacherName = findField(t, ['Employee Name', 'Name', 'Teacher Name']);
      const teacherDesig = findField(t, ['Designation', 'Academic Designation']);

      if (!map.has(id)) {
        // Create a new record if they don't exist in Employee DB
        map.set(id, {
          'Employee ID': t['Employee ID'] || id.toUpperCase(),
          'Employee Name': teacherName || t['Employee Name'] || '',
          'Administrative Designation': '',
          'Academic Designation': teacherDesig || t.Designation || '',
          'Mobile': teacherMobile || t['Mobile Number'] || '',
          'E-mail': teacherEmail || t.Email || '',
          'IP-Ext': '',
          'Photo': teacherPhoto || '',
          'Facebook': findField(t, ['Facebook']),
          'Linkedin': findField(t, ['Linkedin']),
          'Status': 'Active',
          'Group Name': 'Teacher',
          'Department': t.Department || '',
        });
      } else {
        // Enrich existing record with missing pieces from Teacher DB
        const existing = map.get(id)!;
        if (isValEmpty(existing['Employee Name'])) existing['Employee Name'] = teacherName;
        if (isValEmpty(existing.Mobile)) existing.Mobile = teacherMobile;
        if (isValEmpty(existing['E-mail'])) existing['E-mail'] = teacherEmail;
        if (isValEmpty(existing.Photo)) existing.Photo = teacherPhoto;
        if (isValEmpty(existing['Academic Designation'])) existing['Academic Designation'] = teacherDesig;
      }
    });

    return Array.from(map.values());
  }, [diuEmployeeData, teacherData]);

  const [searchTerm, setSearchTerm] = useState('');
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>('Department');
  
  const [selectedDepartments, setSelectedDepartments] = useState<Set<string>>(new Set());
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(new Set());
  const [selectedMissingFields, setSelectedMissingFields] = useState<Set<string>>(new Set());

  const [selectedEmployee, setSelectedEmployee] = useState<DiuEmployeeRow | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editMode, setEditMode] = useState<'add' | 'edit'>('add');
  const [editingRow, setEditingRow] = useState<Partial<DiuEmployeeRow> | undefined>(undefined);

  const handlePanelUpdate = (newData: DiuEmployeeRow) => {
    // Local Update
    updateDiuEmployeeData(prev => {
        const exists = prev.some(row => normalizeId(row['Employee ID']) === normalizeId(newData['Employee ID']));
        if (exists) {
            return prev.map(row => normalizeId(row['Employee ID']) === normalizeId(newData['Employee ID']) ? { ...row, ...newData } : row);
        }
        return [newData, ...prev];
    });
    
    if (selectedEmployee && normalizeId(selectedEmployee['Employee ID']) === normalizeId(newData['Employee ID'])) {
        setSelectedEmployee({ ...selectedEmployee, ...newData });
    }

    // Persistence to Sheets
    (async () => {
        try {
            let result = await submitSheetData('update', SHEET_NAMES.EMPLOYEE, newData, 'Employee ID', newData['Employee ID'].trim(), REF_SHEET_ID);
            const errorMsg = (result.message || result.error || '').toLowerCase();
            // If the employee doesn't exist in the Employee DB yet, add them
            if (result.result === 'error' && (errorMsg.includes('not found') || errorMsg.includes('no match'))) {
                await submitSheetData('add', SHEET_NAMES.EMPLOYEE, newData, 'Employee ID', newData['Employee ID'].trim(), REF_SHEET_ID, { insertMethod: 'first_empty' });
            }
        } catch (e) {
            console.error("Failed to persist employee update:", e);
        }
    })();
  };

  const { departments, groups, statuses, fieldOptions } = useMemo(() => {
    const depts = new Set<string>(), grps = new Set<string>(), stats = new Set<string>();
    const adminDesigs = new Set<string>(), acadDesigs = new Set<string>();

    combinedEmployees.forEach(e => {
        if (e.Department) depts.add(e.Department);
        if (e['Group Name']) e['Group Name'].split(',').forEach(g => grps.add(g.trim()));
        if (e.Status) stats.add(e.Status);
        if (e['Administrative Designation']) adminDesigs.add(e['Administrative Designation']);
        if (e['Academic Designation']) acadDesigs.add(e['Academic Designation']);
    });
    
    const sortedDepts = Array.from(depts).sort();
    return { 
        departments: sortedDepts, 
        groups: Array.from(grps).sort().filter(Boolean), 
        statuses: Array.from(stats).sort(),
        fieldOptions: { 
            'Department': sortedDepts, 
            'Group Name': Array.from(grps).sort().filter(Boolean), 
            'Status': ['Active', 'Inactive', 'On Leave'],
            'Administrative Designation': Array.from(adminDesigs).sort().filter(Boolean),
            'Academic Designation': Array.from(acadDesigs).sort().filter(Boolean)
        } 
    };
  }, [combinedEmployees]);

  const filteredData = useMemo(() => {
    return combinedEmployees.filter(item => {
        if (selectedMissingFields.size > 0) {
            for (const field of selectedMissingFields) {
                let val = (field === 'Designation') ? (item['Administrative Designation'] || item['Academic Designation'] || '').trim() : (item[field as keyof DiuEmployeeRow] || '').trim();
                if (val !== '') return false;
            }
        }
        if (selectedDepartments.size > 0 && !selectedDepartments.has(item.Department)) return false;
        if (selectedGroups.size > 0 && !(item['Group Name'] || '').split(',').some(g => selectedGroups.has(g.trim()))) return false;
        if (selectedStatuses.size > 0 && !selectedStatuses.has(item.Status)) return false;
        if (!searchTerm) return true;
        const lower = searchTerm.toLowerCase();
        return (item['Employee Name'] || '').toLowerCase().includes(lower) || (item['Employee ID'] || '').toLowerCase().includes(lower) || (item.Mobile || '').includes(lower) || (item['E-mail'] || '').toLowerCase().includes(lower);
    });
  }, [combinedEmployees, searchTerm, selectedDepartments, selectedGroups, selectedStatuses, selectedMissingFields]);

  const { currentPage, setCurrentPage, rowsPerPage, totalPages, paginatedData, containerRef } = useResponsivePagination(filteredData, { defaultRows: 12 });

  const handleModalSuccess = (newData: DiuEmployeeRow) => {
      updateDiuEmployeeData(prev => {
          const exists = prev.some(row => normalizeId(row['Employee ID']) === normalizeId(newData['Employee ID']));
          if (exists) {
              return prev.map(row => normalizeId(row['Employee ID']) === normalizeId(newData['Employee ID']) ? { ...row, ...newData } : row);
          }
          return [newData, ...prev];
      });
      
      if (selectedEmployee && normalizeId(selectedEmployee['Employee ID']) === normalizeId(newData['Employee ID'])) {
          setSelectedEmployee(newData);
      }
  };

  const activeFilterCount = selectedDepartments.size + selectedGroups.size + selectedStatuses.size + selectedMissingFields.size;
  const headerActionsTarget = document.getElementById('header-actions-area');
  const headerTitleTarget = document.getElementById('header-title-area');

  return (
    <div className="flex flex-col h-full bg-white relative">
      <div className={`fixed inset-y-0 left-0 w-56 bg-white shadow-2xl z-50 transform transition-transform duration-300 border-r flex flex-col ${isFilterPanelOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="px-4 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 shrink-0">
              <h2 className="text-sm font-bold text-gray-800">Filters</h2>
              <div className="flex items-center space-x-1">
                  <button onClick={() => { setSelectedDepartments(new Set()); setSelectedGroups(new Set()); setSelectedStatuses(new Set()); setSelectedMissingFields(new Set()); }} className="p-1.5 hover:bg-white rounded text-gray-500"><RotateCcw className="w-4 h-4" /></button>
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
                <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 focus:bg-white focus:border-blue-500 rounded-full text-xs focus:ring-0 w-32 md:w-48 outline-none transition-all" />
            </div>
            <button onClick={() => { setEditMode('add'); setEditingRow(undefined); setIsEditModalOpen(true); }} className="hidden lg:flex items-center px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-[11px] font-bold transition-all shadow-lg active:scale-95"><Plus className="w-4 h-4 mr-1.5" />Add New</button>
            <button onClick={() => reloadData('all', true)} disabled={loading.status === 'loading'} className="p-1.5 text-gray-400 hover:text-blue-600 rounded-full transition-all"><RefreshCw className={`w-4 h-4 ${loading.status === 'loading' ? 'animate-spin' : ''}`} /></button>
          </div>,
          headerActionsTarget
      )}

      <div className="flex-1 overflow-hidden flex flex-row gap-2 p-2 md:p-3 bg-white">
        <div className="flex-1 overflow-hidden bg-transparent relative flex flex-col">
            <div className="flex-1 overflow-y-auto p-2 thin-scrollbar" ref={containerRef}>
                <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 ${selectedEmployee ? 'xl:grid-cols-3' : 'xl:grid-cols-4'} gap-4`}>
                    {paginatedData.map((emp) => (
                        <div key={emp['Employee ID']} onClick={() => setSelectedEmployee(emp)} className={`bg-white rounded-2xl border p-5 shadow-sm hover:shadow-md transition-all flex flex-col relative cursor-pointer group ${selectedEmployee?.['Employee ID'] === emp['Employee ID'] ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50/10' : 'border-gray-100 hover:border-blue-200'}`}>
                            <div className="flex items-start space-x-4 mb-3">
                                <div className="w-16 h-16 rounded-full border-2 border-white shadow-md flex items-center justify-center shrink-0 overflow-hidden relative bg-gray-100 ring-1 ring-gray-100">
                                    {!isValEmpty(emp.Photo) ? <img src={getImageUrl(emp.Photo)} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <User className="w-8 h-8 text-gray-300" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-[15px] font-bold text-slate-900 truncate leading-tight mb-1 group-hover:text-blue-700 transition-colors">{emp['Employee Name']}</h3>
                                    <div className="text-[11px] text-blue-600 font-bold truncate mb-1 uppercase tracking-tighter">{emp['Administrative Designation'] || emp['Academic Designation'] || '-'}</div>
                                    <div className="inline-flex px-2 py-0.5 rounded-md bg-gray-100 text-[9px] font-mono font-bold text-gray-500">ID: {emp['Employee ID']}</div>
                                </div>
                            </div>
                            <div className="space-y-2 mt-auto pt-4 border-t border-gray-50">
                                <div className="flex items-center text-[11px] text-gray-600 truncate"><Building2 className="w-3.5 h-3.5 mr-2.5 text-gray-400" />{emp.Department || '-'}</div>
                                <div className="flex items-center text-[11px] text-gray-600 truncate font-mono"><Phone className="w-3.5 h-3.5 mr-2.5 text-gray-400" />{emp.Mobile || '-'}</div>
                                <div className="flex items-center text-[11px] text-gray-600 truncate"><Mail className="w-3.5 h-3.5 mr-2.5 text-gray-400" />{emp['E-mail'] || '-'}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="bg-gray-50 px-4 py-2 border-t border-gray-100 flex justify-between items-center text-[11px] text-gray-500 font-bold rounded-b-xl shrink-0">
                <span>Displaying {filteredData.length > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0}-{Math.min(currentPage * rowsPerPage, filteredData.length)} of {filteredData.length}</span>
                <div className="flex items-center space-x-2">
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 bg-white border border-gray-300 rounded-lg shadow-sm disabled:opacity-40 transition-colors hover:bg-gray-50 font-bold">Prev</button>
                    <span className="bg-blue-600 text-white px-3 py-1 rounded-lg shadow-sm">Page {currentPage} / {totalPages}</span>
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 bg-white border border-gray-300 rounded-lg shadow-sm disabled:opacity-40 transition-colors hover:bg-gray-50 font-bold">Next</button>
                </div>
            </div>
        </div>
        {selectedEmployee && <EmployeeDetailsPanel employee={selectedEmployee} onClose={() => setSelectedEmployee(null)} onUpdate={handlePanelUpdate} fieldOptions={fieldOptions} />}
      </div>
      
      <EmployeeAddEditModal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        mode={editMode as 'add' | 'edit'} 
        initialData={editingRow} 
        fieldOptions={fieldOptions} 
        onSuccess={handleModalSuccess} 
      />
    </div>
  );
};
