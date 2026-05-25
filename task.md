# Task: Nova Disk Analyzer & Optimizer - Native Picker, Full Scans, HomePage Sorter & Skip Filters

> **Last Updated**: May 25, 2026, 11:10 AM (Local Time: 2026-05-25T11:10:00+02:00)
> **Checklist Status**: Completed

- [x] Phase 1: Backend Traversal & organizers Updates (`backend/scanner.py`) <!-- id: 0 -->
  - [x] Implement `ALL_SYSTEM_DRIVES` multi-path traversal in `DiskScanner`
  - [x] Implement skip filters (`skip_hidden`, `skip_packages`, `skip_code`) inside scanner loop
  - [x] Update `organize_directory` to route uncategorized extensions (.ipynb, .torrent) to `"Misc"` folder
  - [x] Skip moving `organize_report_` text log files in `organize_directory`
- [x] Phase 2: Add API Routes & Selector Controller (`backend/main.py`) <!-- id: 1 -->
  - [x] Add `/api/select-folder` native directory picker endpoint using Tkinter
  - [x] Update `ScanRequest` schema to accept skip option flags
- [x] Phase 3: Frontend Navigation & Virtual Root crumbs (`frontend/src/App.tsx`, `Breadcrumbs.tsx`) <!-- id: 2 -->
  - [x] Add `organize` to App.tsx HomePage tab configurations
  - [x] Add "All System Drives" virtual go-back navigation handling in App.tsx
  - [x] Prepend "All System Drives" root crumb when scanning all drives in Breadcrumbs.tsx
- [x] Phase 4: Upgrade DiskSelector and Settings Viewports (`frontend/src/components/DiskSelector.tsx`, `OrganizerTab.tsx`) <!-- id: 3 -->
  - [x] Add prominent "All Local Drives (Full System Scan)" button card in drives grid
  - [x] Render 3 glassmorphic toggle checkbox items for skip optimizations
  - [x] Add "Select Folder" folder picker buttons next to text fields in DiskSelector and OrganizerTab
- [x] Phase 5: Verification & Screenshots Suite <!-- id: 4 -->
  - [x] Rebuild frontend production bundle (`npm run build`)
  - [x] Verify skip features, native dialog selectors, and multi-drive scans manually
  - [x] Update all manuals, walkthrough, and logs with date/time `May 25, 2026, 11:05 AM`
