import React, { useMemo, useState, useEffect, useRef } from 'react';
import { SectionData, ProgramData, CourseSummaryData, TableView } from '../types';
import { ClipboardListIcon } from './icons/ClipboardListIcon';
import { CheckIcon } from './icons/CheckIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { SummaryIcon } from './icons/SummaryIcon';
import { ClipboardDocumentIcon } from './icons/ClipboardDocumentIcon';
import { SummaryChart } from './SummaryChart';

interface ProgramSummaryProps {
  tableView: TableView;
  programData: ProgramData[];
  sectionsData: SectionData[];
  courseSummaryData: CourseSummaryData[];
  unassignedSectionsData: SectionData[];
  lowStudentSectionsData: SectionData[];
  lowClassTakenSectionsData: SectionData[];
}


const facultyHexColors: { [key: string]: string } = {
    'FBE': '#ef4444',
    'FE': '#f59e0b',
    'FHLS': '#10b981',
    'FHSS': '#0ea5e9',
    'FSIT': '#f97316',
    'DEFAULT': '#6b7280',
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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const facultyInfoMap = useMemo(() => {
    const map = new Map<string, string>();
    programData.forEach(p => {
        if (!map.has(p['Faculty Short Name'])) {
            map.set(p['Faculty Short Name'], p['Faculty Full Name']);
        }
    });
    return map;
  }, [programData]);


  const { title, dataToProcess } = useMemo(() => {
    switch (tableView) {
      case 'courses':
        return { title: 'Courses', dataToProcess: courseSummaryData };
      case 'teachers':
        return { title: 'Teachers', dataToProcess: sectionsData };
      case 'unassigned':
        return { title: 'Unassigned', dataToProcess: unassignedSectionsData };
      case 'lowStudent':
        return { title: 'Low Student', dataToProcess: lowStudentSectionsData };
      case 'lowClassTaken':
        return { title: 'Class Taken', dataToProcess: lowClassTakenSectionsData };
      case 'sections':
      default:
        return { title: 'Sections', dataToProcess: sectionsData };
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

  const triggerCopy = (htmlContent: string, textContent: string) => {
     try {
      const blobHtml = new Blob([htmlContent], { type: 'text/html' });
      const blobText = new Blob([textContent.trim()], { type: 'text/plain' });
      const clipboardItem = new ClipboardItem({
        'text/html': blobHtml,
        'text/plain': blobText,
      });

      navigator.clipboard.write([clipboardItem]).then(() => {
          setIsDropdownOpen(false);
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 2000);
      }, (err) => {
          console.error("Failed to copy rich text, falling back to plain text.", err);
          navigator.clipboard.writeText(textContent.trim());
      });
    } catch (error) {
        console.error("Clipboard API not supported, falling back to plain text.", error);
        navigator.clipboard.writeText(textContent.trim());
    }
  };
  
  const handleCopyReport = () => {
    let plainText = '';
    
    const htmlCells = sortedFacultyKeys.map(facultyName => {
        const programs = summaryData[facultyName];
        const subtotal = programs.reduce((sum, p) => sum + p.count, 0);
        const facultyMaxValue = Math.max(...programs.map(p => p.count), 0);

        plainText += `${facultyName}\nProgram\t${title}\n`;
        programs.forEach(p => { plainText += `${p.programName}\t${getCountUnit(p.count, tableView)}\n`; });
        plainText += `Subtotal\t${getCountUnit(subtotal, tableView)}\n\n`;
        
        const programRowsHtml = programs.map(p => {
            const barWidth = facultyMaxValue > 0 ? (p.count / facultyMaxValue) * 100 : 0;
            const color = facultyHexColors[facultyName] || facultyHexColors.DEFAULT;
            return `
                <tr style="border-top: 1px solid #f1f5f9;">
                    <td style="padding: 3px 8px; vertical-align: middle; white-space: nowrap;">
                        <table style="border-collapse: collapse;"><tbody><tr>
                            <td style="padding: 0; white-space: nowrap; vertical-align: middle;" title="${p.programName}">${p.programName}</td>
                            <td style="width: 45px; padding: 0 0 0 8px; vertical-align: middle;">
                                <div style="height: 4px; width: ${barWidth}%; background-color: ${color}; border-radius: 2px;" title="${barWidth.toFixed(1)}%"></div>
                            </td>
                        </tr></tbody></table>
                    </td>
                    <td style="padding: 2px 8px; text-align: right; font-weight: 500; vertical-align: middle; white-space: nowrap;">
                        ${getCountUnit(p.count, tableView)}
                    </td>
                </tr>
            `;
        }).join('');

        const cardContent = `<div style="border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; box-shadow: 0 1px 2px 0 rgba(0,0,0,0.05); page-break-inside: avoid; background-color: #ffffff; display: inline-block;">
            <div style="padding: 6px 8px; text-align: center; font-weight: bold; color: #334155; border-bottom: 1px solid #e2e8f0; background-color: #f8fafc;">
                ${facultyName}
            </div>
            <table style="border-collapse: collapse; font-size: 9pt;">
                <thead>
                    <tr style="background-color: #0891b2; color: white;">
                        <th style="padding: 2px 8px; text-align: left; font-weight: 600; white-space: nowrap;">Program</th>
                        <th style="padding: 2px 8px; text-align: right; font-weight: 600; white-space: nowrap;">${title}</th>
                    </tr>
                </thead>
                <tbody style="background-color: white;">
                    ${programRowsHtml}
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
    triggerCopy(html, plainText);
  };

  const handleCopyChart = () => {
    const chartData = sortedFacultyKeys.flatMap(facultyName => 
        summaryData[facultyName].map(p => ({ ...p, facultyName }))
    );
    const maxValue = Math.max(...chartData.map(d => d.count), 0) || 1;

    let plainText = `${title} Distribution by Program\n\nFACULTY\tPROGRAM\tPID\tCOUNT\n`;
    chartData.forEach(item => {
        plainText += `${item.facultyName}\t${item.programName}\t${item.pid}\t${item.count}\n`;
    });

    const barContainerHeight = 150;
    const barsHtml = chartData.map(item => {
        const barHeight = (item.count / maxValue) * barContainerHeight;
        const color = facultyHexColors[item.facultyName] || facultyHexColors.DEFAULT;
        return `<td style="width: 15px; vertical-align: bottom; padding: 0 1px; text-align: center;"><div style="margin-bottom: 2px; font-size: 10px; font-weight: bold; color: #333;">${item.count > 0 ? item.count : ''}</div><div style="height: ${barHeight}px; background-color: ${color}; border-radius: 2px 2px 0 0;" title="${item.pid} (${item.programName}): ${item.count}"></div></td>`;
    }).join('');

    const labelsHtml = chartData.map(item => `<td style="font-size: 9px; text-align: center; vertical-align: top; height: 50px; position: relative; padding-top: 5px;"><div style="position: absolute; left: 50%; bottom: 0; transform: translateX(-50%) rotate(-45deg); transform-origin: center bottom; white-space: nowrap; width: 70px; padding-bottom: 5px;">${item.programName}</div></td>`).join('');

    const legendHtml = sortedFacultyKeys.map(faculty => `<span style="display: inline-block; margin: 0 8px 5px 8px; font-size: 12px; color: #333; white-space: nowrap;"><span style="display: inline-block; width: 12px; height: 12px; background-color: ${facultyHexColors[faculty] || facultyHexColors.DEFAULT}; border-radius: 2px; margin-right: 5px; vertical-align: middle;"></span><span style="vertical-align: middle;">${faculty}</span></span>`).join('');

    const html = `<div style="font-family: Arial, sans-serif; padding: 16px; border: 1px solid #e2e8f0; border-radius: 6px; background-color: #ffffff; width: auto; display: inline-block;"><h3 style="text-align: center; margin-top: 0; margin-bottom: 20px; font-size: 16px; color: #1e293b;">${title} Distribution by Program</h3><table style="width: 100%; border-collapse: collapse;"><tbody><tr style="height: ${barContainerHeight}px;">${barsHtml}</tr><tr><td colspan="${chartData.length}" style="border-bottom: 2px solid #e5e7eb;"></td></tr><tr style="height: 60px;">${labelsHtml}</tr></tbody></table><div style="text-align: center; margin-top: 20px; padding-top: 10px; border-top: 1px solid #e5e7eb;">${legendHtml}</div></div>`;
    triggerCopy(html, plainText);
  };

  const handleCopyMasterReport = () => {
    let masterHtml = '<div style="font-family: Arial, sans-serif; font-size: 9pt;">';
    let plainText = 'Master Report\n\n';

    sortedFacultyKeys.forEach(facultyName => {
        const programs = summaryData[facultyName];
        if (!programs || programs.length === 0) return;
        
        const facultyFullName = facultyInfoMap.get(facultyName) || facultyName;
        const subtotal = programs.reduce((sum, p) => sum + p.count, 0);
        const facultyMaxValue = Math.max(...programs.map(p => p.count), 0);
        
        plainText += `--- ${facultyFullName} (${facultyName}) ---\nProgram\t${title}\n`;
        programs.forEach(p => { plainText += `${p.programName}\t${getCountUnit(p.count, tableView)}\n`; });
        plainText += `Subtotal\t${getCountUnit(subtotal, tableView)}\n\n`;

        // Left side: Data table with inline bar charts
        const programRowsHtml = programs.map(p => {
            const barWidth = facultyMaxValue > 0 ? (p.count / facultyMaxValue) * 100 : 0;
            const color = facultyHexColors[facultyName] || facultyHexColors.DEFAULT;
            return `
                <tr style="border-top: 1px solid #f1f5f9;">
                    <td style="padding: 3px 4px; vertical-align: middle; white-space: nowrap;">
                        <table style="border-collapse: collapse;"><tbody><tr>
                            <td style="padding: 0; white-space: nowrap; vertical-align: middle;" title="${p.programName}">${p.programName}</td>
                            <td style="width: 45px; padding: 0 0 0 8px; vertical-align: middle;">
                                <div style="height: 4px; width: ${barWidth}%; background-color: ${color}; border-radius: 2px;" title="${barWidth.toFixed(1)}%"></div>
                            </td>
                        </tr></tbody></table>
                    </td>
                    <td style="padding: 2px 4px; text-align: right; font-weight: 500; vertical-align: middle; white-space: nowrap;">
                        ${getCountUnit(p.count, tableView)}
                    </td>
                </tr>
            `;
        }).join('');

        const reportTableHtml = `
            <div style="border: 1px solid #e2e8f0; border-radius: 4px; overflow: hidden; background-color: #ffffff;">
                <table style="border-collapse: collapse; font-size: 8pt;">
                    <thead>
                        <tr style="background-color: #0891b2; color: white;">
                            <th style="padding: 2px 4px; text-align: left; font-weight: 600; white-space: nowrap;">Program</th>
                            <th style="padding: 2px 4px; text-align: right; font-weight: 600; white-space: nowrap;">${title}</th>
                        </tr>
                    </thead>
                    <tbody>${programRowsHtml}</tbody>
                    <tfoot style="background-color: #f0f9ff;">
                        <tr>
                            <td style="padding: 2px 4px; font-weight: bold; color: #0f172a;">Subtotal</td>
                            <td style="padding: 2px 4px; text-align: right; font-weight: bold; color: #0f172a;">${getCountUnit(subtotal, tableView)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>`;

        // Right side: Compact vertical bar chart
        const barContainerHeight = 120;
        const barsHtml = programs.map(item => {
            const barHeight = (item.count / facultyMaxValue) * barContainerHeight;
            const color = facultyHexColors[facultyName] || facultyHexColors.DEFAULT;
            return `
                <td style="vertical-align: bottom; padding: 0 1px; text-align: center;">
                    <div style="margin-bottom: 1px; font-size: 8px; font-weight: bold; color: #333;">${item.count > 0 ? item.count : ''}</div>
                    <div style="height: ${barHeight}px; background-color: ${color}; border-radius: 1px 1px 0 0;" title="${item.pid} (${item.programName}): ${item.count}"></div>
                </td>
            `;
        }).join('');

        const labelsHtml = programs.map(item => `
            <td style="text-align: center; vertical-align: top; font-size: 8px; padding-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${item.programName}">
                ${item.programName}
            </td>
        `).join('');
        
        const chartHtml = `
            <table style="width: 100%; border-collapse: collapse; table-layout: fixed;">
                <tbody>
                    <tr style="height: ${barContainerHeight}px;">
                        ${barsHtml}
                    </tr>
                    <tr><td colspan="${programs.length}" style="border-top: 1px solid #cccccc; padding-top: 2px;"></td></tr>
                    <tr>
                        ${labelsHtml}
                    </tr>
                </tbody>
            </table>
        `;

        const facultyHeaderHtml = `
            <div style="text-align: center; margin-top: 8px; padding: 4px 8px; font-size: 10pt; font-weight: bold; color: #0f172a; background-color: #e0f2fe; border: 1px solid #bae6fd; border-radius: 4px;">
                 ${facultyFullName} (${facultyName})
            </div>
        `;
        
        const chartMessageHtml = `
            <div style="text-align: center; font-size: 8pt; font-style: italic; color: #4b5563; margin-bottom: 4px; padding: 2px; background-color: #f3f4f6; border-radius: 2px; border: 1px solid #e5e7eb;">
                Chart showing distribution of ${title}
            </div>
        `;

        // Combined Master Report block for the faculty
        masterHtml += `
            <div style="margin-bottom: 8px; page-break-inside: avoid; border: 1px solid #cccccc; border-radius: 4px; padding: 6px; background-color: #f8fafc; display: inline-block;">
                <table style="border-collapse: collapse;">
                    <tbody>
                        <tr>
                            <td style="vertical-align: bottom; padding-right: 4px;">${reportTableHtml}</td>
                            <td style="vertical-align: bottom; padding-left: 4px;">
                                ${chartMessageHtml}
                                ${chartHtml}
                                ${facultyHeaderHtml}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
    });
    masterHtml += '</div>';

    triggerCopy(masterHtml, plainText);
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
          <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsDropdownOpen(prev => !prev)}
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
                        <span>Copy Options</span>
                        <ChevronDownIcon className={`h-4 w-4 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                    </>
                )}
            </button>
            {isDropdownOpen && (
                 <div className="absolute right-0 mt-2 w-64 origin-top-right rounded-md bg-white dark:bg-dark-secondary shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-30">
                    <div className="py-1">
                        <button onClick={handleCopyReport} className="w-full text-left flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-accent">
                            <ClipboardListIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                            <span>Copy Distribution Report</span>
                        </button>
                        <button onClick={handleCopyChart} className="w-full text-left flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-accent">
                            <SummaryIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                            <span>Copy Chart</span>
                        </button>
                        <button onClick={handleCopyMasterReport} className="w-full text-left flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-accent">
                            <ClipboardDocumentIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                            <span>Copy Master Report</span>
                        </button>
                    </div>
                 </div>
            )}
          </div>
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