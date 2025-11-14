import React from 'react';
import { SectionData, CourseSummaryData, TeacherSummaryData, ProgramData, TableHeader, TableView } from '../types';
import { DataTable } from './DataTable';
import { CourseDetailRow } from './CourseDetailRow';
import { TeacherDetailRow } from './TeacherDetailRow';

interface SectionDataTableProps {
  tableView: TableView;
  dataForDisplay: SectionData[];
  courseSummaryData: CourseSummaryData[];
  teacherSummaryData: TeacherSummaryData[];
  unassignedSectionsData: SectionData[];
  lowStudentSectionsData: SectionData[];
  lowClassTakenSectionsData: SectionData[];
  sectionTableHeaders: TableHeader<SectionData>[];
  courseSummaryTableHeaders: TableHeader<CourseSummaryData>[];
  teacherSummaryTableHeaders: TableHeader<TeacherSummaryData>[];
  programMap: Map<string, string>;
  googleSheetEmbedUrl: string;
  isSheetView: boolean;
  activeColor: string;
}

export const SectionDataTable: React.FC<SectionDataTableProps> = ({
  tableView,
  dataForDisplay,
  courseSummaryData,
  teacherSummaryData,
  unassignedSectionsData,
  lowStudentSectionsData,
  lowClassTakenSectionsData,
  sectionTableHeaders,
  courseSummaryTableHeaders,
  teacherSummaryTableHeaders,
  programMap,
  googleSheetEmbedUrl,
  isSheetView,
  activeColor,
}) => {
  if (isSheetView) {
    return (
      <iframe
        src={googleSheetEmbedUrl}
        className="w-full h-full border-0"
        title="Google Sheet"
      ></iframe>
    );
  }

  switch (tableView) {
      case 'sections':
          return (
            // FIX: The 'key' prop is not a valid prop for DataTable and was causing a TypeScript error.
            // It has been moved to a wrapper div to preserve the intended remounting behavior when the table view changes.
            <div key={tableView} className="h-full">
              <DataTable<SectionData>
                  data={dataForDisplay}
                  isLoading={false}
                  error={null}
                  headers={sectionTableHeaders}
                  rowKeyAccessor={(row) => row.Ref}
                  headerColor={activeColor}
              />
            </div>
          );
      case 'courses':
          return (
            // FIX: The 'key' prop is not a valid prop for DataTable and was causing a TypeScript error.
            // It has been moved to a wrapper div to preserve the intended remounting behavior when the table view changes.
            <div key={tableView} className="h-full">
              <DataTable<CourseSummaryData>
                  data={courseSummaryData}
                  isLoading={false}
                  error={null}
                  headers={courseSummaryTableHeaders}
                  rowKeyAccessor={(row) => `${row.PID}-${row['Course Code']}`}
                  renderExpandedRow={(row) => <CourseDetailRow course={row} allSections={dataForDisplay} />}
                  headerColor={activeColor}
              />
            </div>
          );
      case 'teachers':
          return (
            // FIX: The 'key' prop is not a valid prop for DataTable and was causing a TypeScript error.
            // It has been moved to a wrapper div to preserve the intended remounting behavior when the table view changes.
            <div key={tableView} className="h-full">
              <DataTable<TeacherSummaryData>
                  data={teacherSummaryData}
                  isLoading={false}
                  error={null}
                  headers={teacherSummaryTableHeaders}
                  rowKeyAccessor={(row) => row['Teacher ID']}
                  renderExpandedRow={(row) => <TeacherDetailRow teacher={row} allSections={dataForDisplay} programMap={programMap} />}
                  headerColor={activeColor}
              />
            </div>
          );
      case 'unassigned':
          return (
            // FIX: The 'key' prop is not a valid prop for DataTable and was causing a TypeScript error.
            // It has been moved to a wrapper div to preserve the intended remounting behavior when the table view changes.
            <div key={tableView} className="h-full">
              <DataTable<SectionData>
                  data={unassignedSectionsData}
                  isLoading={false}
                  error={null}
                  headers={sectionTableHeaders}
                  rowKeyAccessor={(row) => row.Ref}
                  headerColor={activeColor}
              />
            </div>
          );
      case 'lowStudent':
          return (
            // FIX: The 'key' prop is not a valid prop for DataTable and was causing a TypeScript error.
            // It has been moved to a wrapper div to preserve the intended remounting behavior when the table view changes.
            <div key={tableView} className="h-full">
              <DataTable<SectionData>
                  data={lowStudentSectionsData}
                  isLoading={false}
                  error={null}
                  headers={sectionTableHeaders}
                  rowKeyAccessor={(row) => row.Ref}
                  headerColor={activeColor}
              />
            </div>
          );
      case 'lowClassTaken':
          return (
            // FIX: The 'key' prop is not a valid prop for DataTable and was causing a TypeScript error.
            // It has been moved to a wrapper div to preserve the intended remounting behavior when the table view changes.
            <div key={tableView} className="h-full">
              <DataTable<SectionData>
                  data={lowClassTakenSectionsData}
                  isLoading={false}
                  error={null}
                  headers={sectionTableHeaders}
                  rowKeyAccessor={(row) => row.Ref}
                  headerColor={activeColor}
              />
            </div>
          );
      default:
          return null;
  }
};