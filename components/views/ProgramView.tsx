import React from 'react';
import { DataTable } from '../DataTable';
import { ProgramData, TableHeader } from '../../types';

interface ProgramViewProps {
  programData: ProgramData[];
  headers: TableHeader<ProgramData>[];
}

export const ProgramView: React.FC<ProgramViewProps> = ({ programData, headers }) => {
  return (
    <div className="bg-white dark:bg-dark-secondary rounded-lg shadow-md h-full flex flex-col">
      <div className="flex justify-between items-center px-4 py-2 border-b dark:border-gray-700 flex-shrink-0">
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
          Total Programs <span className="text-cyan-600">{programData.length}</span>
        </h2>
      </div>
      <div className="flex-grow overflow-auto">
        <DataTable<ProgramData>
          data={programData}
          isLoading={false}
          error={null}
          headers={headers}
          rowKeyAccessor={(row) => row.PID}
        />
      </div>
    </div>
  );
};