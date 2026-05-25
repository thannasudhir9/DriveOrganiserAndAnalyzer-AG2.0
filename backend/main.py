import os
import uuid
import psutil
import json
from datetime import datetime
from fastapi import FastAPI, HTTPException, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional

from backend.scanner import DiskScanner, is_admin_privilege, organize_directory

class OrganizeRequest(BaseModel):
    path: str
    simulate: bool

app = FastAPI(title="Nova Disk Analyzer API")

# Enable CORS for development with Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registry to hold active and completed scans
# scan_id -> DiskScanner instance
scans_registry = {}

class ScanRequest(BaseModel):
    path: str
    skip_hidden: Optional[bool] = False
    skip_packages: Optional[bool] = False
    skip_code: Optional[bool] = False

@app.get("/api/drives")
def get_drives():
    """
    Detects and returns all available disk drives and partitions on the host machine.
    """
    drives = []
    try:
        partitions = psutil.disk_partitions()
        for partition in partitions:
            # Skip virtual/optical drives with empty or readonly settings
            if 'cdrom' in partition.opts or partition.fstype == '':
                continue
            
            try:
                usage = psutil.disk_usage(partition.mountpoint)
                drives.append({
                    "device": partition.device,
                    "mountpoint": partition.mountpoint,
                    "fstype": partition.fstype,
                    "total": usage.total,
                    "used": usage.used,
                    "free": usage.free,
                    "percent": usage.percent
                })
            except (PermissionError, OSError):
                # Drive might be unmounted, locked, or protected
                continue
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to scan partitions: {str(e)}")
        
    return drives

@app.post("/api/scan")
def start_scan(request: ScanRequest):
    """
    Starts an asynchronous directory scanner for the given absolute path.
    """
    target_path = request.path.strip()
    
    if target_path != "ALL_SYSTEM_DRIVES":
        if not os.path.exists(target_path):
            raise HTTPException(status_code=400, detail="The specified path does not exist.")
            
        if not os.path.isdir(target_path):
            raise HTTPException(status_code=400, detail="The specified path is not a directory.")
        
    # Generate unique scan ID
    scan_id = str(uuid.uuid4())
    
    # Instantiate and start the scanner
    scanner = DiskScanner(
        target_path,
        skip_hidden=request.skip_hidden,
        skip_packages=request.skip_packages,
        skip_code=request.skip_code
    )
    scans_registry[scan_id] = scanner
    scanner.start()
    
    return {
        "scan_id": scan_id,
        "path": scanner.root_path,
        "status": scanner.status
    }

@app.get("/api/scan/{scan_id}/status")
def get_scan_status(scan_id: str):
    """
    Returns real-time progress details of a scanning job.
    """
    if scan_id not in scans_registry:
        raise HTTPException(status_code=404, detail="Scan ID not found.")
        
    scanner = scans_registry[scan_id]
    return scanner.get_progress()

@app.post("/api/scan/{scan_id}/cancel")
def cancel_scan(scan_id: str):
    """
    Cancels an active scanning job.
    """
    if scan_id not in scans_registry:
        raise HTTPException(status_code=404, detail="Scan ID not found.")
        
    scanner = scans_registry[scan_id]
    scanner.cancel()
    return {"status": scanner.status}

@app.post("/api/scan/{scan_id}/pause")
def pause_scan(scan_id: str):
    """
    Pauses an active scanning job.
    """
    if scan_id not in scans_registry:
        raise HTTPException(status_code=404, detail="Scan ID not found.")
        
    scanner = scans_registry[scan_id]
    scanner.pause()
    return {"status": scanner.status}

@app.post("/api/scan/{scan_id}/resume")
def resume_scan(scan_id: str):
    """
    Resumes a paused scanning job.
    """
    if scan_id not in scans_registry:
        raise HTTPException(status_code=404, detail="Scan ID not found.")
        
    scanner = scans_registry[scan_id]
    scanner.resume()
    return {"status": scanner.status}

@app.get("/api/scan/{scan_id}/summary")
def get_scan_summary(scan_id: str):
    """
    Retrieves full aggregated statistics (top folders, top files, categories, duplicates).
    """
    if scan_id not in scans_registry:
        raise HTTPException(status_code=404, detail="Scan ID not found.")
        
    scanner = scans_registry[scan_id]
    return scanner.get_summary()

@app.get("/api/scan/{scan_id}/node")
def get_scan_node(scan_id: str, path: str = Query(..., description="Absolute path of the folder to query")):
    """
    Returns contents of a directory node (its files and immediate subfolders with computed sizes).
    """
    if scan_id not in scans_registry:
        raise HTTPException(status_code=404, detail="Scan ID not found.")
        
    scanner = scans_registry[scan_id]
    return scanner.get_node_contents(path)

@app.get("/api/check-admin")
def check_admin():
    """
    Checks if the local Python process has elevated Administrator privileges.
    """
    return {"is_admin": is_admin_privilege()}

@app.post("/api/scan/{scan_id}/export")
def export_scan_report(scan_id: str):
    """
    Compiles and exports the complete scan results JSON to a /reports folder in the workspace.
    """
    if scan_id not in scans_registry:
        raise HTTPException(status_code=404, detail="Scan ID not found.")
    
    scanner = scans_registry[scan_id]
    summary = scanner.get_summary()
    
    # Enrich summary with export parameters
    summary["timestamp"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    summary["is_admin_mode"] = is_admin_privilege()
    
    # Establish reports folder in project workspace root
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    reports_dir = os.path.join(root_dir, "reports")
    os.makedirs(reports_dir, exist_ok=True)
    
    # Write JSON file with formatted timestamp
    timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
    sanitized_root = "".join(c if c.isalnum() else "_" for c in scanner.root_path)
    sanitized_root = sanitized_root[:30] # Limit filename size
    filename = f"report_{sanitized_root}_{timestamp_str}.json"
    filepath = os.path.join(reports_dir, filename)
    
    try:
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(summary, f, indent=2, ensure_ascii=False)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save report: {str(e)}")
        
    return {
        "success": True,
        "filename": filename,
        "filepath": filepath,
        "timestamp": summary["timestamp"]
    }

@app.post("/api/organize")
def organize_folder(request: OrganizeRequest):
    """
    Cleans up a cluttered directory by grouping immediate level files into category subdirectories.
    Supports simulation dry-runs and safe atomic folder moves.
    """
    res = organize_directory(request.path, request.simulate)
    if "error" in res:
        raise HTTPException(status_code=400, detail=res["error"])
    return res

@app.post("/api/select-folder")
def select_folder():
    """
    Opens a native OS folder selection dialog on the host system using Tkinter
    and returns the selected absolute path.
    """
    try:
        import tkinter as tk
        from tkinter import filedialog
        
        # Initialize and hide root window
        root = tk.Tk()
        root.withdraw()
        root.attributes('-topmost', True) # Bring dialogue to front of all windows
        
        folder_path = filedialog.askdirectory(title="Select Directory to Scan")
        root.destroy()
        
        if folder_path:
            return {"success": True, "path": os.path.abspath(folder_path)}
        else:
            return {"success": True, "path": ""}
    except Exception as e:
        return {"success": False, "error": str(e), "path": ""}

@app.get("/api/docs")
def get_doc(file: str = Query(..., description="Document key to retrieve")):
    """
    Reads and returns the contents of local project workspace markdown files.
    """
    doc_map = {
        "readme": "README.md",
        "implementation_plan": "implementation_plan.md",
        "task": "task.md",
        "walkthrough": "walkthrough.md",
        "prompts_log": "prompts_log.md"
    }
    
    if file not in doc_map:
        raise HTTPException(status_code=400, detail="Invalid document file key requested.")
        
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    filename = doc_map[file]
    filepath = os.path.join(root_dir, filename)
    
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail=f"Document file {filename} not found.")
        
    try:
        # Get last modified time
        mtime = os.path.getmtime(filepath)
        last_modified = datetime.fromtimestamp(mtime).strftime("%Y-%m-%d %H:%M:%S")
        
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read file: {str(e)}")
        
    return {
        "key": file,
        "filename": filename,
        "content": content,
        "last_modified": last_modified
    }

class ScreenshotRequest(BaseModel):
    theme: Optional[str] = "dark"
    view_state: Optional[str] = "selector"
    home_tab: Optional[str] = "scan"
    active_tab: Optional[str] = "explorer"
    current_path: Optional[str] = ""
    scan_id: Optional[str] = None

@app.post("/api/screenshot")
def take_custom_screenshot(req: ScreenshotRequest):
    """
    Takes a premium automated screenshot of the current viewport using headlessly automated Playwright Chromium.
    """
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        raise HTTPException(status_code=500, detail="Playwright is not installed. Please run take_screenshots.py to install it first.")
        
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    screenshots_dir = os.path.join(root_dir, "screenshots")
    os.makedirs(screenshots_dir, exist_ok=True)
    
    # Configure Playwright browser path to avoid AppData permissions
    os.environ["PLAYWRIGHT_BROWSERS_PATH"] = os.path.join(root_dir, "playwright-browsers")
    
    # Construct URL with active query parameters
    query_parts = []
    if req.theme:
        query_parts.append(f"theme={req.theme}")
    if req.view_state:
        query_parts.append(f"viewState={req.view_state}")
    if req.home_tab:
        query_parts.append(f"homeTab={req.home_tab}")
    if req.active_tab:
        query_parts.append(f"activeTab={req.active_tab}")
    if req.current_path:
        from urllib.parse import quote
        query_parts.append(f"currentPath={quote(req.current_path)}")
    if req.scan_id:
        query_parts.append(f"scanId={req.scan_id}")
        
    query_str = "&".join(query_parts)
    target_url = f"http://127.0.0.1:8000/?{query_str}"
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    screenshot_filename = f"screenshot_manual_{timestamp}.png"
    screenshot_filepath = os.path.join(screenshots_dir, screenshot_filename)
    
    def worker():
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            # Match standard viewport
            page = browser.new_page(viewport={"width": 1440, "height": 900})
            try:
                page.goto(target_url)
                # Wait for react elements, animations, and state to render
                import time
                time.sleep(2.5)
                page.screenshot(path=screenshot_filepath)
            finally:
                browser.close()
                
    try:
        worker()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Playwright screenshot capture failed: {str(e)}")
        
    return {
        "success": True,
        "filename": screenshot_filename,
        "filepath": screenshot_filepath
    }

# Serving static assets for the React UI
frontend_dist_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist"))
if os.path.exists(frontend_dist_path):
    # Mount build assets directory
    app.mount("/", StaticFiles(directory=frontend_dist_path, html=True), name="frontend")
else:
    @app.get("/")
    def read_root():
        return {
            "message": "Nova Disk Analyzer API is active. Web UI dist folder not found. Run dev server or compile using run.py."
        }
