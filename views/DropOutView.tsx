
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { UserX, RefreshCw, ArrowLeft, School, Search, Filter, MessageSquare } from 'lucide-react';
import { useSheetData } from '../hooks/useSheetData';
import { DropOutDashboard, DropoutKpiType } from '../components/DropOutDashboard';
import { AdmittedReportTable } from '../components/AdmittedReportTable';
import { UnregisteredStudentsModal } from '../components/UnregisteredStudentsModal';
import { ProgramRightPanel } from '../components/ProgramRightPanel';
import { FilterPanel } from '../components/FilterPanel';
import { FollowupTimelineDashboard } from '../components/FollowupTimelineDashboard';
import { ProgramDataRow, StudentDataRow } from '../types';
import { normalizeId, submitSheetData, extractSheetIdAndGid } from '../services/sheetService';
import { isValEmpty } from './EmployeeView';

const FACULTY_CHIP_COLORS: Record<string, string> = {
  'FBE': 'bg-red-100 text-red-700 border-red-200',
  'FE': 'bg-orange-100 text-orange-700 border-orange-200',
  'FHLS': 'bg-amber-100 text-amber-700 border-amber-200',
  'FHSS': 'bg-green-100 text-green-700 border-green-200',
  'FSIT': 'bg-blue-100 text-blue-700 border-blue-200',
};

const FACULTY_HEADER_COLORS: Record<string, string> = {
  'FBE': 'bg-red-50 text-red-800',
  'FE': 'bg-orange-50 text-orange-800',
  'FHLS': 'bg-amber-50 text-amber-800',
  'FHSS': 'bg-green-50 text-green-800',
  'FSIT': 'bg-blue-50 text-blue-800',
};

export const DropOutView: React.FC = () => {
    const { 
        programData, facultyLeadershipData, diuEmployeeData, teacherData, loading, reloadData,
        studentDataLinks, studentCache, loadStudentData, updateStudentData, registeredData, loadRegisteredData,
        updateProgramData, updateFacultyLeadershipData, updateDiuEmployeeData, semesterFilter, uniqueSemesters
    } = useSheetData();

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedFaculty, setSelectedFaculty] = useState<string>('All');
    const [selectedType, setSelectedType] = useState<string | null>(null);
    const [selectedSemesterMode, setSelectedSemesterMode] = useState<string | null>(null);
    const [selectedProgram, setSelectedProgram] = useState<ProgramDataRow | null>(null);
    const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
    
    const [activeUnregList, setActiveUnregList] = useState<{ semester: string; programId: string; programName: string; students: StudentDataRow[]; targetSemester: string; listType: DropoutKpiType | any } | null>(null);
    const [currentListType, setCurrentListType] = useState<DropoutKpiType>('regPending');
    
    const [selectedAdmittedSemesters, setSelectedAdmittedSemesters] = useState<Set<string>>(new Set());
    const [registrationFilters, setRegistrationFilters] = useState<Map<string, 'registered' | 'unregistered'>>(new Map());
    const [selectedStudent, setSelectedStudent] = useState<StudentDataRow | null>(null);
    const [shouldAutoOpenRemarks, setShouldAutoOpenRemarks] = useState(false);
    const [targetRegSem, setTargetRegSem] = useState<string>('');

    useEffect(() => {
        if (registeredData.length === 0) loadRegisteredData();
    }, [loadRegisteredData, registeredData.length]);

    useEffect(() => {
        if (programData.length > 0 && !selectedProgram) {
            setSelectedProgram(programData[0]);
        }
    }, [programData, selectedProgram]);

    const admittedSemestersOptions = useMemo(() => {
        const keys = Array.from(studentDataLinks.keys()) as string[];
        const seasonWeight: Record<string, number> = { 'winter': 0, 'spring': 1, 'summer': 2, 'short': 2, 'fall': 3, 'autumn': 3 };
        return keys.sort((a, b) => {
            const regex = /([a-zA-Z]+)[\s-]*'?(\d{2,4})/;
            const matchA = a.match(regex);
            const matchB = b.match(regex);
            if (!matchA || !matchB) return b.localeCompare(a);
            let yearA = parseInt(matchA[2], 10); if (yearA < 100) yearA += 2000;
            let yearB = parseInt(matchB[2], 10); if (yearB < 100) yearB += 2000;
            if (yearA !== yearB) return yearB - yearA;
            return (seasonWeight[matchB[1].toLowerCase()] || 0) - (seasonWeight[matchA[1].toLowerCase()] || 0);
        });
    }, [studentDataLinks]);

    useEffect(() => {
        if (admittedSemestersOptions.length > 0 && selectedAdmittedSemesters.size === 0) {
            setSelectedAdmittedSemesters(new Set(admittedSemestersOptions.slice(0, 12)));
        }
    }, [admittedSemestersOptions]);

    useEffect(() => {
        selectedAdmittedSemesters.forEach(sem => {
            if (!studentCache.has(sem)) loadStudentData(sem);
        });
    }, [selectedAdmittedSemesters, studentCache, loadStudentData]);

    const registeredSemesters = useMemo(() => {
        if (registeredData.length === 0) return [];
        const keys = Object.keys(registeredData[0]).filter(k => k.trim() !== '');
        const seasonWeight: Record<string, number> = { 'winter': 0, 'spring': 1, 'summer': 2, 'short': 2, 'fall': 3, 'autumn': 3 };
        return keys.sort((a, b) => {
            const regex = /([a-zA-Z]+)[\s-]*'?(\d{2,4})/;
            const matchA = a.match(regex);
            const matchB = b.match(regex);
            if (!matchA || !matchB) return b.localeCompare(a);
            let yearA = parseInt(matchA[2], 10); if (yearA < 100) yearA += 2000;
            let yearB = parseInt(matchB[2], 10); if (yearB < 100) yearB += 2000;
            if (yearA !== yearB) return yearB - yearA;
            return (seasonWeight[matchB[1].toLowerCase()] || 0) - (seasonWeight[matchA[1].toLowerCase()] || 0);
        });
    }, [registeredData]);

    useEffect(() => {
        if (registeredSemesters.length > 0 && !targetRegSem) {
            setTargetRegSem(registeredSemesters[0]);
        }
    }, [registeredSemesters, targetRegSem]);

    const registrationLookup = useMemo(() => {
        const map = new Map<string, Set<string>>();
        if (registeredData.length === 0) return map;
        registeredData.forEach(row => {
            Object.entries(row).forEach(([sem, idVal]) => {
                if (sem && idVal) {
                    const sId = String(idVal).trim();
                    if (!map.has(sId)) map.set(sId, new Set());
                    map.get(sId)!.add(sem);
                }
            });
        });
        return map;
    }, [registeredData]);

    const programMap = useMemo(() => {
        const map = new Map<string, string>();
        programData.forEach(p => { if (p.PID && p['Program Short Name']) map.set(normalizeId(p.PID), p['Program Short Name']); });
        return map;
    }, [programData]);

    const kpiStats = useMemo(() => {
        if (!selectedProgram || !targetRegSem) return { enrolled: 0, registered: 0, unregistered: 0, pDrop: 0, tDrop: 0, crCom: 0, defense: 0, regPending: 0, followup: 0 };
        const pidNorm = normalizeId(selectedProgram.PID);
        let enrolled = 0, registered = 0, pDrop = 0, tDrop = 0, crCom = 0, defense = 0, regPending = 0, followup = 0;
        
        const seasonWeight: Record<string, number> = { 'winter': 0, 'spring': 1, 'summer': 2, 'short': 2, 'fall': 3, 'autumn': 3 };
        const parseSem = (sem: string) => {
            const match = sem.match(/([a-zA-Z]+)[\s-]*'?(\d{2,4})/);
            if (!match) return { year: 0, season: -1 };
            let year = parseInt(match[2], 10); if (year < 100) year += 2000;
            return { year, season: seasonWeight[match[1].toLowerCase()] ?? -1 };
        };
        const targetParsed = parseSem(targetRegSem);

        selectedAdmittedSemesters.forEach(sem => {
            const currentParsed = parseSem(sem);
            const isOnOrBefore = currentParsed.year < targetParsed.year || (currentParsed.year === targetParsed.year && currentParsed.season <= targetParsed.season);
            if (!isOnOrBefore) return;
            const students = studentCache.get(sem) || [];
            students.forEach(s => {
                if (normalizeId(s.PID) === pidNorm) {
                    enrolled++;
                    const id = String(s['Student ID']).trim();
                    const isRegistered = registrationLookup.get(id)?.has(targetRegSem) || false;
                    if (isRegistered) registered++;

                    const dropClass = s['Dropout Classification'] || '';
                    const isPDrop = dropClass.includes('Permanent');
                    const isTDrop = dropClass.includes('Temporary');
                    if (isPDrop) pDrop++;
                    if (isTDrop) tDrop++;

                    const credReq = parseFloat(s['Credit Requirement'] || '0');
                    const credCom = parseFloat(s['Credit Completed'] || '0');
                    const hasCrCom = !isNaN(credReq) && !isNaN(credCom) && credReq > 0 && (credCom >= credReq);
                    if (hasCrCom) crCom++;

                    if (!isValEmpty(s['Defense Registration'])) defense++;

                    if (!isRegistered && !isPDrop && !hasCrCom) regPending++;

                    const remarksRaw = s['Discussion Remark'] || '';
                    if (remarksRaw) {
                        followup += remarksRaw.split(' || ').filter(Boolean).length;
                    }
                }
            });
        });
        return { enrolled, registered, unregistered: enrolled - registered, pDrop, tDrop, crCom, defense, regPending, followup };
    }, [selectedProgram, selectedAdmittedSemesters, studentCache, registrationLookup, targetRegSem]);

    const getFilteredStudentList = useCallback((type: DropoutKpiType) => {
        if (!selectedProgram || !targetRegSem) return [];
        const pidNorm = normalizeId(selectedProgram.PID);
        const results: StudentDataRow[] = [];
        
        const seasonWeight: Record<string, number> = { 'winter': 0, 'spring': 1, 'summer': 2, 'short': 2, 'fall': 3, 'autumn': 3 };
        const parseSem = (sem: string) => {
            const match = sem.match(/([a-zA-Z]+)[\s-]*'?(\d{2,4})/);
            if (!match) return { year: 0, season: -1 };
            let year = parseInt(match[2], 10); if (year < 100) year += 2000;
            return { year, season: seasonWeight[match[1].toLowerCase()] ?? -1 };
        };
        const targetParsed = parseSem(targetRegSem);

        selectedAdmittedSemesters.forEach(sem => {
            const currentParsed = parseSem(sem);
            const isOnOrBefore = currentParsed.year < targetParsed.year || (currentParsed.year === targetParsed.year && currentParsed.season <= targetParsed.season);
            if (!isOnOrBefore) return;
            
            const students = studentCache.get(sem) || [];
            students.forEach(s => {
                if (normalizeId(s.PID) === pidNorm) {
                    const id = String(s['Student ID']).trim();
                    const isRegistered = registrationLookup.get(id)?.has(targetRegSem) || false;
                    const dropClass = s['Dropout Classification'] || '';
                    const isPDrop = dropClass.includes('Permanent');
                    const isTDrop = dropClass.includes('Temporary');
                    const credReq = parseFloat(s['Credit Requirement'] || '0');
                    const credCom = parseFloat(s['Credit Completed'] || '0');
                    const hasCrCom = !isNaN(credReq) && !isNaN(credCom) && credReq > 0 && (credCom >= credReq);
                    const isDefense = !isValEmpty(s['Defense Registration']);
                    const hasFollowup = (s['Discussion Remark'] || '').trim() !== '';

                    let match = false;
                    if (type === 'all') match = true;
                    else if (type === 'registered') match = isRegistered;
                    else if (type === 'unregistered') match = !isRegistered;
                    else if (type === 'pdrop') match = isPDrop;
                    else if (type === 'tdrop') match = isTDrop;
                    else if (type === 'crcom') match = hasCrCom;
                    else if (type === 'defense') match = isDefense;
                    else if (type === 'regPending') match = !isRegistered && !isPDrop && !hasCrCom;
                    else if (type === 'followup') match = hasFollowup;

                    if (match) {
                        results.push({ ...s, _semester: sem });
                    }
                }
            });
        });
        return results;
    }, [selectedProgram, targetRegSem, selectedAdmittedSemesters, studentCache, registrationLookup]);

    const handleCardClick = (type: DropoutKpiType) => {
        setCurrentListType(type);
        setShouldAutoOpenRemarks(false); // Default: don't auto-open remarks for KPI card clicks
        if (selectedProgram) {
            const students = getFilteredStudentList(type);
            setActiveUnregList({
                semester: 'Selection Analysis',
                programId: selectedProgram.PID,
                programName: selectedProgram['Program Short Name'],
                students,
                targetSemester: targetRegSem,
                listType: type
            });
        }
    };

    const handleFollowupStudentClick = (studentId: string) => {
        const followupStudents = getFilteredStudentList('followup');
        const student = followupStudents.find(s => s['Student ID'] === studentId);
        if (student) {
            setShouldAutoOpenRemarks(true); // Flag to open Remarks & History panel
            setSelectedStudent(student);
        }
    };

    // Initialize list only if nothing is selected or program changes
    useEffect(() => {
        if (selectedProgram && targetRegSem && !activeUnregList) {
            handleCardClick(currentListType);
        }
    }, [selectedProgram?.PID, targetRegSem]);

    const employeeOptions = useMemo(() => {
        const map = new Map<string, string>();
        diuEmployeeData.forEach(e => { 
            const id = e['Employee ID']?.trim();
            if (!id) return;
            map.set(normalizeId(id), `${e['Employee Name']} - ${[e['Administrative Designation'], e['Academic Designation']].filter(Boolean).join('/')} (${id})`); 
        });
        teacherData.forEach(t => {
            const id = t['Employee ID']?.trim();
            if (!id) return;
            const normId = normalizeId(id);
            if (!map.has(normId)) map.set(normId, `${t['Employee Name']} - ${t.Designation} (${id})`);
        });
        return Array.from(map.values()).sort();
    }, [diuEmployeeData, teacherData]);

    const employeeFieldOptions = useMemo(() => {
        const depts = new Set<string>(), grps = new Set<string>(), adminDesigs = new Set<string>(), acadDesigs = new Set<string>();
        diuEmployeeData.forEach(e => { if (e.Department) depts.add(e.Department); if (e['Group Name']) e['Group Name'].split(',').forEach(g => grps.add(g.trim())); if (e['Administrative Designation']) adminDesigs.add(e['Administrative Designation']); if (e['Academic Designation']) acadDesigs.add(e['Academic Designation']); });
        return { 'Department': Array.from(depts).sort(), 'Group Name': Array.from(grps).sort().filter(Boolean), 'Status': ['Active', 'Inactive', 'On Leave'], 'Administrative Designation': Array.from(adminDesigs).sort().filter(Boolean), 'Academic Designation': Array.from(acadDesigs).sort().filter(Boolean) };
    }, [diuEmployeeData]);

    const handleUpdatePersonnel = async (data: any, persist = true) => {
        updateDiuEmployeeData(prev => prev.map(e => normalizeId(e['Employee ID']) === normalizeId(data['Employee ID']) ? { ...e, ...data } : e));
    };

    const handleSaveStudent = async (semester: string, student: StudentDataRow) => {
        const link = studentDataLinks.get(semester);
        if (!link) return;
        const { id: sheetId } = extractSheetIdAndGid(link);
        if (!sheetId) return;

        setSelectedStudent(prev => prev ? { ...prev, ...student } : null);
        updateStudentData(semester, student['Student ID'], student);
        
        if (activeUnregList) {
            const newStudents = activeUnregList.students.map(s => s['Student ID'] === student['Student ID'] ? { ...s, ...student } : s);
            setActiveUnregList({ ...activeUnregList, students: newStudents });
        }

        const { _semester, ...apiPayload } = student as any;
        try {
            await submitSheetData('update', semester, apiPayload, 'Student ID', student['Student ID'].trim(), sheetId);
        } catch (e) {
            console.error("Failed to persist student update in DropOutView", e);
        }
    };

    const handleCloseStudent = () => {
        setSelectedStudent(null);
        setShouldAutoOpenRemarks(false);
    };

    const headerTitleTarget = document.getElementById('header-title-area');
    const headerActionsTarget = document.getElementById('header-actions-area');

    return (
        <div className="flex flex-col h-full bg-gray-50 relative overflow-hidden">
            {headerTitleTarget && createPortal(
                <div className="flex items-center space-x-3 animate-in fade-in slide-in-from-left-2 duration-300">
                    <h2 className="text-[13px] md:text-sm font-bold text-gray-800 uppercase tracking-wide flex items-center truncate">
                        <UserX className="w-4 h-4 mr-2 text-red-600 shrink-0" />
                        Dropout Analysis
                        {selectedProgram && (
                            <>
                                <span className="mx-2 text-gray-300 font-normal shrink-0">|</span>
                                <span className="text-blue-600 normal-case truncate max-w-[150px] md:max-w-none" title={selectedProgram['Program Full Name']}>
                                    {selectedProgram['Program Full Name']}
                                </span>
                            </>
                        )}
                    </h2>
                </div>, 
                headerTitleTarget
            )}
            {headerActionsTarget && createPortal(
                <div className="flex items-center space-x-1 animate-in fade-in slide-in-from-right-2 duration-300 overflow-hidden">
                    <button onClick={() => setIsFilterPanelOpen(true)} className={`flex items-center space-x-1 px-3 py-1.5 text-[11px] font-bold rounded-full border bg-white text-gray-600 border-gray-200 transition-all hover:bg-gray-100`}>
                        <Filter className="w-3.5 h-3.5" />
                        <span>Filter Program & Data</span>
                    </button>
                    <button onClick={() => reloadData('admitted', true)} disabled={loading.status === 'loading'} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all">
                        <RefreshCw className={`w-4 h-4 ${loading.status === 'loading' ? 'animate-spin' : ''}`} />
                    </button>
                </div>, 
                headerActionsTarget
            )}
            <div className="flex-1 overflow-hidden flex flex-row relative">
                <div className="flex-1 min-w-0 bg-white overflow-hidden flex flex-col lg:flex-row">
                    {selectedProgram ? (
                        <>
                            <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/50 border-r border-gray-100">
                                <div className="p-2 md:p-3 shrink-0 bg-white shadow-sm border-b border-gray-100">
                                    <DropOutDashboard 
                                        stats={kpiStats} 
                                        comparisonSemester={targetRegSem} 
                                        onCardClick={handleCardClick}
                                        activeType={currentListType}
                                    />
                                </div>
                                <div className="flex-1 flex flex-col overflow-hidden">
                                    {currentListType === 'followup' ? (
                                        <div className="flex-1 overflow-hidden p-2 md:p-3">
                                            <FollowupTimelineDashboard 
                                                students={getFilteredStudentList('followup')} 
                                                onRowClick={handleFollowupStudentClick}
                                                diuEmployeeData={diuEmployeeData}
                                                teacherData={teacherData}
                                            />
                                        </div>
                                    ) : (
                                        <div className="flex flex-row h-full gap-2 p-2">
                                            <div className="flex-[1.6] border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm flex flex-col">
                                                <AdmittedReportTable 
                                                    selectedAdmittedSemesters={selectedAdmittedSemesters}
                                                    studentCache={studentCache}
                                                    registrationLookup={registrationLookup}
                                                    registeredSemesters={registeredSemesters}
                                                    programMap={programMap}
                                                    programData={programData}
                                                    selectedPrograms={new Set([normalizeId(selectedProgram.PID)])}
                                                    selectedFaculties={new Set()}
                                                    setSelectedFaculties={() => {}}
                                                    selectedProgramTypes={new Set()}
                                                    selectedSemesterTypes={new Set()}
                                                    onUnregClick={(data) => {
                                                        setCurrentListType(data.listType as DropoutKpiType);
                                                        setActiveUnregList(data);
                                                        setShouldAutoOpenRemarks(false); // Reset when switching categories
                                                    }}
                                                    externalTargetRegSemester={targetRegSem}
                                                    onTargetRegSemesterChange={setTargetRegSem}
                                                />
                                            </div>
                                            <div className="flex-1 border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm flex flex-col">
                                                {activeUnregList ? (
                                                    <UnregisteredStudentsModal 
                                                        isInline={true} isOpen={true} 
                                                        onClose={() => {}} 
                                                        semester={activeUnregList.semester} 
                                                        programName={activeUnregList.programName} 
                                                        programId={activeUnregList.programId} 
                                                        targetSemester={activeUnregList.targetSemester} 
                                                        students={activeUnregList.students}
                                                        programMap={programMap}
                                                        registrationLookup={registrationLookup}
                                                        onRowClick={(student) => {
                                                            setShouldAutoOpenRemarks(false); // Default behavior for list clicks
                                                            setSelectedStudent(student);
                                                        }}
                                                        listType={activeUnregList.listType}
                                                    />
                                                ) : (
                                                    <div className="h-full flex flex-col items-center justify-center text-slate-300 p-8 text-center bg-slate-50/20">
                                                        <UserX className="w-12 h-12 mb-3 opacity-10" />
                                                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">Select a category to view analysis</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <ProgramRightPanel 
                                program={selectedProgram}
                                facultyLeadership={facultyLeadershipData.find(f => f['Faculty Short Name'] === selectedProgram['Faculty Short Name'])}
                                facultyLeadershipData={facultyLeadershipData}
                                diuEmployeeData={diuEmployeeData}
                                teacherData={teacherData}
                                employeeOptions={employeeOptions}
                                employeeFieldOptions={employeeFieldOptions}
                                onSaveFacultyLeadership={async () => {}}
                                onSaveProgramLeadership={async () => {}}
                                onSaveProgramData={async () => {}}
                                onSaveEmployee={handleUpdatePersonnel}
                                onSaveStudent={handleSaveStudent}
                                selectedStudent={selectedStudent}
                                studentSemester={selectedStudent ? (selectedStudent as any)._semester : undefined}
                                onCloseStudent={handleCloseStudent}
                                registrationLookup={registrationLookup}
                                autoOpenRemarks={shouldAutoOpenRemarks}
                            />
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-slate-50/50">
                            <UserX className="w-16 h-16 mb-4 opacity-10" />
                            <p className="text-sm font-medium">Select a program via Filter to analyze dropouts</p>
                        </div>
                    )}
                </div>
            </div>
            
            <FilterPanel 
                isOpen={isFilterPanelOpen} 
                onClose={() => setIsFilterPanelOpen(false)} 
                programData={programData} 
                semesterFilter="All" 
                setSemesterFilter={() => {}} 
                uniqueSemesters={[]} 
                selectedFaculties={selectedFaculty === 'All' ? new Set() : new Set([selectedFaculty])} 
                setSelectedFaculties={(f) => setSelectedFaculty(Array.from(f)[0] || 'All')} 
                selectedProgramTypes={new Set()} 
                setSelectedProgramTypes={() => {}} 
                selectedSemesterTypes={new Set()} 
                setSelectedSemesterTypes={() => {}} 
                selectedPrograms={new Set()} 
                setSelectedPrograms={() => {}} 
                attributeOptions={{ teachers: [], courseTypes: [], types: [], credits: [], capacities: [], studentCounts: [], classTakenCounts: [] }} 
                selectedTeachers={new Set()} 
                setSelectedTeachers={() => {}} 
                selectedCourseTypes={new Set()} 
                setSelectedCourseTypes={() => {}} 
                selectedTypes={new Set()} 
                setSelectedTypes={() => {}} 
                selectedCredits={new Set()} 
                setSelectedCredits={() => {}} 
                selectedCapacities={new Set()} 
                setSelectedCapacities={() => {}} 
                studentMin="" 
                setStudentMin={() => {}} 
                studentMax="" 
                setStudentMax={() => {}} 
                selectedStudentCounts={new Set()} 
                setSelectedStudentCounts={() => {}} 
                classTakenMin="" 
                setClassTakenMin={() => {}} 
                classTakenMax="" 
                setClassTakenMax={() => {}} 
                selectedClassTakens={new Set()} 
                setSelectedClassTakens={() => {}} 
                onClearAll={() => {}} 
                hideProgramTab={false} 
                viewMode="dropout" 
                admittedSemestersOptions={admittedSemestersOptions} 
                selectedAdmittedSemesters={selectedAdmittedSemesters} 
                onAdmittedSemesterChange={setSelectedAdmittedSemesters} 
                registeredSemestersOptions={registeredSemesters} 
                registrationFilters={registrationFilters} 
                onRegistrationFilterChange={setRegistrationFilters}
                selectedType={selectedType}
                setSelectedType={setSelectedType}
                selectedSemesterMode={selectedSemesterMode}
                setSelectedSemesterMode={setSelectedSemesterMode}
                onSelectProgram={(p) => { setSelectedProgram(p); }}
                selectedProgram={selectedProgram}
            />
        </div>
    );
};
