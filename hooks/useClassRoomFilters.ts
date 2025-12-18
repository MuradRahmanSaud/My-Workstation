
import { useState, useMemo } from 'react';
import { ClassRoomDataRow, ProgramDataRow } from '../types';

export const useClassRoomFilters = (data: ClassRoomDataRow[], programData: ProgramDataRow[] = []) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Program Filters
  const [selectedFaculties, setSelectedFaculties] = useState<Set<string>>(new Set());
  const [selectedPrograms, setSelectedPrograms] = useState<Set<string>>(new Set()); // Set of PIDs

  // Attribute Filters
  const [selectedBuildings, setSelectedBuildings] = useState<Set<string>>(new Set());
  const [selectedFloors, setSelectedFloors] = useState<Set<string>>(new Set());
  const [selectedRoomTypes, setSelectedRoomTypes] = useState<Set<string>>(new Set());
  
  const [capacityMin, setCapacityMin] = useState('');
  const [capacityMax, setCapacityMax] = useState('');

  // Missing Data Filter
  const [selectedMissingFields, setSelectedMissingFields] = useState<Set<string>>(new Set());

  // Helper to normalize ID
  const normalize = (id: string | undefined) => String(id || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

  // Program Map for Faculty Lookup
  const programMap = useMemo(() => {
    const map = new Map<string, ProgramDataRow>();
    programData.forEach(p => {
        if(p.PID) map.set(normalize(p.PID), p);
    });
    return map;
  }, [programData]);

  // Derived Options
  const options = useMemo(() => {
      const buildings = new Set<string>();
      const floors = new Set<string>();
      const roomTypes = new Set<string>();

      data.forEach(row => {
          if (row.Building) buildings.add(row.Building);
          if (row.Floor) floors.add(row.Floor);
          if (row['Room Type']) roomTypes.add(row['Room Type']);
      });

      return {
          buildings: Array.from(buildings).sort(),
          floors: Array.from(floors).sort(),
          roomTypes: Array.from(roomTypes).sort()
      };
  }, [data]);

  // Filtering Logic
  const filteredData = useMemo(() => {
      return data.filter(item => {
          // 1. Search Term
          const searchMatch = !searchTerm || Object.values(item).some(val => 
              String(val).toLowerCase().includes(searchTerm.toLowerCase())
          );
          if (!searchMatch) return false;

          // Missing Data Filter
          if (selectedMissingFields.size > 0) {
              for (const field of selectedMissingFields) {
                  const val = item[field];
                  if (val && String(val).trim() !== '') return false;
              }
          }

          // 2. Attributes
          if (selectedBuildings.size > 0 && !selectedBuildings.has(item.Building)) return false;
          if (selectedFloors.size > 0 && !selectedFloors.has(item.Floor)) return false;
          if (selectedRoomTypes.size > 0 && !selectedRoomTypes.has(item['Room Type'])) return false;

          // Capacity
          const cap = parseInt(item.Capacity || '0', 10);
          if (capacityMin !== '' && !isNaN(parseInt(capacityMin)) && cap < parseInt(capacityMin)) return false;
          if (capacityMax !== '' && !isNaN(parseInt(capacityMax)) && cap > parseInt(capacityMax)) return false;

          // 3. Program/Faculty Filters (Based on PID owner of the room)
          if (selectedFaculties.size === 0 && selectedPrograms.size === 0) return true;

          const pid = normalize(item.PID);
          
          if (selectedPrograms.size > 0) {
              if (selectedPrograms.has(pid)) return true;
              if (!selectedPrograms.has(pid)) return false; 
          }

          if (selectedFaculties.size > 0) {
              const progInfo = programMap.get(pid);
              if (!progInfo) return false;
              if (!selectedFaculties.has(progInfo['Faculty Short Name'])) return false;
          }

          return true;
      });
  }, [data, searchTerm, selectedBuildings, selectedFloors, selectedRoomTypes, capacityMin, capacityMax, selectedFaculties, selectedPrograms, programMap, selectedMissingFields]);

  const clearAllFilters = () => {
      setSearchTerm('');
      setSelectedFaculties(new Set());
      setSelectedPrograms(new Set());
      setSelectedBuildings(new Set());
      setSelectedFloors(new Set());
      setSelectedRoomTypes(new Set());
      setCapacityMin('');
      setCapacityMax('');
      setSelectedMissingFields(new Set());
  };

  return {
      searchTerm, setSearchTerm,
      filteredData,
      options,
      
      selectedFaculties, setSelectedFaculties,
      selectedPrograms, setSelectedPrograms,

      selectedBuildings, setSelectedBuildings,
      selectedFloors, setSelectedFloors,
      selectedRoomTypes, setSelectedRoomTypes,
      capacityMin, setCapacityMin,
      capacityMax, setCapacityMax,
      
      selectedMissingFields, setSelectedMissingFields,

      clearAllFilters
  };
};
