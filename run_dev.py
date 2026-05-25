import os
import sys
import subprocess
import time

def log(msg):
    print(f"\n[Nova Dev] {msg}", flush=True)

def main():
    root_dir = os.path.dirname(os.path.abspath(__file__))
    frontend_dir = os.path.join(root_dir, "frontend")

    log("Booting Nova Space Analyzer Dev Mode...")
    
    processes = []
    try:
        # 1. Start FastAPI backend with reload enabled
        log("Starting FastAPI backend on http://localhost:8000...")
        backend_cmd = f'"{sys.executable}" -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000'
        backend_process = subprocess.Popen(
            backend_cmd,
            shell=True,
            cwd=root_dir
        )
        processes.append(backend_process)

        # Give backend a moment to bind
        time.sleep(1.0)

        # 2. Start Vite dev server
        log("Starting Vite dev server on http://localhost:5173...")
        frontend_cmd = "npm run dev"
        frontend_process = subprocess.Popen(
            frontend_cmd,
            shell=True,
            cwd=frontend_dir
        )
        processes.append(frontend_process)

        log("Dev Environment running! Press Ctrl+C in this terminal to shut down both processes.")
        
        # Keep main thread alive monitoring children
        while True:
            for p in processes:
                if p.poll() is not None:
                    # One of the processes terminated, shutdown everything
                    log(f"Process {p.pid} terminated. Shutting down dev environment.")
                    return
            time.sleep(1.0)
            
    except KeyboardInterrupt:
        log("Ctrl+C detected! Terminating dev servers...")
    except Exception as e:
        log(f"Dev launcher encountered an error: {str(e)}")
    finally:
        # Clean shutdown of all launched subprocesses
        for p in processes:
            if p.poll() is None:
                try:
                    log(f"Terminating process {p.pid}...")
                    # On Windows, taskkill might be necessary to close process subtrees
                    if sys.platform == "win32":
                        subprocess.run(f"taskkill /F /T /PID {p.pid}", shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                    else:
                        p.terminate()
                except Exception:
                    pass
        log("Dev environment shut down successfully.")

if __name__ == "__main__":
    main()
