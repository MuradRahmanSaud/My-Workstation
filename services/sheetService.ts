
import { MAIN_SHEET_ID, MAIN_SHEET_GID, REF_SHEET_ID, REF_SHEET_GID, TEACHER_SHEET_GID, PROGRAM_SHEET_GID, CLASSROOM_SHEET_GID, DIU_EMPLOYEE_SHEET_GID, STUDENT_LINK_SHEET_ID, STUDENT_LINK_SHEET_GID, REGISTERED_STUDENT_SHEET_GID, CORS_PROXY, GOOGLE_SCRIPT_URL } from '../constants';
import { MainSheetRow, CourseSectionData, ReferenceDataRow, TeacherDataRow, ProgramDataRow, StudentLinkRow, StudentDataRow, ClassRoomDataRow, DiuEmployeeRow } from '../types';
import { parseCSV, extractSheetIdAndGid } from '../utils/csvParser';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const PROXY_LIST = [
    'https://corsproxy.io/?',
    'https://thingproxy.freeboard.io/fetch/',
    'https://api.codetabs.com/v1/proxy?quest=',
    'https://api.allorigins.win/raw?url='
];

const fetchSheet = async <T>(url: string, retries = 3): Promise<T[]> => {
  let proxyIndex = 0;

  for (let i = 0; i < retries; i++) {
    try {
      // Exponential backoff for retries - Reduced base delay for faster failover
      if (i > 0) await sleep(250 * Math.pow(2, i));

      const proxy = PROXY_LIST[proxyIndex % PROXY_LIST.length];
      const targetUrl = `${proxy}${encodeURIComponent(url)}`;
      
      const response = await fetch(targetUrl);
      
      if (!response.ok) {
         // Try next proxy on failure
         proxyIndex++;
         if (response.status === 429) {
             await sleep(1500);
         }
         continue; // Try next iteration
      }
      
      const text = await response.text();
      
      // Basic validation: HTML responses usually mean proxy error or auth page
      if (text.trim().toLowerCase().startsWith('<!doctype html') || text.trim().toLowerCase().startsWith('<html')) {
          proxyIndex++;
          continue; 
      }

      return parseCSV<T>(text);
    } catch (error) {
      // Rotate proxy on network error
      proxyIndex++;
      if (i === retries - 1) {
          console.error(`Failed to fetch sheet after ${retries} attempts.`);
          return [];
      }
    }
  }
  return [];
};

export const fetchMainSheet = async (): Promise<MainSheetRow[]> => {
  // Timestamp to avoid cache
  const url = `https://docs.google.com/spreadsheets/d/${MAIN_SHEET_ID}/export?format=csv&gid=${MAIN_SHEET_GID}&t=${Date.now()}`;
  return fetchSheet<MainSheetRow>(url);
};

export const fetchReferenceData = async (): Promise<ReferenceDataRow[]> => {
  // Timestamp to avoid cache
  const url = `https://docs.google.com/spreadsheets/d/${REF_SHEET_ID}/export?format=csv&gid=${REF_SHEET_GID}&t=${Date.now()}`;
  return fetchSheet<ReferenceDataRow>(url);
};

export const fetchTeacherData = async (): Promise<TeacherDataRow[]> => {
  // Timestamp to avoid cache
  const url = `https://docs.google.com/spreadsheets/d/${REF_SHEET_ID}/export?format=csv&gid=${TEACHER_SHEET_GID}&t=${Date.now()}`;
  return fetchSheet<TeacherDataRow>(url);
};

export const fetchProgramData = async (): Promise<ProgramDataRow[]> => {
  // Timestamp to avoid cache
  const url = `https://docs.google.com/spreadsheets/d/${REF_SHEET_ID}/export?format=csv&gid=${PROGRAM_SHEET_GID}&t=${Date.now()}`;
  return fetchSheet<ProgramDataRow>(url);
};

export const fetchClassRoomData = async (): Promise<ClassRoomDataRow[]> => {
  // Timestamp to avoid cache
  const url = `https://docs.google.com/spreadsheets/d/${REF_SHEET_ID}/export?format=csv&gid=${CLASSROOM_SHEET_GID}&t=${Date.now()}`;
  return fetchSheet<ClassRoomDataRow>(url);
};

export const fetchDiuEmployeeData = async (): Promise<DiuEmployeeRow[]> => {
  // Timestamp to avoid cache
  const url = `https://docs.google.com/spreadsheets/d/${REF_SHEET_ID}/export?format=csv&gid=${DIU_EMPLOYEE_SHEET_GID}&t=${Date.now()}`;
  return fetchSheet<DiuEmployeeRow>(url);
};

export const fetchStudentLinks = async (): Promise<StudentLinkRow[]> => {
  // Add timestamp to ensure fresh data on reload
  const url = `https://docs.google.com/spreadsheets/d/${STUDENT_LINK_SHEET_ID}/export?format=csv&gid=${STUDENT_LINK_SHEET_GID}&t=${Date.now()}`;
  return fetchSheet<StudentLinkRow>(url);
};

export const fetchRegisteredStudentData = async (): Promise<any[]> => {
  // Add timestamp to bypass cache
  const url = `https://docs.google.com/spreadsheets/d/${STUDENT_LINK_SHEET_ID}/export?format=csv&gid=${REGISTERED_STUDENT_SHEET_GID}&t=${Date.now()}`;
  return fetchSheet<any>(url);
};

export const fetchSubSheet = async (sheetLink: string): Promise<CourseSectionData[]> => {
  const { id, gid } = extractSheetIdAndGid(sheetLink);
  if (!id) return [];
  // Timestamp to avoid cache
  const url = `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}&t=${Date.now()}`;
  return fetchSheet<CourseSectionData>(url);
};

// --- API Mutation ---
export interface ApiResult {
    result: 'success' | 'error';
    message?: string;
    error?: any;
}

export interface SubmitOptions {
    insertMethod?: 'append' | 'first_empty';
}

export const submitSheetData = async (
    action: 'add' | 'update' | 'delete',
    sheetName: string,
    data: any,
    keyColumn?: string,
    keyValue?: string,
    spreadsheetId?: string, // Optional parameter for explicit spreadsheet targeting
    options: SubmitOptions = { insertMethod: 'first_empty' }
): Promise<ApiResult> => {
    try {
        const payload = {
            action,
            sheetName,
            data,
            keyColumn,
            keyValue,
            spreadsheetId,
            insertMethod: options.insertMethod // 'first_empty' tells backend to fill gaps if available
        };

        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        // Robustly handle response (Text vs JSON)
        const text = await response.text();
        
        let result;
        try {
            result = JSON.parse(text);
        } catch (e) {
            console.error("Failed to parse JSON response:", text);
            // Detect Google Apps Script HTML Error Pages or default "API is running" msg
            if (text.includes("<!DOCTYPE html") || text.includes("<html")) {
                 return { result: 'error', message: 'API returned HTML (Check Script URL or Deployment)', error: 'HTML Response' };
            }
            if (text.includes("API is run")) {
                 return { result: 'error', message: 'API returned default text. POST request likely redirected to GET.', error: text };
            }
            return { result: 'error', message: 'Invalid API response format', error: text };
        }
        
        return result;
    } catch (error) {
        console.error("API Submit Error:", error);
        return { result: 'error', message: 'Failed to communicate with API', error };
    }
};

// Robust ID normalization: removes spaces, dashes, hidden chars, and ensures lower case for matching
export const normalizeId = (id: string | undefined | null) => {
    if (!id) return '';
    return String(id).replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
};

// Helper to safely extract mobile number with high aggression
export const getMobileNumber = (row: TeacherDataRow, teacherIdRaw: string = ''): string => {
  const keys = Object.keys(row);
  const values = Object.values(row);
  
  const mobileKeys = keys.filter(k => {
      const lower = k.toLowerCase();
      return (lower.includes('mobile') || lower.includes('cell')) && !lower.includes('email');
  });

  for (const key of mobileKeys) {
       const val = row[key];
       if (val && val.trim().length > 0) return val.trim();
  }

  const normalizedTeacherId = normalizeId(teacherIdRaw);

  for (const val of values) {
      if (typeof val !== 'string') continue;
      const cleanVal = val.trim();
      if (!cleanVal) continue;

      if (cleanVal.includes('@')) continue; 
      if (cleanVal === row['Employee Name']) continue;
      if (cleanVal === row['Designation']) continue;
      
      if (cleanVal === teacherIdRaw) continue;
      if (normalizeId(cleanVal) === normalizedTeacherId) continue;

      const digits = cleanVal.replace(/[^0-9]/g, '');

      if (
         (cleanVal.startsWith('01') && digits.length >= 11) ||
         (cleanVal.startsWith('8801') && digits.length >= 13) ||
         (cleanVal.startsWith('+8801') && digits.length >= 13)
      ) {
          return cleanVal;
      }
  }
  
  return '';
};

// --- Student Data Fetching Logic ---
const PID_MAPPING = [
  { pid: '10', code: '02161' },
  { pid: '11', code: '04081' },
  { pid: '12', code: '04083' },
  { pid: '14', code: '04083' },
  { pid: '15', code: '05101' },
  { pid: '16', code: '12091' },
  { pid: '17', code: '04213' },
  { pid: '18', code: '04991' },
  { pid: '19', code: '05151' },
  { pid: '20', code: '12081' },
  { pid: '21', code: '02167' },
  { pid: '22', code: '02163' },
  { pid: '23', code: '14121' },
  { pid: '24', code: '13261' },
  { pid: '25', code: '05103' },
  { pid: '26', code: '08131' },
  { pid: '27', code: '04251' },
  { pid: '28', code: '13263' },
  { pid: '29', code: '11091' },
  { pid: '30', code: '12121' },
  { pid: '31', code: '05153' },
  { pid: '32', code: '14123' },
  { pid: '33', code: '05131' },
  { pid: '34', code: '07121' },
  { pid: '35', code: '05341' },
  { pid: '36', code: '08132' },
  { pid: '37', code: '08133' },
  { pid: '38', code: '08133' },
  { pid: '39', code: '04083' },
  { pid: '40', code: '05291' },
  { pid: '41', code: '07273' },
  { pid: '42', code: '05031' },
  { pid: '43', code: '04281' },
  { pid: '44', code: '12343' },
  { pid: '45', code: '04111' },
  { pid: '46', code: '11093' },
  { pid: '47', code: '05081' },
  { pid: '48', code: '13245' },
  { pid: '49', code: '13083' },
  { pid: '50', code: '05171' },
  { pid: '51', code: '05191' },
  { pid: '52', code: '04991' },
  { pid: '53', code: '07271' },
  { pid: '54', code: '05991' },
  { pid: '55', code: '01101' },
  { pid: '56', code: '05483' },
  { pid: '57', code: '04295' },
  { pid: '58', code: '04011' },
  { pid: '59', code: '03051' },
  { pid: '60', code: '04131' },
  { pid: '61', code: '04221' },
  { pid: '62', code: '13103' },
  { pid: '63', code: '14075' }
];

const fixIdUsingEmail = (id: string, email: string, mobile: string) => {
    if (!id || !email || !id.includes('-')) return { id, mobile };
    const match = email.match(/-(\d+)@/);
    if (match) {
        const emailSuffix = match[1];
        const parts = id.split('-');
        if (parts.length >= 3) {
             const prefix = parts.slice(0, 2).join('-');
             const idSuffixPart = parts.slice(2).join('-');
             if (idSuffixPart.startsWith(emailSuffix)) {
                 const correctId = `${prefix}-${emailSuffix}`;
                 const remainder = idSuffixPart.substring(emailSuffix.length);
                 if (remainder && /^\d+$/.test(remainder)) {
                      return { id: correctId, mobile: remainder + mobile };
                 }
             }
        }
    }
    return { id, mobile };
};

const fetchAndParseSheet = async (sheetId: string, gid: string | null): Promise<StudentDataRow[]> => {
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv${gid ? `&gid=${gid}` : ''}&t=${Date.now()}`;
    const rawData = await fetchSheet<any>(csvUrl);
    const normalizeKey = (obj: any, keyStart: string) => {
        const key = Object.keys(obj).find(k => k.trim().toLowerCase().startsWith(keyStart.toLowerCase()));
        return key ? obj[key] : '';
    };

    return rawData.map(row => {
        let id = String(normalizeKey(row, 'Student ID') || normalizeKey(row, 'ID') || '');
        let mobile = String(normalizeKey(row, 'Mobile') || normalizeKey(row, 'Cell') || '');
        let email = String(normalizeKey(row, 'Email') || '');
        
        let name = String(normalizeKey(row, 'Student Name') || normalizeKey(row, 'Name') || '');
        let sex = String(normalizeKey(row, 'Sex') || normalizeKey(row, 'Gender') || '');

        if (/FEMAL\s+E/i.test(name)) {
             sex = 'Female';
             name = name.replace(/FEMAL\s+E/i, '').trim();
             name = name.replace(/[.-]$/, '');
        }

        return {
            SL: normalizeKey(row, 'SL') || normalizeKey(row, 'Serial'),
            PID: normalizeKey(row, 'PID') || normalizeKey(row, 'Program ID'),
            'Student ID': id,
            'Student Name': name,
            Sex: sex,
            Mobile: mobile,
            Email: email,
        };
    });
};

const fetchAndParsePdf = async (googleDriveLink: string): Promise<StudentDataRow[]> => {
    let directUrl = googleDriveLink;
    const fileIdMatch = googleDriveLink.match(/\/d\/([^/]+)/);
    if (fileIdMatch) {
        directUrl = `https://drive.google.com/uc?export=download&id=${fileIdMatch[1]}`;
    }
    const proxiedUrl = `${CORS_PROXY}${encodeURIComponent(directUrl)}`;
    
    const response = await fetch(proxiedUrl);
    if (!response.ok) throw new Error('Failed to fetch PDF');
    
    const arrayBuffer = await response.arrayBuffer();
    const pdf = await (window as any).pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const totalPages = pdf.numPages;
    const pagePromises = [];
    for (let i = 1; i <= totalPages; i++) {
        pagePromises.push(pdf.getPage(i).then(async (page: any) => {
             const textContent = await page.getTextContent();
             const items = textContent.items.map((item: any) => ({ str: item.str, x: item.transform[4], y: item.transform[5] }));
             items.sort((a: any, b: any) => b.y - a.y || a.x - b.x);
             const lines: { y: number; text: string }[] = [];
             let currentLine: { y: number; parts: {x:number, t:string}[] } | null = null;
             items.forEach((item: any) => {
                if (!currentLine || Math.abs(item.y - currentLine.y) > 5) {
                    if (currentLine) lines.push({ y: currentLine.y, text: currentLine.parts.sort((a,b) => a.x - b.x).map(p => p.t).join(' ') });
                    currentLine = { y: item.y, parts: [{x: item.x, t: item.str}] }; 
                } else {
                    currentLine.parts.push({x: item.x, t: item.str});
                }
            });
            if (currentLine) lines.push({ y: currentLine.y, text: currentLine.parts.sort((a,b) => a.x - b.x).map(p => p.t).join(' ') });
            return lines;
        }));
    }

    const pagesLines = await Promise.all(pagePromises);
    const globalLines = pagesLines.flat();
    const isPageArtifact = (text: string) => {
        const t = text.trim();
        if (!t) return false;
        if (/^\w+ \d{2} \w+ \d{4}/.test(t)) return true;
        if (/^Page \d+ of \d+/i.test(t)) return true;
        if (/^(Program:|Department:|Faculty:|Semester|Session|DSC$|SL\s+Student ID|MORNING|EVENING|AFTERNOON|REGULAR)/i.test(t)) return true;
        return false;
    };

    let allRows: StudentDataRow[] = [];
    let lastPID = '';
    for (let j = 0; j < globalLines.length; j++) {
        const current = globalLines[j];
        let mergedText = current.text;
        let k = j + 1;
        let nextContentObj = null;
        let nextContentIndex = -1;
        while (k < globalLines.length) {
            const nextLineText = globalLines[k].text.trim();
            if (isPageArtifact(nextLineText)) { k++; continue; }
            if (/^\d+$/.test(nextLineText) && k + 1 < globalLines.length && isPageArtifact(globalLines[k+1].text)) { k++; continue; }
            nextContentObj = globalLines[k]; nextContentIndex = k; break;
        }

        if (nextContentObj) {
            const currentIdMatch = mergedText.match(/(\d{8,})/); 
            const nextText = nextContentObj.text.trim();
            const nextStartMatch = nextText.match(/^(\d+)\b/);
            const isNextNewRow = /^\d+\s+\d{3,}/.test(nextText);
            const isLikelyMobile = /^(?:\+88|88)?01\d{9}/.test(nextText);
            if (currentIdMatch && nextStartMatch && !isNextNewRow && !isLikelyMobile) {
                const originalId = currentIdMatch[1];
                const suffix = nextStartMatch[1];
                mergedText = mergedText.replace(originalId, originalId + suffix);
                const rest = nextText.replace(suffix, '').trim();
                if (rest) mergedText += ' ' + rest;
                globalLines[nextContentIndex].text = '';
            }
        }
        
        const text = mergedText.trim();
        if (!text || isPageArtifact(text)) continue;
        const isProgramInfoLine = (text.includes('Program') || text.includes('Department') || text.includes('Bachelor') || text.includes('Master'));
        const isGarbage = text.match(/^\d+$/) || text.match(/^Page \d+/) || text.toLowerCase().includes('semester') || text.toLowerCase().includes('session');

        if (isProgramInfoLine && !isGarbage && text.length > 10) {
              let pidMatch = text.match(/^(?:Program Code|ID|Code)?\s*[:.-]?\s*(\d{2,3})\b/i);
              if (!pidMatch) {
                  const matches = text.matchAll(/\b(\d{2,4})\b/g);
                  for (const m of matches) {
                      const num = parseInt(m[1], 10);
                      if (num < 1900 || num > 2100) { pidMatch = m; break; }
                  }
              }
              if (pidMatch) lastPID = pidMatch[1];
        }

        const idHyphenMatch = text.match(/\b(\d{3}-\d{2}-\d{3,})\b/); 
        const idLongMatch = text.match(/\b(\d{10,35})\b/);
        const idMatch = idHyphenMatch || idLongMatch;
        
        if (idMatch) {
            let id = idMatch[1] || idMatch[0];
            let mobile = '';
            const mobileMatch = text.match(/((?:\+88\s*|88\s*)?01\d{9})/);
            if (mobileMatch) mobile = mobileMatch[1].replace(/\s+/g, '');
            if (/^(?:\+88|88)?01\d{9}$/.test(id)) continue;
            const emailMatch = text.match(/([a-zA-Z0-9._%+-]+\s*@\s*[a-zA-Z0-9.-]+\s*\.\s*[a-zA-Z]{2,})/);
            let email = '';
            let emailRaw = '';
            if (emailMatch) {
                emailRaw = emailMatch[0];
                email = emailRaw.replace(/\s+/g, '');
            }
            const fixed = fixIdUsingEmail(id, email, mobile);
            id = fixed.id;
            mobile = fixed.mobile;
            if (id.length > 16) {
                const overflow = id.substring(16);
                id = id.substring(0, 16);
                const cleanOverflow = overflow.replace(/\s+/g, '');
                if (mobile && cleanOverflow.includes(mobile)) mobile = cleanOverflow; else mobile = cleanOverflow + mobile;
            }
            let currentPID = lastPID;
            const mapping = PID_MAPPING.find(m => id.includes(m.code));
            if (mapping) currentPID = mapping.pid; else {
                const hyphenParts = id.split('-');
                if (hyphenParts.length === 3) currentPID = hyphenParts[1];
            }
            
            let sex = '';
            const femalEMatch = text.match(/FEMAL\s*E/i);
            const rawSexMatch = text.match(/(?:f\s*e\s*)?m\s*a\s*l\s*(?:e|\s*e)/i);
            if (femalEMatch) sex = 'Female'; else if (rawSexMatch) {
                const s = rawSexMatch[0].replace(/\s/g, '').toLowerCase();
                if (s.startsWith('f')) sex = 'Female'; else if (s.startsWith('m')) sex = 'Male';
            }
            const slMatch = text.match(/^(\d+)\s/);
            const sl = slMatch ? slMatch[1] : '';
            let name = text;
            if (sl) name = name.replace(sl, '');
            name = name.replace(idMatch[0], ''); 
            if (emailRaw) name = name.replace(emailRaw, '');
            if (mobile) name = name.replace(mobile, '');
            if (femalEMatch) name = name.replace(new RegExp(femalEMatch[0], 'gi'), ''); else if (rawSexMatch) name = name.replace(new RegExp(rawSexMatch[0], 'gi'), '');
            const leftoverDigits = name.match(/\d+/g);
            if (leftoverDigits) id = id + leftoverDigits.join('');
            name = name.replace(/[^a-zA-Z\s.-]/g, ' ').replace(/\s+/g, ' ').trim().replace(/^[.-]\s*/, '').replace(/\s*[.-]$/, '');
            allRows.push({ SL: sl, PID: currentPID, 'Student ID': id, 'Student Name': name, Sex: sex, Mobile: mobile, Email: email });
        }
    }
    return allRows;
};

export const fetchStudentDetails = async (url: string): Promise<StudentDataRow[]> => {
    const { id, gid } = extractSheetIdAndGid(url);
    const isGoogleSheet = !!id && url.includes('docs.google.com/spreadsheets');
    if (isGoogleSheet) return fetchAndParseSheet(id!, gid);
    else return fetchAndParsePdf(url);
};

// Helper for Program Requirement Parsing
const getReqValues = (reqStr: string, durStr: string) => {
    const getVal = (str: string, type: 'Theory' | 'Lab') => {
        if (!str) return 0;
        const isTheory = type === 'Theory';
        // Regex for Theory: matches "Theory: 123", "Th: 123"
        // Regex for Lab: matches "Lab: 123", "Lb: 123"
        const pattern = isTheory 
          ? /(?:theory|th|lecture|lec)[:\s-]*(\d+)/i 
          : /(?:lab|laboratory|lb)[:\s-]*(\d+)/i;
        
        const match = str.match(pattern);
        if (match) return parseFloat(match[1]);
        
        // Fallback: If looking for Theory and string is just a number (no labels)
        if (isTheory && !/(?:theory|th|lab|lb)/i.test(str)) {
            const simpleMatch = str.match(/(\d+(\.\d+)?)/);
            if (simpleMatch) return parseFloat(simpleMatch[1]);
        }
        return 0;
    };

    const reqTheory = getVal(reqStr, 'Theory');
    const reqLab = getVal(reqStr, 'Lab');
    
    const durTheory = getVal(durStr, 'Theory');
    const durLab = getVal(durStr, 'Lab');

    // Calculate number of classes (floor to get integer part)
    const theoryCount = (durTheory > 0) ? Math.floor(reqTheory / durTheory) : 0;
    const labCount = (durLab > 0) ? Math.floor(reqLab / durLab) : 0;

    return { theory: theoryCount, lab: labCount };
};

// Exported function to fetch merged section data without full reload
export const fetchMergedSectionData = async (
    mainSheetRows: MainSheetRow[],
    programRows: ProgramDataRow[],
    teacherRows: TeacherDataRow[],
    onStatus: (msg: string) => void,
    onBatchData?: (data: CourseSectionData[]) => void // New optional callback
): Promise<CourseSectionData[]> => {
    
    // Build Maps
    const refRows = await fetchReferenceData();
    const refMap = new Map<string, ReferenceDataRow>();
    refRows.forEach(r => refMap.set(r.Ref, r));

    const teacherMap = new Map<string, TeacherDataRow>();
    let teacherIdKey = '';
    if (teacherRows.length > 0) {
        const keys = Object.keys(teacherRows[0]);
        const candidates = ['Employee ID', 'Teacher ID', 'EID', 'ID', 'Code'];
        for (const candidate of candidates) {
            const found = keys.find(k => k.trim().toLowerCase() === candidate.toLowerCase());
            if (found) { teacherIdKey = found; break; }
        }
        if (!teacherIdKey) teacherIdKey = keys.find(k => k.toLowerCase().includes('id')) || keys[0];
    }
    teacherRows.forEach(r => {
        if (teacherIdKey) {
            const id = normalizeId(r[teacherIdKey]);
            if (id) teacherMap.set(id, r);
        }
    });
    
    const programMap = new Map<string, ProgramDataRow>();
    programRows.forEach(p => { if (p.PID) programMap.set(normalizeId(p.PID), p); });

    const batchSize = 12; // Increased batch size for faster loading
    const allData: CourseSectionData[] = [];
    
    for (let i = 0; i < mainSheetRows.length; i += batchSize) {
        const batch = mainSheetRows.slice(i, i + batchSize);
        onStatus(`Fetching semesters ${i + 1}-${Math.min(i + batchSize, mainSheetRows.length)}...`);

        const batchPromises = batch.map(async (row) => {
            if (!row['Sheet Link']) return [];
            const rawData = await fetchSubSheet(row['Sheet Link']);
            return rawData.map(item => {
                 const semester = item.Semester && item.Semester.trim() !== '' ? item.Semester : row.Semester;
                 const refData = refMap.get(item.Ref);
                 const rawTid = item['Teacher ID'];
                 const tid = normalizeId(rawTid);
                 const teacherData = teacherMap.get(tid);
                 const pid = normalizeId(item.PID);
                 const pData = programMap.get(pid);
                 const programStr = pData ? `${item.PID} ${pData['Program Short Name']}` : item.PID;
                 const mobile = teacherData ? getMobileNumber(teacherData, teacherData[teacherIdKey] || rawTid) : item['Mobile Number'];

                 // --- Calculate Class Requirement ---
                 let classReq = '0';
                 if (pData) {
                     const reqValues = getReqValues(pData['Class Requirement'] || '', pData['Class Duration'] || '');
                     const cType = (refData?.['Course Type'] || item['Course Type'] || '').toLowerCase();
                     
                     let baseReq = 0;
                     // Determine Theory vs Lab
                     if (cType.includes('lab') || cType.includes('sessional') || cType.includes('practical')) {
                         baseReq = reqValues.lab;
                     } else {
                         // Default to Theory for Lecture/Theory/Empty
                         baseReq = reqValues.theory;
                     }
                     
                     // Multiply by Credit
                     const credit = parseFloat(item.Credit || '0');
                     if (!isNaN(credit) && credit > 0) {
                         classReq = (baseReq * credit).toString();
                     } else {
                         classReq = baseReq.toString();
                     }
                 }

                 return {
                     ...item,
                     Semester: semester,
                     Program: programStr,
                     'Course Type': refData?.['Course Type'] || item['Course Type'],
                     'Capacity': refData?.['Section Capacity'] || item.Capacity, 
                     'Weekly Class': refData?.['Weekly Class'] || item['Weekly Class'],
                     'ClassRequirement': classReq,
                     'Employee Name': teacherData?.['Employee Name'] || teacherData?.['Teacher Name'] || item['Employee Name'],
                     'Designation': teacherData?.Designation || item.Designation,
                     'Email': teacherData?.Email || item.Email,
                     'Mobile Number': mobile
                 };
            });
        });

        const results = await Promise.all(batchPromises);
        const flatResults = results.flat();
        
        // Incremental Update
        if (onBatchData && flatResults.length > 0) {
            onBatchData(flatResults);
        }

        allData.push(...flatResults);
    }
    return allData;
};

export const fetchAllData = async (
  onStatus: (msg: string) => void,
  onData: (data: CourseSectionData[]) => void,
  onProgramData: (data: ProgramDataRow[]) => void,
  onTeacherData: (data: TeacherDataRow[]) => void,
  onSemesterData: (data: MainSheetRow[]) => void,
  onStudentLinks: (data: StudentLinkRow[]) => void
) => {
  onStatus('Fetching configuration...');
  
  const [mainSheetRows, teacherRows, programRows, studentLinks] = await Promise.all([
    fetchMainSheet(),
    fetchTeacherData(),
    fetchProgramData(),
    fetchStudentLinks()
  ]);

  onProgramData(programRows);
  onTeacherData(teacherRows);
  onSemesterData(mainSheetRows);
  onStudentLinks(studentLinks);

  const mergedData = await fetchMergedSectionData(mainSheetRows, programRows, teacherRows, onStatus);
  if (mergedData.length > 0) onData(mergedData);
};
