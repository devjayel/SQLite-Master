import React from 'react';

export default function SegmentedControl({ options, value, onChange }) {
    return (
        <div className="bg-gray-100 dark:bg-gray-700 p-1 rounded-lg inline-flex">
            {options.map((option) => (
                <button
                    key={option.value}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${value === option.value
                            ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                        }`}
                    onClick={() => onChange(option.value)}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
}