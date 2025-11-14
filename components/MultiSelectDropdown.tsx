import React, { useState, useEffect, useRef } from 'react';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { SearchIcon } from './icons/SearchIcon';

interface MultiSelectDropdownProps {
  options: string[];
  selectedOptions: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
}

export const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  options,
  selectedOptions,
  onChange,
  placeholder = 'Select options',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleToggle = () => setIsOpen(!isOpen);

  const handleOptionClick = (option: string) => {
    const newSelectedOptions = selectedOptions.includes(option)
      ? selectedOptions.filter((o) => o !== option)
      : [...selectedOptions, option];
    onChange(newSelectedOptions);
  };

  const filteredOptions = options.filter((option) =>
    option.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const getButtonText = () => {
    if (selectedOptions.length === 0) {
      return placeholder;
    }
    if (selectedOptions.length === 1) {
      return selectedOptions[0];
    }
    return `${selectedOptions.length} selected`;
  };

  return (
    <div className="relative w-56" ref={dropdownRef}>
      <button
        type="button"
        onClick={handleToggle}
        className="relative appearance-none w-full bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 py-1 pl-3 pr-10 rounded-md leading-tight focus:outline-none focus:bg-white dark:focus:bg-gray-600 focus:border-gray-500 text-sm font-semibold text-left"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="truncate block">{getButtonText()}</span>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
          <ChevronDownIcon className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-20 mt-1 w-full rounded-md bg-white dark:bg-gray-700 shadow-lg border dark:border-gray-600">
          <div className="p-2">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SearchIcon className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-accent dark:bg-gray-800 dark:text-light"
              />
            </div>
          </div>
          <ul className="max-h-60 overflow-y-auto p-2">
            {filteredOptions.map((option) => (
              <li
                key={option}
                onClick={() => handleOptionClick(option)}
                className="flex items-center p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer text-sm text-gray-800 dark:text-gray-200"
              >
                <input
                  type="checkbox"
                  checked={selectedOptions.includes(option)}
                  readOnly
                  className="h-4 w-4 rounded border-gray-300 dark:border-gray-500 text-secondary focus:ring-accent dark:bg-gray-600 dark:checked:bg-secondary"
                />
                <span className="ml-3">{option}</span>
              </li>
            ))}
             {filteredOptions.length === 0 && (
                <li className="p-2 text-sm text-center text-gray-500 dark:text-gray-400">
                    No results found.
                </li>
             )}
          </ul>
        </div>
      )}
    </div>
  );
};