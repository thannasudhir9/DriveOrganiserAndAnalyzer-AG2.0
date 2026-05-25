# Implementation Plan - Native Folder Selection, System-Wide Drive Scans, In-App HomePage Organizer, Misc File Grouping, and Scan Skip Filters

> **Last Updated**: May 25, 2026, 11:10 AM (Local Time: 2026-05-25T11:10:00+02:00)
> **Status**: Under Review (Requesting User Feedback)

We will introduce five major feature expansions:
1. **Native Folder Selection Dialog**: Integrates a "Select Folder" button next to custom path inputs on both the Disk Selector screen and the File Organizer. Clicking it opens a native Windows folder picker dialogue (`tkinter.filedialog.askdirectory`) in a non-blocking background thread and pre-fills the path field.
2. **System-Wide Drive Scans**: Adds a prominent "All Local Drives (Full System Scan)" button in the drive selector grid. This will spin a unified, multi-drive traversal scan across all active partitions (C:, D:, etc.), aggregating statistics, storage capacities, and folder trees under a single virtual root (`All System Drives`).
3. **HomePage File Organizer Tab**: Mounts the File Organizer directly as a primary tab on the Home startup screen, enabling loose-file organization on any folder without running a prior scan.
4. **Misc File Grouping & Safety Skip**: Upgrades `organize_directory` in the backend scanner to automatically catch loose files with other extensions (e.g. `.ipynb`, `.torrent`, and any others) and group them into a `/Misc` folder. Also skips organizing files starting with `organize_report_` to prevent moving its own logs.
5. **Scanning Skip Filters (Performance Boost)**: Introduces three glassmorphic toggle configurations on the startup selector screen to skip scanning specific elements, saving substantial time:
   - **Skip Hidden Folders**: Skips folders starting with a dot (e.g. `.git`, `.github`, `.vscode`).
   - **Skip Heavy Packages**: Skips standard dependency and environment folders (e.g. `node_modules`, `venv`, `.venv`, `env`, `bower_components`).
   - **Skip Source Code Files**: Skips files with programming language extensions (e.g. `.js`, `.py`, `.cpp`, `.ts`).

---

## ⚙️ Proposed Changes & Detailed Implementations

### 1. Backend Traversal & Skip Options (`backend/scanner.py`)
- Expand `DiskScanner.__init__` to support:
  - Multiple `root_paths` (list of paths). If the single path `"ALL_SYSTEM_DRIVES"` is passed, we resolve all active partitions from `psutil.disk_partitions()`.
  - Skip flags: `skip_hidden`, `skip_packages`, `skip_code`.
- Modify `_scan_folder(path)` recursive engine:
  - If a directory matches `skip_hidden=True` and `name.startswith(".")`, skip traversing.
  - If a directory matches `skip_packages=True` and `name` in (`"node_modules"`, `"venv"`, `".venv"`, `"env"`, `"bower_components"`, `".idea"`, `".vscode"`, `".git"`), skip traversing.
  - If a file matches `skip_code=True` and its category is `"Code"`, skip indexing/processing.
- Upgrade `organize_directory(path, simulate)`:
  - Skip files starting with `organize_report_`.
  - If an extension does not match `GROUPS` (e.g. `.ipynb`, `.torrent`), assign it to `"Misc"`.

```python
# In backend/scanner.py
class DiskScanner:
    def __init__(self, root_path, skip_hidden=False, skip_packages=False, skip_code=False):
        # Handle single vs. all system drives scan
        if root_path == "ALL_SYSTEM_DRIVES":
            import psutil
            self.root_paths = []
            for partition in psutil.disk_partitions():
                if 'cdrom' not in partition.opts and partition.fstype != '':
                    try:
                        # Test path accessibility
                        os.scandir(partition.mountpoint)
                        self.root_paths.append(partition.mountpoint)
                    except:
                        continue
            self.root_path = "All System Drives"
        else:
            self.root_paths = [os.path.abspath(root_path)]
            self.root_path = os.path.abspath(root_path)

        self.skip_hidden = skip_hidden
        self.skip_packages = skip_packages
        self.skip_code = skip_code
        # ... other variables ...

    def _scan_thread(self):
        try:
            # If scanning all drives, initialize the virtual root in folders_data
            if len(self.root_paths) > 1:
                self.folders_data["All System Drives"] = {
                    "name": "All System Drives",
                    "size": 0,
                    "files_count": 0,
                    "subfolders": [r for r in self.root_paths],
                    "files": []
                }

            total_system_size = 0
            total_system_files = 0
            for r_path in self.root_paths:
                if self.cancel_flag:
                    break
                sub_size = self._scan_folder(r_path)
                total_system_size += sub_size

            if len(self.root_paths) > 1:
                self.folders_data["All System Drives"]["size"] = total_system_size
                for r_path in self.root_paths:
                    total_system_files += self.folders_data[r_path]["files_count"]
                self.folders_data["All System Drives"]["files_count"] = total_system_files

            if not self.cancel_flag:
                self.status = "completed"
        except Exception as e:
            self.status = "failed"
            self.error = str(e)
        finally:
            self.elapsed_time = time.time() - self.start_time
```

---

## ⚙️ Proposed Changes & Detailed Implementations

### 1. Backend Traversal & Skip Options (`backend/scanner.py`)
- Expand `DiskScanner.__init__` to support:
  - Multiple `root_paths` (list of paths). If the single path `"ALL_SYSTEM_DRIVES"` is passed, we resolve all active partitions from `psutil.disk_partitions()`.
  - Skip flags: `skip_hidden`, `skip_packages`, `skip_code`.
- Modify `_scan_folder(path)` recursive engine:
  - If a directory matches `skip_hidden=True` and `name.startswith(".")`, skip traversing.
  - If a directory matches `skip_packages=True` and `name` in (`"node_modules"`, `"venv"`, `".venv"`, `"env"`, `"bower_components"`, `".idea"`, `".vscode"`, `".git"`), skip traversing.
  - If a file matches `skip_code=True` and its category is `"Code"`, skip indexing/processing.
- Upgrade `organize_directory(path, simulate)`:
  - Skip files starting with `organize_report_`.
  - If an extension does not match `GROUPS` (e.g. `.ipynb`, `.torrent`), assign it to `"Misc"`.

```python
# In backend/scanner.py
class DiskScanner:
    def __init__(self, root_path, skip_hidden=False, skip_packages=False, skip_code=False):
        # Handle single vs. all system drives scan
        if root_path == "ALL_SYSTEM_DRIVES":
            import psutil
            self.root_paths = []
            for partition in psutil.disk_partitions():
                if 'cdrom' not in partition.opts and partition.fstype != '':
                    try:
                        # Test path accessibility
                        os.scandir(partition.mountpoint)
                        self.root_paths.append(partition.mountpoint)
                    except:
                        continue
            self.root_path = "All System Drives"
        else:
            self.root_paths = [os.path.abspath(root_path)]
            self.root_path = os.path.abspath(root_path)

        self.skip_hidden = skip_hidden
        self.skip_packages = skip_packages
        self.skip_code = skip_code
        # ... other variables ...

    def _scan_thread(self):
        try:
            # If scanning all drives, initialize the virtual root in folders_data
            if len(self.root_paths) > 1:
                self.folders_data["All System Drives"] = {
                    "name": "All System Drives",
                    "size": 0,
                    "files_count": 0,
                    "subfolders": [r for r in self.root_paths],
                    "files": []
                }

            total_system_size = 0
            total_system_files = 0
            for r_path in self.root_paths:
                if self.cancel_flag:
                    break
                sub_size = self._scan_folder(r_path)
                total_system_size += sub_size

            if len(self.root_paths) > 1:
                self.folders_data["All System Drives"]["size"] = total_system_size
                for r_path in self.root_paths:
                    total_system_files += self.folders_data[r_path]["files_count"]
                self.folders_data["All System Drives"]["files_count"] = total_system_files

            if not self.cancel_flag:
                self.status = "completed"
        except Exception as e:
            self.status = "failed"
            self.error = str(e)
        finally:
            self.elapsed_time = time.time() - self.start_time
```

---

### 2. New Native Folder Selection & Payload API Routes (`backend/main.py`)
- Expand `ScanRequest` schema:
```python
class ScanRequest(BaseModel):
    path: str
    skip_hidden: Optional[bool] = False
    skip_packages: Optional[bool] = False
    skip_code: Optional[bool] = False
```
- Add `/api/select-folder` POST endpoint to trigger the native folder selection dialog (using Tkinter).

---

### 3. Frontend App & breadcrumb go-back logic (`frontend/src/App.tsx`)
- Add `organize` to the Home tabs list in `App.tsx`.
- Modify `handleGoBack()` to jump to `"All System Drives"` root if navigating back from a drive root (e.g. `C:\`) when scanning `"All System Drives"`:
```typescript
if (parts.length <= 1) {
  if (rootPath === "All System Drives" && currentPath !== "All System Drives") {
    handleNavigate("All System Drives");
  }
  return;
}
```
- Prepend virtual crumbs inside `Breadcrumbs.tsx` to display `"All System Drives"` as a clickable root folder when `rootPath === "All System Drives"`.

---

### 4. Upgrade Selector Cards & Settings UI (`frontend/src/components/DiskSelector.tsx`)
- Add a prominent grid card for **Full System Scan** representing `"ALL_SYSTEM_DRIVES"`.
- Incorporate a **Scan Optimizations Center** containing 3 toggles:
  - Skip Hidden Folders
  - Skip Package Directories
  - Skip Source Code Files
- Incorporate a folder icon button next to custom path fields. When clicked, it hits `/api/select-folder` and pre-fills the input with the native picker's choice.

---

### 5. HomePage Organizer Support (`frontend/src/components/OrganizerTab.tsx`)
- Allow mounting `OrganizerTab` on the Home screen.
- Integrate the native directory browser selection button inside `OrganizerTab` next to its path input box to let users pick folders instantly using mouse clicks!

---

## 🧪 Verification Plan

### Automated Verification
1. Run `npm run build` to verify clean front-end bundle compilation.
2. Confirm uvicorn API loads and imports successfully.

### Manual Verification
1. **Native Folder Selection**: Click the directory selector button. Verify a native Windows dialog opens on top of all windows, let's you pick any folder, and populates the text field.
2. **System-Wide Scan**: Click "All System Drives (Full System Scan)". Verify scan initializes, indexes C:, D:, etc. concurrently, and displays a unified dashboard under the `All System Drives` breadcrumb root.
3. **Skipping Folders**: Run a scan with "Skip Heavy Packages" active. Verify `node_modules` and `venv` are entirely skipped, reducing traversal time significantly.
4. **Misc File Grouping**: Use the File Organizer on a directory containing loose `.ipynb` or `.torrent` files. Verify these items are safely grouped under the `/Misc` folder and no `organize_report_` files are moved.
5. **HomePage Tab**: Navigate to the organizer tab from the home selector on startup and check folder sorting previews directly.
