import React, { useMemo, useState } from 'react';
import { ClipboardListIcon } from './icons/ClipboardListIcon';
import { CheckIcon } from './icons/CheckIcon';

interface SummaryChartProps {
  summaryData: Record<string, { pid: string; programName: string; count: number }[]>;
  chartTitle: string;
}

const facultyChartColors: { [key: string]: string } = {
    'FBE': 'bg-red-500',
    'FE': 'bg-amber-500',
    'FHLS': 'bg-emerald-500',
    'FHSS': 'bg-sky-500',
    'FSIT': 'bg-orange-500',
    'DEFAULT': 'bg-gray-500',
};

export const SummaryChart: React.FC<SummaryChartProps> = ({ summaryData, chartTitle }) => {
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
            <div className="flex justify-center items-center mb-4 relative">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">{chartTitle} Distribution by Program</h3>
            </div>
            
            <div className="w-full h-64 overflow-x-auto thin-scrollbar pb-4 pt-10">
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
