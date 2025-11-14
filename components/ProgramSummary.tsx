import React, { useMemo, useState } from 'react';
import { SectionData, ProgramData, CourseSummaryData, TableView } from '../types';
import { ClipboardListIcon } from './icons/ClipboardListIcon';
import { CheckIcon } from './icons/CheckIcon';

interface ProgramSummaryProps {
  tableView: TableView;
  programData: ProgramData[];
  sectionsData: SectionData[];
  courseSummaryData: CourseSummaryData[];
  unassignedSectionsData: SectionData[];
  lowStudentSectionsData: SectionData[];
  lowClassTakenSectionsData: SectionData[];
}


const facultyChartColors: { [key: string]: string } = {
    'FBE': 'bg-red-500',
    'FE': 'bg-amber-500',
    'FHLS': 'bg-emerald-500',
    'FHSS': 'bg-sky-500',
    'FSIT': 'bg-orange-500',
    'DEFAULT': 'bg-gray-500',
};

const SummaryChart: React.FC<{ summaryData: Record<string, { pid: string; programName: string; count: number }[]>; chartTitle: string }> = ({ summaryData, chartTitle }) => {
    const chartData = useMemo(() => {
        return Object.keys(summaryData).flatMap(facultyName => {
            const programs = summaryData[facultyName];
            return programs.map(p => ({ ...p, facultyName }));
        });
    }, [summaryData]);

    const maxValue = useMemo(() => {
        const max = Math.max(...chartData.map(d => d.count), 0);
        return max === 0 ? 1 : max; // Avoid division by zero
    }, [chartData]);
    
    const facultyOrder = ['FBE', 'FE', 'FHLS', 'FHSS', 'FSIT'];

    const faculties = useMemo(() => {
        return [...new Set(chartData.map(d => d.facultyName))].sort((a: string,b: string) => facultyOrder.indexOf(a) - facultyOrder.indexOf(b));
    }, [chartData]);


    if (chartData.length === 0) return null;

    return (
        <div className="w-full p-4 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm bg-white dark:bg-dark-secondary">
            <h3 className="text-lg font-semibold text-center mb-4 text-gray-800 dark:text-gray-200">{chartTitle} Distribution by Program</h3>
            
            <div className="w-full h-64 overflow-x-auto thin-scrollbar pb-10 pt-10">
                <div className="flex h-full items-end space-x-4 min-w-max px-2 border-b-2 border-gray-200 dark:border-gray-600">
                    {chartData.map((item, index) => (
                        <div key={index} className="group relative flex-1 flex flex-col items-center justify-end h-full min-w-[20px] text-center">
                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 transition-opacity duration-300 group-hover:font-bold" style={{
                                position: 'absolute',
                                bottom: `calc(${(item.count / maxValue) * 100}% + 4px)`,
                                left: '50%',
                                transform: 'translateX(-50%)',
                                opacity: item.count > 0 ? 1 : 0,
                            }}>
                                {item.count}
                            </span>
                            <div 
                                className={`w-full rounded-t-sm transition-all duration-300 hover:opacity-80 ${facultyChartColors[item.facultyName] || facultyChartColors.DEFAULT}`}
                                style={{ height: `${(item.count / maxValue) * 100}%` }}
                                title={`${item.pid} (${item.programName}): ${item.count}`}
                                aria-label={`${item.pid} (${item.programName}): ${item.count}`}
                            >
                                <div className="absolute bottom-full mb-2 w-max px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none transform -translate-x-1/2 left-1/2 z-10">
                                    <strong>{item.pid}</strong> ({item.programName}): {item.count}
                                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-800"></div>
                                </div>
                            </div>
                             <span className="absolute -bottom-8 text-xs text-gray-500 dark:text-gray-400 mt-1 origin-center transform -rotate-45 whitespace-nowrap">
                                {item.pid}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex justify-center flex-wrap gap-x-4 gap-y-2 mt-6">
                {faculties.map(faculty => (
                    <div key={faculty} className="flex items-center space-x-1.5 text-sm">
                        <div className={`w-3 h-3 rounded-sm ${facultyChartColors[faculty] || facultyChartColors.DEFAULT}`}></div>
                        <span className="text-gray-600 dark:text-gray-300">{faculty}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};


export const ProgramSummary: React.FC<ProgramSummaryProps> = ({
  tableView,
  programData,
  sectionsData,
  courseSummaryData,
  unassignedSectionsData,
  lowStudentSectionsData,
  lowClassTakenSectionsData,
}) => {
  const [isCopied, setIsCopied] = useState(false);

  const { title, dataToProcess } = useMemo(() => {
    switch (tableView) {
      case 'courses':
        return { title: 'No. of Courses', dataToProcess: courseSummaryData };
      case 'teachers':
        return { title: 'No. of Teachers', dataToProcess: sectionsData };
      case 'unassigned':
        return { title: 'No. of Unassigned', dataToProcess: unassignedSectionsData };
      case 'lowStudent':
        return { title: 'No. of Low Student', dataToProcess: lowStudentSectionsData };
      case 'lowClassTaken':
        return { title: 'No. of Class Taken', dataToProcess: lowClassTakenSectionsData };
      case 'sections':
      default:
        return { title: 'No. of Sections', dataToProcess: sectionsData };
    }
  }, [
    tableView,
    sectionsData,
    courseSummaryData,
    unassignedSectionsData,
    lowStudentSectionsData,
    lowClassTakenSectionsData,
  ]);

  const getCountUnit = (count: number, view: TableView): string => {
    return String(count);
  };

  const summaryData = useMemo(() => {
    const programInfoMap = new Map<string, { programName: string; facultyName: string }>(
      programData.map(p => [
        p.PID,
        {
          programName: p['Program Short Name'],
          facultyName: p['Faculty Short Name'],
        },
      ])
    );

    let programCounts: Record<string, number>;

    if (tableView === 'teachers') {
      const teacherAssignments = (dataToProcess as SectionData[]).reduce((acc, section) => {
        const pid = section.PID;
        const teacherId = section['Teacher ID'];
        if (pid && teacherId) {
          if (!acc[pid]) {
            acc[pid] = new Set();
          }
          acc[pid].add(teacherId);
        }
        return acc;
      }, {} as Record<string, Set<string>>);
      programCounts = Object.fromEntries(
        Object.entries(teacherAssignments).map(([pid, teacherSet]) => [pid, teacherSet.size])
      );
    } else if (tableView === 'courses') {
      programCounts = (dataToProcess as CourseSummaryData[]).reduce((acc, course) => {
        acc[course.PID] = (acc[course.PID] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
    } else {
      // Handles sections, unassigned, lowStudent, lowClassTaken
      programCounts = (dataToProcess as SectionData[]).reduce((acc, section) => {
        acc[section.PID] = (acc[section.PID] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
    }

    const groupedByFaculty: Record<string, { pid: string; programName: string; count: number }[]> = {};

    for (const pid in programCounts) {
      const programInfo = programInfoMap.get(pid);
      if (programInfo) {
        const { facultyName, programName } = programInfo;
        if (!groupedByFaculty[facultyName]) {
          groupedByFaculty[facultyName] = [];
        }
        groupedByFaculty[facultyName].push({
          pid: pid,
          programName: programName,
          count: programCounts[pid],
        });
      }
    }

    for (const faculty in groupedByFaculty) {
      groupedByFaculty[faculty].sort((a, b) => a.programName.localeCompare(b.programName));
    }

    return groupedByFaculty;
  }, [dataToProcess, tableView, programData]);

  const facultyOrder = ['FBE', 'FE', 'FHLS', 'FHSS', 'FSIT'];
  const sortedFacultyKeys = Object.keys(summaryData).sort((a, b) => {
    const indexA = facultyOrder.indexOf(a);
    const indexB = facultyOrder.indexOf(b);
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return a.localeCompare(b);
  });
  
  const handleCopy = () => {
    let plainText = '';
    
    const htmlCells = sortedFacultyKeys.map(facultyName => {
        const programs = summaryData[facultyName];
        const subtotal = programs.reduce((sum, p) => sum + p.count, 0);

        plainText += `${facultyName}\nProgram\t${title}\n`;
        programs.forEach(p => { plainText += `${p.programName}\t${getCountUnit(p.count, tableView)}\n`; });
        plainText += `Subtotal\t${getCountUnit(subtotal, tableView)}\n\n`;

        const cardContent = `<div style="border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; box-shadow: 0 1px 2px 0 rgba(0,0,0,0.05); page-break-inside: avoid; width: 220px; background-color: #ffffff;">
            <div style="padding: 6px 8px; text-align: center; font-weight: bold; color: #334155; border-bottom: 1px solid #e2e8f0; background-color: #f8fafc;">
                ${facultyName}
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 9pt;">
                <thead>
                    <tr style="background-color: #0891b2; color: white;">
                        <th style="padding: 2px 8px; text-align: left; font-weight: 600;">Program</th>
                        <th style="padding: 2px 8px; text-align: right; font-weight: 600; white-space: nowrap;">${title}</th>
                    </tr>
                </thead>
                <tbody style="background-color: white;">
                    ${programs.map(p => `
                    <tr style="border-top: 1px solid #f1f5f9;">
                        <td style="padding: 2px 8px;">${p.programName}</td>
                        <td style="padding: 2px 8px; text-align: right; font-weight: 500;">${getCountUnit(p.count, tableView)}</td>
                    </tr>
                    `).join('')}
                </tbody>
                <tfoot style="background-color: #f0f9ff;">
                    <tr>
                        <td style="padding: 2px 8px; font-weight: bold; color: #0f172a;">Subtotal</td>
                        <td style="padding: 2px 8px; text-align: right; font-weight: bold; color: #0f172a;">${getCountUnit(subtotal, tableView)}</td>
                    </tr>
                </tfoot>
            </table>
        </div>`;
        return `<td style="vertical-align: top; padding: 0 4px 4px 0;">${cardContent}</td>`;
    });

    const htmlTable = `<table style="border-collapse: collapse; border-spacing: 0;"><tbody><tr>${htmlCells.join('')}</tr></tbody></table>`;
    const html = `<div style="font-family: Arial, sans-serif; font-size: 10pt;">${htmlTable}</div>`;

    try {
      const blobHtml = new Blob([html], { type: 'text/html' });
      const blobText = new Blob([plainText.trim()], { type: 'text/plain' });
      const clipboardItem = new ClipboardItem({
        'text/html': blobHtml,
        'text/plain': blobText,
      });

      navigator.clipboard.write([clipboardItem]).then(() => {
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 2000);
      }, (err) => {
          console.error("Failed to copy rich text, falling back to plain text.", err);
          navigator.clipboard.writeText(plainText.trim());
      });
    } catch (error) {
        console.error("Clipboard API not supported, falling back to plain text.", error);
        navigator.clipboard.writeText(plainText.trim());
    }
  };


  if (sortedFacultyKeys.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-center text-gray-500 dark:text-gray-400">
        <p>No summary data available for the current filters.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex justify-between items-center flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">{title} Distribution Report</h2>
          <button
            onClick={handleCopy}
            disabled={isCopied}
            className={`flex items-center space-x-1.5 px-3 py-1.5 text-sm font-semibold rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-dark-secondary
            ${isCopied 
                ? 'bg-emerald-500 text-white focus:ring-emerald-400' 
                : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500 focus:ring-accent'
            }`}
          >
            {isCopied ? (
                <>
                    <CheckIcon className="h-4 w-4" />
                    <span>Copied!</span>
                </>
            ) : (
                <>
                    <ClipboardListIcon className="h-4 w-4" />
                    <span>Copy Report</span>
                </>
            )}
          </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {sortedFacultyKeys.map(facultyName => {
          const programs = summaryData[facultyName];
          const subtotal = programs.reduce((sum, p) => sum + p.count, 0);

          return (
            <div key={facultyName} className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden shadow-sm flex flex-col">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-dark-accent">
                  <tr>
                    <th colSpan={2} className="px-3 py-1.5 text-center font-bold text-gray-700 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700">
                      {facultyName}
                    </th>
                  </tr>
                  <tr className="bg-cyan-600 dark:bg-cyan-700 text-white">
                    <th className="px-3 py-1 text-left font-semibold">Program</th>
                    <th className="px-3 py-1 text-right font-semibold whitespace-nowrap">{title}</th>
                  </tr>
                </thead>
              </table>
              <div className="overflow-y-auto thin-scrollbar flex-grow">
                <table className="w-full text-sm">
                  <tbody className="bg-white dark:bg-dark-secondary divide-y divide-gray-200 dark:divide-gray-700">
                    {programs.map(({ programName, count }) => (
                      <tr key={programName}>
                        <td className="px-3 py-1 whitespace-nowrap">{programName}</td>
                        <td className="px-3 py-1 text-right font-medium">{getCountUnit(count, tableView)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <table className="w-full text-sm">
                <tfoot className="bg-cyan-100/50 dark:bg-cyan-900/30">
                  <tr>
                    <td className="px-3 py-1 font-bold text-gray-800 dark:text-gray-200">Subtotal</td>
                    <td className="px-3 py-1 text-right font-bold text-gray-800 dark:text-gray-200">{getCountUnit(subtotal, tableView)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          );
        })}
      </div>
      <SummaryChart summaryData={summaryData} chartTitle={title} />
    </div>
  );
};