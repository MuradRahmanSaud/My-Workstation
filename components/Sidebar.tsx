import React, { useState } from 'react';
import { View } from '../constants';
import { DashboardIcon } from './icons/DashboardIcon';
import { DataIcon } from './icons/DataIcon';
import { CourseIcon } from './icons/CourseIcon';
import { SectionIcon } from './icons/SectionIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';

interface SidebarProps {
  activeView: View;
  setActiveView: (view: View) => void;
  isOpen: boolean;
}

const SidebarLink: React.FC<{
  icon: React.ReactNode;
  label: View;
  isActive: boolean;
  onClick: () => void;
  isSubItem?: boolean;
}> = ({ icon, label, isActive, onClick, isSubItem = false }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center text-left text-sm font-medium transition-colors duration-200 ${
      isSubItem ? 'pl-10 pr-2 py-1.5' : 'pl-3 pr-2 py-2'
    } ${
      isActive
        ? 'bg-secondary text-white'
        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-accent'
    }`}
  >
    {icon}
    <span className="ml-3">{label}</span>
  </button>
);


export const Sidebar: React.FC<SidebarProps> = ({ isOpen, activeView, setActiveView }) => {
  const [isDataOpen, setIsDataOpen] = useState(true);

  return (
    <aside className={`bg-white dark:bg-dark-secondary flex-shrink-0 flex flex-col shadow-lg transition-all duration-300 ${isOpen ? 'w-60' : 'w-0'} overflow-hidden`}>
        <div className="w-60 flex flex-col h-full">
            <div className="px-4 py-3 border-b dark:border-gray-700 flex-shrink-0">
                <h1 className="text-lg font-bold text-primary dark:text-light">PS Workstation</h1>
            </div>
            <nav className="flex-1 space-y-1 py-2 overflow-y-auto thin-scrollbar">
                <SidebarLink
                  icon={<DashboardIcon className="h-5 w-5" />}
                  label={View.DASHBOARD}
                  isActive={activeView === View.DASHBOARD}
                  onClick={() => setActiveView(View.DASHBOARD)}
                />
                <div>
                  <button
                    onClick={() => setIsDataOpen(!isDataOpen)}
                    className="w-full flex items-center justify-between pl-3 pr-2 py-2 text-left text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-accent"
                  >
                    <div className="flex items-center">
                      <DataIcon className="h-5 w-5" />
                      <span className="ml-3">Data</span>
                    </div>
                    <ChevronDownIcon className={`h-5 w-5 transition-transform duration-200 ${isDataOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isDataOpen && (
                    <div className="mt-1 space-y-1">
                      <SidebarLink
                        icon={<CourseIcon className="h-4 w-4" />}
                        label={View.PROGRAM}
                        isActive={activeView === View.PROGRAM}
                        onClick={() => setActiveView(View.PROGRAM)}
                        isSubItem
                      />
                      <SidebarLink
                        icon={<SectionIcon className="h-4 w-4" />}
                        label={View.SECTION}
                        isActive={activeView === View.SECTION}
                        onClick={() => setActiveView(View.SECTION)}
                        isSubItem
                      />
                    </div>
                  )}
                </div>
            </nav>
        </div>
    </aside>
  );
};