import os
import time
import threading
from collections import defaultdict
import heapq

# File extension categories
EXTENSION_CATEGORIES = {
    "Videos": [".mp4", ".mkv", ".avi", ".mov", ".wmv", ".flv", ".webm", ".m4v"],
    "Audio": [".mp3", ".wav", ".flac", ".ogg", ".m4a", ".aac", ".wma"],
    "Images": [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".svg", ".webp", ".tiff", ".ico"],
    "Documents": [".pdf", ".docx", ".doc", ".xlsx", ".xls", ".pptx", ".ppt", ".txt", ".rtf", ".csv", ".md", ".pdf"],
    "Archives": [".zip", ".rar", ".7z", ".tar", ".gz", ".bz2", ".xz", ".iso", ".wim"],
    "Code": [".py", ".js", ".ts", ".tsx", ".html", ".css", ".json", ".cpp", ".c", ".h", ".cs", ".java", ".go", ".rs", ".php", ".sh", ".bat", ".ps1"],
    "System": [".sys", ".dll", ".exe", ".msi", ".cab", ".dat", ".bin", ".ini", ".log", ".tmp"],
}

def get_category(ext):
    ext = ext.lower()
    for category, extensions in EXTENSION_CATEGORIES.items():
        if ext in extensions:
            return category
    return "Others"

class DiskScanner:
    def __init__(self, root_path):
        self.root_path = os.path.abspath(root_path)
        self.status = "idle"  # idle, scanning, completed, failed, cancelled
        self.error = None
        
        # Live counters
        self.scanned_folders = 0
        self.scanned_files = 0
        self.total_size = 0
        self.current_folder = ""
        self.start_time = 0
        self.elapsed_time = 0
        
        # Flags
        self.cancel_flag = False
        self.pause_flag = False
        self.pause_event = threading.Event()
        self.pause_event.set()
        self.total_paused_time = 0
        self.last_pause_start = 0
        self._thread = None
        
        # In-memory scan results
        # path -> { "name": str, "size": int, "files_count": int, "subfolders": [], "files": [] }
        self.folders_data = defaultdict(lambda: {
            "name": "",
            "size": 0,
            "files_count": 0,
            "subfolders": [],
            "files": []
        })
        
        # Tracking files & folders sizes for stats
        self.top_files_heap = []  # max heap for largest files
        self.top_folders_heap = [] # max heap for largest folders
        
        # Extension stats: ext -> { "size": int, "count": int }
        self.extension_stats = defaultdict(lambda: {"size": 0, "count": 0})
        
        # Duplicate detection candidates: (filename, size) -> [path1, path2, ...]
        self.duplicate_candidates = defaultdict(list)
        
        # Permission errors: [path1, path2, ...]
        self.permission_errors = []

    def start(self):
        if self.status == "scanning":
            return
        
        self.status = "scanning"
        self.cancel_flag = False
        self.pause_flag = False
        self.pause_event.set()
        self.total_paused_time = 0
        self.last_pause_start = 0
        self.start_time = time.time()
        self.scanned_folders = 0
        self.scanned_files = 0
        self.total_size = 0
        self.permission_errors = []
        self.folders_data.clear()
        self.top_files_heap.clear()
        self.top_folders_heap.clear()
        self.extension_stats.clear()
        self.duplicate_candidates.clear()
        
        self._thread = threading.Thread(target=self._scan_thread)
        self._thread.daemon = True
        self._thread.start()

    def cancel(self):
        if self.status == "scanning":
            self.cancel_flag = True
            self.status = "cancelled"
            if self._thread:
                self._thread.join(timeout=1.0)

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

    def get_node_contents(self, path):
        """
        Retrieves the pre-calculated contents of a specific folder path.
        """
        abs_path = os.path.abspath(path)
        
        # Check if we have data for this path
        if abs_path not in self.folders_data:
            # If path is not scanned or outside scope, return empty
            return {
                "path": abs_path,
                "name": os.path.basename(abs_path) or abs_path,
                "size": 0,
                "files_count": 0,
                "folders": [],
                "files": []
            }
            
        folder = self.folders_data[abs_path]
        
        # Prepare subfolders with their calculated sizes
        subfolders = []
        for sub_name in folder["subfolders"]:
            sub_path = os.path.join(abs_path, sub_name)
            sub_size = self.folders_data[sub_path]["size"]
            subfolders.append({
                "name": sub_name,
                "path": sub_path,
                "size": sub_size,
                "files_count": self.folders_data[sub_path]["files_count"],
                "is_dir": True
            })
            
        # Prepare files list
        files = []
        for f in folder["files"]:
            files.append({
                "name": f["name"],
                "path": f["path"],
                "size": f["size"],
                "is_dir": False
            })
            
        # Sort both by size descending
        subfolders.sort(key=lambda x: x["size"], reverse=True)
        files.sort(key=lambda x: x["size"], reverse=True)
        
        return {
            "path": abs_path,
            "name": os.path.basename(abs_path) or abs_path,
            "size": folder["size"],
            "files_count": folder["files_count"],
            "folders": subfolders,
            "files": files
        }

    def get_summary(self):
        """
        Returns full analytics summary after (or during) scanning.
        """
        # Convert heaps to sorted lists
        # Top files
        top_files = sorted(
            [{"name": item[1], "path": item[2], "size": item[0]} for item in self.top_files_heap],
            key=lambda x: x["size"],
            reverse=True
        )
        
        # Top folders
        # Filter folders to avoid repeating parent folders that just contain the children.
        # We can sort all scanned folders and pick the absolute largest.
        sorted_folders = []
        for path, info in self.folders_data.items():
            if path == self.root_path:
                continue
            sorted_folders.append({
                "name": info["name"] or path,
                "path": path,
                "size": info["size"]
            })
        sorted_folders.sort(key=lambda x: x["size"], reverse=True)
        top_folders = sorted_folders[:20]
        
        # File type distribution
        file_types = defaultdict(lambda: {"size": 0, "count": 0})
        for ext, stats in self.extension_stats.items():
            category = get_category(ext)
            file_types[category]["size"] += stats["size"]
            file_types[category]["count"] += stats["count"]
            
        file_types_list = [
            {"category": cat, "size": stats["size"], "count": stats["count"]}
            for cat, stats in file_types.items()
        ]
        file_types_list.sort(key=lambda x: x["size"], reverse=True)
        
        # Get duplicates (only where count > 1)
        duplicates = []
        for (name, size), paths in self.duplicate_candidates.items():
            if len(paths) > 1 and size > 1024 * 1024:  # Only care about duplicates > 1MB
                duplicates.append({
                    "name": name,
                    "size": size,
                    "paths": paths
                })
        # Sort duplicates by wasted space (size * (count - 1)) descending
        duplicates.sort(key=lambda x: x["size"] * (len(x["paths"]) - 1), reverse=True)
        
        return {
            "root_path": self.root_path,
            "status": self.status,
            "total_size": self.total_size,
            "scanned_folders": self.scanned_folders,
            "scanned_files": self.scanned_files,
            "elapsed_time": round(self.elapsed_time, 2),
            "top_files": top_files[:20],
            "top_folders": top_folders,
            "file_types": file_types_list,
            "duplicates": duplicates[:50],  # top 50 duplicates
            "permission_errors_count": len(self.permission_errors)
        }

    def _scan_thread(self):
        try:
            self._scan_folder(self.root_path)
            if not self.cancel_flag:
                self.status = "completed"
        except Exception as e:
            self.status = "failed"
            self.error = str(e)
        finally:
            self.elapsed_time = time.time() - self.start_time

    def _scan_folder(self, path):
        self.pause_event.wait()
        if self.cancel_flag:
            return 0
            
        self.current_folder = path
        self.scanned_folders += 1
        
        # Initialize directory structures
        dir_name = os.path.basename(path) or path
        self.folders_data[path]["name"] = dir_name
        
        folder_size = 0
        local_files = []
        local_subfolders = []
        
        try:
            # os.scandir is highly optimized on Windows
            with os.scandir(path) as entries:
                for entry in entries:
                    self.pause_event.wait()
                    if self.cancel_flag:
                        return 0
                        
                    # Skip symlinks to prevent cyclic paths
                    try:
                        if entry.is_symlink():
                            continue
                    except OSError:
                        continue
                        
                    if entry.is_file():
                        try:
                            file_size = entry.stat().st_size
                            file_path = entry.path
                            file_name = entry.name
                            
                            folder_size += file_size
                            self.scanned_files += 1
                            self.total_size += file_size
                            
                            local_files.append({
                                "name": file_name,
                                "path": file_path,
                                "size": file_size
                            })
                            
                            # Extension stats
                            _, ext = os.path.splitext(file_name)
                            self.extension_stats[ext.lower()]["size"] += file_size
                            self.extension_stats[ext.lower()]["count"] += 1
                            
                            # Track top largest files
                            if len(self.top_files_heap) < 100:
                                heapq.heappush(self.top_files_heap, (file_size, file_name, file_path))
                            elif file_size > self.top_files_heap[0][0]:
                                heapq.heapreplace(self.top_files_heap, (file_size, file_name, file_path))
                                
                            # Register duplicate candidates
                            self.duplicate_candidates[(file_name, file_size)].append(file_path)
                            
                        except OSError:
                            # Skip files that raise errors on stat (e.g. locked system files)
                            pass
                            
                    elif entry.is_dir():
                        local_subfolders.append(entry.name)
                        
        except PermissionError:
            self.permission_errors.append(path)
            return 0
        except OSError:
            # Handle other OS errors gracefully
            return 0
            
        # Update current folder data with what we have directly
        self.folders_data[path]["files"] = local_files
        self.folders_data[path]["subfolders"] = local_subfolders
        
        # Traverse subfolders and aggregate sizes
        for sub_name in local_subfolders:
            if self.cancel_flag:
                return 0
            sub_path = os.path.join(path, sub_name)
            sub_size = self._scan_folder(sub_path)
            folder_size += sub_size
            
        # Update folders data size and files count
        self.folders_data[path]["size"] = folder_size
        
        # Calculate files count (recursively sum direct files + subfolder files)
        total_files_in_folder = len(local_files)
        for sub_name in local_subfolders:
            sub_path = os.path.join(path, sub_name)
            total_files_in_folder += self.folders_data[sub_path]["files_count"]
        self.folders_data[path]["files_count"] = total_files_in_folder
        
        return folder_size

def is_admin_privilege():
    import ctypes
    try:
        # Windows privilege check
        return ctypes.windll.shell32.IsUserAnAdmin() != 0
    except:
        # Unix privilege check fallback
        try:
            return os.getuid() == 0
        except:
            return False

def organize_directory(path, simulate=True):
    import shutil
    abs_path = os.path.abspath(path)
    if not os.path.exists(abs_path) or not os.path.isdir(abs_path):
        return {"error": "Target directory does not exist."}

    # Groupings mapping for organization
    GROUPS = {
        "Documents": [".pdf", ".docx", ".doc", ".xls", ".xlsx", ".ppt", ".pptx", ".txt", ".rtf", ".csv", ".md"],
        "Images": [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".svg", ".webp", ".tiff", ".ico"],
        "Videos": [".mp4", ".mkv", ".avi", ".mov", ".wmv", ".flv", ".webm", ".m4v"],
        "Audio": [".mp3", ".wav", ".flac", ".ogg", ".m4a", ".aac"],
        "Archives": [".zip", ".rar", ".7z", ".tar", ".gz", ".xz", ".iso"],
        "Installers": [".exe", ".msi"],
    }

    moves = []
    try:
        with os.scandir(abs_path) as entries:
            for entry in entries:
                if entry.is_file():
                    name = entry.name
                    _, ext = os.path.splitext(name)
                    ext = ext.lower()
                    
                    target_folder = None
                    for folder, extensions in GROUPS.items():
                        if ext in extensions:
                            target_folder = folder
                            break
                            
                    if target_folder:
                        file_size = entry.stat().st_size
                        moves.append({
                            "name": name,
                            "size": file_size,
                            "target_folder": target_folder,
                            "path": entry.path
                        })
    except PermissionError:
        return {"error": "Permission denied reading this folder."}
    except Exception as e:
        return {"error": str(e)}

    if simulate:
        return {"simulated": True, "moves": moves, "moved_count": len(moves)}

    # Perform actual moves safely
    moved_count = 0
    errors = []
    for m in moves:
        src = m["path"]
        dest_dir = os.path.join(abs_path, m["target_folder"])
        dest = os.path.join(dest_dir, m["name"])
        
        try:
            if not os.path.exists(dest_dir):
                os.makedirs(dest_dir, exist_ok=True)
            shutil.move(src, dest)
            moved_count += 1
        except Exception as e:
            errors.append({"file": m["name"], "error": str(e)})

    return {
        "simulated": False,
        "moved_count": moved_count,
        "moves": moves[:moved_count],  # return successfully moved files
        "errors": errors
    }

