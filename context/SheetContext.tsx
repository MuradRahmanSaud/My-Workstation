import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode, useRef } from 'react';
import { CourseSectionData, ProgramDataRow, TeacherDataRow, ClassRoomDataRow, LoadingState, SheetContextType, StudentDataRow, StudentLinkRow, MainSheetRow, DiuEmployeeRow, ReferenceDataRow, FacultyLeadershipRow, StudentFollowupRow } from '../types';
import { fetchRegisteredStudentData, fetchStudentLinks, fetchMainSheet, fetchTeacherData, fetchProgramData, fetchClassRoomData, fetchMergedSectionData, fetchDiuEmployeeData, normalizeId, fetchReferenceData, getMobileNumber, fetchSubSheet, fetchFacultyLeadershipData, fetchStudentFollowupData } from '../services/sheetService';

const SheetContext = createContext<SheetContextType | undefined>(undefined);

export const SheetProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [data, setData] = useState<CourseSectionData[]>([]);
  const [programData, setProgramData] = useState<ProgramDataRow[]>([]);
  const [teacherData, setTeacherData] = useState<TeacherDataRow[]>([]);
  const [classroomData, setClassroomData] = useState<ClassRoomDataRow[]>([]);
  const [diuEmployeeData, setDiuEmployeeData] = useState<DiuEmployeeRow[]>([]);
  const [referenceData, setReferenceData] = useState<ReferenceDataRow[]>([]);
  const [facultyLeadershipData, setFacultyLeadershipData] = useState<FacultyLeadershipRow[]>([]);
  const [studentFollowupData, setStudentFollowupData] = useState<StudentFollowupRow[]>([]);
  const [semesterLinks, setSemesterLinks] = useState<Map<string, string>>(new Map());
  const [admittedLinks, setAdmittedLinks] = useState<Map<string, string>>(new Map());
  const [registeredLinks, setRegisteredLinks] = useState<Map<string, string>>(new Map());
  const [studentDataLinks, setStudentDataLinks] = useState<Map<string, string>>(new Map());
  const [semesterFilter, setSemesterFilter] = useState('All');
  const [userHasSelected, setUserHasSelected] = useState(false);
  const [studentCache, setStudentCache] = useState<Map<string, StudentDataRow[]>>(new Map());
  const [registeredData, setRegisteredData] = useState<any[]>([]);
  const [loading, setLoading] = useState<LoadingState>({ status: 'idle' });

  // Use a ref to prevent multiple simultaneous loads
  const isSyncing = useRef(false);

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
        setStudentCache((prev: Map<string, StudentDataRow[]>) => {
            const newMap = new Map<string, StudentDataRow[]>(prev);
            newMap.set(semester, studentRows as unknown as StudentDataRow[]);
            return newMap;
        });
    } catch (e) {}
  };

  const updateStudentData = (semester: string, studentId: string, newData: Partial<StudentDataRow>) => {
    setStudentCache((prev: Map<string, StudentDataRow[]>) => {
        const newMap = new Map<string, StudentDataRow[]>(prev);
        const list = newMap.get(semester) || [];
        const updatedList = list.map(s => s['Student ID'] === studentId ? { ...s, ...newData } : s);
        newMap.set(semester, updatedList);
        return newMap;
    });
  };

  const loadRegisteredData = async (force?: boolean) => {
    if (!force && registeredData.length > 0) return;
    try {
        const regData = await fetchRegisteredStudentData();
        setRegisteredData(regData);
    } catch (e) {}
  };

  const loadStudentFollowupData = async (force?: boolean) => {
    if (!force && studentFollowupData.length > 0) return;
    try {
        const data = await fetchStudentFollowupData();
        setStudentFollowupData(data);
    } catch (e) {}
  };

  const loadData = async (mode: 'all' | 'admitted' | 'sections' | 'followup' = 'all', force: boolean = false) => {
    if (isSyncing.current) return;
    isSyncing.current = true;
    
    setLoading({ status: 'loading', message: 'Syncing Data...' });
    
    if (force) {
        ['reference', 'teacher', 'program', 'faculty_leadership', 'employee'].forEach(key => {
            sessionStorage.removeItem(`cache_${key}`);
        });
        setStudentCache(new Map());
        setRegisteredData([]);
        setStudentFollowupData([]);
    }

    try {
      // Step 1: Parallel fetch all core databases and metadata links
      const corePromises: Promise<any>[] = [];

      if (mode === 'all' || mode === 'followup') {
          corePromises.push(fetchStudentFollowupData().then(setStudentFollowupData));
      }

      if (mode === 'all' || mode === 'admitted') {
          corePromises.push(fetchStudentLinks().then(links => {
              const map = new Map<string, string>();
              links.forEach(row => { if (row.Semester && row['Student Data Link']) map.set(row.Semester, row['Student Data Link']); });
              setStudentDataLinks(map);
          }));
          corePromises.push(loadRegisteredData(force));
      }

      if (mode === 'all' || mode === 'sections') {
          corePromises.push(Promise.all([
            fetchMainSheet(), fetchProgramData(), fetchTeacherData(), fetchClassRoomData(), fetchDiuEmployeeData(), fetchReferenceData(), fetchFacultyLeadershipData()
          ]).then(async ([mainRows, pRows, tRows, cRows, eRows, rRows, lRows]) => {
              if (mainRows.length === 0) throw new Error("Sync Failed.");
              
              setProgramData(pRows); setTeacherData(tRows); setClassroomData(cRows); setReferenceData(rRows); setDiuEmployeeData(eRows); setFacultyLeadershipData(lRows);
              
              const semLinks = new Map<string, string>();
              mainRows.forEach(row => { if (row.Semester && row['Sheet Link']) semLinks.set(row.Semester, row['Sheet Link']); });
              setSemesterLinks(semLinks);

              setData([]);
              await fetchMergedSectionData(mainRows, pRows, tRows, rRows, onStatusChange, (batch) => {
                  setData(prev => [...prev, ...batch]);
              });
          }));
      }

      await Promise.all(corePromises);
      setLoading({ status: 'success' });
    } catch (e: any) {
      console.error("Load failed", e);
      setLoading({ status: 'error', message: e.message || 'Busy...' });
    } finally {
      isSyncing.current = false;
    }
  };

  const onStatusChange = (msg: string) => setLoading(prev => ({ ...prev, message: msg }));

  useEffect(() => { loadData('all'); }, []);

  const updateClassroomData = (updater: (prev: ClassRoomDataRow[]) => ClassRoomDataRow[]) => setClassroomData(prev => updater(prev));
  const updateReferenceData = (updater: (prev: ReferenceDataRow[]) => ReferenceDataRow[]) => setReferenceData(prev => updater(prev));
  const updateSectionData = (updater: (prev: CourseSectionData[]) => CourseSectionData[]) => setData(prev => updater(prev));
  const updateDiuEmployeeData = (updater: (prev: DiuEmployeeRow[]) => DiuEmployeeRow[]) => setDiuEmployeeData(prev => updater(prev));
  const updateProgramData = (updater: (prev: ProgramDataRow[]) => ProgramDataRow[]) => setProgramData(prev => updater(prev));
  const updateFacultyLeadershipData = (updater: (prev: FacultyLeadershipRow[]) => FacultyLeadershipRow[]) => setFacultyLeadershipData(prev => updater(prev));

  return (
    <SheetContext.Provider value={{ 
        data, programData, teacherData, classroomData, diuEmployeeData, referenceData, facultyLeadershipData, studentFollowupData, semesterLinks, admittedLinks, registeredLinks, studentDataLinks, studentCache, loadStudentData, updateStudentData, registeredData, loadRegisteredData, loadStudentFollowupData, loading, semesterFilter, setSemesterFilter: (v) => { setSemesterFilter(v); setUserHasSelected(true); }, uniqueSemesters, reloadData: loadData, updateClassroomData, updateReferenceData, updateSectionData, updateDiuEmployeeData, updateProgramData, updateFacultyLeadershipData
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