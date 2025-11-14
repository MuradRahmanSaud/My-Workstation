// types.ts
import React from 'react';

export interface SectionData {
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
  'Course Type': string;
  'Section Capacity': string;
  'Weekly Class': string;
  'Teacher Name': string;
  Designation: string;
  Mobile: string;
  'E-mail': string;
}

export interface ProgramData {
  PID: string;
  'Faculty Short Name': string;
  'Faculty Full Name': string;
  'Program Full Name': string;
  'Program Short Name': string;
  'Department Name': string;
  'Program Type': string;
  'Semester Type': string;
  'Semester Duration': string;
  Head: string;
  'Associate Head': string;
  Administration: string;
}

export interface CourseSummaryData {
  PID: string;
  'Course Code': string;
  'Course Title': string;
  Credit: string;
  'Course Type': string;
  Type: string;
  'Program Short Name': string;
  Section: number;
  Capacity: number;
  Student: number;
  Vacancy: number;
  Semester?: string;
}

export interface TeacherSummaryData {
  'Teacher ID': string;
  'Teacher Name': string;
  Designation: string;
  'Credit Load': number;
  'Student Count': number;
  'Total Sections': number;
  Mobile: string;
  Email: string;
}

export type TableHeader<T> = {
  label: string;
  key: keyof T | string;
  align?: 'center';
  render?: (row: T) => React.ReactNode;
};

export interface AttributeFilters {
  teachers: string[];
  courseTypes: string[];
  types: string[];
  credits: string[];
  capacities: string[];
  studentCount: { min: string; max: string };
  classesTaken: { min: string; max: string };
}

export type TableView = 'sections' | 'courses' | 'teachers' | 'unassigned' | 'lowStudent' | 'lowClassTaken';