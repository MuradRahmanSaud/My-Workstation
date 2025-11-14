import React, { useState, useMemo, useEffect } from 'react';
import { ProgramSummary } from './ProgramSummary';
import { SectionData, ProgramData, CourseSummaryData, TableHeader, TableView } from '../types';

// Make SheetJS's XLSX object available in the component
declare var XLSX: any;

interface ReportAndExportPanelProps {
  tableView: TableView;
  programData: ProgramData[];
  sectionsData: SectionData[];
  courseSummaryData: CourseSummaryData[];
  unassignedSectionsData: SectionData[];
  lowStudentSectionsData: SectionData[];
  lowClassTakenSectionsData: SectionData[];
  allColumns: TableHeader<SectionData>[];
}

const courseExportableColumns: { label: string; key: keyof CourseSummaryData }[] = [
    { label: 'SEMESTER', key: 'Semester' },
    { label: 'PROGRAM', key: 'Program Short Name' },
    { label: 'COURSE CODE', key: 'Course Code' },
    { label: 'COURSE TITLE', key: 'Course Title' },
    { label: 'CREDIT', key: 'Credit' },
    { label: 'COURSE TYPE', key: 'Course Type' },
    { label: 'TOTAL SECTIONS', key: 'Section' },
    { label: 'CAPACITY', key: 'Capacity' },
    { label: 'STUDENT', key: 'Student' },
    { label: 'VACANCY', key: 'Vacancy' },
];

export const ReportAndExportPanel: React.FC<ReportAndExportPanelProps> = ({ 
    allColumns,
    ...programSummaryProps
}) => {
    const { programData, sectionsData, courseSummaryData, tableView } = programSummaryProps;

    const sectionExportableColumns = useMemo(() => {
        const baseExportColumns = [
            { label: 'SEMESTER', key: 'Semester' as keyof SectionData },
            { label: 'PROGRAM', key: 'PID' as keyof SectionData },
        ];
        
        const tableColumns = allColumns
            .filter(c => !c.render && c.key !== 'PID' && c.key !== 'Semester')
            .map(c => ({ label: c.label.toUpperCase(), key: c.key as keyof SectionData }));

        let finalColumns = [...baseExportColumns, ...tableColumns];

        if (['sections', 'unassigned', 'lowStudent', 'lowClassTaken'].includes(tableView)) {
            const hasSectionIdColumn = finalColumns.some(c => c.key === 'Section ID');
            if (!hasSectionIdColumn) {
                const courseCodeIndex = finalColumns.findIndex(c => c.key === 'Course Code');
                const newColumn = { label: 'SECTION ID', key: 'Section ID' as keyof SectionData };
                if (courseCodeIndex !== -1) {
                    finalColumns.splice(courseCodeIndex, 0, newColumn);
                } else {
                    finalColumns.push(newColumn);
                }
            }
        }
        
        if (['sections', 'lowStudent', 'lowClassTaken'].includes(tableView)) {
            const hasTeacherColumn = finalColumns.some(c => c.key === 'Teacher Name');
            if (!hasTeacherColumn) {
                finalColumns.push({ label: 'TEACHER', key: 'Teacher Name' });
            }
        }
        
        return finalColumns;
    }, [allColumns, tableView]);

    const exportableColumns = useMemo(() => {
        if (tableView === 'courses') {
            return courseExportableColumns.map(({ label, key }) => ({ label: label.toUpperCase(), key: key as string }));
        }
        return sectionExportableColumns;
    }, [tableView, sectionExportableColumns]);
    
    const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
    const [fileName, setFileName] = useState('Program_Summary_Report');

    useEffect(() => {
        setSelectedColumns(exportableColumns.map(c => c.label));
    }, [exportableColumns]);

    const handleSelectAll = () => setSelectedColumns(exportableColumns.map(c => c.label));
    const handleDeselectAll = () => setSelectedColumns([]);

    const handleColumnToggle = (label: string) => {
        setSelectedColumns(prev => 
            prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
        );
    };
    
    const getColumnTitle = (view: TableView): string => {
        // This helper function formats the camelCase view name into a readable title.
        // e.g., 'lowStudent' -> 'No. of Low Student', 'sections' -> 'No. of Sections'
        const title = view
            .replace(/([A-Z])/g, ' $1') // Add space before uppercase letters
            .replace(/^./, (str) => str.toUpperCase()); // Capitalize first letter
        return `No. of ${title}`;
    }
    
    const handleDownload = () => {
        // Helper to calculate column widths from JSON data
        const getJsonColumnWidths = (jsonData: any[], headers: string[]) => {
            const widths = headers.map(h => h.length);
            jsonData.forEach(row => {
                headers.forEach((header, i) => {
                    const cellValue = row[header];
                    const cellLength = cellValue ? String(cellValue).length : 0;
                    if (cellLength > widths[i]) {
                        widths[i] = cellLength;
                    }
                });
            });
            return widths.map(w => ({ wch: w + 2 })); // Add padding
        };
        
        // Helper to calculate column widths from Array-of-Arrays data
        const getAoaColumnWidths = (aoaData: any[][]) => {
            const colWidths: { [key: number]: number } = {};
            aoaData.forEach(row => {
                row.forEach((cell, colIndex) => {
                    const cellLength = cell ? String(cell).length : 0;
                    if (!colWidths[colIndex] || colWidths[colIndex] < cellLength) {
                        colWidths[colIndex] = cellLength;
                    }
                });
            });
            return Object.keys(colWidths).map(key => ({ wch: colWidths[parseInt(key, 10)] + 2 }));
        };

        const getCountUnit = (count: number, view: TableView): number => {
            return count;
        };

        const wb = XLSX.utils.book_new();
        const programInfoMap = new Map<string, { programName: string; facultyName: string }>(
            programData.map(p => [p.PID, { programName: p['Program Short Name'], facultyName: p['Faculty Short Name'] }])
        );

        if (tableView === 'courses') {
            // 1. Create Report Sheet for Courses
            const programCounts = courseSummaryData.reduce((acc: Record<string, number>, course) => {
                acc[course.PID] = (acc[course.PID] || 0) + 1;
                return acc;
            }, {});

            const groupedByFaculty: Record<string, { programName: string; count: number }[]> = {};
            Object.keys(programCounts).forEach(pid => {
                const info = programInfoMap.get(pid);
                if (info) {
                    if (!groupedByFaculty[info.facultyName]) groupedByFaculty[info.facultyName] = [];
                    groupedByFaculty[info.facultyName].push({ programName: info.programName, count: programCounts[pid] });
                }
            });

            const reportSheetData: any[] = [['Faculty', 'Program', getColumnTitle(tableView)]];
            const facultyOrder = ['FBE', 'FE', 'FHLS', 'FHSS', 'FSIT'];
            const sortedFacultyKeys = Object.keys(groupedByFaculty).sort((a,b) => facultyOrder.indexOf(a) - facultyOrder.indexOf(b));

            sortedFacultyKeys.forEach(faculty => {
                reportSheetData.push([faculty, '', '']);
                let subtotal = 0;
                groupedByFaculty[faculty].sort((a, b) => a.programName.localeCompare(b.programName)).forEach(p => {
                    reportSheetData.push(['', p.programName, getCountUnit(p.count, tableView)]);
                    subtotal += p.count;
                });
                reportSheetData.push(['', 'Subtotal', getCountUnit(subtotal, tableView)]);
                reportSheetData.push(['', '', '']);
            });

            const reportWs = XLSX.utils.aoa_to_sheet(reportSheetData);
            reportWs['!cols'] = getAoaColumnWidths(reportSheetData);
            XLSX.utils.book_append_sheet(wb, reportWs, 'Report');
            
            // Helper for mapping course data to export format
            const columnMap = new Map(courseExportableColumns.map(c => [c.label, c.key]));
            const getCourseRowData = (row: CourseSummaryData) => {
                const newRow: Record<string, any> = {};
                selectedColumns.forEach(label => {
                    const key = columnMap.get(label.toUpperCase());
                    if (key) newRow[label.toUpperCase()] = row[key as keyof CourseSummaryData];
                });
                return newRow;
            };

            // 2. Create "All Program" Sheet
            const allProgramData = courseSummaryData.map(getCourseRowData);
            const allProgramHeaders = selectedColumns.map(l => l.toUpperCase());
            const allProgramWs = XLSX.utils.json_to_sheet(allProgramData, { header: allProgramHeaders });
            allProgramWs['!cols'] = getJsonColumnWidths(allProgramData, allProgramHeaders);
            XLSX.utils.book_append_sheet(wb, allProgramWs, 'All Program');

            // 3. Create Program-wise Sheets
            const coursesByProgram = courseSummaryData.reduce((acc, course) => {
                const programName = programInfoMap.get(course.PID)?.programName || 'Unknown';
                if (!acc[programName]) acc[programName] = [];
                acc[programName].push(course);
                return acc;
            }, {} as Record<string, CourseSummaryData[]>);
            
            Object.keys(coursesByProgram).sort().forEach(programName => {
                const programSheetData = coursesByProgram[programName].map(getCourseRowData);
                const safeSheetName = programName.replace(/[\\/*?:"<>|]/g, '').substring(0, 31);
                const programWs = XLSX.utils.json_to_sheet(programSheetData, { header: allProgramHeaders });
                programWs['!cols'] = getJsonColumnWidths(programSheetData, allProgramHeaders);
                XLSX.utils.book_append_sheet(wb, programWs, safeSheetName);
            });

            XLSX.writeFile(wb, `${fileName}.xlsx`);
            return;
        }

        // 1. Create Report Sheet
        const programCounts = sectionsData.reduce((acc: Record<string, number>, section) => {
            acc[section.PID] = (acc[section.PID] || 0) + 1; return acc;
        }, {});

        const groupedByFaculty: Record<string, { programName: string; count: number }[]> = {};
        Object.keys(programCounts).forEach(pid => {
            const info = programInfoMap.get(pid);
            if (info) {
                if (!groupedByFaculty[info.facultyName]) groupedByFaculty[info.facultyName] = [];
                groupedByFaculty[info.facultyName].push({ programName: info.programName, count: programCounts[pid] });
            }
        });
        
        const reportSheetData: any[] = [['Faculty', 'Program', getColumnTitle(tableView)]];
        const facultyOrder = ['FBE', 'FE', 'FHLS', 'FHSS', 'FSIT'];
        const sortedFacultyKeys = Object.keys(groupedByFaculty).sort((a,b) => facultyOrder.indexOf(a) - facultyOrder.indexOf(b));

        sortedFacultyKeys.forEach(faculty => {
            reportSheetData.push([faculty, '', '']); // Faculty Header
            let subtotal = 0;
            groupedByFaculty[faculty].sort((a, b) => a.programName.localeCompare(b.programName)).forEach(p => {
                reportSheetData.push(['', p.programName, getCountUnit(p.count, tableView)]);
                subtotal += p.count;
            });
            reportSheetData.push(['', 'Subtotal', getCountUnit(subtotal, tableView)]); // Subtotal
            reportSheetData.push(['', '', '']); // Spacer
        });

        const reportWs = XLSX.utils.aoa_to_sheet(reportSheetData);
        reportWs['!cols'] = getAoaColumnWidths(reportSheetData);
        XLSX.utils.book_append_sheet(wb, reportWs, 'Report');

        // 2. Create "All Program" Sheet
        const columnMap = new Map(sectionExportableColumns.map(c => [c.label, c.key as keyof SectionData]));
        const allProgramHeaders = selectedColumns.map(l => l.toUpperCase());

        const getRowData = (row: SectionData) => {
            const newRow: Record<string, any> = {};
            selectedColumns.forEach(label => {
                const key = columnMap.get(label.toUpperCase());
                 if (label.toUpperCase() === 'PROGRAM') {
                    newRow[label.toUpperCase()] = programInfoMap.get(row.PID)?.programName || row.PID;
                } else if (label.toUpperCase() === 'TEACHER') {
                    if (!row['Teacher ID'] || !row['Teacher Name']) {
                        newRow[label.toUpperCase()] = 'Not Assigned';
                    } else {
                        const { 'Teacher Name': teacherName, Designation, 'Teacher ID': teacherId } = row;
                        let displayText = teacherName;
                        if (Designation) {
                            displayText = `${displayText}, ${Designation}`;
                        }
                        if (teacherId) {
                            displayText = `${displayText} (${teacherId})`;
                        }
                        newRow[label.toUpperCase()] = displayText;
                    }
                } else if(key) {
                    newRow[label.toUpperCase()] = row[key as keyof SectionData];
                }
            });
            return newRow;
        };

        const allProgramData = sectionsData.map(getRowData);
        const allProgramWs = XLSX.utils.json_to_sheet(allProgramData, { header: allProgramHeaders });
        allProgramWs['!cols'] = getJsonColumnWidths(allProgramData, allProgramHeaders);
        XLSX.utils.book_append_sheet(wb, allProgramWs, 'All Program');

        // 3. Create Program-wise Sheets
        const sectionsByProgram = sectionsData.reduce((acc, section) => {
            const programName = programInfoMap.get(section.PID)?.programName || 'Unknown';
            if (!acc[programName]) acc[programName] = [];
            acc[programName].push(section);
            return acc;
        }, {} as Record<string, SectionData[]>);
        
        Object.keys(sectionsByProgram).sort().forEach(programName => {
            const programSheetData = sectionsByProgram[programName].map(getRowData);
            const safeSheetName = programName.replace(/[\\/*?:"<>|]/g, '').substring(0, 31);
            const programWs = XLSX.utils.json_to_sheet(programSheetData, { header: allProgramHeaders });
            programWs['!cols'] = getJsonColumnWidths(programSheetData, allProgramHeaders);
            XLSX.utils.book_append_sheet(wb, programWs, safeSheetName);
        });

        XLSX.writeFile(wb, `${fileName}.xlsx`);
    };

    const dataLength = useMemo(() => {
        return tableView === 'courses' ? courseSummaryData.length : sectionsData.length;
    }, [tableView, courseSummaryData, sectionsData]);

  return (
    <div className="flex h-full w-full overflow-hidden">
        {/* Left Panel: Report Preview */}
        <div className="flex-grow p-4 overflow-y-auto thin-scrollbar">
            <ProgramSummary {...programSummaryProps} />
        </div>
        
        {/* Right Panel: Export Controls */}
        <div className="w-64 flex-shrink-0 border-l dark:border-gray-700 flex flex-col bg-gray-50 dark:bg-dark-primary/30">
            <div className="p-4 flex-grow overflow-y-auto thin-scrollbar space-y-4 flex flex-col">
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="font-semibold text-gray-700 dark:text-gray-200">Select Columns to Export</h3>
                        <span className="text-xs text-gray-500">{selectedColumns.length} / {exportableColumns.length}</span>
                    </div>
                    <div className="flex space-x-2 mb-3">
                        <button onClick={handleSelectAll} className="flex-1 text-xs px-2 py-1 border rounded-md hover:bg-gray-200 dark:hover:bg-gray-600">Select All</button>
                        <button onClick={handleDeselectAll} className="flex-1 text-xs px-2 py-1 border rounded-md hover:bg-gray-200 dark:hover:bg-gray-600">Deselect All</button>
                    </div>
                    <div className="space-y-1.5 overflow-y-auto thin-scrollbar pr-2 flex-grow">
                        {exportableColumns.map(({label}) => (
                            <label key={label} className="flex items-center space-x-2 text-sm p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selectedColumns.includes(label)}
                                    onChange={() => handleColumnToggle(label)}
                                    className="h-4 w-4 rounded border-gray-300 dark:border-gray-500 text-secondary focus:ring-accent"
                                />
                                <span className="text-gray-700 dark:text-gray-300 select-none">{label.toUpperCase()}</span>
                            </label>
                        ))}
                    </div>
                </div>
            </div>
             <div className="p-4 border-t dark:border-gray-700 flex-shrink-0 space-y-4">
                <div>
                    <label htmlFor="filename" className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Export Filename</label>
                    <input
                        type="text"
                        id="filename"
                        value={fileName}
                        onChange={(e) => setFileName(e.target.value)}
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-accent dark:bg-gray-700"
                    />
                </div>
                <button
                    onClick={handleDownload}
                    disabled={selectedColumns.length === 0 || dataLength === 0}
                    className="w-full px-4 py-2 text-sm font-semibold text-white bg-cyan-600 rounded-md hover:bg-cyan-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                    Download Excel ({dataLength} rows)
                </button>
            </div>
        </div>
    </div>
  );
};