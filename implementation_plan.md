# Implementation Plan - Scanning Progress Bar, ETA, Background Scanning & Pause/Resume

> **Last Updated**: May 25, 2026, 10:15 AM (Local Time: 2026-05-25T10:15:00+02:00)
> **Status**: Approved & Executed (100% Completed)

We will expand the **Nova Space Analyzer** scanning interface to implement a highly interactive, non-blocking scanning environment that features:
1. A **visual progress bar** representing scan completeness.
2. An **elapsed scan clock** and live speed metrics (MB/s + items/s).
3. A **dynamic moving-average ETA (Estimated Time to Complete)** / ETC countdown.
4. A **non-blocking background scanning** workflow where the user can navigate back to the Home page (`DiskSelector`) at any time during an active scan, leaving the scan running smoothly in the background.
5. A **floating interactive scan monitor card** in the bottom-right corner when scanning is active but minimized, allowing the user to view mini-progress, abort, or restore the full screen scanner in one click.
6. A **System Docs sub-tab directly on the Home Selector Page**, allowing immediate access to README, checklists, prompts history, and architectural specifications on launch without requiring a scan.
7. A **Pause / Resume Scanning capability** utilizing low-overhead Python thread condition primitives.

---

## ⚙️ Proposed Changes & Detailed Implementations

We will make minimal, high-impact edits to the following files:

### 1. Backend Service (`backend/scanner.py`)
- Introduce pause tracking flags (`self.pause_flag`, `self.pause_event = threading.Event()`, `self.total_paused_time = 0`, `self.last_pause_start = 0`).
- Wait on the event inside recursive directory entry scans: `self.pause_event.wait()`.
- Add `pause()` and `resume()` methods to halt/wake the scanning loop and accurately adjust elapsed time.
- Expose the drive capacity fields (`drive_used_size`, `drive_total_size`, `drive_free_size`) and partition type flag `is_drive_root` in the API payload response.

```python
    def __init__(self, root_path):
        # ... original counters ...
        self.pause_flag = False
        self.pause_event = threading.Event()
        self.pause_event.set()  # Starts non-blocking
        self.total_paused_time = 0
        self.last_pause_start = 0
        # ... original heaps ...

    def pause(self):
        if self.status == "scanning" and not self.pause_flag:
            self.pause_flag = True
            self.pause_event.clear()
            self.status = "paused"
            self.last_pause_start = time.time()

    def resume(self):
        if self.status == "paused" or self.pause_flag:
            self.pause_flag = False
            self.pause_event.set()
            self.status = "scanning"
            if self.last_pause_start > 0:
                self.total_paused_time += time.time() - self.last_pause_start
                self.last_pause_start = 0

    def get_progress(self):
        if self.status == "scanning":
            self.elapsed_time = time.time() - self.start_time - self.total_paused_time
        elif self.status == "paused" and self.last_pause_start > 0:
            self.elapsed_time = self.last_pause_start - self.start_time - self.total_paused_time
            
        import shutil
        drive_total = 0
        drive_used = 0
        try:
            usage = shutil.disk_usage(self.root_path)
            drive_total = usage.total
            drive_used = usage.used
        except OSError:
            pass
            
        drive, path_part = os.path.splitdrive(self.root_path)
        is_drive_root = path_part in ('\\', '/', '')
            
        return {
            "status": self.status,
            "error": self.error,
            "scanned_folders": self.scanned_folders,
            "scanned_files": self.scanned_files,
            "total_size": self.total_size,
            "current_folder": self.current_folder,
            "elapsed_time": round(self.elapsed_time, 2),
            "permission_errors_count": len(self.permission_errors),
            "is_drive_root": is_drive_root,
            "drive_used_size": drive_used,
            "drive_total_size": drive_total
        }
```

Add the `self.pause_event.wait()` checkpoints inside `_scan_folder` before stat calls and loop checks:
```python
    def _scan_folder(self, path):
        self.pause_event.wait()
        if self.cancel_flag:
            return 0
        # ...
        try:
            with os.scandir(path) as entries:
                for entry in entries:
                    self.pause_event.wait()
                    # ... rest of entry checks ...
```

---

### 2. Backend Routes (`backend/main.py`)
Add endpoints `/api/scan/{scan_id}/pause` and `/api/scan/{scan_id}/resume`:
```python
@app.post("/api/scan/{scan_id}/pause")
def pause_scan(scan_id: str):
    if scan_id not in scans_registry:
        raise HTTPException(status_code=404, detail="Scan ID not found.")
    scanner = scans_registry[scan_id]
    scanner.pause()
    return {"status": scanner.status}

@app.post("/api/scan/{scan_id}/resume")
def resume_scan(scan_id: str):
    if scan_id not in scans_registry:
        raise HTTPException(status_code=404, detail="Scan ID not found.")
    scanner = scans_registry[scan_id]
    scanner.resume()
    return {"status": scanner.status}
```

---

### 3. Frontend Models Types (`frontend/src/types.ts`)
Update the `ScanStatus` and `ScanSummary` interfaces status types:
```typescript
export interface ScanStatus {
  status: 'idle' | 'scanning' | 'paused' | 'completed' | 'failed' | 'cancelled';
  // ... rest of fields ...
}
```

---

### 4. App Coordination UI (`frontend/src/App.tsx`)
We will rebuild the scanning screen, header, and home screen:
- **Pause & Resume API Calls**: Implement `handlePauseScan()` and `handleResumeScan()` to invoke the new routes.
- **Home Page Sub-Tabs**: Choose between **Scan Analyzer Hub** (using `DiskSelector`) and **Project Documentation** (renders `<DocsTab />`).
- **Static animation freezes on Pause**: Remove the spinning CSS classes (`animate-spin-neon` and `animate-pulse`) when `progress.status === 'paused'` to visually freeze the progress indicators!
- **Play/Pause controls on Full scan HUD**: Render a toggleable Pause/Play button with glowing borders.
- **Mini floating controls card**: Floating monitoring status card also exposes mini Play/Pause indicators.

---

### 5. Repository Configurations & Sync
- Setup a secure `.gitignore` to skip `node_modules`, static builds, logs, and JSON scan reports.
- Synchronize all codebase additions and documentation directly to the repository origin `https://github.com/thannasudhir9/DriveOrganiserAndAnalyzer-AG2.0.git` on the remote `main` branch.

---

## 🧪 Verification Plan

### Automated Verification
1. Verify that `npm run build` compiles completely with the new TypeScript fields and `DocsTab` import.
2. Confirm the FastAPI backend starts and serves the modified scanner status JSON without errors.
3. Validate repository push success by performing `git status` and verifying that the local branch is fully in sync with the remote origin `main` branch on GitHub.

### Manual Verification
1. **Pause Scan Action**: Trigger a scan. Hit "Pause Scan". Verify the elapsed timer clock halts immediately, the spinning radar freezes visually, and status changes to `"paused"`.
2. **Resume Scan Action**: Click "Resume Scan". Verify uvicorn continues scanning files, clock starts ticking up again, and radar begins spinning.
3. **Docs Tab on Home**: Switch tabs on the selector screen to read the checklists before starting a scan.
4. **Minimizing while Paused**: Minimize a paused scan. Verify the floating monitor badge in the bottom-right corner displays `Paused` in amber with a play icon to quickly resume it.
5. **Git Push Integrity**: Verify on GitHub that all code updates (backend scanner algorithms, frontend App views, and docs viewer tab styling) are fully hosted on the repository `https://github.com/thannasudhir9/DriveOrganiserAndAnalyzer-AG2.0.git`.
