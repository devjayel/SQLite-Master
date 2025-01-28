import React, { useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { sql } from '@codemirror/lang-sql';
import { oneDark } from '@codemirror/theme-one-dark';
import QueryTabs from './QueryTabs';

export default function SQLEditor({ onExecute }) {
    const [tabs, setTabs] = useState([
        { id: '1', query: '' }
    ]);
    const [activeTab, setActiveTab] = useState('1');

    const handleQueryChange = (value) => {
        setTabs(prev => prev.map(tab =>
            tab.id === activeTab ? { ...tab, query: value } : tab
        ));
    };

    const handleExecute = () => {
        const currentTab = tabs.find(tab => tab.id === activeTab);
        if (currentTab?.query.trim()) {
            onExecute(currentTab.query);
        }
    };

    const handleNewTab = () => {
        const newTab = {
            id: String(Date.now()),
            query: ''
        };
        setTabs(prev => [...prev, newTab]);
        setActiveTab(newTab.id);
    };

    const handleTabClose = (tabId) => {
        setTabs(prev => {
            const newTabs = prev.filter(tab => tab.id !== tabId);
            if (activeTab === tabId && newTabs.length > 0) {
                setActiveTab(newTabs[newTabs.length - 1].id);
            }
            return newTabs;
        });
    };

    const currentQuery = tabs.find(tab => tab.id === activeTab)?.query || '';

    return (
        <div className="flex flex-col h-full">
            <QueryTabs
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                onTabClose={handleTabClose}
                onNewTab={handleNewTab}
            />
            <div className="flex-1 min-h-0 mt-4">
                <CodeMirror
                    value={currentQuery}
                    height="200px"
                    extensions={[sql()]}
                    theme={oneDark}
                    onChange={handleQueryChange}
                    className="border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden"
                />
            </div>
            <div className="mt-4 flex justify-end">
                <button
                    onClick={handleExecute}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 transition-colors duration-200"
                >
                    Execute Query
                </button>
            </div>
        </div>
    );
}