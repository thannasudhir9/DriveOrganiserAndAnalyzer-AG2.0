# Task: Nova Disk Analyzer & Optimizer - Native Picker, Full Scans, HomePage Sorter, Skip Filters, and UI Theme Improvements

> **Last Updated**: May 25, 2026, 6:15 PM (Local Time: 2026-05-25T18:15:00+02:00)
> **Checklist Status**: In Progress

- [x] Phase 1: Backend Traversal & organizers Updates (`backend/scanner.py`) <!-- id: 0 -->
  - [x] Implement `ALL_SYSTEM_DRIVES` multi-path traversal in `DiskScanner`
  - [x] Implement skip filters (`skip_hidden`, `skip_packages`, `skip_code`) inside scanner loop
  - [x] Update `organize_directory` to route uncategorized extensions (.ipynb, .torrent) to `"Misc"` folder
  - [x] Skip moving `organize_report_` text log files in `organize_directory`
- [x] Phase 2: Add API Routes & Selector Controller (`backend/main.py`) <!-- id: 1 -->
  - [x] Add `/api/select-folder` native directory picker endpoint using Tkinter
  - [x] Update `ScanRequest` schema to accept skip option flags
  - [x] Implement `/api/screenshot` endpoint using headlessly automated Playwright
- [x] Phase 3: Frontend Navigation & Virtual Root crumbs (`frontend/src/App.tsx`, `Breadcrumbs.tsx`) <!-- id: 2 -->
  - [x] Add `organize` to App.tsx HomePage tab configurations
  - [x] Add "All System Drives" virtual go-back navigation handling in App.tsx
  - [x] Prepend "All System Drives" root crumb when scanning all drives in Breadcrumbs.tsx
- [x] Phase 4: Upgrade DiskSelector and Settings Viewports (`frontend/src/components/DiskSelector.tsx`, `OrganizerTab.tsx`) <!-- id: 3 -->
  - [x] Add prominent "All Local Drives (Full System Scan)" button card in drives grid
  - [x] Render 3 glassmorphic toggle checkbox items for skip optimizations
  - [x] Add "Select Folder" folder picker buttons next to text fields in DiskSelector and OrganizerTab
- [/] Phase 5: Home Navigation buttons, Shutter feedback, and Light theme name contrast fixes <!-- id: 4 -->
  - [x] Add theme-aware CSS custom property styling for Home, Camera, and Theme header buttons in `App.tsx`
  - [x] Add visual "Camera Shutter Flash" micro-animation and error alert banners when taking screenshots
  - [x] Add glowing "Return to Active Scan" and "Return to Report" header navigation buttons in `App.tsx`
  - [x] Fix visual contrast of folder/file names in Visual Treemap and Hover details popup in `Treemap.tsx` for Light Theme
  - [ ] Restart ASGI server and compile production bundles with `npm run build`
- [ ] Phase 6: Verification & Final Document Updates <!-- id: 5 -->
  - [ ] Verify screenshot, navigation return flows, and light theme name visibility
  - [ ] Update README.md, future_scope.md, implementation_plan.md, and walkthrough.md with timestamp: `May 25, 2026, 6:15 PM`
