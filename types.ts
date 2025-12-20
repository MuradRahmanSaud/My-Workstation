
export interface MainSheetRow {
  Semester: string;
  'Sheet Link': string;
  'Admitted Student'?: string;
  'Registered Student'?: string;
  'Student Data Link'?: string;
}

export interface StudentLinkRow {
  Semester: string;
  'Student Data Link': string;
}

export interface ReferenceDataRow {
  Ref: string;
  'Course Type': string;
  'Section Capacity': string;
  'Weekly Class': string;
  PID?: string;
  Program?: string;
  Credit?: string;
  Type?: string;
  [key: string]: string | undefined;
}

export interface TeacherDataRow {
  'Employee ID': string;
  'Employee Name': string;
  Designation: string;
  Email: string;
  'Mobile Number': string;
  Department?: string;
  Photo?: string;
  Facebook?: string;
  Linkedin?: string;
  [key: string]: string | undefined;
}

export interface FacultyLeadershipRow {
  'Faculty Short Name': string;
  'Faculty Full Name': string;
  Dean: string;
  'Associate Dean': string;
  Administration: string;
}

export interface ProgramDataRow {
  PID: string;
  'Faculty Short Name': string;
  'Faculty Full Name': string;
  'Program Full Name': string;
  'Program Short Name': string;
  'Department Name': string;
  'Program Type': string;
  'Semester Type': string;
  'Semester Duration': string;
  'No of Class Required': string;
  'Class Requirement': string;
  'Class Duration': string;
  // Faculty Leadership (Legacy fields in Program_DB)
  Dean?: string;
  'Associate Dean'?: string;
  'Faculty Administration'?: string;
  // Program Leadership
  Head: string;
  'Associate Head': string;
  Administration: string;
}

export interface ClassRoomDataRow {
  PID: string;
  Building: string;
  Floor: string;
  Room: string;
  'Room Type': string;
  Capacity: string;
  'Slot Duration': string;
  'Slot Per Room'?: string;
  'Shared Program': string;
  [key: string]: string;
}

export interface DiuEmployeeRow {
  'Employee ID': string;
  'Employee Name': string;
  'Administrative Designation': string;
  'Academic Designation': string;
  Mobile: string;
  'IP-Ext': string;
  'E-mail': string;
  Photo: string;
  Facebook: string;
  Linkedin: string;
  Status: string;
  'Group Name': string;
  Department: string;
  Password?: string;
}

export interface CourseSectionData {
  Ref: string;
  Semester: string;
  PID: string;
  'Course Code': string;
  'Section ID': string;
  'Course Title': string;
  Section: string;
  Credit: string;
  Type: string;
  Student: string;
  'Teacher ID': string;
  'Class Taken': string;
  
  // Merged fields from Reference Sheet
  'Course Type'?: string;
  'Capacity'?: string; // Renamed from Section Capacity
  'Weekly Class'?: string;
  
  // Calculated Field
  'ClassRequirement'?: string;

  // Merged fields from Teacher Sheet
  'Employee Name'?: string;
  'Designation'?: string;
  'Email'?: string;
  'Mobile Number'?: string;
  
  [key: string]: string | undefined; // Fallback for extra columns
}

export interface StudentDataRow {
    SL: string;
    PID: string;
    'Student ID': string;
    'Student Name': string;
    Sex: string;
    Mobile: string;
    Email: string;
    [key: string]: string;
}

export type ViewState = 'dashboard' | 'section' | 'program' | 'employee' | 'settings' | 'student' | 'classroom' | 'pdf_to_excel';

export interface LoadingState {
  status: 'idle' | 'loading' | 'success' | 'error';
  message?: string;
}

export interface SheetContextType {
  data: CourseSectionData[];
  programData: ProgramDataRow[];
  teacherData: TeacherDataRow[];
  classroomData: ClassRoomDataRow[];
  diuEmployeeData: DiuEmployeeRow[];
  referenceData: ReferenceDataRow[];
  facultyLeadershipData: FacultyLeadershipRow[];
  semesterLinks: Map<string, string>;
  admittedLinks: Map<string, string>;
  registeredLinks: Map<string, string>;
  studentDataLinks: Map<string, string>;
  studentCache: Map<string, StudentDataRow[]>;
  loadStudentData: (semester: string, force?: boolean) => Promise<void>;
  registeredData: any[];
  loadRegisteredData: (force?: boolean) => Promise<void>;
  loading: LoadingState;
  
  // Lifted Semester Filter State
  semesterFilter: string;
  setSemesterFilter: (semester: string) => void;
  uniqueSemesters: string[];

  reloadData: (mode?: 'all' | 'admitted' | 'sections', force?: boolean) => Promise<void>;
  updateClassroomData: (updater: (prev: ClassRoomDataRow[]) => ClassRoomDataRow[]) => void;
  updateReferenceData: (updater: (prev: ReferenceDataRow[]) => ReferenceDataRow[]) => void;
  updateSectionData: (updater: (prev: CourseSectionData[]) => CourseSectionData[]) => void;
  updateDiuEmployeeData: (updater: (prev: DiuEmployeeRow[]) => DiuEmployeeRow[]) => void;
  updateProgramData: (updater: (prev: ProgramDataRow[]) => ProgramDataRow[]) => void;
  updateFacultyLeadershipData: (updater: (prev: FacultyLeadershipRow[]) => FacultyLeadershipRow[]) => void;
}