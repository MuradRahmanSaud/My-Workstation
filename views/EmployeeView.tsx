import React, { useState, useMemo } from 'react';
import { Search, RefreshCw, Mail, Phone, Filter, User, Building2, Plus, Pencil, Trash2, X, RotateCcw, ChevronDown, ChevronRight, CheckSquare, Square, Globe, AlertTriangle } from 'lucide-react';
import { useSheetData } from '../hooks/useSheetData';
import { useResponsivePagination } from '../hooks/useResponsivePagination';
import { DiuEmployeeRow } from '../types';
import { EditEntryModal } from '../components/EditEntryModal';
import { EmployeeDetailsPanel } from '../components/EmployeeDetailsPanel';
import { submitSheetData } from '../services/sheetService';
import { SHEET_NAMES, REF_SHEET_ID } from '../constants';

// Reusable Filter Section Component
const FilterSection = ({ 
    title, 
    items, 
    selectedSet, 
    onToggle, 
    expandedSection, 
    setExpandedSection 
}: {
    title: string,
    items: string[],
    selectedSet: Set<string>,
    onToggle: (item: string) => void,
    expandedSection: string | null,
    setExpandedSection: (s: string | null) => void
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const isExpanded = expandedSection === title;
    
    const filteredItems = items.filter(i => (i || '').toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="border-b border-gray-100 last:border-0">
            <button 
                onClick={() => setExpandedSection(isExpanded ? null : title)}
                className="w-full flex items-center justify-between py-2.5 px-3 hover:bg-gray-50 transition-colors group"
            >
                <div className="flex items-center text-[11px] font-semibold text-gray-700">
                    {title}
                    {selectedSet.size > 0 && (
                        <span className="ml-2 px-1.5 py-0.5 rounded-full text-[9px] bg-blue-100 text-blue-700">
                            {selectedSet.size}
                        </span>
                    )}
                </div>
                {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600" />
                ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600" />
                )}
            </button>
            {isExpanded && (
                <div className="pb-3 px-3">
                    <div className="relative mb-2">
                        <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input 
                            type="text" 
                            placeholder="Search..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-7 pr-2 py-1 text-[10px] border border-gray-200 rounded focus:outline-none focus:border-blue-400 bg-gray-50 focus:bg-white transition-colors"
                        />
                    </div>
                    <div className="max-h-40 overflow-y-auto thin-scrollbar space-y-0.5">
                        {filteredItems.map(item => (
                            <div 
                                key={item} 
                                onClick={() => onToggle(item)}
                                className={`flex items-center p-1.5 rounded cursor-pointer transition-colors ${selectedSet.has(item) ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                            >
                                <div className={`mr-2 ${selectedSet.has(item) ? 'text-blue-600' : 'text-gray-400'}`}>
                                    {selectedSet.has(item) ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                                </div>
                                <span className={`text-[10px] font-medium leading-tight truncate ${selectedSet.has(item) ? 'text-gray-800' : 'text-gray-600'}`} title={item}>
                                    {item || '(Empty)'}
                                </span>
                            </div>
                        ))}
                        {filteredItems.length === 0 && <div className="text-[10px] text-gray-400 text-center py-2">No matches</div>}
                    </div>
                </div>
            )}
        </div>
    );
};

export const EmployeeView: React.FC = () => {
  const { diuEmployeeData, loading, reloadData, updateDiuEmployeeData } = useSheetData();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filter State
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>('Department');
  
  const [selectedDepartments, setSelectedDepartments] = useState<Set<string>>(new Set());
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [selectedAdminDesignations, setSelectedAdminDesignations] = useState<Set<string>>(new Set());
  const [selectedAcademicDesignations, setSelectedAcademicDesignations] = useState<Set<string>>(new Set());
  const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(new Set());

  // Missing Data Filter
  const [selectedMissingFields, setSelectedMissingFields] = useState<Set<string>>(new Set());
  const [departmentBackup, setDepartmentBackup] = useState<Set<string> | null>(null);
  const missingDataOptions = ['Mobile', 'E-mail', 'Photo', 'Department', 'Designation'];

  // Selection & Edit State
  const [selectedEmployee, setSelectedEmployee] = useState<DiuEmployeeRow | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editMode, setEditMode] = useState<'add' | 'edit'>('add');
  const [editingRow, setEditingRow] = useState<DiuEmployeeRow | undefined>(undefined);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Extract unique values for Filters and Edit Form
  const { departments, groups, adminDesignations, academicDesignations, statuses, fieldOptions } = useMemo(() => {
    const depts = new Set<string>();
    const grps = new Set<string>();
    const adminDesigs = new Set<string>();
    const academicDesigs = new Set<string>();
    const stats = new Set<string>();

    diuEmployeeData.forEach(e => {
        if (e.Department) depts.add(e.Department);
        
        // Split groups by comma for unique filter options
        if (e['Group Name']) {
            e['Group Name'].split(',').forEach(g => grps.add(g.trim()));
        }
        
        if (e['Administrative Designation']) adminDesigs.add(e['Administrative Designation']);
        if (e['Academic Designation']) academicDesigs.add(e['Academic Designation']);
        if (e.Status) stats.add(e.Status);
    });

    const sortedDepts = Array.from(depts).sort();
    const sortedGrps = Array.from(grps).sort().filter(Boolean); // Filter empty strings
    const sortedAdminDesigs = Array.from(adminDesigs).sort();
    const sortedAcademicDesigs = Array.from(academicDesigs).sort();
    const sortedStatuses = Array.from(stats).sort();

    return {
        departments: sortedDepts,
        groups: sortedGrps,
        adminDesignations: sortedAdminDesigs,
        academicDesignations: sortedAcademicDesigs,
        statuses: sortedStatuses,
        fieldOptions: {
            'Department': sortedDepts,
            'Administrative Designation': sortedAdminDesigs,
            'Academic Designation': sortedAcademicDesigs,
            'Group Name': sortedGrps,
            'Status': ['Active', 'Inactive', 'On Leave']
        }
    };
  }, [diuEmployeeData]);

  // Filter Data
  const filteredData = useMemo(() => {
    return diuEmployeeData.filter(item => {
        // Missing Data Filter
        if (selectedMissingFields.size > 0) {
            for (const field of selectedMissingFields) {
                let val = '';
                if (field === 'Designation') {
                    // Check either designation field
                    val = (item['Administrative Designation'] || item['Academic Designation'] || '').trim();
                } else {
                    // @ts-ignore
                    val = (item[field] || item[field === 'E-mail' ? 'E-mail' : field] || '').trim();
                }
                if (val !== '') return false; // If valid, skip
            }
        }

        // Department Filter
        if (selectedDepartments.size > 0 && !selectedDepartments.has(item.Department)) {
            return false;
        }

        // Group Filter
        if (selectedGroups.size > 0) {
            const itemGroups = (item['Group Name'] || '').split(',').map(s => s.trim());
            // Check if any of the item's groups match the selected groups (OR logic)
            const hasMatch = itemGroups.some(g => selectedGroups.has(g));
            if (!hasMatch) return false;
        }

        // Administrative Designation Filter
        if (selectedAdminDesignations.size > 0 && !selectedAdminDesignations.has(item['Administrative Designation'])) {
            return false;
        }

        // Academic Designation Filter
        if (selectedAcademicDesignations.size > 0 && !selectedAcademicDesignations.has(item['Academic Designation'])) {
            return false;
        }

        // Status Filter
        if (selectedStatuses.size > 0 && !selectedStatuses.has(item.Status)) {
            return false;
        }

        // Search Filter
        if (!searchTerm) return true;
        const lower = searchTerm.toLowerCase();
        return (
            (item['Employee Name'] || '').toLowerCase().includes(lower) ||
            (item['Employee ID'] || '').toLowerCase().includes(lower) ||
            (item.Mobile || '').includes(lower) ||
            (item['E-mail'] || '').toLowerCase().includes(lower) ||
            (item['Academic Designation'] || '').toLowerCase().includes(lower) ||
            (item['Administrative Designation'] || '').toLowerCase().includes(lower)
        );
    });
  }, [diuEmployeeData, searchTerm, selectedDepartments, selectedGroups, selectedAdminDesignations, selectedAcademicDesignations, selectedStatuses, selectedMissingFields]);

  // Pagination
  const { currentPage, setCurrentPage, rowsPerPage, totalPages, paginatedData, containerRef } = useResponsivePagination(filteredData, { defaultRows: 12 });

  // Helper to get image URL
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

  // --- Actions ---

  const handleCardClick = (emp: DiuEmployeeRow) => {
      setSelectedEmployee(emp);
  };

  const handleAdd = () => {
      setEditMode('add');
      setEditingRow(undefined);
      setIsEditModalOpen(true);
  };

  const handleDelete = async (e: React.MouseEvent, row: DiuEmployeeRow) => {
      e.stopPropagation(); 
      if (!window.confirm(`Are you sure you want to delete ${row['Employee Name']} (${row['Employee ID']})?`)) return;
      
      setIsDeleting(row['Employee ID']);
      try {
          const result = await submitSheetData(
              'delete', 
              SHEET_NAMES.EMPLOYEE, 
              row, 
              'Employee ID', 
              row['Employee ID'], 
              REF_SHEET_ID
          );

          if (result.result === 'success') {
              updateDiuEmployeeData(prev => prev.filter(p => p['Employee ID'] !== row['Employee ID']));
              if (selectedEmployee?.['Employee ID'] === row['Employee ID']) {
                  setSelectedEmployee(null);
              }
          } else {
              alert('Failed to delete: ' + result.message);
          }
      } catch (error) {
          console.error("Delete error:", error);
          alert('An error occurred while deleting.');
      } finally {
          setIsDeleting(null);
      }
  };

  const handleModalSuccess = (newData: any) => {
      if (!newData) return;

      if (editMode === 'add') {
          updateDiuEmployeeData(prev => [newData, ...prev]);
      } else {
          const originalId = editingRow?.['Employee ID'];
          if (originalId) {
              updateDiuEmployeeData(prev => prev.map(row => 
                  row['Employee ID'] === originalId ? { ...row, ...newData } : row
              ));
              if (selectedEmployee?.['Employee ID'] === originalId) {
                  setSelectedEmployee({ ...selectedEmployee, ...newData });
              }
          }
      }
  };

  const handlePanelUpdate = (newData: DiuEmployeeRow) => {
      updateDiuEmployeeData(prev => prev.map(row => 
          row['Employee ID'] === newData['Employee ID'] ? { ...row, ...newData } : row
      ));
      setSelectedEmployee(prev => prev ? { ...prev, ...newData } : prev);
  };

  const toggleSetItem = (set: Set<string>, item: string, setter: (s: Set<string>) => void) => {
      const newSet = new Set(set);
      if (newSet.has(item)) newSet.delete(item);
      else newSet.add(item);
      setter(newSet);
      setCurrentPage(1);
  };

  const handleMissingDataToggle = (field: string) => {
      const newSet = new Set(selectedMissingFields);
      const isAdding = !newSet.has(field);

      if (isAdding) {
          newSet.add(field);
          if (field === 'Department') {
              if (selectedDepartments.size > 0) {
                  setDepartmentBackup(new Set(selectedDepartments));
                  setSelectedDepartments(new Set());
              }
          }
      } else {
          newSet.delete(field);
          if (field === 'Department' && departmentBackup) {
              setSelectedDepartments(departmentBackup);
              setDepartmentBackup(null);
          }
      }
      setSelectedMissingFields(newSet);
      setCurrentPage(1);
  };

  const handleResetFilters = () => {
      setSelectedDepartments(new Set());
      setDepartmentBackup(null);
      setSelectedGroups(new Set());
      setSelectedAdminDesignations(new Set());
      setSelectedAcademicDesignations(new Set());
      setSelectedStatuses(new Set());
      setSelectedMissingFields(new Set());
      setSearchTerm('');
      setCurrentPage(1);
  };

  const activeFilterCount = selectedDepartments.size + selectedGroups.size + selectedAdminDesignations.size + selectedAcademicDesignations.size + selectedStatuses.size + selectedMissingFields.size;

  const renderAccordionSection = (title: string, content: React.ReactNode, count: number, isWarning: boolean = false) => (
      <div className="border-b border-gray-100 last:border-0">
          <button 
              onClick={() => setExpandedSection(expandedSection === title ? null : title)}
              className="w-full flex items-center justify-between py-2.5 px-3 hover:bg-gray-50 transition-colors group"
          >
              <div className={`flex items-center text-[11px] font-semibold ${isWarning ? 'text-red-600' : 'text-gray-700'}`}>
                  {isWarning && <AlertTriangle className="w-3 h-3 mr-1.5" />}
                  {title}
                  {count > 0 && (
                      <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[9px] ${isWarning ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                          {count}
                      </span>
                  )}
              </div>
              {expandedSection === title ? (
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600" />
              ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600" />
              )}
          </button>
          {expandedSection === title && (
              <div className="pb-3 px-3">
                  {content}
              </div>
          )}
      </div>
  );

  const columnsToEdit = [
      'Employee ID',
      'Employee Name',
      'Department',
      'Administrative Designation',
      'Academic Designation',
      'Group Name',
      'Mobile',
      'E-mail',
      'IP-Ext',
      'Status',
      'Photo',
      'Facebook',
      'Linkedin'
  ];

  const multiSelectFields = ['Group Name'];

  return (
    <div className="flex flex-col h-full p-2 space-y-2 bg-gray-50 relative">
      
      {/* Filter Slide-out Panel */}
      <div className={`fixed inset-y-0 left-0 w-64 md:w-56 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out border-r border-gray-200 flex flex-col ${isFilterPanelOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="px-4 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 shrink-0">
              <h2 className="text-sm font-bold text-gray-800">Filter Employees</h2>
              <div className="flex items-center space-x-1">
                  <button 
                      onClick={handleResetFilters} 
                      className="p-1.5 hover:bg-white rounded text-gray-500 transition-colors"
                      title="Reset Filters"
                  >
                      <RotateCcw className="w-4 h-4" />
                  </button>
                  <button onClick={() => setIsFilterPanelOpen(false)} className="p-1.5 hover:bg-white rounded text-gray-500 transition-colors">
                      <X className="w-5 h-5" />
                  </button>
              </div>
          </div>

          <div className="flex-1 overflow-y-auto thin-scrollbar">
              {renderAccordionSection('Has Missing Data', (
                  <div className="flex flex-wrap gap-1.5">
                      {missingDataOptions.map(field => (
                          <button
                              key={field}
                              onClick={() => handleMissingDataToggle(field)}
                              className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${selectedMissingFields.has(field) ? 'bg-red-100 text-red-700 border-red-200' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                          >
                              {field}
                          </button>
                      ))}
                  </div>
              ), selectedMissingFields.size, true)}

              <FilterSection 
                  title="Department" 
                  items={departments} 
                  selectedSet={selectedDepartments} 
                  onToggle={(item) => toggleSetItem(selectedDepartments, item, setSelectedDepartments)}
                  expandedSection={expandedSection}
                  setExpandedSection={setExpandedSection}
              />

              <FilterSection 
                  title="Administrative Designation" 
                  items={adminDesignations} 
                  selectedSet={selectedAdminDesignations} 
                  onToggle={(item) => toggleSetItem(selectedAdminDesignations, item, setSelectedAdminDesignations)}
                  expandedSection={expandedSection}
                  setExpandedSection={setExpandedSection}
              />

              <FilterSection 
                  title="Academic Designation" 
                  items={academicDesignations} 
                  selectedSet={selectedAcademicDesignations} 
                  onToggle={(item) => toggleSetItem(selectedAcademicDesignations, item, setSelectedAcademicDesignations)}
                  expandedSection={expandedSection}
                  setExpandedSection={setExpandedSection}
              />

              <FilterSection 
                  title="Group Name" 
                  items={groups} 
                  selectedSet={selectedGroups} 
                  onToggle={(item) => toggleSetItem(selectedGroups, item, setSelectedGroups)}
                  expandedSection={expandedSection}
                  setExpandedSection={setExpandedSection}
              />

              <FilterSection 
                  title="Status" 
                  items={statuses} 
                  selectedSet={selectedStatuses} 
                  onToggle={(item) => toggleSetItem(selectedStatuses, item, setSelectedStatuses)}
                  expandedSection={expandedSection}
                  setExpandedSection={setExpandedSection}
              />
          </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-3 md:space-y-0 bg-white p-3 rounded border border-gray-200 shadow-sm shrink-0">
        <div className="flex items-center space-x-2 w-full md:w-auto justify-between md:justify-start">
           <div className="flex items-center space-x-2">
               <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide flex items-center">
                 <User className="w-4 h-4 mr-2 text-blue-600" />
                 Employee Directory
               </h2>
               <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] rounded-full font-bold border border-blue-200">
                    {filteredData.length}
               </span>
           </div>
           
           <button 
                onClick={() => reloadData('sections')}
                disabled={loading.status === 'loading'}
                className="md:hidden p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded border border-gray-200"
            >
                <RefreshCw className={`w-4 h-4 ${loading.status === 'loading' ? 'animate-spin' : ''}`} />
            </button>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <button 
                onClick={() => setIsFilterPanelOpen(true)}
                className={`hidden md:flex items-center space-x-1 px-3 py-2 md:py-1.5 text-xs font-bold rounded border transition-all ${activeFilterCount > 0 ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}
            >
                <Filter className="w-3.5 h-3.5" />
                <span>Filter</span>
                {activeFilterCount > 0 && (
                    <span className="bg-blue-600 text-white text-[9px] px-1.5 rounded-full ml-1 min-w-[16px] text-center h-4 flex items-center justify-center">
                        {activeFilterCount}
                    </span>
                )}
            </button>

            <div className="relative group flex-1 md:flex-none hidden md:block">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                <input 
                    type="text" 
                    placeholder="Search employees..." 
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="pl-9 pr-3 py-2 md:py-1.5 bg-gray-50 border border-gray-300 focus:bg-white focus:border-blue-500 rounded text-xs md:text-sm focus:ring-0 w-full md:w-56 outline-none transition-all shadow-sm"
                />
            </div>

            <button 
                onClick={handleAdd}
                className="hidden md:flex items-center px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold transition-all shadow-sm active:scale-95"
            >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Add Employee
            </button>

            <button 
                onClick={() => reloadData('sections')}
                disabled={loading.status === 'loading'}
                className="hidden md:block p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded border border-gray-200 hover:border-blue-200 transition-all disabled:opacity-50"
                title="Refresh"
            >
                <RefreshCw className={`w-3.5 h-3.5 ${loading.status === 'loading' ? 'animate-spin' : ''}`} />
            </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-row gap-2">
        <div className="flex-1 overflow-hidden bg-slate-50/50 rounded border border-gray-200 shadow-sm relative flex flex-col">
            {loading.status === 'loading' && diuEmployeeData.length === 0 && (
                <div className="absolute inset-0 z-20 bg-white/90 flex flex-col items-center justify-center space-y-2">
                    <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm text-gray-500 font-medium animate-pulse">Loading directory...</p>
                </div>
            )}

            {isFilterPanelOpen && (
                <div 
                    className="fixed inset-0 bg-black/40 z-40 md:hidden backdrop-blur-sm transition-opacity"
                    onClick={() => setIsFilterPanelOpen(false)}
                ></div>
            )}

            <div className="flex-1 overflow-y-auto p-2 pb-40 md:pb-2" ref={containerRef}>
                {paginatedData.length > 0 ? (
                    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 ${selectedEmployee ? 'xl:grid-cols-3' : 'xl:grid-cols-4'} gap-2`}>
                        {paginatedData.map((emp) => {
                            const imgUrl = getImageUrl(emp.Photo);
                            const adminDesig = emp['Administrative Designation'];
                            const academicDesig = emp['Academic Designation'];
                            
                            const isThisDeleting = isDeleting === emp['Employee ID'];
                            const isSelected = selectedEmployee?.['Employee ID'] === emp['Employee ID'];

                            return (
                                <div 
                                    key={emp['Employee ID']} 
                                    onClick={() => handleCardClick(emp)}
                                    className={`bg-white rounded-lg border shadow-sm hover:shadow-md transition-all flex flex-col overflow-hidden group relative cursor-pointer ${isThisDeleting ? 'opacity-50 pointer-events-none' : ''} ${isSelected ? 'ring-1 ring-blue-500 border-blue-500' : 'border-gray-200'}`}
                                >
                                    <div className="absolute top-2 right-2 flex space-x-1.5 z-10 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={(e) => handleDelete(e, emp)}
                                            className="p-1 bg-white/90 text-gray-600 hover:text-red-600 hover:bg-red-50 border border-gray-200 rounded-full shadow-sm transition-colors backdrop-blur-sm"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>

                                    <div className="p-3 flex items-start space-x-3">
                                        <div className="w-16 h-16 md:w-12 md:h-12 rounded-full bg-gray-50 border border-white shadow-sm flex items-center justify-center shrink-0 overflow-hidden relative ring-1 ring-gray-100">
                                            {imgUrl ? (
                                                <img 
                                                    src={imgUrl} 
                                                    alt={emp['Employee Name']} 
                                                    className="w-full h-full object-cover" 
                                                    referrerPolicy="no-referrer"
                                                    onError={(e) => {
                                                        const target = e.target as HTMLImageElement;
                                                        target.style.display = 'none';
                                                        target.nextElementSibling?.classList.remove('hidden');
                                                    }}
                                                />
                                            ) : null}
                                            <div className={`w-full h-full flex items-center justify-center ${imgUrl ? 'hidden' : ''}`}>
                                                <User className="w-8 h-8 md:w-6 md:h-6 text-gray-300" />
                                            </div>
                                        </div>
                                        
                                        <div className="flex-1 min-w-0 space-y-0.5">
                                            <h3 className="text-base md:text-sm font-bold text-slate-800 truncate leading-tight" title={emp['Employee Name']}>
                                                {emp['Employee Name']}
                                            </h3>
                                            
                                            {adminDesig && (
                                                <div className="text-xs md:text-[11px] text-blue-600 font-bold truncate" title={adminDesig}>
                                                    {adminDesig} <span className="text-gray-400 font-mono font-normal">({emp['Employee ID']})</span>
                                                </div>
                                            )}
                                            
                                            {academicDesig && (
                                                <div className={`text-xs md:text-[11px] truncate font-medium ${adminDesig ? 'text-slate-500' : 'text-blue-600 font-bold'}`} title={academicDesig}>
                                                    {academicDesig} {!adminDesig && <span className="text-gray-400 font-mono font-normal">({emp['Employee ID']})</span>}
                                                </div>
                                            )}
                                            {!adminDesig && !academicDesig && (
                                                <div className="text-xs md:text-[11px] text-gray-400 font-mono">({emp['Employee ID']})</div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="px-3 pb-3 space-y-1.5">
                                        <div className="flex items-center text-xs md:text-[11px] text-gray-600 truncate" title={emp.Department}>
                                            <Building2 className="w-4 h-4 md:w-3.5 md:h-3.5 mr-2 text-gray-400 shrink-0" />
                                            <span className="truncate">{emp.Department || '-'}</span>
                                        </div>
                                        
                                        <div className="flex items-center text-xs md:text-[11px] text-gray-600 truncate">
                                            <a 
                                                href={emp.Mobile ? `tel:${emp.Mobile}` : undefined} 
                                                onClick={(e) => e.stopPropagation()}
                                                className={`flex items-center transition-colors ${emp.Mobile ? 'hover:text-blue-600' : ''}`}
                                            >
                                                <Phone className="w-4 h-4 md:w-3.5 md:h-3.5 mr-2 text-gray-400 shrink-0" />
                                                <span className="font-medium text-slate-700">{emp.Mobile || '-'}</span>
                                            </a>
                                            
                                            {emp['IP-Ext'] && (
                                                <>
                                                    <span className="mx-1.5 text-gray-300">|</span>
                                                    <Globe className="w-3.5 h-3.5 md:w-3 md:h-3 mr-1 text-purple-400 shrink-0" />
                                                    <span className="font-mono text-purple-600">Ext: {emp['IP-Ext']}</span>
                                                </>
                                            )}
                                        </div>

                                        <div className="flex items-center text-xs md:text-[11px] text-gray-600 truncate" title={emp['E-mail']}>
                                            <a 
                                                href={emp['E-mail'] ? `mailto:${emp['E-mail']}` : undefined} 
                                                onClick={(e) => e.stopPropagation()}
                                                className="flex items-center transition-colors hover:text-blue-600 w-full"
                                            >
                                                <Mail className="w-4 h-4 md:w-3.5 md:h-3.5 mr-2 text-gray-400 shrink-0" />
                                                <span className="truncate">{emp['E-mail'] || '-'}</span>
                                            </a>
                                        </div>
                                    </div>
                                    
                                    {isThisDeleting && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-20">
                                            <div className="flex flex-col items-center">
                                                <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin mb-1"></div>
                                                <span className="text-[10px] font-bold text-red-600">Deleting...</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 py-10">
                        <div className="bg-gray-100 p-4 rounded-full mb-3">
                            <User className="w-8 h-8 opacity-40" />
                        </div>
                        <p className="text-sm font-medium text-gray-500">No employees found.</p>
                        <p className="text-xs text-gray-400 mt-1">Try adjusting your search or filters.</p>
                    </div>
                )}
            </div>
            
            <div className="bg-white px-3 py-2 border-t border-gray-200 flex justify-between items-center text-[10px] text-gray-500 font-medium select-none shrink-0 shadow-[0_-2px_5px_rgba(0,0,0,0.02)] hidden md:flex">
                <div className="flex items-center space-x-2">
                    <span className="hidden sm:inline">Showing</span>
                    <span className="font-bold text-slate-700">
                        {filteredData.length > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0}-
                        {Math.min(currentPage * rowsPerPage, filteredData.length)}
                    </span>
                    <span className="hidden sm:inline">of {filteredData.length}</span>
                </div>

                {totalPages > 1 && (
                    <div className="flex items-center space-x-1">
                        <button 
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                            disabled={currentPage === 1}
                            className="px-2.5 py-1 bg-white border border-gray-200 rounded hover:bg-gray-50 hover:text-blue-600 disabled:opacity-40 transition-colors shadow-sm"
                        >
                            Prev
                        </button>
                        <span className="mx-2 font-bold text-slate-700">{currentPage} <span className="text-gray-400 font-normal">/</span> {totalPages}</span>
                        <button 
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                            disabled={currentPage === totalPages}
                            className="px-2.5 py-1 bg-white border border-gray-200 rounded hover:bg-gray-50 hover:text-blue-600 disabled:opacity-40 transition-colors shadow-sm"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>
        </div>

        {selectedEmployee && (
            <EmployeeDetailsPanel 
                employee={selectedEmployee} 
                onClose={() => setSelectedEmployee(null)}
                onUpdate={handlePanelUpdate}
                fieldOptions={fieldOptions}
            />
        )}
      </div>

      <div className="md:hidden fixed bottom-24 left-8 right-8 bg-white/95 backdrop-blur-md border border-gray-200/80 p-1.5 rounded-full z-40 flex items-center gap-2 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
          <button 
              onClick={() => setIsFilterPanelOpen(true)}
              className={`p-4 rounded-full border flex-shrink-0 transition-colors relative ${activeFilterCount > 0 ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-gray-50/50 border-gray-200 text-gray-600'}`}
          >
              <Filter className="w-5 h-5" />
              {activeFilterCount > 0 && (
                  <span className="absolute top-0 right-0 transform translate-x-1/4 -translate-y-1/4 bg-blue-600 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full border-2 border-white shadow-sm font-bold">
                      {activeFilterCount}
                  </span>
              )}
          </button>
          
          <div className="relative flex-1">
              <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                  type="text" 
                  placeholder="Search employees..." 
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  className="pl-12 pr-5 py-4 w-full bg-gray-50/80 border border-gray-200 rounded-full text-sm font-medium focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all placeholder-gray-400"
              />
          </div>
      </div>

      <button
          onClick={handleAdd}
          className="md:hidden fixed bottom-44 right-5 w-14 h-14 bg-blue-600 text-white rounded-full shadow-xl shadow-blue-600/30 flex items-center justify-center z-40 hover:bg-blue-700 active:scale-90 transition-all hover:scale-105"
      >
          <Plus className="w-7 h-7" />
      </button>

      <EditEntryModal 
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          mode={editMode}
          title={editMode === 'add' ? 'Add Employee' : 'Edit Employee'}
          sheetName={SHEET_NAMES.EMPLOYEE}
          columns={columnsToEdit}
          initialData={editingRow}
          keyColumn="Employee ID"
          spreadsheetId={REF_SHEET_ID}
          fieldOptions={fieldOptions}
          multiSelectFields={multiSelectFields}
          onSuccess={handleModalSuccess}
      />
    </div>
  );
};