import React from 'react';

interface GenericPlaceholderViewProps {
  viewName: string;
}

export const GenericPlaceholderView: React.FC<GenericPlaceholderViewProps> = ({ viewName }) => (
  <div className="p-4 text-center text-gray-600 dark:text-gray-300">
    <h1 className="text-2xl font-bold mb-4">{viewName} Data</h1>
    <p>This view is under construction.</p>
  </div>
);
