
import React, { useState, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
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

// Background images mapped to view states
const VIEW_BACKGROUNDS: Record<string, string> = {
  dashboard: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&q=80&w=2070',
  section: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=2069',
  program: 'https://images.unsplash.com/photo-1523050335392-9bc567597b81?auto=format&fit=crop&q=80&w=2070',
  dropout: 'https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&q=80&w=2070',
  student: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&q=80&w=2070',
  employee: 'https://images.unsplash.com/photo-1556761175-4b464b461175-4b46?auto=format&fit=crop&q=80&w=1974',
  classroom: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&q=80&w=2132',
  pdf_to_excel: 'https://images.unsplash.com/photo-1454165833767-027ff3399ae7?auto=format&fit=crop&q=80&w=2070',
  settings: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=2070',
};

function AppContent() {
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');

  const bgImage = useMemo(() => VIEW_BACKGROUNDS[currentView] || VIEW_BACKGROUNDS.dashboard, [currentView]);

  const renderContent = () => {
    switch (currentView) {
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
        return <SectionView />;
    }
  };

  return (
    <div className="relative flex flex-col-reverse md:flex-row h-screen w-screen bg-slate-950 overflow-hidden font-sans">
      {/* Immersive Background Layer */}
      <div 
        className="fixed inset-0 z-0 transition-all duration-1000 ease-in-out scale-105"
        style={{
          backgroundImage: `url(${bgImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'brightness(0.4) saturate(1.2)'
        }}
      />
      
      {/* Content Wrapper */}
      <div className="relative z-10 flex flex-col-reverse md:flex-row h-full w-full overflow-hidden">
        <Sidebar 
          currentView={currentView}
          setView={setCurrentView}
        />
        <div className="flex-1 flex flex-col min-w-0 bg-transparent">
          <Header />
          <main className="flex-1 overflow-hidden relative">
            {renderContent()}
          </main>
        </div>
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
