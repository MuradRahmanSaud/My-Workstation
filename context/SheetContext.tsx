import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CourseSectionData, ProgramDataRow, TeacherDataRow, ClassRoomDataRow, LoadingState, SheetContextType, StudentDataRow, StudentLinkRow, MainSheetRow, DiuEmployeeRow, ReferenceDataRow } from '../types';
import { fetchAllData, fetchStudentDetails, fetchRegisteredStudentData, fetchStudentLinks, fetchMainSheet, fetchTeacherData, fetchProgramData, fetchClassRoomData, fetchMergedSectionData, fetchDiuEmployeeData, normalizeId, fetchReferenceData, getMobileNumber } from '../services/sheetService';

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
  
  // Student Data Cache
  const [studentCache, setStudentCache] = useState<Map<string, StudentDataRow[]>>(new Map());
  
  // Registered Data State
  const [registeredData, setRegisteredData] = useState<any[]>([]);

  const [loading, setLoading] = useState<LoadingState>({ status: 'idle' });

  const loadStudentData = async (semester: string, force: boolean = false) => {
      // If cached and not forced, do nothing (consumer handles it)
      if (!force && studentCache.has(semester)) return;

      const url = studentDataLinks.get(semester);
      if (!url) return;

      try {
          const fetchedData = await fetchStudentDetails(url);
          setStudentCache(prev => new Map(prev).set(semester, fetchedData));
      } catch (e) {
          console.error(`Failed to load student data for ${semester}`, e);
      }
  };

  const loadRegisteredData = async (force: boolean = false) => {
      if (!force && registeredData.length > 0) return;

      try {
          const data = await fetchRegisteredStudentData();
          setRegisteredData(data);
      } catch (e) {
          console.error("Failed to load registered data", e);
      }
  };

  const processStudentLinks = (studentLinks: StudentLinkRow[]) => {
      const map = new Map<string, string>();
      studentLinks.forEach(row => {
          if (row.Semester && row['Student Data Link']) {
              map.set(row.Semester, row['Student Data Link']);
          }
      });
      setStudentDataLinks(map);
      
      // Auto-load latest semester student data
      const semesters = Array.from(map.keys());
      if (semesters.length > 0) {
           // Sort semesters to find latest (Year Desc, Season Weight Desc)
           const sorted = semesters.sort((a, b) => {
              const regex = /([a-zA-Z]+)[\s-]*'?(\d{2,4})/;
              const matchA = a.match(regex);
              const matchB = b.match(regex);
              if (!matchA || !matchB) return b.localeCompare(a);

              let yearA = parseInt(matchA[2]);
              if (yearA < 100) yearA += 2000;
              const seasonA = matchA[1].toLowerCase();
              
              let yearB = parseInt(matchB[2]);
              if (yearB < 100) yearB += 2000;
              const seasonB = matchB[1].toLowerCase();

              if (yearA !== yearB) return yearB - yearA;
              
              const weights: Record<string, number> = { 'fall': 3, 'autumn': 3, 'summer': 2, 'short': 2, 'spring': 1, 'winter': 0 };
              return (weights[seasonB] || 0) - (weights[seasonA] || 0);
           });
           
           const latest = sorted[0];
           const latestUrl = map.get(latest);
           
           if (latestUrl) {
               fetchStudentDetails(latestUrl).then(data => {
                   setStudentCache(prev => new Map(prev).set(latest, data));
               }).catch(console.error);
           }
      }
  };

  const processMainSheet = (mainSheetRows: MainSheetRow[]) => {
        const semLinks = new Map<string, string>();
        const admLinks = new Map<string, string>();
        const regLinks = new Map<string, string>();

        mainSheetRows.forEach(row => {
            if (row.Semester) {
                if (row['Sheet Link']) semLinks.set(row.Semester, row['Sheet Link']);
                if (row['Admitted Student']) admLinks.set(row.Semester, row['Admitted Student']);
                if (row['Registered Student']) regLinks.set(row.Semester, row['Registered Student']);
            }
        });
        setSemesterLinks(semLinks);
        setAdmittedLinks(admLinks);
        setRegisteredLinks(regLinks);
  };

  const updateClassroomData = (updater: (prev: ClassRoomDataRow[]) => ClassRoomDataRow[]) => {
      setClassroomData(prev => updater(prev));
  };

  const updateReferenceData = (updater: (prev: ReferenceDataRow[]) => ReferenceDataRow[]) => {
      setReferenceData(prev => updater(prev));
  };

  const updateSectionData = (updater: (prev: CourseSectionData[]) => CourseSectionData[]) => {
      setData(prev => updater(prev));
  };

  const updateDiuEmployeeData = (updater: (prev: DiuEmployeeRow[]) => DiuEmployeeRow[]) => {
      setDiuEmployeeData(prev => updater(prev));
  };

  const updateProgramData = (updater: (prev: ProgramDataRow[]) => ProgramDataRow[]) => {
      setProgramData(prev => updater(prev));
  };

  const loadData = async (mode: 'all' | 'admitted' | 'sections' = 'all') => {
    setLoading({ status: 'loading', message: 'Initializing...' });
    
    try {
      // 1. ADMITTED DATA REFRESH (Quick)
      if (mode === 'all' || mode === 'admitted') {
          setLoading({ status: 'loading', message: 'Refreshing Admitted Data...' });
          
          // Clear cache to force reload of individual semesters when requested later
          setStudentCache(new Map());
          
          const [links, regData] = await Promise.all([
             fetchStudentLinks(), // This now has timestamp
             loadRegisteredData(true) // Force refresh registered data
          ]);
          processStudentLinks(links);
          
          // If only refreshing admitted, we are done
          if (mode === 'admitted') {
              setLoading({ status: 'success' });
              return;
          }
      }

      // 2. SECTIONS DATA REFRESH (Heavy)
      if (mode === 'all' || mode === 'sections') {
          setLoading({ status: 'loading', message: 'Fetching configuration...' });
          // Fetch Config
          const [mainSheetRows, teacherRows, programRows, classroomRows, diuEmployeesRaw, referenceRows] = await Promise.all([
            fetchMainSheet(),
            fetchTeacherData(),
            fetchProgramData(),
            fetchClassRoomData(),
            fetchDiuEmployeeData(),
            fetchReferenceData()
          ]);

          setProgramData(programRows);
          setTeacherData(teacherRows);
          setClassroomData(classroomRows);
          setReferenceData(referenceRows);
          
          // --- MERGE LOGIC START ---
          const employeeMap = new Map<string, DiuEmployeeRow>();

          // 1. Process DIU Employee Sheet (Priority)
          // This ensures data from the specific sheet (GID 383791522) is loaded first and takes precedence
          diuEmployeesRaw.forEach(row => {
              const id = row['Employee ID'];
              // Skip rows without valid ID
              if (!id) return;
              
              const normalizedId = normalizeId(id);
              if (!normalizedId) return;

              // Normalize Mobile field from common variations in Employee Sheet
              const rawRow = row as any;
              const mobile = rawRow.Mobile || rawRow['Mobile Number'] || rawRow['Cell'] || rawRow['Phone'] || '';

              if (!employeeMap.has(normalizedId)) {
                  employeeMap.set(normalizedId, { ...row, Mobile: mobile });
              } else {
                  // Handle duplicate within DIU sheet: enrich existing with new info if missing
                  const existing = employeeMap.get(normalizedId)!;
                  Object.keys(row).forEach(k => {
                      const key = k as keyof DiuEmployeeRow;
                      if (!existing[key] && row[key]) {
                          (existing as any)[key] = row[key];
                      }
                  });
                  // Ensure mobile is populated if missing in existing but present in current duplicate
                  if (!existing.Mobile && mobile) existing.Mobile = mobile;
              }
          });

          // 2. Process Teacher Sheet (Merge or Add)
          teacherRows.forEach(t => {
              const id = t['Employee ID'];
              const normalizedId = normalizeId(id);
              
              if (!normalizedId) return;

              // Use robust extraction for teacher mobile
              const tMobile = getMobileNumber(t, id);

              if (employeeMap.has(normalizedId)) {
                  // MERGE: Update existing DIU record with extra info from Teacher sheet if missing
                  const existing = employeeMap.get(normalizedId)!;
                  
                  if (!existing.Photo && t.Photo) existing.Photo = t.Photo;
                  if (!existing.Facebook && t.Facebook) existing.Facebook = t.Facebook;
                  if (!existing.Linkedin && t.Linkedin) existing.Linkedin = t.Linkedin;
                  if (!existing['E-mail'] && t.Email) existing['E-mail'] = t.Email;
                  
                  // Use robust mobile extraction if missing
                  if (!existing.Mobile && tMobile) existing.Mobile = tMobile;
                  
                  if (!existing.Department && t.Department) existing.Department = t.Department;
                  // NOTE: Designation merge removed to prioritize Employee_DB data strictly as requested.
                  
              } else {
                  // ADD: New record from Teacher sheet
                  const newRow: DiuEmployeeRow = {
                      'Employee ID': t['Employee ID'],
                      'Employee Name': t['Employee Name'],
                      'Administrative Designation': '',
                      'Academic Designation': t.Designation,
                      'Mobile': tMobile,
                      'IP-Ext': '',
                      'E-mail': t.Email,
                      'Photo': t.Photo || '',
                      'Facebook': t.Facebook || '',
                      'Linkedin': t.Linkedin || '',
                      'Status': 'Active', 
                      'Group Name': 'Teacher',
                      'Department': t.Department || '',
                  };
                  employeeMap.set(normalizedId, newRow);
              }
          });

          const mergedEmployees = Array.from(employeeMap.values());
          // --- MERGE LOGIC END ---

          setDiuEmployeeData(mergedEmployees);
          processMainSheet(mainSheetRows);

          // Clear existing section data before reload
          setData([]);

          // Fetch Sections with incremental callback
          await fetchMergedSectionData(
              mainSheetRows, 
              programRows, 
              teacherRows, 
              (msg) => setLoading(prev => ({ ...prev, message: msg })),
              (batchData) => {
                  setData(prev => [...prev, ...batchData]);
              }
          );
      }
      
      setLoading({ status: 'success' });
    } catch (e) {
      console.error(e);
      setLoading({ status: 'error', message: 'Failed to load data.' });
    }
  };

  useEffect(() => {
    loadData('all');
  }, []);

  return (
    <SheetContext.Provider value={{ 
        data, 
        programData, 
        teacherData,
        classroomData,
        diuEmployeeData,
        referenceData,
        semesterLinks, 
        admittedLinks, 
        registeredLinks, 
        studentDataLinks, 
        studentCache, 
        loadStudentData, 
        registeredData, 
        loadRegisteredData,
        loading, 
        reloadData: loadData,
        updateClassroomData,
        updateReferenceData,
        updateSectionData,
        updateDiuEmployeeData,
        updateProgramData
    }}>
      {children}
    </SheetContext.Provider>
  );
};

export const useSheetContext = () => {
  const context = useContext(SheetContext);
  if (context === undefined) {
    throw new Error('useSheetContext must be used within a SheetProvider');
  }
  return context;
};