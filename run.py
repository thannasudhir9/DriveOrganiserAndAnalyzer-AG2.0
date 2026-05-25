import os
import sys
import subprocess
import time
import webbrowser
import threading

def log(msg):
    print(f"\n[Nova Startup] {msg}", flush=True)

def run_command(cmd, cwd=None):
    """
    Executes a shell command and raises an exception if it fails.
    Uses shell=True to support Windows command execution seamlessly.
    """
    try:
        res = subprocess.run(cmd, shell=True, cwd=cwd, check=True)
        return res.returncode == 0
    except subprocess.CalledProcessError as e:
        print(f"Error running command: {cmd}\nException: {str(e)}", flush=True)
        return False

def open_browser():
    """
    Threaded browser opener. Waits for the FastAPI server to initialize
    and then launches the web page.
    """
    time.sleep(1.8)
    log("FastAPI backend is active. Opening Nova Disk Analyzer in your browser...")
    webbrowser.open("http://localhost:8000")

def main():
    root_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(root_dir, "backend")
    frontend_dir = os.path.join(root_dir, "frontend")

    log("Initializing Nova Space Analyzer configuration...")

    # 1. Install Python dependencies
    log("Verifying and installing Python backend dependencies...")
    reqs_path = os.path.join(backend_dir, "requirements.txt")
    if not run_command(f'"{sys.executable}" -m pip install -r "{reqs_path}"'):
        log("Python dependency installation failed. Please check pip settings.")
        sys.exit(1)

    # 2. Check Node modules and build frontend
    log("Verifying Node.js dependencies for frontend...")
    node_modules_path = os.path.join(frontend_dir, "node_modules")
    
    if not os.path.exists(node_modules_path):
        log("node_modules folder not found. Running npm install...")
        if not run_command("npm install", cwd=frontend_dir):
            log("npm install failed. Please verify Node.js and npm installations.")
            sys.exit(1)
    else:
        log("node_modules verified successfully.")

    # 3. Compile the React build
    log("Compiling React + TypeScript production bundle...")
    if not run_command("npm run build", cwd=frontend_dir):
        log("React production bundle build failed.")
        sys.exit(1)

    log("Frontend compiled successfully. Static files copied to /frontend/dist.")

    # 4. Fire background browser launch thread
    browser_thread = threading.Thread(target=open_browser)
    browser_thread.daemon = True
    browser_thread.start()

    # 5. Boot Uvicorn Server (blocking command)
    log("Launching local ASGI web server on http://localhost:8000...")
    # Execute uvicorn as a Python subprocess module to automatically load the user site packages path
    run_command(f'"{sys.executable}" -m uvicorn backend.main:app --host 127.0.0.1 --port 8000')

if __name__ == "__main__":
    main()
