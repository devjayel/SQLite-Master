import React from 'react';
import { HiMiniPlus, HiMiniXMark } from "react-icons/hi2";

export default function QueryTabs({ tabs, activeTab, onTabChange, onTabClose, onNewTab }) {
    return (
        <div className="flex items-center border-b border-gray-200 dark:border-gray-700">
            <div className="flex-1 flex overflow-x-auto">
                {tabs.map((tab, index) => (
                    <div
                        key={tab.id}
                        className={`group flex items-center px-4 py-2 cursor-pointer border-b-2 ${activeTab === tab.id
                            ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                            }`}
                        onClick={() => onTabChange(tab.id)}
                    >
                        <span className="truncate">Query {index + 1}</span>
                        {tabs.length > 1 && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onTabClose(tab.id);
                                }}
                                className="ml-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                            >
                                <HiMiniXMark className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                ))}
            </div>
            <button
                onClick={onNewTab}
                className="p-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            >
                <HiMiniPlus className="h-5 w-5" />
            </button>
        </div>
    );
}