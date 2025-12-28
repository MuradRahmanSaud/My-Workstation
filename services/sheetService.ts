
import { MAIN_SHEET_ID, MAIN_SHEET_GID, REF_SHEET_ID, REF_SHEET_GID, TEACHER_SHEET_GID, PROGRAM_SHEET_GID, CLASSROOM_SHEET_GID, DIU_EMPLOYEE_SHEET_GID, FACULTY_LEADERSHIP_SHEET_GID, STUDENT_LINK_SHEET_ID, STUDENT_LINK_SHEET_GID, REGISTERED_STUDENT_SHEET_GID, CORS_PROXY, GOOGLE_SCRIPT_URL, FOLLOWUP_SHEET_GID } from '../constants';
import { MainSheetRow, CourseSectionData, ReferenceDataRow, TeacherDataRow, ProgramDataRow, StudentLinkRow, StudentDataRow, ClassRoomDataRow, DiuEmployeeRow, FacultyLeadershipRow, StudentFollowupRow } from '../types';
import { parseCSV, extractSheetIdAndGid } from '../utils/csvParser';

// Exporting extractSheetIdAndGid to resolve import dependency in other views
export { extractSheetIdAndGid };

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const PROXY_LIST = [
    'https://corsproxy.io/?',
    'https://thingproxy.freeboard.io/fetch/',
    'https://api.codetabs.com/v1/proxy?quest=',
    'https://api.allorigins.win/raw?url='
];

const getCachedData = <T>(key: string): T[] | null => {
    try {
        const cached = sessionStorage.getItem(`cache_${key}`);
        if (!cached) return null;
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < 30 * 60 * 1000) return data;
    } catch (e) { return null; }
    return null;
};

const setCachedData = (key: string, data: any) => {
    try {
        sessionStorage.setItem(`cache_${key}`, JSON.stringify({ data, timestamp: Date.now() }));
    } catch (e) { /* ignore storage limits */ }
};

const fetchSheet = async <T>(url: string, retries = 3): Promise<T[]> => {
  try {
    const directResponse = await fetch(`${url}&direct=true`);
    if (directResponse.ok) {
        const text = await directResponse.text();
        if (text && !text.trim().startsWith('<!doctype html') && !text.trim().startsWith('<html')) {
            return parseCSV<T>(text);
        }
    }
  } catch (e) {
    console.debug("Direct fetch failed, falling back to proxies...");
  }

  let proxyIndex = 0;
  for (let i = 0; i < retries; i++) {
    try {
      if (i > 0) await sleep(300 * i);
      const proxy = PROXY_LIST[proxyIndex % PROXY_LIST.length];
      const targetUrl = `${proxy}${encodeURIComponent(url)}`;
      const response = await fetch(targetUrl);
      if (!response.ok) { proxyIndex++; continue; }
      const text = await response.text();
      if (!text || text.trim().startsWith('<!doctype html') || text.trim().startsWith('<html')) {
          proxyIndex++;
          continue; 
      }
      return parseCSV<T>(text);
    } catch (error) { proxyIndex++; }
  }
  return [];
};

export const fetchMainSheet = async (): Promise<MainSheetRow[]> => {
  const url = `https://docs.google.com/spreadsheets/d/${MAIN_SHEET_ID}/export?format=csv&gid=${MAIN_SHEET_GID}&t=${Date.now()}`;
  return fetchSheet<MainSheetRow>(url);
};

export const fetchReferenceData = async (): Promise<ReferenceDataRow[]> => {
  const cached = getCachedData<ReferenceDataRow>('reference');
  if (cached) return cached;
  const url = `https://docs.google.com/spreadsheets/d/${REF_SHEET_ID}/export?format=csv&gid=${REF_SHEET_GID}&t=${Date.now()}`;
  const data = await fetchSheet<ReferenceDataRow>(url);
  if (data.length > 0) setCachedData('reference', data);
  return data;
};

export const fetchTeacherData = async (): Promise<TeacherDataRow[]> => {
  const cached = getCachedData<TeacherDataRow>('teacher');
  if (cached) return cached;
  const url = `https://docs.google.com/spreadsheets/d/${REF_SHEET_ID}/export?format=csv&gid=${TEACHER_SHEET_GID}&t=${Date.now()}`;
  const data = await fetchSheet<TeacherDataRow>(url);
  if (data.length > 0) setCachedData('teacher', data);
  return data;
};

export const fetchProgramData = async (): Promise<ProgramDataRow[]> => {
  const cached = getCachedData<ProgramDataRow>('program');
  if (cached) return cached;
  const url = `https://docs.google.com/spreadsheets/d/${REF_SHEET_ID}/export?format=csv&gid=${PROGRAM_SHEET_GID}&t=${Date.now()}`;
  const data = await fetchSheet<ProgramDataRow>(url);
  if (data.length > 0) setCachedData('program', data);
  return data;
};

export const fetchFacultyLeadershipData = async (): Promise<FacultyLeadershipRow[]> => {
  const cached = getCachedData<FacultyLeadershipRow>('faculty_leadership');
  if (cached) return cached;
  const url = `https://docs.google.com/spreadsheets/d/${REF_SHEET_ID}/export?format=csv&gid=${FACULTY_LEADERSHIP_SHEET_GID}&t=${Date.now()}`;
  const data = await fetchSheet<FacultyLeadershipRow>(url);
  if (data.length > 0) setCachedData('faculty_leadership', data);
  return data;
};

export const fetchClassRoomData = async (): Promise<ClassRoomDataRow[]> => {
  const url = `https://docs.google.com/spreadsheets/d/${REF_SHEET_ID}/export?format=csv&gid=${CLASSROOM_SHEET_GID}&t=${Date.now()}`;
  return fetchSheet<ClassRoomDataRow>(url);
};

export const fetchDiuEmployeeData = async (): Promise<DiuEmployeeRow[]> => {
  const cached = getCachedData<DiuEmployeeRow>('employee');
  if (cached) return cached;
  const url = `https://docs.google.com/spreadsheets/d/${REF_SHEET_ID}/export?format=csv&gid=${DIU_EMPLOYEE_SHEET_GID}&t=${Date.now()}`;
  const data = await fetchSheet<DiuEmployeeRow>(url);
  if (data.length > 0) setCachedData('employee', data);
  return data;
};

export const fetchStudentLinks = async (): Promise<StudentLinkRow[]> => {
  const url = `https://docs.google.com/spreadsheets/d/${STUDENT_LINK_SHEET_ID}/export?format=csv&gid=${STUDENT_LINK_SHEET_GID}&t=${Date.now()}`;
  return fetchSheet<StudentLinkRow>(url);
};

export const fetchRegisteredStudentData = async (): Promise<any[]> => {
  const url = `https://docs.google.com/spreadsheets/d/${STUDENT_LINK_SHEET_ID}/export?format=csv&gid=${REGISTERED_STUDENT_SHEET_GID}&t=${Date.now()}`;
  return fetchSheet<any>(url);
};

// Fix: Add fetchStudentFollowupData function
export const fetchStudentFollowupData = async (): Promise<StudentFollowupRow[]> => {
  const url = `https://docs.google.com/spreadsheets/d/${STUDENT_LINK_SHEET_ID}/export?format=csv&gid=${FOLLOWUP_SHEET_GID}&t=${Date.now()}`;
  return fetchSheet<StudentFollowupRow>(url);
};

export const fetchSubSheet = async (sheetLink: string): Promise<CourseSectionData[]> => {
  const { id, gid } = extractSheetIdAndGid(sheetLink);
  if (!id) return [];
  const url = `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}&t=${Date.now()}`;
  return fetchSheet<CourseSectionData>(url);
};

export const normalizeId = (id: string | undefined | null) => {
    if (!id) return '';
    return String(id).replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
};

export const getMobileNumber = (row: TeacherDataRow): string => {
  const keys = Object.keys(row);
  const mobileKeys = keys.filter(k => {
      const lower = k.toLowerCase();
      return (lower.includes('mobile') || lower.includes('cell')) && !lower.includes('email');
  });
  for (const key of mobileKeys) {
       const val = row[key];
       if (val && val.trim().length > 0) return val.trim();
  }
  return '';
};

export const submitSheetData = async (
    action: 'add' | 'update' | 'delete', 
    sheetName: string, 
    data: any, 
    keyColumn?: string, 
    keyValue?: string, 
    spreadsheetId?: string, 
    options: any = { insertMethod: 'first_empty' }
): Promise<any> => {
    try {
        console.log(`[SheetService] ${action.toUpperCase()} Action on ${sheetName}`);
        
        const payload = { 
            action, 
            sheetName, 
            data, 
            keyColumn: keyColumn || 'uniqueid', 
            keyValue: keyValue ? String(keyValue).trim() : '', 
            spreadsheetId, 
            insertMethod: options.insertMethod 
        };

        const response = await fetch(GOOGLE_SCRIPT_URL, { 
            method: 'POST', 
            mode: 'cors',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8',
            },
            body: JSON.stringify(payload) 
        });

        if (!response.ok) {
            throw new Error(`Server Response Error: ${response.status}`);
        }

        const result = await response.json();
        console.log("[SheetService] API Response:", result);
        return result;
    } catch (error: any) { 
        console.error("[SheetService] Sync Error:", error);
        return { 
            result: 'error', 
            message: error.message || 'API connection failed' 
        }; 
    }
};

export const fetchMergedSectionData = async (
    mainSheetRows: MainSheetRow[],
    programRows: ProgramDataRow[],
    teacherRows: TeacherDataRow[],
    refRows: ReferenceDataRow[],
    onStatus: (msg: string) => void,
    onBatchData?: (data: CourseSectionData[]) => void
): Promise<CourseSectionData[]> => {
    const refMap = new Map<string, ReferenceDataRow>();
    refRows.forEach(r => refMap.set(r.Ref, r));
    const teacherMap = new Map<string, TeacherDataRow>();
    teacherRows.forEach(r => { const id = normalizeId(r['Employee ID']); if (id) teacherMap.set(id, r); });
    const programMap = new Map<string, ProgramDataRow>();
    programRows.forEach(p => { if (p.PID) programMap.set(normalizeId(p.PID), p); });

    const processRow = (item: any, sourceRow: MainSheetRow) => {
        const refData = refMap.get(item.Ref);
        const tid = normalizeId(item['Teacher ID']);
        const teacherData = teacherMap.get(tid);
        const pData = programMap.get(normalizeId(item.PID));
        let classReq = '0';
        if (pData) {
            const pattern = /(?:theory|th|lecture|lec)[:\s-]*(\d+)/i;
            const patternLab = /(?:lab|laboratory|lb)[:\s-]*(\d+)/i;
            const reqStr = pData['Class Requirement'] || '';
            const durStr = pData['Class Duration'] || '';
            
            const getVal = (str: string, pat: RegExp) => {
                const m = str.match(pat);
                return m ? parseFloat(m[1]) : 0;
            };

            const theoryDur = getVal(durStr, pattern);
            const labDur = getVal(durStr, patternLab);
            const theoryReq = getVal(reqStr, pattern);
            const labReq = getVal(reqStr, patternLab);

            const cType = (refData?.['Course Type'] || item['Course Type'] || '').toLowerCase();
            const baseReq = (cType.includes('lab') || cType.includes('sessional')) ? (labDur > 0 ? Math.floor(labReq/labDur) : 0) : (theoryDur > 0 ? Math.floor(theoryReq/theoryDur) : 0);
            classReq = (parseFloat(item.Credit || '0') > 0 ? baseReq * parseFloat(item.Credit) : baseReq).toString();
        }
        return {
            ...item,
            Semester: item.Semester?.trim() || sourceRow.Semester,
            Program: pData ? `${item.PID} ${pData['Program Short Name']}` : item.PID,
            'Course Type': refData?.['Course Type'] || item['Course Type'],
            'Capacity': refData?.['Section Capacity'] || item.Capacity, 
            'Weekly Class': refData?.['Weekly Class'] || item['Weekly Class'],
            'ClassRequirement': classReq,
            'Employee Name': teacherData?.['Employee Name'] || item['Employee Name'],
            'Designation': teacherData?.Designation || item.Designation,
            'Email': teacherData?.Email || item.Email,
            'Mobile Number': teacherData ? getMobileNumber(teacherData) : item['Mobile Number']
        };
    };

    if (mainSheetRows.length > 0) {
        const firstRow = mainSheetRows[0];
        if (firstRow['Sheet Link']) {
            try {
                const raw = await fetchSubSheet(firstRow['Sheet Link']);
                const processed = raw.map(i => processRow(i, firstRow));
                if (onBatchData) onBatchData(processed);
            } catch(e) {}
        }
    }

    const remainingRows = mainSheetRows.slice(1);
    const batchSize = 15; 
    const allData: CourseSectionData[] = [];
    
    for (let i = 0; i < remainingRows.length; i += batchSize) {
        const batch = remainingRows.slice(i, i + batchSize);
        const batchPromises = batch.map(async (row) => {
            if (!row['Sheet Link']) return [];
            try {
                const rawData = await fetchSubSheet(row['Sheet Link']);
                return rawData.map(item => processRow(item, row));
            } catch (e) { return []; }
        });
        const results = await Promise.all(batchPromises);
        const flatResults = results.flat();
        if (onBatchData && flatResults.length > 0) onBatchData(flatResults);
        allData.push(...flatResults);
    }
    return allData;
};
