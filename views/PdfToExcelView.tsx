
import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, Download, RefreshCw, AlertCircle, FileText, X, Bot, Clock } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

export const PdfToExcelView: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [status, setStatus] = useState<'idle' | 'extracting' | 'analyzing' | 'success' | 'error'>('idle');
    const [statusMessage, setStatusMessage] = useState('');
    const [extractedData, setExtractedData] = useState<any[]>([]);
    const [columns, setColumns] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            resetState();
        }
    };

    const resetState = () => {
        setStatus('idle');
        setStatusMessage('');
        setExtractedData([]);
        setColumns([]);
    };

    const extractTextFromPdf = async (file: File): Promise<string> => {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await (window as any).pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        
        // Increase page limit to utilizing Gemini Flash's large context
        const maxPages = Math.min(pdf.numPages, 50); 
        
        // Parallel Page Processing for Speed
        const pagePromises = Array.from({ length: maxPages }, (_, i) => i + 1).map(async (pageNum) => {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            
            // Basic line grouping logic based on Y coordinate
            const items = textContent.items.map((item: any) => ({
                str: item.str,
                x: item.transform[4],
                y: item.transform[5]
            }));
            
            // Sort by Y descending (top to bottom), then X ascending
            items.sort((a: any, b: any) => b.y - a.y || a.x - b.x);
            
            let lastY = -1;
            let pageText = '';
            
            items.forEach((item: any) => {
                if (lastY !== -1 && Math.abs(item.y - lastY) > 5) {
                    pageText += '\n';
                }
                pageText += item.str + ' ';
                lastY = item.y;
            });

            return `--- Page ${pageNum} ---\n${pageText}\n`;
        });

        const pageTexts = await Promise.all(pagePromises);
        return pageTexts.join('\n');
    };

    const processWithAI = async () => {
        if (!file) return;

        setIsProcessing(true);
        try {
            // Step 1: Extract Text (Parallel)
            setStatus('extracting');
            setStatusMessage('Extracting text from PDF...');
            
            const startTime = Date.now();
            const text = await extractTextFromPdf(file);
            const extractTime = ((Date.now() - startTime) / 1000).toFixed(1);

            if (!text.trim()) {
                throw new Error("No text found in PDF. It might be a scanned image.");
            }

            // Step 2: Send to Gemini
            setStatus('analyzing');
            setStatusMessage(`Analying ${text.length} chars (Extraction took ${extractTime}s)...`);
            
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            // Explicitly requesting JSON array of objects with specific columns
            const prompt = `
            You are a fast data extraction engine.
            Extract the student data from the following text into a JSON array of objects.
            
            The output JSON must strictly follow this structure for each student:
            {
                "Student ID": "...",
                "Student Name": "...",
                "Sex": "...",
                "Mobile": "...",
                "Email": "..."
            }
            
            Rules:
            1. Extract ALL student rows found.
            2. Merge data from multiple pages into one continuous list.
            3. Fix common OCR errors if visible.
            4. If a field (like Email or Mobile) is missing for a row, use an empty string "".
            5. Return ONLY the JSON array.
            
            Text Data:
            ${text.substring(0, 100000)} 
            `; // Increased limit to 100k chars for Flash model

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: "application/json" // Force JSON for speed and reliability
                }
            });

            const rawResponse = response.text || '[]';
            let jsonData: any = [];
            
            try {
                jsonData = JSON.parse(rawResponse);
                // Handle case where AI returns object with data key instead of array
                if (!Array.isArray(jsonData) && typeof jsonData === 'object' && jsonData !== null) {
                    const obj = jsonData as any;
                    const possibleArray = Object.values(obj).find(v => Array.isArray(v));
                    if (possibleArray) jsonData = possibleArray;
                    else if (obj.data && Array.isArray(obj.data)) jsonData = obj.data;
                    else jsonData = [jsonData];
                }
            } catch (e) {
                console.error("JSON Parse Error", e);
                throw new Error("AI response format error.");
            }

            if (!Array.isArray(jsonData) || jsonData.length === 0) {
                throw new Error("No tabular data found or extracted.");
            }

            // Step 3: Success
            setExtractedData(jsonData);
            // Enforce specific columns based on requirements
            const requiredCols = ["Student ID", "Student Name", "Sex", "Mobile", "Email"];
            setColumns(requiredCols);
            setStatus('success');
            setStatusMessage(`Successfully extracted ${jsonData.length} rows.`);

        } catch (error: any) {
            console.error(error);
            setStatus('error');
            setStatusMessage(error.message || "Failed to process PDF.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDownload = () => {
        if (extractedData.length === 0) return;
        
        // Filter data to only contain required columns for clean export
        const exportData = extractedData.map((row: any) => ({
            "Student ID": row["Student ID"] || '',
            "Student Name": row["Student Name"] || '',
            "Sex": row["Sex"] || '',
            "Mobile": row["Mobile"] || '',
            "Email": row["Email"] || ''
        }));

        const worksheet = (window as any).XLSX.utils.json_to_sheet(exportData);
        const workbook = (window as any).XLSX.utils.book_new();
        (window as any).XLSX.utils.book_append_sheet(workbook, worksheet, "Student Data");
        (window as any).XLSX.writeFile(workbook, `${file?.name.replace('.pdf', '')}_Converted.xlsx`);
    };

    return (
        <div className="flex flex-col h-full p-4 space-y-4 bg-gray-50 overflow-y-auto">
            {/* Header */}
            <div className="flex items-center space-x-3 mb-2">
                <div className="p-2.5 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg shadow-sm">
                    <FileSpreadsheet className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-gray-800">PDF to Excel Converter</h2>
                    <p className="text-xs text-gray-500">Powered by Gemini AI</p>
                </div>
            </div>

            {/* Main Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-5xl mx-auto w-full">
                
                {/* Upload Section */}
                <div className={`border-2 border-dashed rounded-xl p-10 text-center transition-all ${file ? 'border-green-300 bg-green-50/30' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'}`}>
                    <input 
                        type="file" 
                        accept=".pdf" 
                        onChange={handleFileChange} 
                        className="hidden" 
                        ref={fileInputRef} 
                    />
                    
                    {!file ? (
                        <div className="flex flex-col items-center cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                            <Upload className="w-12 h-12 text-gray-400 mb-4" />
                            <h3 className="text-sm font-bold text-gray-700">Click to Upload PDF</h3>
                            <p className="text-xs text-gray-500 mt-2">Supports tabular data extraction</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center">
                            <div className="bg-white p-3 rounded-full shadow-sm mb-3">
                                <FileText className="w-8 h-8 text-red-500" />
                            </div>
                            <p className="text-sm font-bold text-gray-800">{file.name}</p>
                            <p className="text-xs text-gray-500 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                            
                            {status !== 'success' && status !== 'analyzing' && status !== 'extracting' && (
                                <button 
                                    onClick={() => { setFile(null); resetState(); }}
                                    className="text-xs text-red-500 hover:text-red-700 mt-3 font-medium flex items-center"
                                >
                                    <X className="w-3 h-3 mr-1" /> Remove
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Action Area */}
                {file && (
                    <div className="mt-6 flex flex-col items-center justify-center space-y-4">
                        {status === 'idle' && (
                            <button
                                onClick={processWithAI}
                                className="flex items-center px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold shadow-md transition-transform active:scale-95 text-sm"
                            >
                                <Bot className="w-5 h-5 mr-2" />
                                Analyze with AI
                            </button>
                        )}

                        {(status === 'extracting' || status === 'analyzing') && (
                            <div className="flex flex-col items-center animate-in fade-in duration-300">
                                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-3"></div>
                                <p className="text-sm font-medium text-blue-700">{statusMessage}</p>
                                <p className="text-[10px] text-gray-400 mt-1 flex items-center">
                                    <Clock className="w-3 h-3 mr-1" /> Processing large files may take a moment
                                </p>
                            </div>
                        )}

                        {status === 'error' && (
                            <div className="flex items-center p-4 bg-red-50 text-red-700 rounded-lg border border-red-100 max-w-md">
                                <AlertCircle className="w-5 h-5 mr-3 shrink-0" />
                                <div className="text-sm">
                                    <span className="font-bold block">Error</span>
                                    {statusMessage}
                                </div>
                                <button 
                                    onClick={() => setStatus('idle')}
                                    className="ml-4 p-1 hover:bg-red-100 rounded"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Results Area */}
                {status === 'success' && (
                    <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-gray-800">Extraction Results</h3>
                                <p className="text-xs text-gray-500">{extractedData.length} rows found</p>
                            </div>
                            <button 
                                onClick={handleDownload}
                                className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Download Excel
                            </button>
                        </div>

                        <div className="border border-gray-200 rounded-lg overflow-hidden max-h-[400px] overflow-y-auto thin-scrollbar relative">
                            <table className="w-full text-left border-collapse text-sm">
                                <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                                    <tr>
                                        {columns.map((col, idx) => (
                                            <th key={idx} className="px-4 py-3 font-bold text-gray-600 border-b border-gray-200 whitespace-nowrap bg-gray-50">
                                                {col}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {extractedData.map((row: any, idx: number) => (
                                        <tr key={idx} className="hover:bg-blue-50/50 transition-colors">
                                            {columns.map((col, cIdx) => (
                                                <td key={cIdx} className="px-4 py-2 text-gray-700 whitespace-nowrap max-w-xs truncate" title={String(row[col])}>
                                                    {row[col]}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
