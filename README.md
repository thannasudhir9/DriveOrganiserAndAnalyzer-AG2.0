# 🚀 Nova Disk Space Analyzer

> **Last Updated**: May 25, 2026, 10:15 AM (Local Time: 2026-05-25T10:15:00+02:00)
> **Branch**: `main` (synchronized with remote GitHub repository)

Nova Disk Space Analyzer is a highly responsive, locally run web application that traverses your hard drives and projects, visualizing directory sizes using interactive **squarified SVG treemaps** (WinDirStat-style), listing candidate duplicate files, grouping file extensions, and exposing an advanced space-hog search tool.

All file exploration operations are strictly **read-only**, guaranteeing complete system safety.

---

## 🎯 Key Features

1. **Automatic Drive Detection**: Instantly detects and lists Windows local drives (`C:\`, `D:\`, etc.) with used vs. free storage gauges.
2. **Custom Directory Scan**: Supports scanning any custom absolute filesystem directory or project path.
3. **Live Progress Terminal**: Visual neon-glowing scanner radar showing scanning speeds (files/sec), elapsed time, total cataloged objects, and real-time truncated filesystem paths.
4. **WinDirStat-style Interactive Treemap**: Pure React-engineered recursive SVG treemap. Larger blocks represent larger space consumers, categorized by extensions, with support for hovering tooltips and folder drill-downs.
5. **Split-Layout Folder Explorer**: Interactive table displaying files and subdirectories with custom progress bars representing their exact relative space allocations within the parent.
6. **Redundant Duplicate Finder**: Maps candidate duplicates (identical filename + byte size) across your folders, displaying wasted capacity summaries and file locations.
7. **Advanced Search & Filter**: Real-time query matching over major space consumers with size thresholds (e.g. >10MB, >100MB, >1GB) and type filters.
8. **Protected System Fail-Safe**: Catches administrator permission constraints smoothly and logs warnings in a dashboard banner without aborting the scanner thread.

---

## 🧱 Technical Stack

- **Backend**: Python 3.14 + FastAPI + Uvicorn + `psutil` (system drives explorer).
- **Frontend**: React (Vite) + TypeScript + Vanilla CSS + Lucide Icons + Recharts (file category charts) + Custom Aspect-Ratio Treemap.
- **Aesthetic Theme**: Premium deep-space neon glow variables (`#060913`), frosted glassmorphic card boundaries, fluid micro-animations, and styled scrollbar tracks.

---

## 📂 Project Structure

```
D:\AntigravityCode\OS-Organiser And Analyzer\
├── backend/
│   ├── main.py              # FastAPI endpoints, CORS middlewares, static file serving
│   ├── scanner.py           # Multi-threaded os.scandir directory traversal engine
│   └── requirements.txt     # Backend python dependencies (fastapi, uvicorn, psutil)
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Breadcrumbs.tsx   # Windows path separator breadcrumbs navigator
│   │   │   ├── Dashboard.tsx     # Main diagnostics tab layout controller
│   │   │   ├── DiskSelector.tsx  # Local partitions grid picker card
│   │   │   ├── DuplicatesTab.tsx # Identical filename + size finder lists
│   │   │   ├── FileExplorer.tsx  # Traversal tables with proportional size gauges
│   │   │   ├── FileTypeChart.tsx # Recharts horizontal extensions size charts
│   │   │   ├── SearchFilter.tsx  # Advanced space hogs query engine
│   │   │   └── Treemap.tsx       # Aspect-ratio-optimized squarified SVG blocks
│   │   ├── App.tsx               # State coordinator, cancel hooks, API polling loops
│   │   ├── index.css             # Glassmorphism utilities, scrollbars, neon glows
│   │   ├── main.tsx              # React client entry point
│   │   └── types.ts              # System TypeScript types interfaces
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── implementation_plan.md   # Initial architectural design plan
├── task.md                  # Development checklist tracker
├── walkthrough.md           # Implementation completion details
├── run.py                   # Production single-click integrated launcher
└── run_dev.py               # Concurrent development runner (reload server + vite dev)
```

---

## 🚀 Getting Started

### Option A: Standard Single-Click Mode (Recommended)
This script prepares everything, builds the frontend static package, opens your browser automatically, and spins the local FastAPI service:
1. Open a terminal in the root directory:
   ```powershell
   python run.py
   ```
2. Navigate to `http://localhost:8000` in your web browser (if it doesn't open automatically).

### Option B: Concurrent Developer Mode
Ideal for developers looking to modify files, styles, or add backend endpoints with hot-module reload support:
1. Open a terminal in the root directory:
   ```powershell
   python run_dev.py
   ```
2. The launcher spins the FastAPI backend on `http://localhost:8000` and the Vite React server on `http://localhost:5173`.
3. Open your browser and navigate to `http://localhost:5173`. Press `Ctrl+C` in your terminal to shut down both processes.
