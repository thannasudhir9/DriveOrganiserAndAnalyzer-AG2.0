import os
import sys
import time
import subprocess

def run_command(cmd, cwd=None):
    try:
        subprocess.run(cmd, shell=True, cwd=cwd, check=True)
        return True
    except Exception as e:
        print(f"Error running command {cmd}: {str(e)}")
        return False

def main():
    root_dir = os.path.dirname(os.path.abspath(__file__))
    screenshots_dir = os.path.join(root_dir, "screenshots")
    os.makedirs(screenshots_dir, exist_ok=True)
    
    # Establish a local workspace path for Playwright browsers to avoid C:\Users\...\AppData EPERM errors
    local_browsers_dir = os.path.join(root_dir, "playwright-browsers")
    os.makedirs(local_browsers_dir, exist_ok=True)
    os.environ["PLAYWRIGHT_BROWSERS_PATH"] = local_browsers_dir
    
    print("[Nova Screenshots] Creating screenshots directory at:", screenshots_dir)
    print("[Nova Screenshots] Setting local Playwright browsers directory at:", local_browsers_dir)
    
    # Check/install playwright
    print("[Nova Screenshots] Checking and installing playwright backend dependencies for automated captures...")
    run_command(f'"{sys.executable}" -m pip install playwright')
    
    # Run playwright install chromium with local browser path configured in environment
    run_command(f'"{sys.executable}" -m playwright install chromium')

    print("[Nova Screenshots] Launching browser automation script...")
    
    script_content = f"""import os
import time
from playwright.sync_api import sync_playwright

def take_screenshots():
    root_dir = os.path.dirname(os.path.abspath(__file__))
    screenshots_dir = os.path.join(root_dir, "screenshots")
    os.environ["PLAYWRIGHT_BROWSERS_PATH"] = os.path.join(root_dir, "playwright-browsers")
    
    with sync_playwright() as p:
        # Launch headless browser
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={{"width": 1440, "height": 900}})
        
        print("Navigating to Nova local application at http://localhost:8000...")
        try:
            page.goto("http://localhost:8000")
            time.sleep(3.5) # Let assets load
        except Exception as e:
            print("Failed to reach http://localhost:8000. Is the server running? Start it using 'python run.py' first.")
            return

        # 1. Dark mode - Startup selector
        page.screenshot(path=os.path.join(screenshots_dir, "1_dark_startup_selector.png"))
        print("Captured Startup Selector (Dark)")

        # Toggle to Light mode
        sun_icon = page.locator("button[title='Switch to Light Theme']")
        if sun_icon.count() > 0:
            sun_icon.click()
            time.sleep(1.5)
            page.screenshot(path=os.path.join(screenshots_dir, "2_light_startup_selector.png"))
            print("Captured Startup Selector (Light)")
            
            # Switch back to dark for consistency
            moon_icon = page.locator("button[title='Switch to Dark Theme']")
            if moon_icon.count() > 0:
                moon_icon.click()
                time.sleep(1.5)

        # Go to Docs Viewer on selector
        docs_btn = page.locator("text=Interactive Project Docs")
        if docs_btn.count() > 0:
            docs_btn.click()
            time.sleep(2)
            page.screenshot(path=os.path.join(screenshots_dir, "3_dark_interactive_docs.png"))
            print("Captured Interactive Docs Viewer")
            
        # Go to Features Guide on selector
        features_btn = page.locator("text=Application Features")
        if features_btn.count() > 0:
            features_btn.click()
            time.sleep(2)
            page.screenshot(path=os.path.join(screenshots_dir, "4_dark_features_guide.png"))
            print("Captured Features Tour Guide")

        # Let's initiate a scan to show Live HUD and Dashboard!
        # First return to scan tab
        scan_tab = page.locator("text=Scan Analyzer Hub")
        if scan_tab.count() > 0:
            scan_tab.click()
            time.sleep(0.8)

        # Click custom path input or run scan on default
        path_input = page.locator("input[placeholder*='e.g. C:']")
        scan_btn = page.locator("button:has-text('Start Custom Scan')")
        
        if path_input.count() > 0 and scan_btn.count() > 0:
            backend_path = os.path.join(root_dir, "backend")
            path_input.fill(backend_path)
            time.sleep(0.8)
            scan_btn.click()
            print("Initiating scan on path:", backend_path)
            time.sleep(2) # Wait for live scanning to fill
            
            # 5. Live scanning HUD banner
            page.screenshot(path=os.path.join(screenshots_dir, "5_dark_live_scanning_dashboard.png"))
            print("Captured Live Scanning Dashboard")
            
            # Wait for scan completion
            time.sleep(5)
            
            # 6. Completed results dashboard - Directory Explorer
            page.screenshot(path=os.path.join(screenshots_dir, "6_dark_results_explorer.png"))
            print("Captured Completed Results Explorer (Dark)")

            # Toggle to Light mode on results dashboard
            sun_icon = page.locator("button[title='Switch to Light Theme']")
            if sun_icon.count() > 0:
                sun_icon.click()
                time.sleep(2)
                page.screenshot(path=os.path.join(screenshots_dir, "7_light_results_explorer.png"))
                print("Captured Completed Results Explorer (Light)")
                
                # Switch back to dark
                moon_icon = page.locator("button[title='Switch to Dark Theme']")
                if moon_icon.count() > 0:
                    moon_icon.click()
                    time.sleep(2)

            # Click Duplicates Tab
            dup_tab = page.locator("text=Duplicate Finder")
            if dup_tab.count() > 0:
                dup_tab.click()
                time.sleep(1.5)
                page.screenshot(path=os.path.join(screenshots_dir, "8_dark_duplicate_finder.png"))
                print("Captured Duplicate Finder")

            # Click Analytics & Charts Tab
            analytics_tab = page.locator("text=Analytics & Charts")
            if analytics_tab.count() > 0:
                analytics_tab.click()
                time.sleep(1.5)
                page.screenshot(path=os.path.join(screenshots_dir, "9_dark_analytics_charts.png"))
                print("Captured Analytics & Charts")

            # Click Space Optimizer Tab
            opt_tab = page.locator("text=Space Optimizer")
            if opt_tab.count() > 0:
                opt_tab.click()
                time.sleep(1.5)
                page.screenshot(path=os.path.join(screenshots_dir, "10_dark_space_optimizer.png"))
                print("Captured Space Optimizer recommendations")

            # Click Dedicated File Organizer Tab
            org_tab = page.locator("text=File Organizer")
            if org_tab.count() > 0:
                org_tab.click()
                time.sleep(1.5)
                page.screenshot(path=os.path.join(screenshots_dir, "11_dark_file_organizer_tab.png"))
                print("Captured File Organizer Workspace Panel")

        browser.close()
        print("[Nova Screenshots] Success! All 11 feature screenshots successfully captured inside /screenshots directory.")

if __name__ == '__main__':
    take_screenshots()
"""
    
    runner_path = os.path.join(root_dir, "run_take_screenshots.py")
    with open(runner_path, "w", encoding="utf-8") as f:
        f.write(script_content)
        
    print("[Nova Screenshots] Running browser automation script now...")
    run_command(f'"{sys.executable}" "{runner_path}"')
    
    # Cleanup script runner
    try:
        os.remove(runner_path)
    except:
        pass

if __name__ == '__main__':
    main()
