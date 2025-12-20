
import { MAIN_SHEET_ID, MAIN_SHEET_GID, REF_SHEET_ID, REF_SHEET_GID, TEACHER_SHEET_GID, PROGRAM_SHEET_GID, CLASSROOM_SHEET_GID, DIU_EMPLOYEE_SHEET_GID, FACULTY_LEADERSHIP_SHEET_GID, STUDENT_LINK_SHEET_ID, STUDENT_LINK_SHEET_GID, REGISTERED_STUDENT_SHEET_GID, CORS_PROXY, GOOGLE_SCRIPT_URL } from '../constants';
import { MainSheetRow, CourseSectionData, ReferenceDataRow, TeacherDataRow, ProgramDataRow, StudentLinkRow, StudentDataRow, ClassRoomDataRow, DiuEmployeeRow, FacultyLeadershipRow } from '../types';
import { parseCSV, extractSheetIdAndGid } from '../utils/csvParser';

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

const fetchSheet = async <T>(url: string, retries = 2): Promise<T[]> => {
  let proxyIndex = 0;
  for (let i = 0; i < retries; i++) {
    try {
      if (i > 0) await sleep(200 * i); // Very short delay for fast retry
      const proxy = PROXY_LIST[proxyIndex % PROXY_LIST.length];
      const targetUrl = `${proxy}${encodeURIComponent(url)}`;
      const response = await fetch(targetUrl);
      if (!response.ok) { proxyIndex++; continue; }
      const text = await response.text();
      if (!text || text.trim().startsWith('<!doctype html') || text.trim().startsWith('<html')) {
          proxyIndex++;
          if (proxyIndex >= 2) return []; 
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

const getReqValues = (reqStr: string, durStr: string) => {
    const getVal = (str: string, type: 'Theory' | 'Lab') => {
        if (!str) return 0;
        const pattern = type === 'Theory' ? /(?:theory|th|lecture|lec)[:\s-]*(\d+)/i : /(?:lab|laboratory|lb)[:\s-]*(\d+)/i;
        const match = str.match(pattern);
        if (match) return parseFloat(match[1]);
        if (type === 'Theory' && !/(?:theory|th|lab|lb)/i.test(str)) {
            const simpleMatch = str.match(/(\d+(\.\d+)?)/);
            if (simpleMatch) return parseFloat(simpleMatch[1]);
        }
        return 0;
    };
    return { theory: getVal(durStr, 'Theory') > 0 ? Math.floor(getVal(reqStr, 'Theory') / getVal(durStr, 'Theory')) : 0, lab: getVal(durStr, 'Lab') > 0 ? Math.floor(getVal(reqStr, 'Lab') / getVal(durStr, 'Lab')) : 0 };
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
            const reqValues = getReqValues(pData['Class Requirement'] || '', pData['Class Duration'] || '');
            const cType = (refData?.['Course Type'] || item['Course Type'] || '').toLowerCase();
            const baseReq = (cType.includes('lab') || cType.includes('sessional') || cType.includes('practical')) ? reqValues.lab : reqValues.theory;
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

    // PRIORITY: Load the first semester immediately
    if (mainSheetRows.length > 0) {
        onStatus('Prioritizing Latest Semester...');
        const firstRow = mainSheetRows[0];
        if (firstRow['Sheet Link']) {
            try {
                const raw = await fetchSubSheet(firstRow['Sheet Link']);
                const processed = raw.map(i => processRow(i, firstRow));
                if (onBatchData) onBatchData(processed);
            } catch(e) {}
        }
    }

    // Load remaining in larger batches
    const remainingRows = mainSheetRows.slice(1);
    const batchSize = 15; 
    const allData: CourseSectionData[] = [];
    
    for (let i = 0; i < remainingRows.length; i += batchSize) {
        const batch = remainingRows.slice(i, i + batchSize);
        onStatus(`Streaming History (Batch ${Math.floor(i/batchSize) + 1})...`);
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

export const submitSheetData = async (action: 'add' | 'update' | 'delete', sheetName: string, data: any, keyColumn?: string, keyValue?: string, spreadsheetId?: string, options: any = { insertMethod: 'first_empty' }): Promise<any> => {
    try {
        const response = await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action, sheetName, data, keyColumn, keyValue, spreadsheetId, insertMethod: options.insertMethod }) });
        return await response.json();
    } catch (error) { return { result: 'error', message: 'API communication failed' }; }
};
