
import React from 'react';
import { ViewState } from '../types';
import { LayoutDashboard, TableProperties, Settings, GraduationCap, School, FileText, Building2, IdCard, FileSpreadsheet } from 'lucide-react';

interface SidebarProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setView }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'section', label: 'Section', icon: TableProperties },
    { id: 'program', label: 'Program', icon: School },
    { id: 'student', label: 'Student', icon: FileText },
    { id: 'employee', label: 'Staff', icon: IdCard },
    { id: 'classroom', label: 'Rooms', icon: Building2 },
    { id: 'pdf_to_excel', label: 'Tools', icon: FileSpreadsheet },
    { id: 'settings', label: 'Set', icon: Settings },
  ] as const;

  return (
    <aside className="
      w-full md:w-56 
      h-14 md:h-full 
      bg-slate-900 text-slate-300 
      flex flex-row md:flex-col 
      shrink-0 transition-all duration-300 
      border-t md:border-t-0 md:border-r border-slate-800
      z-50 order-2 md:order-1
    ">
      {/* Brand - Hidden on Mobile */}
      <div className="hidden md:flex h-16 items-center justify-center md:justify-start md:px-6 border-b border-slate-800 shrink-0">
        <GraduationCap className="w-6 h-6 text-blue-500" />
        <span className="ml-3 font-bold text-white text-base hidden md:block tracking-tight">Workstation</span>
      </div>

      {/* Menu */}
      <nav className="
        flex-1 
        flex flex-row md:flex-col 
        items-center md:items-stretch 
        justify-around md:justify-start 
        py-0 md:py-4
        space-y-0 md:space-y-1
        overflow-x-auto no-scrollbar
      ">
        {menuItems.map((item) => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id as ViewState)}
              className={`
                flex flex-col md:flex-row items-center justify-center md:justify-start
                px-2 md:px-5 
                py-1 md:py-3.5
                h-full md:h-auto
                transition-all duration-200
                
                /* Border logic: Top on Mobile, Left on Desktop */
                border-t-2 md:border-t-0 md:border-l-4
                ${isActive 
                  ? 'bg-slate-800 text-blue-400 border-blue-500' 
                  : 'border-transparent hover:bg-slate-800/50 hover:text-slate-200'
                } 
                group min-w-[50px] md:w-auto
              `}
              title={item.label}
            >
              <item.icon className={`w-5 h-5 md:w-5 md:h-5 ${isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
              <span className={`text-[10px] md:text-sm font-medium ml-0 md:ml-3 mt-1 md:mt-0 ${isActive ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Footer / User Info compact - Hidden on Mobile */}
      <div className="hidden md:block p-4 border-t border-slate-800">
        <div className="flex items-center">
          <div className="w-8 h-8 rounded bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-xs text-white font-bold shadow-sm">
            AD
          </div>
          <div className="ml-3">
            <p className="text-xs font-medium text-slate-200 leading-tight">Admin</p>
            <p className="text-[10px] text-slate-500 leading-tight">DIU</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
