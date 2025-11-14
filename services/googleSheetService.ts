import { SectionData, ProgramData } from '../types';

const SHEET_ID = '1WHVthN8KN_lj17LoR0g65qx3LSAGIfEsMJ6ppyRQHx4';

// Section Sheet
const SECTION_SHEET_GID = '2107160677';
const SECTION_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SECTION_SHEET_GID}`;

// Program Sheet
const PROGRAM_SHEET_GID = '2086836531';
const PROGRAM_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${PROGRAM_SHEET_GID}`;

// A generic CSV to JSON parser
const parseCSV = <T extends Record<string, any>>(csvText: string): T[] => {
  const lines = csvText.trim().split('\n');
  const rawHeaders = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  
  // Clean headers to match the expected keys
  const headers = rawHeaders.map(h => {
      if (h.toLowerCase() === 'e-mail') return 'E-mail';
      return h.replace(/\s+/g, ' ').trim();
  });

  const rows = lines.slice(1).map(line => {
    // This regex handles commas inside quoted strings
    const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
    const rowObject: any = {};
    
    headers.forEach((header, index) => {
        const key = header as keyof T;
        const value = (values[index] || '').trim().replace(/"/g, '');
        rowObject[key] = value;
    });

    return rowObject as T;
  });

  return rows;
};


export const fetchSheetData = async (): Promise<SectionData[]> => {
  try {
    // Add a cache-busting parameter to ensure fresh data is fetched
    const url = `${SECTION_URL}&_=${new Date().getTime()}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Network response was not ok: ${response.statusText}`);
    }
    const csvText = await response.text();
    return parseCSV<SectionData>(csvText);
  } catch (error) {
    console.error('Failed to fetch or parse section data:', error);
    throw new Error('Could not retrieve section data from the Google Sheet. Please check if it is published and accessible.');
  }
};

export const fetchProgramData = async (): Promise<ProgramData[]> => {
    try {
      // Add a cache-busting parameter to ensure fresh data is fetched
      const url = `${PROGRAM_URL}&_=${new Date().getTime()}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.statusText}`);
      }
      const csvText = await response.text();
      return parseCSV<ProgramData>(csvText);
    } catch (error) {
      console.error('Failed to fetch or parse program data:', error);
      throw new Error('Could not retrieve program data from the Google Sheet. Please check if it is published and accessible.');
    }
  };