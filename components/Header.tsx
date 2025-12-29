
import React from 'react';
import { Bell, Home, GraduationCap } from 'lucide-react';
import { ViewState } from '../types';

interface HeaderProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentView, setView }) => {
  return (
    <header className="h-10 md:h-14 bg-white/80 backdrop-blur-md border-b border-gray-200 flex items-center justify-between px-4 sticky top-0 z-40 shrink-0 shadow-sm">
      <div className="flex items-center space-x-4">
        {/* Brand Area */}
        <div 
          onClick={() => setView('launcher')}
          className="flex items-center cursor-pointer hover:opacity-80 transition-opacity"
        >
          <div className="bg-blue-600 p-1.5 rounded-lg shadow-sm mr-2">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className="font-black text-slate-800 text-base tracking-tight uppercase hidden md:block">DIU Workstation</span>
        </div>

        {/* Back to Home Button - Only shown if not on launcher */}
        {currentView !== 'launcher' && (
          <button 
            onClick={() => setView('launcher')}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-600 rounded-full text-xs font-bold transition-all"
            title="Go back to Home Grid"
          >
            <Home className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Home</span>
          </button>
        )}
      </div>

      {/* Container for View Title & Navigation - Populated via Portal */}
      <div id="header-title-area" className="flex items-center flex-1 justify-center overflow-hidden px-4">
        {/* Placeholder for Title/Breadcrumbs injected by Views */}
      </div>

      {/* Container for View Controls (Filter, Search, Refresh) - Populated via Portal */}
      <div id="header-actions-area" className="flex items-center space-x-2 flex-1 justify-end overflow-hidden">
        {/* Placeholder for Search/Filters injected by Views */}
      </div>

      {/* Fixed Header Actions */}
      <div className="flex items-center space-x-1 border-l border-gray-100 pl-3 ml-2 shrink-0">
        <button className="relative p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors group">
          <Bell className="w-4 h-4" />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-red-500 rounded-full ring-2 ring-white group-hover:scale-125 transition-transform"></span>
        </button>
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-700 to-slate-900 border border-slate-200 flex items-center justify-center text-[10px] text-white font-black shadow-sm ml-2">
          AD
        </div>
      </div>
    </header>
  );
};
