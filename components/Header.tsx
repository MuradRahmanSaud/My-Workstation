
import React from 'react';
import { Bell, GraduationCap } from 'lucide-react';
import { ViewState } from '../types';

interface HeaderProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentView, setView }) => {
  return (
    <header className="h-12 md:h-16 bg-white border-b border-slate-100 flex items-center justify-between px-4 md:px-6 sticky top-0 z-50 shrink-0">
      {/* Left: Navigation & Branding */}
      <div className="flex items-center space-x-4 md:space-x-6">
        {/* Brand - Clicking this returns to Hub */}
        <div 
          onClick={() => setView('launcher')}
          className="flex items-center cursor-pointer group transition-all"
        >
          <div className="bg-slate-900 p-2 rounded-xl group-hover:bg-blue-600 transition-colors duration-300 shadow-sm">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div className="ml-3 hidden md:block">
            <h1 className="text-sm font-black text-slate-900 leading-none uppercase tracking-tight group-hover:text-blue-600 transition-colors">DIU Workstation</h1>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Workspace V2.5</p>
          </div>
        </div>
      </div>

      {/* Center: Contextual Title (Dynamically injected via Portal) */}
      <div 
        id="header-title-area" 
        className="flex-1 flex items-center justify-center overflow-hidden px-4 max-w-2xl"
      >
        {currentView === 'launcher' && (
           <div className="flex items-center space-x-2 text-slate-300 opacity-50">
             <span className="h-px w-8 bg-slate-200"></span>
             <span className="text-[10px] font-black uppercase tracking-[0.2em]">Ready to Work</span>
             <span className="h-px w-8 bg-slate-200"></span>
           </div>
        )}
      </div>

      {/* Right: Actions & User */}
      <div className="flex items-center space-x-2 md:space-x-3">
        {/* Dynamic Contextual Actions */}
        <div id="header-actions-area" className="flex items-center space-x-1.5">
          {/* View-specific buttons go here via Portal */}
        </div>

        {/* System Actions */}
        <div className="flex items-center space-x-1 border-l border-slate-100 pl-3 md:pl-4 ml-1 md:ml-2">
          <button className="relative p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-all group">
            <Bell className="w-4.5 h-4.5" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full border-2 border-white group-hover:scale-125 transition-transform"></span>
          </button>
          
          <div className="flex items-center ml-2 p-1 pl-2 pr-1.5 bg-slate-50 rounded-full border border-slate-100 hover:border-slate-200 transition-all cursor-pointer group">
            <div className="mr-2 hidden sm:block text-right">
              <p className="text-[10px] font-black text-slate-700 leading-none group-hover:text-blue-600 transition-colors uppercase">Admin</p>
              <p className="text-[8px] font-bold text-slate-400 uppercase leading-none mt-0.5">Daffodil</p>
            </div>
            <div className="w-7 h-7 rounded-full bg-slate-900 border border-white flex items-center justify-center text-[10px] text-white font-black shadow-sm shrink-0">
              AD
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
