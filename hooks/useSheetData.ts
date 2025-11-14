import { useState, useCallback, useEffect } from 'react';
import { fetchSheetData, fetchProgramData } from '../services/googleSheetService';
import { SectionData, ProgramData } from '../types';

export const useSheetData = () => {
  const [sheetData, setSheetData] = useState<SectionData[]>([]);
  const [programData, setProgramData] = useState<ProgramData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadAllData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [sections, programs] = await Promise.all([
        fetchSheetData(),
        fetchProgramData(),
      ]);
      setSheetData(sections);
      setProgramData(programs);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred while fetching data.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  return { sheetData, programData, isLoading, error, loadAllData };
};
