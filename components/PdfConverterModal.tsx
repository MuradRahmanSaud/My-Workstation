import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, Download, CheckCircle, AlertCircle, FileText, Copy, CheckSquare, Square, RefreshCcw, ListChecks, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, X } from 'lucide-react';
import { useResponsivePagination } from '../hooks/useResponsivePagination';

interface ExtractedRow {
    SL: string;
    PID: string;
    'Student ID': string;
    'Student Name': string;
    Sex: string;
    Mobile: string;
    Email: string;
    [key: string]: string;
}

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

const COLUMNS = ['SL', 'PID', 'Student ID', 'Student Name', 'Sex', 'Mobile', 'Email'];

// Helper to identify page artifacts to skip during look-ahead
const isPageArtifact = (text: string) => {
    const t = text.trim();
    if (!t) return false;
    // Date/Time: Saturday 06 December 2025 10:12 AM
    if (/^\w+ \d{2} \w+ \d{4}/.test(t)) return true;
    // Page X of Y
    if (/^Page \d+ of \d+/i.test(t)) return true;
    // Headers
    if (/^Program:/i.test(t)) return true;
    if (/^Department:/i.test(t)) return true;
    if (/^Faculty:/i.test(t)) return true;
    if (/^Semester/i.test(t)) return true;
    if (/^Session/i.test(t)) return true;
    if (/^DSC$/i.test(t)) return true;
    if (/^SL\s+Student ID/i.test(t)) return true;
    if (/^(MORNING|EVENING|AFTERNOON|REGULAR)$/i.test(t)) return true;
    return false;
};

interface PdfConverterModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const PdfConverterModal: React.FC<PdfConverterModalProps> = ({ isOpen, onClose }) => {
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');
    const [stats, setStats] = useState({ rows: 0, pages: 0 });
    const fileInputRef = useRef<HTMLInputElement>(null);

    // New State for Data Preview and Selection
    const [extractedData, setExtractedData] = useState<ExtractedRow[]>([]);
    // Initially uncheck all columns
    const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set());
    const [copySuccess, setCopySuccess] = useState(false);

    // Pagination Hook
    const { currentPage, setCurrentPage, rowsPerPage, totalPages, paginatedData, containerRef } = useResponsivePagination(extractedData);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setStatus('idle');
            setMessage('');
            setStats({ rows: 0, pages: 0 });
            setExtractedData([]);
            setCopySuccess(false);
        }
    };

    const processPdf = async () => {
        if (!file) return;

        setIsProcessing(true);
        setStatus('processing');
        setMessage('Reading file...');
        setExtractedData([]);

        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await (window as any).pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            
            const totalPages = pdf.numPages;
            
            // Collect all pages first
            const pagePromises = [];
            for (let i = 1; i <= totalPages; i++) {
                pagePromises.push(pdf.getPage(i).then(async (page: any) => {
                     const textContent = await page.getTextContent();
                     const items = textContent.items.map((item: any) => ({
                         str: item.str,
                         x: item.transform[4],
                         y: item.transform[5] 
                     }));
                     items.sort((a: any, b: any) => b.y - a.y || a.x - b.x);
                     
                     const lines: { y: number; text: string }[] = [];
                     let currentLine: { y: number; parts: {x:number, t:string}[] } | null = null;
                     items.forEach((item: any) => {
                        if (!currentLine || Math.abs(item.y - currentLine.y) > 5) {
                            if (currentLine) {
                                lines.push({ 
                                    y: currentLine.y, 
                                    text: currentLine.parts.sort((a,b) => a.x - b.x).map(p => p.t).join(' ') 
                                });
                            }
                            currentLine = { y: item.y, parts: [{x: item.x, t: item.str}] }; 
                        } else {
                            currentLine.parts.push({x: item.x, t: item.str});
                        }
                    });
                    if (currentLine) {
                        lines.push({ 
                            y: currentLine.y, 
                            text: currentLine.parts.sort((a,b) => a.x - b.x).map(p => p.t).join(' ') 
                        });
                    }
                    return lines;
                }));
            }

            const pagesLines = await Promise.all(pagePromises);
            
            // Flatten all pages to handle split rows
            const globalLines = pagesLines.flat();
            
            const allRows: ExtractedRow[] = [];
            let lastPID = '';

            for (let j = 0; j < globalLines.length; j++) {
                const current = globalLines[j];
                let mergedText = current.text;

                // Look Ahead Logic to find next content line (skipping artifacts)
                let k = j + 1;
                let nextContentObj = null;
                let nextContentIndex = -1;

                while (k < globalLines.length) {
                    const nextLineText = globalLines[k].text.trim();
                    
                    if (isPageArtifact(nextLineText)) {
                         k++;
                         continue;
                    }
                    
                    // Context-Aware Skip:
                    // If line looks like a number (e.g., "223") but the NEXT line is an artifact (e.g., "DSC"), 
                    // assume this line is also an artifact (like Semester Code) and skip it.
                    if (/^\d+$/.test(nextLineText) && k + 1 < globalLines.length) {
                        if (isPageArtifact(globalLines[k+1].text)) {
                            k++;
                            continue;
                        }
                    }

                    nextContentObj = globalLines[k];
                    nextContentIndex = k;
                    break;
                }

                if (nextContentObj) {
                    const currentIdMatch = mergedText.match(/(\d{8,})/); // Relaxed ID match
                    const nextText = nextContentObj.text.trim();
                    const nextStartMatch = nextText.match(/^(\d+)\b/);
                    
                    // Check if next is a new row (starts with SL digits followed by ID digits)
                    // e.g. "274 024222..." is a new row. "52" or "52 Name" is likely a suffix.
                    const isNextNewRow = /^\d+\s+\d{3,}/.test(nextText);

                    // Check if suffix looks like a mobile number (e.g. 017...)
                    const isLikelyMobile = /^(?:\+88|88)?01\d{9}/.test(nextText);

                    if (currentIdMatch && nextStartMatch && !isNextNewRow && !isLikelyMobile) {
                        const originalId = currentIdMatch[1];
                        const suffix = nextStartMatch[1];
                        const newId = originalId + suffix;
                        mergedText = mergedText.replace(originalId, newId);
                        
                        const rest = nextText.replace(suffix, '').trim();
                        if (rest) {
                            mergedText += ' ' + rest;
                        }
                        
                        // Clear the next line so it's not processed again
                        globalLines[nextContentIndex].text = '';
                    }
                }
                
                const text = mergedText.trim();
                
                if (!text || isPageArtifact(text)) continue;

                // PID Detection from Header info
                const isProgramInfoLine = (text.includes('Program') || text.includes('Department') || text.includes('Bachelor') || text.includes('Master'));
                const isGarbage = text.match(/^\d+$/) || text.match(/^Page \d+/) || text.toLowerCase().includes('semester') || text.toLowerCase().includes('session');

                if (isProgramInfoLine && !isGarbage && text.length > 10) {
                     let pidMatch = text.match(/^(?:Program Code|ID|Code)?\s*[:.-]?\s*(\d{2,3})\b/i);
                     if (!pidMatch) {
                         const matches = text.matchAll(/\b(\d{2,4})\b/g);
                         for (const m of matches) {
                             const num = parseInt(m[1], 10);
                             if (num < 1900 || num > 2100) {
                                 pidMatch = m;
                                 break;
                             }
                         }
                     }
                     if (pidMatch) lastPID = pidMatch[1];
                }

                // Student Row Detection
                const idHyphenMatch = text.match(/\b(\d{3}-\d{2}-\d{3,5})\b/);
                const idLongMatch = text.match(/\b(\d{10,35})\b/); // Increased limit for merged ID/Mobile
                const idMatch = idHyphenMatch || idLongMatch;
                
                if (idMatch) {
                    let id = idMatch[1] || idMatch[0];
                    let mobile = '';
                    
                    // Extract mobile first to use in logic
                    // Support optional space after +88/88
                    const mobileMatch = text.match(/((?:\+88\s*|88\s*)?01\d{9})/);
                    if (mobileMatch) mobile = mobileMatch[1].replace(/\s+/g, '');

                    // If the found "Student ID" looks exactly like a mobile number (11 digits, starts with 01), skip this row.
                    // This prevents stray mobile numbers from becoming rows.
                    if (/^(?:\+88|88)?01\d{9}$/.test(id)) {
                        continue;
                    }

                    // Strict Truncate to 16 rule
                    if (id.length > 16) {
                        const overflow = id.substring(16);
                        id = id.substring(0, 16);
                        
                        // If mobile is already in overflow (likely because ID captured it), don't double append
                        // Normalize overflow to check for inclusion
                        const cleanOverflow = overflow.replace(/\s+/g, '');
                        if (mobile && cleanOverflow.includes(mobile)) {
                             mobile = cleanOverflow;
                        } else {
                             mobile = cleanOverflow + mobile;
                        }
                    }

                    let currentPID = lastPID;
                    const mapping = PID_MAPPING.find(m => id.includes(m.code));
                    if (mapping) currentPID = mapping.pid;
                    else {
                        const hyphenParts = id.split('-');
                        if (hyphenParts.length === 3) currentPID = hyphenParts[1];
                    }

                    // Email extraction: robust against PDF spaces around @ and .
                    const emailMatch = text.match(/([a-zA-Z0-9._%+-]+\s*@\s*[a-zA-Z0-9.-]+\s*\.\s*[a-zA-Z]{2,})/);
                    let email = '';
                    let emailRaw = '';
                    if (emailMatch) {
                        emailRaw = emailMatch[0];
                        email = emailRaw.replace(/\s+/g, '');
                    }
                    
                    // Sex extraction
                    let sex = '';
                    // Prioritize specific 'FEMAL E' (with optional spaces) artifact detection
                    const femalEMatch = text.match(/FEMAL\s*E/i);
                    const rawSexMatch = text.match(/(?:f\s*e\s*)?m\s*a\s*l\s*(?:e|\s*e)/i);

                    if (femalEMatch) {
                        sex = 'Female';
                    } else if (rawSexMatch) {
                        const s = rawSexMatch[0].replace(/\s/g, '').toLowerCase();
                        if (s.startsWith('f')) sex = 'Female';
                        else if (s.startsWith('m')) sex = 'Male';
                    }

                    const slMatch = text.match(/^(\d+)\s/);
                    const sl = slMatch ? slMatch[1] : '';

                    let name = text;
                    if (sl) name = name.replace(sl, '');
                    // Use original full match to replace to be safe
                    name = name.replace(idMatch[0], ''); 
                    
                    if (emailRaw) name = name.replace(emailRaw, '');
                    if (mobile) name = name.replace(mobile, '');
                    
                    if (femalEMatch) {
                         name = name.replace(new RegExp(femalEMatch[0], 'gi'), '');
                    } else if (rawSexMatch) {
                         name = name.replace(new RegExp(rawSexMatch[0], 'gi'), '');
                    }

                    const leftoverDigits = name.match(/\d+/g);
                    if (leftoverDigits) {
                        const extra = leftoverDigits.join('');
                        id = id + extra;
                    }
                    
                    name = name.replace(/[^a-zA-Z\s.-]/g, ' '); 
                    name = name.replace(/\s+/g, ' ').trim();
                    name = name.replace(/^[.-]\s*/, '').replace(/\s*[.-]$/, '');

                    allRows.push({
                        SL: sl,
                        PID: currentPID,
                        'Student ID': id,
                        'Student Name': name,
                        Sex: sex,
                        Mobile: mobile,
                        Email: email
                    });
                }
            }

            setExtractedData(allRows);
            setStats({ rows: allRows.length, pages: totalPages });
            setStatus('success');
            setMessage(`Successfully extracted ${allRows.length} rows.`);

        } catch (error: any) {
            console.error(error);
            setStatus('error');
            setMessage('Failed to process PDF. Ensure it is a valid text-based PDF.');
        } finally {
            setIsProcessing(false);
        }
    };

    const toggleColumnSelection = (col: string) => {
        const newSet = new Set(selectedColumns);
        if (newSet.has(col)) {
            newSet.delete(col);
        } else {
            newSet.add(col);
        }
        setSelectedColumns(newSet);
    };

    const toggleSelectAll = () => {
        if (selectedColumns.size === COLUMNS.length) {
            setSelectedColumns(new Set());
        } else {
            setSelectedColumns(new Set(COLUMNS));
        }
    };

    // Helper to escape values for TSV/CSV to handle text wrapping (newlines) and tabs
    const escapeTsv = (str: string, forceText: boolean = false) => {
        let val = str || '';
        
        // If forceText is true (for IDs/Mobiles), prepend a single quote so Excel treats as text
        if (forceText) {
            val = `'${val}`;
        }

        // If string contains quotes, tabs, or newlines, wrap in quotes and escape internal quotes
        if (/[,"\n\t]/.test(val)) {
            return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
    };

    const copySelectedToClipboard = () => {
        if (selectedColumns.size === 0 || extractedData.length === 0) return;

        // Filter data to only include selected columns in standard order
        const orderedCols = COLUMNS.filter(col => selectedColumns.has(col));
        
        // Create Header Row
        const header = orderedCols.join('\t');

        // Create Data Rows
        const rows = extractedData.map(row => {
            return orderedCols.map(col => {
                // Force text format for numeric columns that might have leading zeros
                const forceText = ['Student ID', 'Mobile', 'PID', 'SL'].includes(col);
                return escapeTsv(row[col], forceText);
            }).join('\t');
        }).join('\n');

        const finalText = `${header}\n${rows}`;

        navigator.clipboard.writeText(finalText).then(() => {
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        }).catch(err => {
            console.error('Failed to copy', err);
        });
    };

    const downloadSelectedColumns = () => {
        if (selectedColumns.size === 0 || extractedData.length === 0) return;

        // Filter data to only include selected columns
        // Maintain column order based on COLUMNS array
        const filteredData = extractedData.map(row => {
            const newRow: any = {};
            COLUMNS.forEach(col => {
                if (selectedColumns.has(col)) {
                    newRow[col] = row[col];
                }
            });
            return newRow;
        });

        const worksheet = (window as any).XLSX.utils.json_to_sheet(filteredData);
        const workbook = (window as any).XLSX.utils.book_new();
        (window as any).XLSX.utils.book_append_sheet(workbook, worksheet, "Student Data");
        
        const fileName = (file?.name.replace('.pdf', '') || 'Export') + '_Converted.xlsx';
        (window as any).XLSX.writeFile(workbook, fileName);
    };

    const resetTool = () => {
        setFile(null);
        setStatus('idle');
        setExtractedData([]);
        setSelectedColumns(new Set()); // Reset to empty
        setStats({ rows: 0, pages: 0 });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 shrink-0">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center">
                        <div className="p-1.5 bg-green-100 rounded mr-2">
                             <FileSpreadsheet className="w-5 h-5 text-green-600" />
                        </div>
                        PDF to Excel Converter
                    </h3>
                    <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                    <div className="max-w-5xl mx-auto space-y-6">
                        
                        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                            <p className="text-sm text-gray-600 mb-6">
                                Extract student data from PDF. Preview the data, copy selected columns (with headers), or download as Excel.
                            </p>

                            {status !== 'success' && (
                                <>
                                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:bg-gray-50 transition-colors">
                                        <input 
                                            type="file" 
                                            accept=".pdf" 
                                            onChange={handleFileChange}
                                            className="hidden" 
                                            ref={fileInputRef}
                                        />
                                        
                                        {!file ? (
                                            <div className="flex flex-col items-center cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                                <Upload className="w-10 h-10 text-gray-400 mb-3" />
                                                <p className="text-sm font-medium text-gray-700">Click to upload PDF</p>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center">
                                                <FileText className="w-10 h-10 text-blue-500 mb-3" />
                                                <p className="text-sm font-medium text-gray-800">{file.name}</p>
                                                <p className="text-xs text-gray-500 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                                <button 
                                                    onClick={resetTool}
                                                    className="text-xs text-red-500 hover:text-red-700 mt-2 font-medium"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {file && (
                                        <div className="mt-4 flex justify-center">
                                            <button
                                                onClick={processPdf}
                                                disabled={isProcessing}
                                                className={`flex items-center px-6 py-2.5 rounded-lg text-sm font-bold text-white shadow-md transition-all ${
                                                    isProcessing 
                                                    ? 'bg-gray-400 cursor-not-allowed' 
                                                    : 'bg-green-600 hover:bg-green-700 active:scale-95'
                                                }`}
                                            >
                                                {isProcessing ? (
                                                    <>
                                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                                                        Extracting...
                                                    </>
                                                ) : (
                                                    <>
                                                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                                                        Start Extraction
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    )}

                                    {status === 'processing' && (
                                        <div className="mt-4 p-3 bg-blue-50 text-blue-700 rounded text-xs text-center animate-pulse">
                                            {message}
                                        </div>
                                    )}
                                     {status === 'error' && (
                                        <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-lg flex items-center text-red-700">
                                            <AlertCircle className="w-5 h-5 mr-2 shrink-0" />
                                            <div>
                                                <span className="font-bold block text-sm">Error</span>
                                                <span className="text-xs">{message}</span>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            {status === 'success' && extractedData.length === 0 && (
                                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-100 rounded-lg flex flex-col items-center text-yellow-700">
                                    <AlertCircle className="w-8 h-8 mb-2 shrink-0 opacity-80" />
                                    <span className="font-bold text-sm">No Data Found</span>
                                    <span className="text-xs text-center mt-1">
                                        The extraction completed but no student records were identified. 
                                        <br/>Please ensure the PDF contains identifiable student data tables (Student ID, Name, etc.).
                                    </span>
                                    <button 
                                        onClick={resetTool}
                                        className="mt-3 px-3 py-1.5 text-xs font-bold text-yellow-700 border border-yellow-300 rounded hover:bg-yellow-100"
                                    >
                                        Try Another File
                                    </button>
                                </div>
                            )}

                            {status === 'success' && extractedData.length > 0 && (
                                <div className="mt-6 flex flex-col h-[500px]">
                                    {/* Actions Bar */}
                                    <div className="flex items-center justify-between mb-3 shrink-0">
                                        <div className="flex items-center text-sm text-gray-600">
                                            <span className="font-bold mr-1">{extractedData.length}</span> rows extracted.
                                            <span className="ml-2 text-xs text-gray-500">(Select columns to export)</span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                             <button
                                                onClick={toggleSelectAll}
                                                className="flex items-center px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded border border-gray-300"
                                            >
                                                <ListChecks className="w-3.5 h-3.5 mr-1" />
                                                {selectedColumns.size === COLUMNS.length ? 'Deselect All' : 'Select All'}
                                            </button>

                                             <button
                                                onClick={resetTool}
                                                className="flex items-center px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded border border-gray-300"
                                            >
                                                <RefreshCcw className="w-3.5 h-3.5 mr-1" />
                                                Reset
                                            </button>
                                            
                                            <button
                                                onClick={copySelectedToClipboard}
                                                disabled={selectedColumns.size === 0}
                                                className="flex items-center px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded border border-gray-300 transition-all"
                                                title="Copy with headers (handles text wrap)"
                                            >
                                                {copySuccess ? (
                                                    <CheckCircle className="w-3.5 h-3.5 mr-1 text-green-600" />
                                                ) : (
                                                    <Copy className="w-3.5 h-3.5 mr-1" />
                                                )}
                                                {copySuccess ? 'Copied' : 'Copy'}
                                            </button>

                                            <button
                                                onClick={downloadSelectedColumns}
                                                disabled={selectedColumns.size === 0}
                                                className="flex items-center px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <Download className="w-3.5 h-3.5 mr-1.5" />
                                                Download Selected
                                            </button>
                                        </div>
                                    </div>

                                    {/* Data Table */}
                                    <div className="flex-1 overflow-auto border border-gray-200 rounded-lg thin-scrollbar relative" ref={containerRef}>
                                        <table className="w-full text-left border-collapse">
                                            <thead className="bg-gray-50 sticky top-0 z-10 border-b border-gray-200 shadow-sm">
                                                <tr>
                                                    {COLUMNS.map(col => (
                                                        <th key={col} className="px-3 py-2 text-xs font-bold text-gray-700 whitespace-nowrap bg-gray-50">
                                                            <div className="flex items-center space-x-2">
                                                                <button 
                                                                    onClick={() => toggleColumnSelection(col)}
                                                                    className="text-gray-500 hover:text-blue-600 focus:outline-none"
                                                                >
                                                                    {selectedColumns.has(col) ? (
                                                                        <CheckSquare className="w-4 h-4 text-blue-600" />
                                                                    ) : (
                                                                        <Square className="w-4 h-4 text-gray-400" />
                                                                    )}
                                                                </button>
                                                                <span>{col}</span>
                                                            </div>
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50 bg-white">
                                                {paginatedData.map((row, idx) => (
                                                    <tr key={idx} className="hover:bg-blue-50/30 text-xs text-gray-600">
                                                        {COLUMNS.map(col => (
                                                            <td key={col} className={`px-3 py-1.5 border-r border-transparent ${selectedColumns.has(col) ? 'opacity-100' : 'opacity-50 bg-gray-50'}`}>
                                                                <div className="max-w-[150px] truncate" title={row[col]}>
                                                                    {row[col]}
                                                                </div>
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Pagination Footer */}
                                    <div className="bg-slate-50 px-2 py-1 border-t border-gray-200 flex justify-between items-center text-[10px] text-gray-500 font-medium select-none shrink-0 h-[30px] rounded-b-lg">
                                        <div className="flex items-center space-x-2">
                                             <span>
                                                {extractedData.length > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0}-
                                                {Math.min(currentPage * rowsPerPage, extractedData.length)} of {extractedData.length}
                                             </span>
                                        </div>

                                        <div className="flex items-center space-x-1">
                                              <button 
                                                onClick={() => setCurrentPage(1)} 
                                                disabled={currentPage === 1}
                                                className="p-1 hover:bg-white hover:shadow-sm rounded disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                                              >
                                                  <ChevronsLeft className="w-3.5 h-3.5" />
                                              </button>
                                              <button 
                                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                                                disabled={currentPage === 1}
                                                className="p-1 hover:bg-white hover:shadow-sm rounded disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                                              >
                                                  <ChevronLeft className="w-3.5 h-3.5" />
                                              </button>
                                              
                                              <span className="min-w-[20px] text-center font-bold text-gray-700">
                                                  {currentPage}
                                              </span>
                                              
                                              <button 
                                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                                                disabled={currentPage === totalPages || totalPages === 0}
                                                className="p-1 hover:bg-white hover:shadow-sm rounded disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                                              >
                                                  <ChevronRight className="w-3.5 h-3.5" />
                                              </button>
                                               <button 
                                                onClick={() => setCurrentPage(totalPages)} 
                                                disabled={currentPage === totalPages || totalPages === 0}
                                                className="p-1 hover:bg-white hover:shadow-sm rounded disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                                              >
                                                  <ChevronsRight className="w-3.5 h-3.5" />
                                              </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};