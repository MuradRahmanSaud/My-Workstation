import React, { useState, useMemo } from 'react';
import { SectionData, CourseSummaryData, TeacherSummaryData, ProgramData, TableHeader, TableView } from '../../types';
import { DashboardMetrics } from '../DashboardMetrics';
import { XIcon } from '../icons/XIcon';
import { useSectionDataProcessor } from '../../hooks/useSectionDataProcessor';
import { SectionViewHeader } from '../SectionViewHeader';
import { SectionDataTable } from '../SectionDataTable';
import { ReportAndExportPanel } from '../SummaryModal';

interface SectionViewProps {
  filteredData: SectionData[];
  programData: ProgramData[];
  isSheetView: boolean;
  setIsSheetView: React.Dispatch<React.SetStateAction<boolean>>;
  onOpenFilterPanel: () => void;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  loadAllData: () => Promise<void>;
  isLoading: boolean;
  googleSheetUrl: string;
  googleSheetEmbedUrl: string;
  sectionTableHeaders: TableHeader<SectionData>[];
  courseSummaryTableHeaders: TableHeader<CourseSummaryData>[];
  teacherSummaryTableHeaders: TableHeader<TeacherSummaryData>[];
  selectedPids: string[];
}

const COURSE_VALIDATION_SHEET_EMBED_URL = 'https://docs.google.com/spreadsheets/d/1WHVthN8KN_lj17LoR0g65qx3LSAGIfEsMJ6ppyRQHx4/edit?rm=minimal#gid=199522004';

// Helper component for the validation sheet view
const CourseValidationSheet = ({ onClose, className }: { onClose: () => void; className?: string }) => (
  <div className={`p-4 bg-gray-50 dark:bg-dark-primary flex flex-col ${className || ''}`}>
    <div className="flex justify-between items-center mb-2 flex-shrink-0">
      <h3 className="font-semibold text-gray-700 dark:text-gray-200">Course Data Validation</h3>
      <button 
        onClick={onClose} 
        className="p-1 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700" 
        aria-label="Close validation sheet"
      >
        <XIcon className="h-5 w-5" />
      </button>
    </div>
    <iframe
      src={COURSE_VALIDATION_SHEET_EMBED_URL}
      className="w-full h-full border rounded-md"
      title="Course Validation Sheet"
    ></iframe>
  </div>
);

const tableViewColors: Record<TableView, string> = {
  courses: 'bg-blue-600 dark:bg-blue-700',
  sections: 'bg-purple-600 dark:bg-purple-700',
  teachers: 'bg-orange-500 dark:bg-orange-600',
  unassigned: 'bg-red-600 dark:bg-red-700',
  lowStudent: 'bg-green-600 dark:bg-green-700',
  lowClassTaken: 'bg-cyan-600 dark:bg-cyan-700',
};

export const SectionView: React.FC<SectionViewProps> = ({
  filteredData,
  programData,
  isSheetView,
  setIsSheetView,
  onOpenFilterPanel,
  searchTerm,
  setSearchTerm,
  loadAllData,
  isLoading,
  googleSheetUrl,
  googleSheetEmbedUrl,
  sectionTableHeaders,
  courseSummaryTableHeaders,
  teacherSummaryTableHeaders,
  selectedPids,
}) => {
  const [tableView, setTableView] = useState<TableView>('courses');
  const [lowStudentThreshold, setLowStudentThreshold] = useState(7);
  const [classTakenThreshold, setClassTakenThreshold] = useState(0);
  const [showCourseValidationSheet, setShowCourseValidationSheet] = useState(false);
  const [isReportViewOpen, setIsReportViewOpen] = useState(false);

  const {
    dashboardStats,
    hasIncompleteCourseData,
    incompleteSectionsData,
    incompleteCourseKeys,
    lowStudentSectionsData,
    lowStudentCount,
    lowClassTakenSectionsData,
    lowClassTakenCount,
    courseSummaryData,
    teacherSummaryData,
    unassignedSectionsData,
    programMap,
    maxStudentCount,
    maxClassTaken,
  } = useSectionDataProcessor(filteredData, programData, lowStudentThreshold, classTakenThreshold);
  
  const activeColor = useMemo(() => {
    return tableViewColors[tableView] || 'bg-cyan-600 dark:bg-cyan-700';
  }, [tableView]);

  const dataForDisplay = useMemo(() => {
    return (showCourseValidationSheet && tableView === 'courses') ? incompleteSectionsData : filteredData;
  }, [showCourseValidationSheet, tableView, incompleteSectionsData, filteredData]);
  
  const courseSummaryDataForDisplay = useMemo(() => {
    if (showCourseValidationSheet && tableView === 'courses') {
      return courseSummaryData.filter(course =>
        incompleteCourseKeys.has(`${course.PID}-${course['Course Code']}`)
      );
    }
    return courseSummaryData;
  }, [showCourseValidationSheet, tableView, courseSummaryData, incompleteCourseKeys]);

  const handleTableViewChange = (view: TableView) => {
    setTableView(view);
    if (view !== 'courses') {
      setShowCourseValidationSheet(false);
    }
  };

  const handleSelectCoursesView = () => {
    handleTableViewChange('courses');
    setShowCourseValidationSheet(false);
  };
  
  const handleToggleCourseValidation = () => {
    setTableView('courses');
    setShowCourseValidationSheet(prev => !prev);
  };

  const handleToggleSheetView = () => {
    if (!isSheetView) {
      setIsReportViewOpen(false);
    }
    setIsSheetView(!isSheetView);
  };

  const handleReportClick = () => {
    if (!isReportViewOpen) {
      setIsSheetView(false);
    }
    setIsReportViewOpen(prev => !prev);
  };

  const isValidationViewActive = showCourseValidationSheet && tableView === 'courses';
  const hasIncompleteCoursesToShow = courseSummaryDataForDisplay.length > 0;

  const renderMainContent = () => {
    if (isReportViewOpen) {
      return (
        <ReportAndExportPanel
            tableView={tableView}
            programData={programData}
            sectionsData={filteredData}
            courseSummaryData={courseSummaryData}
            unassignedSectionsData={unassignedSectionsData}
            lowStudentSectionsData={lowStudentSectionsData}
            lowClassTakenSectionsData={lowClassTakenSectionsData}
            allColumns={sectionTableHeaders}
        />
      );
    }

    if (isSheetView) {
      return (
        <iframe
          src={googleSheetEmbedUrl}
          className="w-full h-full border-0"
          title="Google Sheet"
        ></iframe>
      );
    }

    // This block handles the user's request for the "book" icon functionality.
    // It checks if the validation view should be active.
    if (isValidationViewActive) {
      // If there are courses with incomplete data, show a split view with the
      // filtered course table on top and the validation sheet on the bottom.
      if (hasIncompleteCoursesToShow) {
        return (
          <>
            <div className="flex-1 overflow-auto thin-scrollbar">
              <SectionDataTable
                tableView="courses"
                dataForDisplay={dataForDisplay}
                courseSummaryData={courseSummaryDataForDisplay}
                teacherSummaryData={teacherSummaryData}
                unassignedSectionsData={unassignedSectionsData}
                lowStudentSectionsData={lowStudentSectionsData}
                lowClassTakenSectionsData={lowClassTakenSectionsData}
                sectionTableHeaders={sectionTableHeaders}
                courseSummaryTableHeaders={courseSummaryTableHeaders}
                teacherSummaryTableHeaders={teacherSummaryTableHeaders}
                programMap={programMap}
                googleSheetEmbedUrl={googleSheetEmbedUrl}
                isSheetView={false}
                activeColor={activeColor}
              />
            </div>
            <CourseValidationSheet 
              onClose={() => setShowCourseValidationSheet(false)}
              className="flex-1 border-t dark:border-gray-700"
            />
          </>
        );
      } else {
        // If there are no incomplete courses, show only the validation sheet
        // full-screen to avoid showing an empty "No Data Found" table.
        return (
          <CourseValidationSheet 
            onClose={() => setShowCourseValidationSheet(false)}
            className="flex-grow"
          />
        );
      }
    }

    // Default table view for all other cases.
    return (
      <div className="flex-grow overflow-auto thin-scrollbar">
        <SectionDataTable
          tableView={tableView}
          dataForDisplay={dataForDisplay}
          courseSummaryData={courseSummaryDataForDisplay}
          teacherSummaryData={teacherSummaryData}
          unassignedSectionsData={unassignedSectionsData}
          lowStudentSectionsData={lowStudentSectionsData}
          lowClassTakenSectionsData={lowClassTakenSectionsData}
          sectionTableHeaders={sectionTableHeaders}
          courseSummaryTableHeaders={courseSummaryTableHeaders}
          teacherSummaryTableHeaders={teacherSummaryTableHeaders}
          programMap={programMap}
          googleSheetEmbedUrl={googleSheetEmbedUrl}
          isSheetView={false}
          activeColor={activeColor}
        />
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-dark-secondary rounded-lg shadow-md h-full flex flex-col">
      <SectionViewHeader
        dataForDisplayLength={dataForDisplay.length}
        onOpenFilterPanel={onOpenFilterPanel}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        loadAllData={loadAllData}
        isLoading={isLoading}
        googleSheetUrl={googleSheetUrl}
        isSheetView={isSheetView}
        onToggleSheetView={handleToggleSheetView}
        onReportClick={handleReportClick}
        isReportViewActive={isReportViewOpen}
      />
      <DashboardMetrics
        totalCourses={dashboardStats.totalCourses}
        totalSections={dashboardStats.totalSections}
        totalTeachers={dashboardStats.totalTeachers}
        totalUnassigned={dashboardStats.totalUnassigned}
        onSelectCoursesView={handleSelectCoursesView}
        onSelectSectionsView={() => handleTableViewChange('sections')}
        onSelectTeachersView={() => handleTableViewChange('teachers')}
        onSelectUnassignedView={() => handleTableViewChange('unassigned')}
        activeView={tableView}
        lowStudentCount={lowStudentCount}
        lowStudentThreshold={lowStudentThreshold}
        onLowStudentThresholdChange={setLowStudentThreshold}
        onSelectLowStudentView={() => handleTableViewChange('lowStudent')}
        maxStudentCount={maxStudentCount}
        classTakenCount={lowClassTakenCount}
        classTakenThreshold={classTakenThreshold}
        onClassTakenThresholdChange={setClassTakenThreshold}
        onSelectClassTakenView={() => handleTableViewChange('lowClassTaken')}
        maxClassTaken={maxClassTaken}
        hasIncompleteCourseData={hasIncompleteCourseData}
        onToggleCourseValidationSheet={handleToggleCourseValidation}
      />
      
      <div className="flex-grow flex flex-col overflow-hidden">
        {renderMainContent()}
      </div>
    </div>
  );
};