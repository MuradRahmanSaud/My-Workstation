
import React, { useState, useMemo } from 'react';
import { Header } from './components/Header';
import { SectionView } from './views/SectionView';
import { ProgramView } from './views/ProgramView';
import { DropOutView } from './views/DropOutView';
import { EmployeeView } from './views/EmployeeView';
import { StudentView } from './views/StudentView';
import { ClassRoomView } from './views/ClassRoomView';
import { PdfToExcelView } from './views/PdfToExcelView';
import { SettingsView } from './views/SettingsView';
import { ViewState } from './types';
import { SheetProvider } from './context/SheetContext';
import { 
  LayoutDashboard, TableProperties, Settings, GraduationCap, School, 
  FileText, Building2, IdCard, FileSpreadsheet, MessageSquareQuote, Search
} from 'lucide-react';

// Immersive backgrounds only for active modules (optional)
const VIEW_BACKGROUNDS: Record<string, string> = {
  dashboard: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&q=80&w=2070',
  section: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=2069',
  program: 'https://images.unsplash.com/photo-1523050335392-9bc567597b81?auto=format&fit=crop&q=80&w=2070',
  dropout: 'https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&q=80&w=2070',
  student: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&q=80&w=2070',
  employee: 'https://images.unsplash.com/photo-1556761175-4b464b461175?auto=format&fit=crop&q=80&w=1974',
  classroom: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&q=80&w=2132',
  pdf_to_excel: 'https://images.unsplash.com/photo-1454165833767-027ff3399ae7?auto=format&fit=crop&q=80&w=2070',
  settings: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=2070',
};

const MENU_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
  { id: 'section', label: 'Sections', icon: TableProperties, color: 'text-purple-600 bg-purple-50 border-purple-100' },
  { id: 'program', label: 'Programs', icon: School, color: 'text-blue-600 bg-blue-50 border-blue-100' },
  { id: 'dropout', label: 'Follow-up', icon: MessageSquareQuote, color: 'text-red-600 bg-red-50 border-red-100' },
  { id: 'student', label: 'Students', icon: FileText, color: 'text-teal-600 bg-teal-50 border-teal-100' },
  { id: 'employee', label: 'Employees', icon: IdCard, color: 'text-orange-500 bg-orange-50 border-orange-100' },
  { id: 'classroom', label: 'Rooms', icon: Building2, color: 'text-cyan-600 bg-cyan-50 border-cyan-100' },
  { id: 'pdf_to_excel', label: 'AI Tools', icon: FileSpreadsheet, color: 'text-green-600 bg-green-50 border-green-100' },
  { id: 'settings', label: 'Settings', icon: Settings, color: 'text-slate-600 bg-slate-50 border-slate-100' },
] as const;

function Launcher({ setView }: { setView: (view: ViewState) => void }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredItems = useMemo(() => {
    return MENU_ITEMS.filter(item => 
      item.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  return (
    <div className="h-full w-full flex flex-col items-center justify-start pt-12 md:pt-20 p-6 md:p-10 overflow-y-auto bg-slate-50">
      <div className="max-w-[1200px] w-full animate-in fade-in zoom-in-95 duration-500 flex flex-col items-center">
        {/* Hub Header with Logo on Left and Subtext aligned under Title */}
        <div className="flex items-start mb-10 space-x-4 self-center md:self-auto">
          <div className="p-2.5 bg-blue-600 rounded-xl shadow-md mt-1">
            <GraduationCap className="w-7 h-7 md:w-10 md:h-10 text-white" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter uppercase leading-tight">Workspace Hub</h1>
            <p className="text-slate-400 font-bold text-[9px] md:text-[11px] uppercase tracking-[0.35em] ml-0.5 md:ml-1 -mt-0.5">Integrated University Management</p>
          </div>
        </div>

        {/* Launcher Search Bar */}
        <div className="w-full max-w-md mb-10 relative group">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
            <Search className="w-4 h-4 md:w-5 md:h-5" />
          </div>
          <input 
            type="text"
            placeholder="Search module..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 md:pl-12 pr-4 py-3 md:py-3.5 bg-white border border-slate-200 rounded-2xl shadow-sm focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none transition-all text-sm font-medium text-slate-700"
          />
        </div>
        
        {/* Module Grid */}
        {filteredItems.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-3 md:gap-4 w-full">
            {filteredItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setView(item.id as ViewState)}
                className="group flex flex-col items-center bg-white border border-slate-200 rounded-xl p-3 md:p-3.5 transition-all hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/10 active:scale-95 text-center shadow-sm"
              >
                <div className={`w-10 h-10 md:w-12 md:h-12 ${item.color} rounded-xl border flex items-center justify-center mb-2.5 transition-all group-hover:scale-110`}>
                  <item.icon className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                
                <h3 className="text-[10px] md:text-[11px] font-black text-slate-800 uppercase tracking-wide group-hover:text-blue-600 transition-colors truncate w-full">
                  {item.label}
                </h3>
              </button>
            ))}
          </div>
        ) : (
          <div className="py-16 flex flex-col items-center text-slate-300">
            <Search className="w-12 h-12 mb-3 opacity-20" />
            <p className="text-sm font-bold uppercase tracking-widest opacity-40">No modules match your search</p>
          </div>
        )}

        {/* Quick Help / Info section */}
        <div className="mt-16 flex flex-col items-center opacity-30">
          <div className="h-px w-24 bg-slate-300 mb-6"></div>
          <span className="text-slate-900 font-black uppercase text-[10px] tracking-[0.3em]">DIU Workstation V2.5 Professional</span>
        </div>
      </div>
    </div>
  );
}

function AppContent() {
  const [currentView, setCurrentView] = useState<ViewState>('launcher');

  const bgImage = useMemo(() => VIEW_BACKGROUNDS[currentView] || null, [currentView]);

  const renderContent = () => {
    switch (currentView) {
      case 'launcher':
        return <Launcher setView={setCurrentView} />;
      case 'dashboard':
        return <SectionView key="dashboard" showStats={true} />;
      case 'section':
        return <SectionView key="section" showStats={false} />;
      case 'program':
        return <ProgramView />;
      case 'dropout':
        return <DropOutView />;
      case 'employee':
        return <EmployeeView />;
      case 'student':
        return <StudentView />;
      case 'classroom':
        return <ClassRoomView />;
      case 'pdf_to_excel':
        return <PdfToExcelView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <Launcher setView={setCurrentView} />;
    }
  };

  return (
    <div className="relative flex flex-col h-screen w-screen bg-slate-50 overflow-hidden font-sans text-slate-900">
      {/* Background layer only shown if active and not on launcher */}
      {currentView !== 'launcher' && bgImage && (
        <div 
          className="fixed inset-0 z-0 transition-all duration-1000 ease-in-out scale-105"
          style={{
            backgroundImage: `url(${bgImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'brightness(0.35) saturate(1.1) blur(2px)'
          }}
        />
      )}
      
      {/* Content Wrapper */}
      <div className="relative z-10 flex flex-col h-full w-full overflow-hidden">
        <Header currentView={currentView} setView={setCurrentView} />
        <main className="flex-1 overflow-hidden relative">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <SheetProvider>
      <AppContent />
    </SheetProvider>
  );
}
