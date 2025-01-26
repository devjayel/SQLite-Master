import React, { useState, useEffect } from 'react';

export default function EditModal({ isOpen, onClose, data, columns, onSave }) {
    const [formData, setFormData] = useState({});

    useEffect(() => {
        setFormData(data || {});
        console.log(columns)
    }, [data]);

    if (!isOpen) return null;

    const handleChange = (columnName, value) => {
        setFormData(prev => ({
            ...prev,
            [columnName]: value
        }));
    };

    const handleSubmit = () => {
        onSave(formData);
    };

    // Helper function to parse enum options from type string
    const parseEnumOptions = (type) => {
        const match = type.match(/enum\((.*)\)/i);
        if (match) {
            return match[1].split(',').map(opt =>
                opt.trim().replace(/^'|'$/g, '').replace(/^"|"$/g, '')
            );
        }
        return [];
    };

    // Helper function to parse CHECK constraint options
    const parseCheckConstraint = (type) => {
        // Match pattern like: varchar check ("status" in ('waiting', 'processing', 'failed', 'complete'))
        const match = type.match(/check\s*\([^(]*in\s*\((.*?)\)\)/i);
        if (match) {
            return match[1].split(',').map(opt =>
                opt.trim().replace(/^'|'$/g, '').replace(/^"|"$/g, '')
            );
        }
        return null;
    };

    // Helper function to determine input type and properties
    const getInputProps = (column) => {
        const type = column.type.toLowerCase();

        // Check for varchar with CHECK constraint first
        if (type.includes('varchar') || type.includes('text')) {
            const checkOptions = parseCheckConstraint(column.type);
            if (checkOptions) {
                return {
                    type: 'select',
                    options: checkOptions,
                    className: "w-full p-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:border-indigo-500 dark:focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-500"
                };
            }
        }

        // Handle numeric types
        if (type.includes('int') || type.includes('decimal') || type.includes('float') || type.includes('double') || type.includes('numeric')) {
            return {
                type: 'number',
                step: type.includes('decimal') || type.includes('float') || type.includes('double') ? '0.01' : '1',
                className: "w-full p-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:border-indigo-500 dark:focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-500"
            };
        }

        // Handle enum type
        if (type.startsWith('enum')) {
            const options = parseEnumOptions(type);
            return {
                type: 'select',
                options,
                className: "w-full p-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:border-indigo-500 dark:focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-500"
            };
        }

        // Handle date types
        if (type === 'date') {
            return {
                type: 'date',
                className: "w-full p-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:border-indigo-500 dark:focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-500"
            };
        }

        // Handle time type
        if (type === 'time') {
            return {
                type: 'time',
                className: "w-full p-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:border-indigo-500 dark:focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-500"
            };
        }

        // Handle timestamp/datetime types
        if (type.includes('timestamp') || type === 'datetime') {
            return {
                type: 'datetime-local',
                className: "w-full p-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:border-indigo-500 dark:focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-500"
            };
        }

        // Handle text/varchar types
        if (type.includes('text') || type.includes('char') || type === 'string') {
            return {
                type: 'text',
                className: "w-full p-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:border-indigo-500 dark:focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-500"
            };
        }

        // Unknown type
        return null;
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-[500px] shadow-xl max-h-[90vh] flex flex-col">
                <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
                    {formData?.id ? 'Edit Row' : 'Add New Row'}
                </h2>
                <div className="space-y-4 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent pr-2">
                    {columns.map((col) => {
                        const inputProps = getInputProps(col);
                        if (!inputProps) return null;

                        return (
                            <div key={col.name} className="flex flex-col">
                                <label className="font-medium mb-1 text-gray-700 dark:text-gray-300">
                                    {col.name}
                                    {col.notnull ? ' *' : ''}
                                    <span className="text-xs text-gray-500 ml-2 lowercase">({col.type})</span>
                                </label>
                                {inputProps.type === 'select' ? (
                                    <select
                                        value={formData[col.name] || ''}
                                        onChange={(e) => handleChange(col.name, e.target.value)}
                                        className={inputProps.className}
                                        required={col.notnull}
                                    >
                                        <option value="">Select {col.name}</option>
                                        {inputProps.options.map((option) => (
                                            <option key={option} value={option}>
                                                {option}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        type={inputProps.type}
                                        value={formData[col.name] || ''}
                                        onChange={(e) => handleChange(col.name, e.target.value)}
                                        className={inputProps.className}
                                        required={col.notnull}
                                        step={inputProps.step}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>
                <div className="flex justify-end mt-6 space-x-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-md text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="px-4 py-2 rounded-md text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 transition-colors duration-200"
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
}