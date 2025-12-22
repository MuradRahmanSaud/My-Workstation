
import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { UserX, RefreshCw, ArrowLeft, School, Search, Filter } from 'lucide-react';
import { useSheetData } from '../hooks/useSheetData';
import { DropOutLeftPanel } from '../components/DropOutLeftPanel';
import { DropOutDashboard } from '../components/DropOutDashboard';
import { AdmittedReportTable } from '../components/AdmittedReportTable';
import { UnregisteredStudentsModal } from '../components/UnregisteredStudentsModal';
import { ProgramRightPanel } from '../components/ProgramRightPanel';
import { FilterPanel } from '../components/FilterPanel';
import { ProgramDataRow, StudentDataRow } from '../types';
import { normalizeId, submitSheetData, extractSheetIdAndGid } from '../services/sheetService';

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
        updateProgramData, updateFacultyLeadershipData, updateDiuEmployeeData
    } = useSheetData();

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedFaculty, setSelectedFaculty] = useState<string>('All');
    const [selectedType, setSelectedType] = useState<string | null>(null);
    const [selectedSemesterMode, setSelectedSemesterMode] = useState<string | null>(null);
    const [selectedProgram, setSelectedProgram] = useState<ProgramDataRow | null>(null);
    const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
    const [activeUnregList, setActiveUnregList] = useState<{ semester: string; programId: string; programName: string; students: StudentDataRow[]; targetSemester: string } | null>(null);
    const [selectedAdmittedSemesters, setSelectedAdmittedSemesters] = useState<Set<string>>(new Set());
    const [registrationFilters, setRegistrationFilters] = useState<Map<string, 'registered' | 'unregistered'>>(new Map());
    const [selectedStudent, setSelectedStudent] = useState<StudentDataRow | null>(null);
    
    // Lifted state for comparison semester to sync with summary cards
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

    // Set initial target registration semester when data loads
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

    const groupedData = useMemo(() => {
        const groups: Record<string, ProgramDataRow[]> = {};
        programData.forEach(p => {
            const fac = p['Faculty Short Name'] || 'Other';
            if (!groups[fac]) groups[fac] = [];
            const matchesSearch = !searchTerm || p['Program Short Name'].toLowerCase().includes(searchTerm.toLowerCase()) || p.PID.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesFaculty = selectedFaculty === 'All' || p['Faculty Short Name'] === selectedFaculty;
            const matchesType = !selectedType || p['Program Type'] === selectedType;
            const matchesSemesterMode = !selectedSemesterMode || p['Semester Type']?.includes(selectedSemesterMode);
            if (matchesSearch && matchesFaculty && matchesType && matchesSemesterMode) groups[fac].push(p);
        });
        Object.keys(groups).forEach(key => { if (groups[key].length === 0) delete groups[key]; else groups[key].sort((a, b) => a['Program Short Name'].localeCompare(b['Program Short Name'])); });
        return groups;
    }, [programData, searchTerm, selectedFaculty, selectedType, selectedSemesterMode]);

    const sortedGroupKeys = useMemo(() => Object.keys(groupedData).sort(), [groupedData]);

    const kpiStats = useMemo(() => {
        if (!selectedProgram || !targetRegSem) return { enrolled: 0, registered: 0, unregistered: 0, totalCreditsCompleted: 0 };
        const pidNorm = normalizeId(selectedProgram.PID);
        let enrolled = 0, registered = 0, totalCreditsCompleted = 0;

        // Chronological Helper logic
        const seasonWeight: Record<string, number> = { 'winter': 0, 'spring': 1, 'summer': 2, 'short': 2, 'fall': 3, 'autumn': 3 };
        const parseSem = (sem: string) => {
            const match = sem.match(/([a-zA-Z]+)[\s-]*'?(\d{2,4})/);
            if (!match) return { year: 0, season: -1 };
            let year = parseInt(match[2], 10); if (year < 100) year += 2000;
            return { year, season: seasonWeight[match[1].toLowerCase()] ?? -1 };
        };

        const targetParsed = parseSem(targetRegSem);

        selectedAdmittedSemesters.forEach(sem => {
            // Apply point-in-time filter: Enrollment semester must be <= Target comparison semester
            const currentParsed = parseSem(sem);
            const isOnOrBefore = currentParsed.year < targetParsed.year || (currentParsed.year === targetParsed.year && currentParsed.season <= targetParsed.season);
            
            if (!isOnOrBefore) return;

            const students = studentCache.get(sem) || [];
            students.forEach(s => {
                if (normalizeId(s.PID) === pidNorm) {
                    enrolled++;
                    const id = String(s['Student ID']).trim();
                    if (registrationLookup.get(id)?.has(targetRegSem)) registered++;
                    
                    const credits = parseFloat(s['Credit Completed'] || '0');
                    if (!isNaN(credits)) totalCreditsCompleted += credits;
                }
            });
        });

        return { enrolled, registered, unregistered: enrolled - registered, totalCreditsCompleted };
    }, [selectedProgram, selectedAdmittedSemesters, studentCache, registrationLookup, targetRegSem]);

    useEffect(() => {
        if (selectedProgram && targetRegSem) {
            const pidNorm = normalizeId(selectedProgram.PID);
            const allUnreg: StudentDataRow[] = [];
            
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
                        if (!registrationLookup.get(id)?.has(targetRegSem)) {
                            allUnreg.push({ ...s, _semester: sem });
                        }
                    }
                });
            });
            setActiveUnregList({
                semester: 'Total Selection',
                programId: selectedProgram.PID,
                programName: selectedProgram['Program Short Name'],
                students: allUnreg,
                targetSemester: targetRegSem
            });
        }
    }, [selectedProgram, targetRegSem, selectedAdmittedSemesters, studentCache, registrationLookup]);

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
        const { id } = extractSheetIdAndGid(link);
        if (!id) return;

        // 1. Immediate UI update for the selected student overlay
        setSelectedStudent(prev => prev ? { ...prev, ...student } : null);

        // 2. Prepare payload (remove internal properties)
        const { _semester, ...apiPayload } = student as any;

        try {
            // 3. Persist to API using the correct semester name as the sheetName
            await submitSheetData('update', semester, apiPayload, 'Student ID', student['Student ID'].trim(), id);
            
            // 4. Update global immutable cache
            updateStudentData(semester, student['Student ID'], student);
            
            // 5. Refresh inline unreg list
            if (activeUnregList) {
                const newStudents = activeUnregList.students.map(s => s['Student ID'] === student['Student ID'] ? { ...s, ...student } : s);
                setActiveUnregList({ ...activeUnregList, students: newStudents });
            }
        } catch (e) {
            console.error("Failed to persist student update in DropOutView", e);
        }
    };

    const headerTitleTarget = document.getElementById('header-title-area');
    const headerActionsTarget = document.getElementById('header-actions-area');

    return (
        <div className="flex flex-col h-full bg-gray-50 relative overflow-hidden">
            {headerTitleTarget && createPortal(
                <div className="flex items-center space-x-3 animate-in fade-in slide-in-from-left-2 duration-300">
                    <h2 className="text-[13px] md:text-sm font-bold text-gray-800 uppercase tracking-wide flex items-center">
                        <UserX className="w-4 h-4 mr-2 text-red-600" />
                        Dropout Analysis
                    </h2>
                </div>, 
                headerTitleTarget
            )}

            {headerActionsTarget && createPortal(
                <div className="flex items-center space-x-1 animate-in fade-in slide-in-from-right-2 duration-300 overflow-hidden">
                    <button onClick={() => setIsFilterPanelOpen(true)} className={`flex items-center space-x-1 px-3 py-1.5 text-[11px] font-bold rounded-full border bg-white text-gray-600 border-gray-200 transition-all hover:bg-gray-100`}>
                        <Filter className="w-3.5 h-3.5" />
                        <span>Filter Semesters</span>
                    </button>
                    <button onClick={() => reloadData('admitted', true)} disabled={loading.status === 'loading'} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all">
                        <RefreshCw className={`w-4 h-4 ${loading.status === 'loading' ? 'animate-spin' : ''}`} />
                    </button>
                </div>, 
                headerActionsTarget
            )}

            <div className="flex-1 overflow-hidden flex flex-row relative">
                <DropOutLeftPanel 
                    searchTerm={searchTerm} setSearchTerm={setSearchTerm}
                    selectedFaculty={selectedFaculty} setSelectedFaculty={setSelectedFaculty} faculties={Array.from(new Set(programData.map(p => p['Faculty Short Name']))).sort()}
                    selectedType={selectedType} setSelectedType={setSelectedType}
                    selectedSemesterMode={selectedSemesterMode} setSelectedSemesterMode={setSelectedSemesterMode}
                    sortedGroupKeys={sortedGroupKeys} groupedData={groupedData}
                    selectedProgram={selectedProgram} onSelectProgram={setSelectedProgram}
                    facultyColors={FACULTY_CHIP_COLORS} facultyHeaderColors={FACULTY_HEADER_COLORS}
                    loading={loading.status === 'loading' && programData.length === 0}
                />

                <div className="flex-1 min-w-0 bg-white overflow-hidden flex flex-col lg:flex-row">
                    {selectedProgram ? (
                        <>
                            <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/50 border-r border-gray-100">
                                <div className="p-2 md:p-3 shrink-0 bg-white shadow-sm border-b border-gray-100">
                                    <DropOutDashboard stats={kpiStats} comparisonSemester={targetRegSem} />
                                </div>
                                <div className="flex-1 flex flex-col overflow-hidden">
                                    <div className="flex flex-row h-full gap-2 p-2">
                                        <div className="flex-1 border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm flex flex-col">
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
                                                onUnregClick={setActiveUnregList}
                                                externalTargetRegSemester={targetRegSem}
                                                onTargetRegSemesterChange={setTargetRegSem}
                                            />
                                        </div>
                                        <div className="flex-1 border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
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
                                                    onRowClick={(student) => setSelectedStudent(student)}
                                                />
                                            ) : (
                                                <div className="h-full flex flex-col items-center justify-center text-slate-300 p-8 text-center bg-slate-50/20">
                                                    <UserX className="w-12 h-12 mb-3 opacity-10" />
                                                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">Select Unregistered count to view students</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
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
                                onCloseStudent={() => setSelectedStudent(null)}
                                registrationLookup={registrationLookup}
                            />
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-slate-50/50">
                            <UserX className="w-16 h-16 mb-4 opacity-10" />
                            <p className="text-sm font-medium">Select a program to analyze dropouts</p>
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
                selectedFaculties={new Set()}
                setSelectedFaculties={() => {}}
                selectedProgramTypes={new Set()}
                setSelectedProgramTypes={() => {}}
                selectedSemesterTypes={new Set()}
                setSelectedSemesterTypes={() => {}}
                selectedPrograms={new Set()}
                setSelectedPrograms={() => {}}
                attributeOptions={{ teachers: [], courseTypes: [], types: [], credits: [], capacities: [], studentCounts: [], classTakenCounts: [] }}
                selectedTeachers={new Set()} setSelectedTeachers={() => {}}
                selectedCourseTypes={new Set()} setSelectedCourseTypes={() => {}}
                selectedTypes={new Set()} setSelectedTypes={() => {}}
                selectedCredits={new Set()} setSelectedCredits={() => {}}
                selectedCapacities={new Set()} setSelectedCapacities={() => {}}
                studentMin="" setStudentMin={() => {}} studentMax="" setStudentMax={() => {}}
                selectedStudentCounts={new Set()} setSelectedStudentCounts={() => {}}
                classTakenMin="" setClassTakenMin={() => {}} classTakenMax="" setClassTakenMax={() => {}}
                selectedClassTakens={new Set()} setSelectedClassTakens={() => {}}
                onClearAll={() => {}}
                hideProgramTab={true}
                viewMode="admitted"
                admittedSemestersOptions={admittedSemestersOptions}
                selectedAdmittedSemesters={selectedAdmittedSemesters}
                onAdmittedSemesterChange={setSelectedAdmittedSemesters}
                registeredSemestersOptions={registeredSemesters}
                registrationFilters={registrationFilters}
                onRegistrationFilterChange={setRegistrationFilters}
            />
        </div>
    );
};
