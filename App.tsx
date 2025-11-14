// App.tsx
import React, { useState, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { FilterPanel } from './components/FilterPanel';
import { View } from './constants';
import { ProgramData, SectionData, CourseSummaryData, TeacherSummaryData, TableHeader } from './types';
import { useSheetData } from './hooks/useSheetData';
import { useSectionFilters } from './hooks/useSectionFilters';
import { DashboardView } from './components/views/DashboardView';
import { ProgramView } from './components/views/ProgramView';
import { SectionView } from './components/views/SectionView';
import { GenericPlaceholderView } from './components/views/GenericPlaceholderView';
import { CheckIcon } from './components/icons/CheckIcon';
import { ClipboardListIcon } from './components/icons/ClipboardListIcon';

const SHEET_ID = '1WHVthN8KN_lj17LoR0g65qx3LSAGIfEsMJ6ppyRQHx4';
const SHEET_GID = '2107160677';
const GOOGLE_SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit#gid=${SHEET_GID}`;
const GOOGLE_SHEET_EMBED_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit?rm=minimal#gid=${SHEET_GID}`;

const programTableHeaders: TableHeader<ProgramData>[] = [
  { label: 'PID', key: 'PID', align: 'center' },
  { label: 'Faculty Short Name', key: 'Faculty Short Name' },
  { label: 'Faculty Full Name', key: 'Faculty Full Name' },
  { label: 'Program Full Name', key: 'Program Full Name' },
  { label: 'Program Short Name', key: 'Program Short Name' },
  { label: 'Department Name', key: 'Department Name' },
  { label: 'Program Type', key: 'Program Type', align: 'center' },
  { label: 'Semester Type', key: 'Semester Type', align: 'center' },
  { label: 'Semester Duration', key: 'Semester Duration', align: 'center' },
  { label: 'Head', key: 'Head' },
  { label: 'Associate Head', key: 'Associate Head' },
  { label: 'Administration', key: 'Administration' },
];

const CopyCourseInfoButton: React.FC<{ row: CourseSummaryData }> = ({ row }) => {
    const [isCopied, setIsCopied] = React.useState(false);
    
    // Format for simple text paste (e.g., into a search box)
    const compactText = `${row.PID}/${row.Credit}/${row.Type}`;
    
    // HTML table format for multi-column paste in spreadsheets
    const tableHtml = `<table><tr><td>${row.PID}</td><td>${row['Program Short Name']}</td><td>${row.Credit}</td><td>${row.Type}</td></tr></table>`;

    const handleCopy = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        if (!row.Type) {
            return;
        }

        try {
            // Modern Clipboard API to provide two formats.
            // Spreadsheets (like Excel) prefer text/html for Ctrl+V, pasting the table.
            // Plain text inputs (like Find boxes) use text/plain for Ctrl+V.
            // Ctrl+Shift+V will always use text/plain.
            const htmlBlob = new Blob([tableHtml], { type: 'text/html' });
            const textBlob = new Blob([compactText], { type: 'text/plain' });

            const clipboardItem = new (window as any).ClipboardItem({
                'text/html': htmlBlob,
                'text/plain': textBlob,
            });

            navigator.clipboard.write([clipboardItem]).then(() => {
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 2000);
            }).catch(err => {
                console.warn('Failed to write ClipboardItem, falling back to compact text.', err);
                // Fallback to just copying the compact text.
                navigator.clipboard.writeText(compactText);
            });
        } catch (error) {
            // Fallback for older browsers.
            console.warn('ClipboardItem not supported, falling back to compact text.', error);
            navigator.clipboard.writeText(compactText).then(() => {
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 2000);
            });
        }
    };

    return (
        <button 
            onClick={handleCopy}
            disabled={!row.Type || isCopied}
            className={`flex items-center justify-center w-24 px-2 py-1 text-xs font-semibold rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-dark-secondary
            ${isCopied 
                ? 'bg-emerald-500 text-white focus:ring-emerald-400' 
                : 'bg-accent text-white hover:bg-secondary focus:ring-accent'
            }
            disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed`}
            title={row.Type ? `Copy: Pastes '${compactText}' in text fields, or columns in spreadsheets.` : 'Type not available'}
        >
            {isCopied ? (
                <>
                    <CheckIcon className="h-3 w-3 mr-1" />
                    <span>Copied</span>
                </>
            ) : (
                 <span className="truncate">{compactText}</span>
            )}
        </button>
    );
};


const courseSummaryTableHeaders: TableHeader<CourseSummaryData>[] = [
  { 
    label: 'ACTION', 
    key: 'action',
    align: 'center',
    render: (row: CourseSummaryData) => (
      <div className="flex justify-center items-center">
        <CopyCourseInfoButton row={row} />
      </div>
    )
  },
  { label: 'PROGRAM', key: 'Program Short Name', align: 'center' },
  { label: 'COURSE CODE', key: 'Course Code' },
  { 
    label: 'COURSE TITLE', 
    key: 'Course Title',
    render: (row: CourseSummaryData) => <div className="w-64 whitespace-normal break-words">{row['Course Title']}</div>
  },
  { label: 'CREDIT', key: 'Credit', align: 'center' },
  { label: 'TOTAL SECTIONS', key: 'Section', align: 'center' },
  { label: 'TOTAL CAPACITY', key: 'Capacity', align: 'center' },
  { label: 'TOTAL STUDENTS', key: 'Student', align: 'center' },
  { label: 'TOTAL VACANCY', key: 'Vacancy', align: 'center' },
];

const teacherSummaryTableHeaders: TableHeader<TeacherSummaryData>[] = [
    { label: 'TEACHER ID', key: 'Teacher ID' },
    { label: 'TEACHER NAME', key: 'Teacher Name' },
    { label: 'DESIGNATION', key: 'Designation' },
    { label: 'CREDIT LOAD', key: 'Credit Load', align: 'center' },
    { label: 'STUDENT COUNT', key: 'Student Count', align: 'center' },
    { label: 'TOTAL SECTIONS', key: 'Total Sections', align: 'center' },
    { label: 'MOBILE', key: 'Mobile' },
    { label: 'EMAIL', key: 'Email' },
];


const App: React.FC = () => {
  const [activeView, setActiveView] = useState<View>(View.SECTION);
  const [isSheetView, setIsSheetView] = useState(false);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const openFilterPanel = () => {
    setIsSidebarOpen(false);
    setIsFilterPanelOpen(true);
  };

  const closeFilterPanel = () => {
    setIsFilterPanelOpen(false);
    setIsSidebarOpen(true);
  };

  const { sheetData, programData, isLoading, error, loadAllData } = useSheetData();

  const programMap = useMemo(() => 
    new Map(programData.map(p => [p.PID, p['Program Short Name']])), 
  [programData]);

  const sectionTableHeaders: TableHeader<SectionData>[] = [
    { 
      label: 'PROGRAM', 
      key: 'PID',
      render: (row: SectionData) => programMap.get(row.PID) || row.PID
    },
    { label: 'COURSE CODE', key: 'Course Code' },
    { label: 'COURSE TITLE', key: 'Course Title' },
    { label: 'SECTION', key: 'Section', align: 'center' },
    { label: 'CREDIT', key: 'Credit', align: 'center' },
    { label: 'STUDENTS', key: 'Student', align: 'center' },
    { label: 'CAPACITY', key: 'Section Capacity', align: 'center' },
    { label: 'CLASSES TAKEN', key: 'Class Taken', align: 'center' },
    { label: 'COURSE TYPE', key: 'Course Type', align: 'center' },
    { 
      label: 'TEACHER', 
      key: 'Teacher Name',
      render: (row: SectionData) => {
        if (!row['Teacher ID'] || !row['Teacher Name']) {
          return <span className="text-gray-500 italic">Not Assigned</span>;
        }
        const { 'Teacher Name': teacherName, Designation, 'Teacher ID': teacherId } = row;
        let displayText = teacherName;
        if (Designation) {
          displayText = `${displayText}, ${Designation}`;
        }
        if (teacherId) {
          displayText = `${displayText} (${teacherId})`;
        }
        return displayText;
      }
    },
  ];

  const {
    filteredData,
    searchTerm,
    setSearchTerm,
    selectedSemesters,
    setSelectedSemesters,
    selectedPids,
    setSelectedPids,
    sortedSemesters,
    attributeFilters,
    setAttributeFilters,
    resetFilters,
  } = useSectionFilters(sheetData);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-full">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-cyan-600"></div>
        </div>
      );
    }
    
    if (error) {
       return (
        <div className="p-4 m-4 text-center text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20 rounded-md">
          <h3 className="font-bold">Error loading data</h3>
          <p>{error}</p>
        </div>
      );
    }

    switch (activeView) {
      case View.DASHBOARD:
        return <DashboardView />;
      case View.PROGRAM:
        return <ProgramView programData={programData} headers={programTableHeaders} />;
      case View.SECTION:
        return (
          <SectionView
            filteredData={filteredData}
            programData={programData}
            isSheetView={isSheetView}
            setIsSheetView={setIsSheetView}
            onOpenFilterPanel={openFilterPanel}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            loadAllData={loadAllData}
            isLoading={isLoading}
            googleSheetUrl={GOOGLE_SHEET_URL}
            googleSheetEmbedUrl={GOOGLE_SHEET_EMBED_URL}
            sectionTableHeaders={sectionTableHeaders}
            courseSummaryTableHeaders={courseSummaryTableHeaders}
            teacherSummaryTableHeaders={teacherSummaryTableHeaders}
            selectedPids={selectedPids}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen text-gray-800 dark:text-gray-200">
      <Sidebar isOpen={isSidebarOpen} activeView={activeView} setActiveView={setActiveView} />
      <FilterPanel
        isOpen={isFilterPanelOpen}
        onClose={closeFilterPanel}
        programs={programData}
        selectedPids={selectedPids}
        onProgramSelect={setSelectedPids}
        sheetData={sheetData}
        attributeFilters={attributeFilters}
        onAttributeFiltersChange={setAttributeFilters}
        sortedSemesters={sortedSemesters}
        selectedSemesters={selectedSemesters}
        setSelectedSemesters={setSelectedSemesters}
        onResetFilters={resetFilters}
      />
      <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 dark:bg-dark-primary p-4">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;