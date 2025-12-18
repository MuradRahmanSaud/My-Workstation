
import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { CourseSectionData, ProgramDataRow, TeacherDataRow, ClassRoomDataRow, LoadingState, SheetContextType, StudentDataRow, StudentLinkRow, MainSheetRow, DiuEmployeeRow, ReferenceDataRow } from '../types';
import { fetchRegisteredStudentData, fetchStudentLinks, fetchMainSheet, fetchTeacherData, fetchProgramData, fetchClassRoomData, fetchMergedSectionData, fetchDiuEmployeeData, normalizeId, fetchReferenceData, getMobileNumber, fetchSubSheet } from '../services/sheetService';

const SheetContext = createContext<SheetContextType | undefined>(undefined);

export const SheetProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [data, setData] = useState<CourseSectionData[]>([]);
  const [programData, setProgramData] = useState<ProgramDataRow[]>([]);
  const [teacherData, setTeacherData] = useState<TeacherDataRow[]>([]);
  const [classroomData, setClassroomData] = useState<ClassRoomDataRow[]>([]);
  const [diuEmployeeData, setDiuEmployeeData] = useState<DiuEmployeeRow[]>([]);
  const [referenceData, setReferenceData] = useState<ReferenceDataRow[]>([]);
  const [semesterLinks, setSemesterLinks] = useState<Map<string, string>>(new Map());
  const [admittedLinks, setAdmittedLinks] = useState<Map<string, string>>(new Map());
  const [registeredLinks, setRegisteredLinks] = useState<Map<string, string>>(new Map());
  const [studentDataLinks, setStudentDataLinks] = useState<Map<string, string>>(new Map());
  const [semesterFilter, setSemesterFilter] = useState('All');
  const [userHasSelected, setUserHasSelected] = useState(false);
  const [studentCache, setStudentCache] = useState<Map<string, StudentDataRow[]>>(new Map());
  const [registeredData, setRegisteredData] = useState<any[]>([]);
  const [loading, setLoading] = useState<LoadingState>({ status: 'idle' });

  const uniqueSemesters = useMemo(() => {
    const rawSemesters = Array.from(new Set(data.map(d => d.Semester?.trim()).filter(Boolean))) as string[];
    const seasonWeight: Record<string, number> = { 'winter': 0, 'spring': 1, 'summer': 2, 'short': 2, 'fall': 3, 'autumn': 3 };
    const sorted = rawSemesters.sort((a, b) => {
        const regex = /([a-zA-Z]+)[\s-]*'?(\d{2,4})/;
        const matchA = a.match(regex);
        const matchB = b.match(regex);
        if (!matchA || !matchB) return b.localeCompare(a);
        const seasonA = matchA[1].toLowerCase(); 
        let yearA = parseInt(matchA[2], 10); if (yearA < 100) yearA += 2000; 
        const seasonB = matchB[1].toLowerCase();
        let yearB = parseInt(matchB[2], 10); if (yearB < 100) yearB += 2000;
        if (yearA !== yearB) return yearB - yearA; 
        return (seasonWeight[seasonB] || 0) - (seasonWeight[seasonA] || 0); 
    });
    return ['All', ...sorted];
  }, [data]);

  useEffect(() => {
    if (!userHasSelected && uniqueSemesters.length > 1) {
        setSemesterFilter(uniqueSemesters[1]);
    }
  }, [uniqueSemesters, userHasSelected]);

  const loadStudentData = async (semester: string, force?: boolean) => {
    if (!force && studentCache.has(semester)) return;
    const link = studentDataLinks.get(semester);
    if (!link) return;
    try {
        const studentRows = await fetchSubSheet(link);
        setStudentCache(prev => new Map(prev).set(semester, studentRows as unknown as StudentDataRow[]));
    } catch (e) {}
  };

  const loadRegisteredData = async (force?: boolean) => {
    if (!force && registeredData.length > 0) return;
    try {
        const regData = await fetchRegisteredStudentData();
        setRegisteredData(regData);
    } catch (e) {}
  };

  const loadData = async (mode: 'all' | 'admitted' | 'sections' = 'all') => {
    setLoading({ status: 'loading', message: 'Optimizing Workflow...' });
    try {
      // Lazy load secondary data in background
      if (mode === 'all' || mode === 'admitted') {
          fetchStudentLinks().then(links => {
              const map = new Map<string, string>();
              links.forEach(row => { if (row.Semester && row['Student Data Link']) map.set(row.Semester, row['Student Data Link']); });
              setStudentDataLinks(map);
          });
          loadRegisteredData();
          if (mode === 'admitted') { setLoading({ status: 'success' }); return; }
      }

      if (mode === 'all' || mode === 'sections') {
          onStatusChange('Syncing Assets...');
          const [mainRows, pRows, tRows, cRows, eRows, rRows] = await Promise.all([
            fetchMainSheet(), fetchProgramData(), fetchTeacherData(), fetchClassRoomData(), fetchDiuEmployeeData(), fetchReferenceData()
          ]);
          if (mainRows.length === 0) throw new Error("Network Busy.");

          setProgramData(pRows); setTeacherData(tRows); setClassroomData(cRows); setReferenceData(rRows); setDiuEmployeeData(eRows);
          const semLinks = new Map<string, string>();
          mainRows.forEach(row => { if (row.Semester && row['Sheet Link']) semLinks.set(row.Semester, row['Sheet Link']); });
          setSemesterLinks(semLinks);

          setData([]);
          await fetchMergedSectionData(mainRows, pRows, tRows, rRows, onStatusChange, (batch) => {
              setData(prev => [...prev, ...batch]);
          });
      }
      setLoading({ status: 'success' });
    } catch (e: any) {
      setLoading({ status: 'error', message: e.message || 'Busy...' });
    }
  };

  const onStatusChange = (msg: string) => setLoading(prev => ({ ...prev, message: msg }));

  useEffect(() => { loadData('all'); }, []);

  const updateClassroomData = (updater: (prev: ClassRoomDataRow[]) => ClassRoomDataRow[]) => setClassroomData(prev => updater(prev));
  const updateReferenceData = (updater: (prev: ReferenceDataRow[]) => ReferenceDataRow[]) => setReferenceData(prev => updater(prev));
  const updateSectionData = (updater: (prev: CourseSectionData[]) => CourseSectionData[]) => setData(prev => updater(prev));
  const updateDiuEmployeeData = (updater: (prev: DiuEmployeeRow[]) => DiuEmployeeRow[]) => setDiuEmployeeData(prev => updater(prev));
  const updateProgramData = (updater: (prev: ProgramDataRow[]) => ProgramDataRow[]) => setProgramData(prev => updater(prev));

  return (
    <SheetContext.Provider value={{ 
        data, programData, teacherData, classroomData, diuEmployeeData, referenceData, semesterLinks, admittedLinks, registeredLinks, studentDataLinks, studentCache, loadStudentData, registeredData, loadRegisteredData, loading, semesterFilter, setSemesterFilter: (v) => { setSemesterFilter(v); setUserHasSelected(true); }, uniqueSemesters, reloadData: loadData, updateClassroomData, updateReferenceData, updateSectionData, updateDiuEmployeeData, updateProgramData
    }}>
      {children}
    </SheetContext.Provider>
  );
};

export const useSheetContext = () => {
  const context = useContext(SheetContext);
  if (context === undefined) throw new Error('useSheetContext must be used within a SheetProvider');
  return context;
};
