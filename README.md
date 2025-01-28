# SQLite Master

## Description
SQLite Master is a powerful desktop application built with Electron, React, Vite, and Tailwind CSS. It provides a modern and intuitive interface for managing SQLite databases, making database operations simpler and more efficient for developers and database administrators.

## Features
- 📊 Visual Database Management
  - Browse tables and views
  - Execute SQL queries with syntax highlighting
  - View and edit table data
  - Real-time query results
  - Data export capabilities

- 🛠 Database Operations
  - Create and manage databases
  - Import/Export database files
  - Manage table structures
  - Execute batch operations
  - Database backup and restore

- 💻 Modern Interface
  - Clean and intuitive UI
  - Dark theme support
  - Responsive layout
  - Multi-tab query workspace
  - Customizable workspace

## Technology Stack
- Electron.js - Cross-platform desktop framework
- React - UI framework
- Vite - Build tool
- Tailwind CSS - Styling
- SQLite3 - Database engine

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm (v6 or higher)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/devjayel/SQLite-Master
cd SQLite-Master
```

2. Install dependencies:
```bash
npm i
```

### Development

Run the application in development mode:

1. Start React development server:
```bash
npm run react:dev
```

2. Start Electron in another terminal:
```bash
npm run electron:dev
```

### Building for Production

Create a production build:
```bash
npm run electron:build
```

The built application will be available in the `dist` directory.

## Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

## License
This project is licensed under the MIT License.