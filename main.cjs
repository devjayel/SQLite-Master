const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require("path");
const fs = require("fs");
const { exec, spawn } = require("child_process");

let watchInterval;
const WATCH_INTERVAL = 1000; // 1 second interval

// Function to get file modification time
const getFileModTime = (filePath) => {
    try {
        const stats = fs.statSync(filePath);
        return stats.mtimeMs;
    } catch (error) {
        console.error('Error getting file modification time:', error);
        return null;
    }
};

// Update SQLite imports with better error handling
let sqlite3;
let open;
try {
    sqlite3 = require('sqlite3').verbose();
    open = require('sqlite').open;
} catch (error) {
    console.error('Failed to load SQLite modules:', error);
    dialog.showErrorBox('Database Error', 'Failed to load SQLite modules. Please ensure all dependencies are installed.');
}

async function handleDatabase(dbPath) {
    return await open({
        filename: dbPath,
        driver: sqlite3.Database
    });
}

let mainWindow;
let serverProcess = null; // Laravel server process
let reactProcess = null; // React server process

app.on("ready", () => {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        icon: path.join(__dirname, "assets", "favicon.ico"),
        webPreferences: {
            preload: path.join(__dirname, "preload.cjs"),
            contextIsolation: true,
            enableRemoteModule: false,
            nodeIntegration: false,
        },
        autoHideMenuBar: true,
        show: false,
    });

    mainWindow.on("ready-to-show", mainWindow.show);

    const isDev = !app.isPackaged;

    mainWindow.loadURL(
        isDev
            ? "http://localhost:5173" // Vite dev server
            : `file://${path.join(__dirname, "dist/index.html")}` // Production build
    );
});

app.on("window-all-closed", () => {
    if (serverProcess) {
        if (process.platform === "win32") {
            exec(`taskkill /pid ${serverProcess.pid} /T /F`);
        } else {
            serverProcess.kill("SIGTERM");
        }
    }

    // Cleanup React server
    if (reactProcess) {
        if (process.platform === "win32") {
            exec(`taskkill /pid ${reactProcess.pid} /T /F`);
        } else {
            reactProcess.kill("SIGTERM");
        }
    }

    if (process.platform !== "darwin") {
        app.quit();
    }
});

ipcMain.handle('select-file', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'SQLite Database', extensions: ['db', 'sqlite', 'sqlite3'] }]
    });
    return { filePath: result.filePaths[0] };
});

ipcMain.handle('get-tables', async (event, dbPath) => {
    const db = await handleDatabase(dbPath);
    const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table'");
    await db.close();
    return tables.map(t => t.name);
});

ipcMain.handle('get-table-data', async (event, dbPath, tableName) => {
    const db = await handleDatabase(dbPath);
    const data = await db.all(`SELECT * FROM ${tableName}`);
    await db.close();
    return data;
});

ipcMain.handle('get-table-columns', async (event, dbPath, tableName) => {
    const db = await open({ filename: dbPath, driver: sqlite3.Database });

    // Get PRAGMA table_info details
    const columns = await db.all(`PRAGMA table_info(${tableName})`);

    // Extract the CREATE TABLE SQL to parse constraints
    const createTableStmt = await db.get(
        `SELECT sql FROM sqlite_master WHERE type='table' AND name=?`,
        [tableName]
    );

    await db.close();

    // Parse CHECK constraints for enums (if applicable)
    const enumConstraints = {};
    if (createTableStmt?.sql) {
        const checkRegex = /CHECK\s*\(([^)]+)\)/gi; // Regex to find CHECK constraints
        console.log(checkRegex)
        let match;
        while ((match = checkRegex.exec(createTableStmt.sql)) !== null) {
            const checkClause = match[1];
            const columnRegex = /"(\w+)"\s*IN\s*\(([^)]+)\)/i;
            const columnMatch = columnRegex.exec(checkClause);
            if (columnMatch) {
                const columnName = columnMatch[1];
                const enumValues = columnMatch[2]
                    .split(',')
                    .map((val) => val.trim().replace(/^'|'$/g, '')); // Clean up values
                enumConstraints[columnName] = enumValues;
            }
        }
    }

    // Return combined column information
    return columns.map((col) => ({
        name: col.name,
        type: col.type,
        notnull: col.notnull,
        primaryKey: col.pk,
        defaultValue: col.dflt_value,
        enumValues: enumConstraints[col.name] || null, // Include enum-like constraints
        stmt: createTableStmt
    }));
});

ipcMain.handle('delete-row', async (event, dbPath, tableName, rowId) => {
    const db = await handleDatabase(dbPath);
    await db.run(`DELETE FROM ${tableName} WHERE id = ?`, rowId);
    await db.close();
});

ipcMain.handle('add-row', async (event, dbPath, tableName, rowData) => {
    const db = await handleDatabase(dbPath);
    const columns = Object.keys(rowData).join(', ');
    const values = Object.values(rowData);
    const placeholders = values.map(() => '?').join(', ');
    await db.run(
        `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`,
        values
    );
    await db.close();
});

ipcMain.handle('update-row', async (event, dbPath, tableName, rowId, rowData) => {
    const db = await handleDatabase(dbPath);
    const updates = Object.keys(rowData)
        .map(key => `${key} = ?`)
        .join(', ');
    const values = [...Object.values(rowData), rowId];
    await db.run(
        `UPDATE ${tableName} SET ${updates} WHERE id = ?`,
        values
    );
    await db.close();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// Add real-time database watching handlers
ipcMain.handle('start-watch', async (event, dbPath, tableName) => {
  let lastModTime = getFileModTime(dbPath);
  
  // Clear any existing watch interval
  if (watchInterval) {
    clearInterval(watchInterval);
  }

  watchInterval = setInterval(async () => {
    const currentModTime = getFileModTime(dbPath);
    
    if (currentModTime && currentModTime !== lastModTime) {
      lastModTime = currentModTime;
      try {
        const db = await handleDatabase(dbPath);
        const data = await db.all(`SELECT * FROM ${tableName}`);
        await db.close();
        // Send the updated data to the renderer
        event.sender.send('db-updated', data);
      } catch (error) {
        console.error('Error watching database:', error);
      }
    }
  }, WATCH_INTERVAL);
});

ipcMain.handle('stop-watch', () => {
  if (watchInterval) {
    clearInterval(watchInterval);
    watchInterval = null;
  }
});

// Add cleanup on app quit
app.on('before-quit', () => {
    if (watchInterval) {
        clearInterval(watchInterval);
    }
});

// SQL Query Execution Handler
ipcMain.handle('execute-query', async (event, dbPath, query) => {
        try {
                const db = await handleDatabase(dbPath);
                const results = await db.all(query);
                await db.close();
                return { success: true, results };
        } catch (error) {
                return { success: false, error: error.message };
        }
});