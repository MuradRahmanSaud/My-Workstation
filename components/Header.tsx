import React from 'react';
import { Bell, Menu } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="h-10 md:h-12 bg-white border-b border-gray-200 flex items-center justify-between px-3 sticky top-0 z-40 shrink-0 shadow-sm">
      {/* Container for View Title & Navigation - Populated via Portal */}
      <div id="header-title-area" className="flex items-center flex-1 overflow-hidden">
        <button className="md:hidden mr-2 p-1 hover:bg-gray-100 rounded text-gray-600">
            <Menu className="w-5 h-5" />
        </button>
        {/* Placeholder for Title/Breadcrumbs injected by Views */}
      </div>

      {/* Container for View Controls (Filter, Search, Refresh) - Populated via Portal */}
      <div id="header-actions-area" className="flex items-center space-x-2 flex-1 justify-end px-2 overflow-hidden">
        {/* Placeholder for Search/Filters injected by Views */}
      </div>

      {/* Fixed Header Actions */}
      <div className="flex items-center space-x-1 border-l border-gray-100 pl-2 ml-1 shrink-0">
        <button className="relative p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors group">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full ring-1 ring-white group-hover:scale-110 transition-transform"></span>
        </button>
      </div>
    </header>
  );
};