# yTube Downloader.py
import os
import sys
import time
import threading
import subprocess
import webbrowser
import tkinter as tk
from tkinter import ttk

# This part has been updated to handle PyInstaller's temporary path
if getattr(sys, 'frozen', False):
    # PyInstaller se banaye gaye .exe ke liye
    BASE_DIR = sys._MEIPASS
    PROJECT_ROOT = sys._MEIPASS
else:
    # Aam Python script ke liye
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))

# Add the project directory to the Python path
sys.path.append(PROJECT_ROOT)

# Set the Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'yt_video_downloader.settings')

# Explicitly import whitenoise components to help PyInstaller
try:
    import whitenoise.middleware
    import whitenoise.storage
except ImportError as e:
    print(f"CRITICAL: Failed to import whitenoise components early: {e}", file=sys.stderr)
    time.sleep(10)
    sys.exit(1)

import django

try:
    django.setup()
except Exception as e:
    print(f"CRITICAL: Django setup failed: {e}", file=sys.stderr)
    time.sleep(10)
    sys.exit(1)

FFMPEG_BIN_DIR = os.path.join(PROJECT_ROOT, 'ffmpeg_bin')
SERVER_LOG_FILE = os.path.join(PROJECT_ROOT, 'server_error.log')


def log_error(message):
    """Logs errors to a file, useful for debugging silent executables."""
    try:
        with open(SERVER_LOG_FILE, 'a') as f:
            f.write(f"[{time.ctime()}] {message}\n")
    except Exception as e:
        print(f"CRITICAL ERROR: Could not write to log file: {e} - Message: {message}", file=sys.stderr)


def run_django_commands():
    """
    Run Django management commands.txt (migrate, collectstatic) in a separate thread.
    """
    try:
        from django.core.management import execute_from_command_line

        log_error("Applying database migrations...")
        print("Applying database migrations...")
        execute_from_command_line(['manage.py', 'migrate'])
        log_error("Migrations applied.")
        print("Migrations applied.")

        log_error("Collecting static files...")
        print("Collecting static files...")
        execute_from_command_line(['manage.py', 'collectstatic', '--noinput'])
        log_error("Static files collected.")
        print("Static files collected.")

        ffmpeg_exe_path = os.path.join(FFMPEG_BIN_DIR, 'ffmpeg.exe')
        if not os.path.exists(ffmpeg_exe_path):
            log_error(f"WARNING: FFmpeg executable not found at {ffmpeg_exe_path}. Downloads may fail.")
            print(f"WARNING: FFmpeg executable not found at {ffmpeg_exe_path}. Downloads may fail.", file=sys.stderr)
        else:
            log_error(f"FFmpeg found at: {ffmpeg_exe_path}")
            print(f"FFmpeg found at: {ffmpeg_exe_path}")

    except Exception as e:
        log_error(f"Error running Django management commands.txt: {e}")
        print(f"Error running Django management commands.txt: {e}", file=sys.stderr)


# Global variable to hold the Tkinter root window, so we can close it from another thread
loading_window = None
server_ready_event = threading.Event()


def create_loading_screen():
    """Creates and displays a Tkinter loading screen."""
    global loading_window
    try:
        loading_window = tk.Tk()
        loading_window.title("Loading...")
        loading_window.overrideredirect(True)
        loading_window.attributes('-topmost', True)

        loading_window.config(bg='#2A004A')
        window_width = 400
        window_height = 200
        screen_width = loading_window.winfo_screenwidth()
        screen_height = loading_window.winfo_screenheight()
        x = (screen_width // 2) - (window_width // 2)
        y = (screen_height // 2) - (window_height // 2)
        loading_window.geometry(f'{window_width}x{window_height}+{x}+{y}')

        label = tk.Label(loading_window, text="yTube-Downloader", font=("Inter", 24, "bold"), fg='#E0BBE4',
                         bg='#2A004A')
        label.pack(pady=20)

        sub_label = tk.Label(loading_window, text="Starting server... Please wait.", font=("Inter", 12), fg='#BBBBBB',
                             bg='#2A004A')
        sub_label.pack(pady=5)

        s = ttk.Style()
        s.theme_use('clam')
        s.configure("purple.Horizontal.TProgressbar",
                    background='#E0BBE4',
                    troughcolor='#5A008A',
                    bordercolor='#5A008A',
                    lightcolor='#E0BBE4',
                    darkcolor='#E0BBE4',
                    thickness=10)

        progress_bar = ttk.Progressbar(loading_window, style="purple.Horizontal.TProgressbar", orient="horizontal",
                                       length=300, mode="indeterminate")
        progress_bar.pack(pady=20)
        progress_bar.start(15)

        def check_and_close():
            if server_ready_event.is_set():
                loading_window.destroy()
                log_error("Loading screen closed.")
                print("Loading screen closed.")
            else:
                loading_window.after(500, check_and_close)

        loading_window.after(100, check_and_close)
        loading_window.mainloop()
    except Exception as e:
        log_error(f"Error creating Tkinter loading screen: {e}")
        print(f"Error creating Tkinter loading screen: {e}", file=sys.stderr)
        if loading_window and loading_window.winfo_exists():
            loading_window.destroy()


def run_waitress_server():
    """Run the Waitress WSGI server and signal readiness."""
    try:
        from waitress import serve
        from yt_video_downloader.wsgi import application

        log_error("Attempting to start Waitress server on http://127.0.0.1:8000/")
        print("Attempting to start Waitress server on http://127.0.0.1:8000/")

        server_thread = threading.Thread(target=lambda: serve(application, host='127.0.0.1', port=8000))
        server_thread.daemon = True
        server_thread.start()

        max_retries = 30
        for i in range(max_retries):
            try:
                import socket
                with socket.create_connection(('127.0.0.1', 8000), timeout=1):
                    log_error("Server is responsive.")
                    print("Server is responsive.")
                    server_ready_event.set()
                    break
            except (ConnectionRefusedError, socket.timeout):
                log_error(f"Server not yet responsive, retry {i + 1}/{max_retries}...")
                print(f"Server not yet responsive, retry {i + 1}/{max_retries}...")
                time.sleep(0.5)
        else:
            log_error("Server did not become responsive within the timeout period.")
            print("Server did not become responsive within the timeout period.", file=sys.stderr)

        server_thread.join()

        log_error("Waitress server started successfully (this message won't show until server stops).")
        print("Waitress server started successfully (this message won't show until server stops).")
    except Exception as e:
        log_error(f"Critical Error starting Waitress server: {e}")
        print(f"Critical Error starting Waitress server: {e}", file=sys.stderr)
        time.sleep(10)
        sys.exit(1)


if __name__ == '__main__':
    log_error("yTube Downloader.py started. (Main process)")
    print("yTube Downloader.py started. (Main process)")

    loading_thread = threading.Thread(target=create_loading_screen)
    loading_thread.daemon = True
    loading_thread.start()

    django_commands_thread = threading.Thread(target=run_django_commands)
    django_commands_thread.daemon = True
    django_commands_thread.start()

    run_waitress_server()

    log_error("Opening main application URL in browser...")
    print("Opening main application URL in browser...")
    webbrowser.open_new_tab('http://127.0.0.1:8000/')

    log_error("Main application URL opened. Main thread will now block until server stops.")
    print("Main application URL opened. Main thread will now block until server stops.")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        log_error("Server process interrupted (e.g., Ctrl+C in console).")
        print("Server process interrupted.")
    except Exception as e:
        log_error(f"Unexpected error in main thread: {e}")
        print(f"Unexpected error in main thread: {e}", file=sys.stderr)