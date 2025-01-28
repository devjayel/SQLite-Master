import { useState, useEffect } from 'react';
import SQLEditor from './components/SQLEditor';
import EditModal from './components/EditModal';
import SegmentedControl from './components/SegmentedControl';
import SplashScreen from './components/SplashScreen';
import Footer from './components/Footer';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [tableData, setTableData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [showProperties, setShowProperties] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchColumn, setSearchColumn] = useState('');
  const [visibleColumns, setVisibleColumns] = useState([]);
  const [isColumnMenuOpen, setIsColumnMenuOpen] = useState(false);
  const [queryResults, setQueryResults] = useState([]);
  const [queryError, setQueryError] = useState(null);
  const [activeTab, setActiveTab] = useState('browse');

  const handleFileSelect = async () => {
    try {
      const result = await window.electron.ipcRenderer.invoke('select-file');
      if (result.filePath) {
        setSelectedFile(result.filePath);
        const dbTables = await window.electron.ipcRenderer.invoke('get-tables', result.filePath);
        setTables(dbTables);
      }
    } catch (error) {
      console.error('Error selecting file:', error);
    }
  };

  const handleTableSelect = async (table) => {
    setSelectedTable(table);
    setCurrentPage(1);
    setSearchTerm('');
    setSearchColumn('');
    try {
      // Stop watching previous table
      await window.electron.ipcRenderer.invoke('stop-watch');

      const data = await window.electron.ipcRenderer.invoke('get-table-data', selectedFile, table);
      const columnInfo = await window.electron.ipcRenderer.invoke('get-table-columns', selectedFile, table);
      setTableData(data);
      setColumns(columnInfo);
      setVisibleColumns(columnInfo.map(col => col.name));

      // Start watching new table
      await window.electron.ipcRenderer.invoke('start-watch', selectedFile, table);
    } catch (error) {
      console.error('Error loading table data:', error);
    }
  };

  useEffect(() => { console.log(columns) }, [columns]);

  const handleColumnToggle = (columnName) => {
    setVisibleColumns(prev => {
      if (prev.includes(columnName)) {
        return prev.filter(col => col !== columnName);
      } else {
        return [...prev, columnName];
      }
    });
  };

  // Search and Pagination calculation
  const filteredData = tableData.filter(row => {
    if (!searchTerm || !searchColumn) return true;
    const cellValue = String(row[searchColumn]).toLowerCase();
    return cellValue.includes(searchTerm.toLowerCase());
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  // Page change handler
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const handleDelete = async (rowId) => {
    try {
      await window.electron.ipcRenderer.invoke('delete-row', selectedFile, selectedTable, rowId);
      const updatedData = await window.electron.ipcRenderer.invoke('get-table-data', selectedFile, selectedTable);
      setTableData(updatedData);
    } catch (error) {
      console.error('Error deleting row:', error);
    }
  };

  const handleAdd = async (newRow) => {
    try {
      await window.electron.ipcRenderer.invoke('add-row', selectedFile, selectedTable, newRow);
      const updatedData = await window.electron.ipcRenderer.invoke('get-table-data', selectedFile, selectedTable);
      setTableData(updatedData);
    } catch (error) {
      console.error('Error adding row:', error);
    }
  };

  const handleUpdate = async (rowId, updatedData) => {
    try {
      await window.electron.ipcRenderer.invoke('update-row', selectedFile, selectedTable, rowId, updatedData);
      const newData = await window.electron.ipcRenderer.invoke('get-table-data', selectedFile, selectedTable);
      setTableData(newData);
      setEditingRow(null);
    } catch (error) {
      console.error('Error updating row:', error);
    }
  };

  const handleSave = async (rowData) => {
    try {
      if (rowData.id) {
        await handleUpdate(rowData.id, rowData);
      } else {
        await handleAdd(rowData);
      }
      setIsModalOpen(false);
      setEditingRow(null);
    } catch (error) {
      console.error('Error saving data:', error);
    }
  };

  // Add real-time update handler
  useEffect(() => {
    if (selectedFile && selectedTable) {
      // Start watching the database
      window.electron.ipcRenderer.invoke('start-watch', selectedFile, selectedTable);

      // Set up the listener for database updates
      const handleDbUpdate = (newData) => {
        setTableData(newData);
      };

      window.electron.ipcRenderer.on('db-updated', handleDbUpdate);

      // Cleanup function
      return () => {
        window.electron.ipcRenderer.invoke('stop-watch');
        window.electron.ipcRenderer.removeListener('db-updated', handleDbUpdate);
      };
    }
  }, [selectedFile, selectedTable]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isColumnMenuOpen && !event.target.closest('.relative')) {
        setIsColumnMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isColumnMenuOpen]);


  const handleQueryExecute = async (query) => {
    try {
      setQueryError(null);
      const result = await window.electron.ipcRenderer.invoke('execute-query', selectedFile, query);
      if (result.success) {
        setQueryResults(result.results);
      } else {
        setQueryError(result.error);
      }
    } catch (error) {
      setQueryError(error.message);
    }
  };

  useEffect(() => {
    // Hide splash screen after 3 seconds
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {showSplash ? (
        <SplashScreen />
      ) : (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
          <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="p-4">
              <div className="flex justify-between items-center">
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">SQLite Master</h1>
                <button
                  onClick={handleFileSelect}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-900"
                >
                  Select Database
                </button>
              </div>
            </div>
          </header>

          <div className="flex-1 p-6">
            <div className="flex gap-6">
              {/* Sidebar */}
              <div className="w-64 flex-shrink-0">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Tables</h2>
                  <div className="space-y-1">
                    {tables.map((table) => (
                      <div
                        key={table}
                        onClick={() => handleTableSelect(table)}
                        className={`px-3 py-2 rounded-md text-sm cursor-pointer transition-colors ${selectedTable === table
                          ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-200 font-medium'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                      >
                        {table}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {!selectedFile && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
                  <div className="text-gray-500 dark:text-gray-400">
                    Please select a SQLite database file to begin
                  </div>
                </div>
              )}
              {selectedFile && !selectedTable && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
                  <div className="text-gray-500 dark:text-gray-400">
                    Select a table from the sidebar to view its contents
                  </div>
                </div>
              )}
              {selectedTable && (
                <div className="flex-1 p-4 overflow-hidden">
                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedTable}</h2>
                      <SegmentedControl
                        options={[
                          { value: 'browse', label: 'Browse' },
                          { value: 'properties', label: 'Structure' },
                          { value: 'sql', label: 'SQL Editor' }
                        ]}
                        value={activeTab}
                        onChange={setActiveTab}
                      />
                    </div>

                    {activeTab === 'properties' && (
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Table Properties</h3>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setVisibleColumns(columns.map(col => col.name))}
                              className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                            >
                              Show All
                            </button>
                            <button
                              onClick={() => setVisibleColumns([])}
                              className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
                            >
                              Hide All
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {columns.map((col) => (
                            <div key={col.name} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-700">
                              <div className="flex justify-between items-center">
                                <p className="font-medium text-gray-900 dark:text-white">{col.name}</p>
                                <div className="inline-flex items-center justify-start gap-2">
                                  <input
                                    id={`prop-${col.name}`}
                                    type="checkbox"
                                    checked={visibleColumns.includes(col.name)}
                                    onChange={() => handleColumnToggle(col.name)}
                                    className="peer cursor-pointer rounded border-2 border-slate-400 transition-colors duration-300 ease-in-out checked:bg-blue-700 checked:hover:bg-blue-700 checked:disabled:border-slate-300 checked:disabled:bg-slate-300 checked:disabled:hover:bg-slate-300 disabled:hover:none disabled:cursor-not-allowed disabled:border-slate-200 disabled:indeterminate:border-slate-300 disabled:indeterminate:bg-slate-300 disabled:hover:bg-transparent focus:ring-transparent hover:border-blue-700 hover:bg-blue-50 indeterminate:bg-blue-700 indeterminate:disabled:hover:bg-slate-300 size-4"
                                  />
                                  <label
                                    htmlFor={`prop-${col.name}`}
                                    className="font-medium transition-colors duration-300 ease-in-out peer-disabled:opacity-70 text-xs whitespace-nowrap peer-disabled:cursor-not-allowed peer-disabled:text-slate-400 hover:cursor-pointer text-gray-700 dark:text-gray-300"
                                  >
                                    Visible
                                  </label>
                                </div>
                              </div>
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Type: {col.type}</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                Nullable: {col.notnull ? 'No' : 'Yes'}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {activeTab === 'sql' && (
                      <>
                        <SQLEditor onExecute={handleQueryExecute} />
                        {queryError && (
                          <div className="mt-4 p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-md">
                            {queryError}
                          </div>
                        )}
                        {queryResults.length > 0 && (
                          <div className="mt-4">
                            <h4 className="text-md font-medium text-gray-900 dark:text-white mb-2">Query Results</h4>
                            <div className="overflow-x-auto">
                              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-700">
                                  <tr>
                                    {Object.keys(queryResults[0]).map((key) => (
                                      <th
                                        key={key}
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                                      >
                                        {key}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                  {queryResults.map((row, i) => (
                                    <tr key={i}>
                                      {Object.values(row).map((value, j) => (
                                        <td
                                          key={j}
                                          className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300"
                                        >
                                          {value}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {activeTab === 'browse' && (
                      <>
                        {/* Add search interface */}
                        <div className="mb-4 flex space-x-4 items-center">
                          <select
                            value={searchColumn}
                            onChange={(e) => setSearchColumn(e.target.value)}
                            className="block p-2 rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-300 sm:text-sm"
                          >
                            <option value="">Select column to search</option>
                            {columns.map((col) => (
                              <option key={col.name} value={col.name}>
                                {col.name}
                              </option>
                            ))}
                          </select>
                          <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search..."
                            className="block p-2 w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-300 sm:text-sm"
                            disabled={!searchColumn}
                          />

                          {/* Column visibility dropdown */}
                          <div className="relative">
                            <button
                              onClick={() => setIsColumnMenuOpen(!isColumnMenuOpen)}
                              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                            >
                              Columns
                              <svg className="ml-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            </button>

                            {isColumnMenuOpen && (
                              <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-50">
                                <div className="py-1 divide-y divide-gray-100 dark:divide-gray-700">
                                  <div className="px-4 py-2">
                                    <div className="flex justify-between">
                                      <button
                                        onClick={() => setVisibleColumns(columns.map(col => col.name))}
                                        className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-500"
                                      >
                                        Show All
                                      </button>
                                      <button
                                        onClick={() => setVisibleColumns([])}
                                        className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-500"
                                      >
                                        Hide All
                                      </button>
                                    </div>
                                  </div>
                                  <div className="max-h-60 overflow-y-auto">
                                    {columns.map((col) => (
                                      <div key={col.name} className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700">
                                        <div className="inline-flex items-center justify-start gap-2">
                                          <input
                                            id={`col-${col.name}`}
                                            type="checkbox"
                                            checked={visibleColumns.includes(col.name)}
                                            onChange={() => handleColumnToggle(col.name)}
                                            className="peer cursor-pointer rounded border-2 border-slate-400 transition-colors duration-300 ease-in-out checked:bg-blue-700 checked:hover:bg-blue-700 checked:disabled:border-slate-300 checked:disabled:bg-slate-300 checked:disabled:hover:bg-slate-300 disabled:hover:none disabled:cursor-not-allowed disabled:border-slate-200 disabled:indeterminate:border-slate-300 disabled:indeterminate:bg-slate-300 disabled:hover:bg-transparent focus:ring-transparent hover:border-blue-700 hover:bg-blue-50 indeterminate:bg-blue-700 indeterminate:disabled:hover:bg-slate-300 size-4"
                                          />
                                          <label
                                            htmlFor={`col-${col.name}`}
                                            className="font-medium transition-colors duration-300 ease-in-out peer-disabled:opacity-70 text-xs whitespace-nowrap peer-disabled:cursor-not-allowed peer-disabled:text-slate-400 hover:cursor-pointer text-gray-700 dark:text-gray-300"
                                          >
                                            {col.name}
                                          </label>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="relative rounded-lg border border-gray-200 dark:border-gray-700 shadow">
                          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 p-4">
                            <div className="inline-block min-w-full align-middle">
                              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-700">
                                  <tr>
                                    <th scope="col" className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-700 px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                      Actions
                                    </th>
                                    {columns.filter(col => visibleColumns.includes(col.name)).map((col, i) => (
                                      <th
                                        key={i}
                                        scope="col"
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                                      >
                                        {col.name}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                  {currentItems.map((row, i) => (
                                    <tr key={i} className={i % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700'}>
                                      <td className="px-6 py-4 bg-inherit whitespace-nowrap sticky left-0 z-10">
                                        <button
                                          onClick={() => {
                                            setEditingRow({ ...row });
                                            setIsModalOpen(true);
                                          }}
                                          className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 mr-2"
                                        >
                                          Edit
                                        </button>
                                        <button
                                          onClick={() => handleDelete(row.id)}
                                          className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
                                        >
                                          Delete
                                        </button>
                                      </td>
                                      {columns.filter(col => visibleColumns.includes(col.name)).map((col) => (
                                        <td key={`${row.id}-${col.name}`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                                          {row[col.name]}
                                        </td>
                                      ))}

                                    </tr>
                                  ))}
                                </tbody >
                              </table>

                              {/* Pagination controls */}
                              <div className="mt-6 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700">
                                <div className="flex-1 flex justify-between sm:hidden">
                                  <button
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className={`relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-md ${currentPage === 1
                                      ? 'text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 cursor-not-allowed'
                                      : 'text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600'
                                      }`}
                                  >
                                    Previous
                                  </button>
                                  <button
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    className={`relative ml-3 inline-flex items-center px-4 py-2 text-sm font-medium rounded-md ${currentPage === totalPages
                                      ? 'text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 cursor-not-allowed'
                                      : 'text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600'
                                      }`}
                                  >
                                    Next
                                  </button>
                                </div>
                                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                  <div>
                                    <p className="text-sm text-gray-700 dark:text-gray-300">
                                      Showing <span className="font-medium">{indexOfFirstItem + 1}</span> to{' '}
                                      <span className="font-medium">{Math.min(indexOfLastItem, tableData.length)}</span> of{' '}
                                      <span className="font-medium">{tableData.length}</span> results
                                    </p>
                                  </div>
                                  <div className='sticky right-0 z-10'>
                                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                      <button
                                        onClick={() => handlePageChange(currentPage - 1)}
                                        disabled={currentPage === 1}
                                        className={`relative inline-flex items-center px-2 py-2 rounded-l-md border ${currentPage === 1
                                          ? 'border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                                          : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600'
                                          }`}
                                      >
                                        <span className="sr-only">Previous</span>
                                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                          <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                      </button>

                                      {[...Array(totalPages)].map((_, index) => {
                                        const pageNumber = index + 1;
                                        return (
                                          <button
                                            key={pageNumber}
                                            onClick={() => handlePageChange(pageNumber)}
                                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${currentPage === pageNumber
                                              ? 'z-10 bg-indigo-600 dark:bg-indigo-500 border-indigo-600 dark:border-indigo-500 text-white'
                                              : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600'
                                              }`}
                                          >
                                            {pageNumber}
                                          </button>
                                        );
                                      })}

                                      <button
                                        onClick={() => handlePageChange(currentPage + 1)}
                                        disabled={currentPage === totalPages}
                                        className={`relative inline-flex items-center px-2 py-2 rounded-r-md border ${currentPage === totalPages
                                          ? 'border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                                          : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600'
                                          }`}
                                      >
                                        <span className="sr-only">Next</span>
                                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                        </svg>
                                      </button>
                                    </nav>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <EditModal
                              isOpen={isModalOpen}
                              onClose={() => {
                                setIsModalOpen(false);
                                setEditingRow(null);
                              }}
                              data={editingRow}
                              columns={columns}
                              onSave={handleSave}
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          <Footer />

          <EditModal
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setEditingRow(null);
            }}
            data={editingRow}
            columns={columns}
            onSave={handleSave}
          />
        </div >
      )
      }
    </>
  );
}