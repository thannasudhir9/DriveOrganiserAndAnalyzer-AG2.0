export interface Drive {
  device: string;
  mountpoint: string;
  fstype: string;
  total: number;
  used: number;
  free: number;
  percent: number;
}

export interface ScanStatus {
  status: 'idle' | 'scanning' | 'paused' | 'completed' | 'failed' | 'cancelled';
  error: string | null;
  scanned_folders: number;
  scanned_files: number;
  total_size: number;
  current_folder: string;
  elapsed_time: number;
  permission_errors_count: number;
  is_drive_root?: boolean;
  drive_used_size?: number;
  drive_total_size?: number;
}

export interface FileItem {
  name: string;
  path: string;
  size: number;
  is_dir: false;
}

export interface FolderItem {
  name: string;
  path: string;
  size: number;
  files_count: number;
  is_dir: true;
}

export interface DirectoryContent {
  path: string;
  name: string;
  size: number;
  files_count: number;
  folders: FolderItem[];
  files: FileItem[];
}

export interface FileTypeSummary {
  category: string;
  size: number;
  count: number;
}

export interface DuplicateSet {
  name: string;
  size: number;
  paths: string[];
}

export interface ScanSummary {
  root_path: string;
  status: 'idle' | 'scanning' | 'paused' | 'completed' | 'failed' | 'cancelled';
  total_size: number;
  scanned_folders: number;
  scanned_files: number;
  elapsed_time: number;
  top_files: FileItem[];
  top_folders: { name: string; path: string; size: number }[];
  file_types: FileTypeSummary[];
  duplicates: DuplicateSet[];
  permission_errors_count: number;
}

export interface OrganizeMove {
  name: string;
  size: number;
  target_folder: string;
  path: string;
}

export interface OrganizeResponse {
  simulated: boolean;
  moved_count: number;
  moves: OrganizeMove[];
  errors?: { file: string; error: string }[];
}

export interface AdminResponse {
  is_admin: boolean;
}
