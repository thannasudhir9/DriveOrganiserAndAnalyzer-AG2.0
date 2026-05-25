# 🔮 Nova Space Optimizer & Secure File Organizer - Future Scope

> **Last Updated**: May 25, 2026, 11:10 AM (Local Time: 2026-05-25T11:10:00+02:00)
> **Branch**: `main`
> **Project Scope Manual**: Future Upgrades Roadmap

This document outlines architectural roadmaps, advanced optimization strategies, and robust edge-case handlers designed to scale **Nova** to enterprise environments, improve traversal efficiency, and secure complete cross-platform coverage.

---

## 🎯 1. High-Performance Filesystem Traversal (Rust/C Bindings)

### 🚀 Low-Level System Call Traversal
- **Problem**: Python's `os.walk` or standard recursive directory traversal incurs significant interpreter overhead and garbage collection cycles when scanning millions of files (especially on mechanical drives or high-speed NVMe drives).
- **Solution**: 
  - Integrate low-level **Rust bindings** using `PyO3` or compile a C++ scanner extension.
  - Implement direct Win32 API calls (`FindFirstFileW` and `FindNextFileW`) on Windows and direct POSIX directory streams (`getdents`) on Linux/macOS.
  - **Expected Outcome**: Traversal speed jumps from 10,000 items/s to **120,000+ items/s**, optimizing memory consumption to flat static structures.

### 🧵 Advanced Work-Stealing Multi-Threading
- **Architecture**: Introduce a lock-free thread pool implementing a **Work-Stealing Scheduler** (similar to Rust's Rayon or Java's ForkJoinPool).
- **Operation**: Sub-directories are dynamically queued as individual branch items. If a worker thread finishes its traversal queue, it automatically steals directory branches from overloaded workers, balancing multi-core CPU threads cleanly.

---

## 🔒 2. Cryptographic Content-Based Duplication Finder

### 🧪 Dual-Stage Deduplication Engine
Currently, duplicate files are candidate-grouped by identical file sizes and names. To guarantee 100% data identity before deletion, we propose a two-phase check:
1. **Size Filter Gate**: Group files with identical sizes first (quick metadata check).
2. **Partial Hashing**: Calculate a quick cryptographic hash (e.g., MD5 or SHA-256) of the first 64KB and last 64KB of the file (highly effective for immediate mismatch detection).
3. **Full Content Hash**: Perform full-file cryptographic hash (SHA-256) only for files passing the second gate.
4. **Byte-by-Byte Validation**: Introduce a safe byte-by-byte visual match gate for critical storage sets.

### 🔗 Smart System Links & Soft References
- Instead of deleting files manually, offer a **"Smart Merge"** option:
  - Deletes redundant duplicate copies and replaces them with **Hard Links** (on NTFS/ext4) or **Symbolic Links** (Symlinks).
  - Recover 100% of wasted disk space while ensuring applications referencing the duplicate file paths continue working seamlessly without modifications.

---

## 🤖 3. Intelligent Sorter & AI Category Schedulers

### ✍️ Category Rule Customization UI
- Provide an advanced configuration dashboard enabling users to define custom sorting rules:
  - **Rule Criteria**: File size ranges, creation/modification dates, filename regex patterns, or custom extension mappings.
  - **Nested targets**: Define subfolders dynamically (e.g., sort raw camera logs into `/Media/2026/Logs/` based on metadata tags).

### 🧠 Semantic AI File Classification
- Integrate a local, lightweight NLP classifier (e.g., ONNX-compiled text model or Sentence Transformers) running strictly offline on the user's host:
  - Analyzes the semantic meaning of loose filenames.
  - Groups them dynamically into contextual folder trees (e.g., categorizes `tax_invoice_2025.pdf`, `balance_sheet.xlsx`, and `receipt_target.png` collectively under a unified `/Financials` directory).

---

## 🛠️ 4. Dynamic Privilege Elevator & UAC Hooks

### 🛡️ In-App Elevation Gate
- **Problem**: When permissions blocks are encountered, the user currently must manually shut down the backend, open elevated Command Prompt, and reboot.
- **Solution**:
  - Implement a backend UAC elevation wrapper. When a user toggles "Elevate Scanner Rights", the backend spawns a secondary subprocess using Windows UAC shell commands:
    ```python
    import ctypes
    # Elevates secondary scanner process to Administrator directly
    ctypes.windll.shell32.ShellExecuteW(None, "runas", sys.executable, "elevated_scanner.py", None, 1)
    ```
  - Prompts standard native OS elevation dialogs and transitions Scanner threads cleanly to Elevated mode without closing the UI.

---

## 🌍 5. Cross-Platform Safe Safeguards

### 📂 Large Path support (Windows `\\?\` Prefixes)
- **Problem**: Standard Windows API calls fail on directory structures exceeding 260 characters (MAX_PATH limit).
- **Solution**: Re-write scanner helpers to automatically prepend the Windows long-path prefix `\\?\` to absolute directories on Windows, permitting traversal of infinitely nested developer files (e.g. deeply nested `node_modules`).

### 🍎 OS-Specific Metadata Skipping
- **Linux/Unix**: Ignore virtual mount points like `/proc`, `/sys`, and `/dev` to prevent scanner loops on recursive system devices.
- **macOS**: Skip resource fork files and folder layouts like `.DS_Store` or cache directories automatically.
- **Case Sensitivity Handling**: Add path normalizers resolving capitalizations differences between partition structures cleanly (e.g. ext4 vs NTFS case-handling).

---

## 📊 6. Interactive Treemap Zoom & Vectors Export

### 🔍 Aspect-Ratio Zoom Transitions
- Overhaul the SVG treemap to support **deep-drill zoom animations**:
  - Clicking any directory block within the Treemap smoothly focuses and expands the clicked sector to occupy 100% of the viewport.
  - Renders child nodes dynamically inside the zoom level.
- Expose premium vector formats export:
  - Add buttons to save space maps as high-resolution `.svg` vectors or print-ready `.pdf` reports for corporate system audits.

---

## ⏰ 7. Automated Storage Schedulers & Daemons

### 🔔 Smart Background Daemons
- Pack the FastAPI backend as a lightweight background service or Windows Service/cron daemon:
  - Periodically indices local disk drives during CPU idle times.
  - Spawns desktop notifications if drive space falls below a custom threshold (e.g., 5% free space).
  - Automatically sweeps predefined cleanup targets (e.g., deletes temporary system logs older than 30 days).
