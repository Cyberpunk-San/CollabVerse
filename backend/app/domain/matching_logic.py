import subprocess
import os

import platform

def run_cpp_solver(input_data: str):
    """
    Communicates with the compiled C++ binary in /bin/solver.
    Sends data via stdin and captures optimal matches via stdout.
    """
    # Locate the binary relative to the project root
    is_windows = platform.system() == "Windows"
    binary_name = "solver.exe" if is_windows else "solver"
    
    bin_dir = os.path.join(os.getcwd(), "bin")
    binary_path = os.path.join(bin_dir, binary_name)
    
    if not os.path.exists(binary_path):
        raise FileNotFoundError(f"C++ Solver binary not found at {binary_path}")

    try:
        process = subprocess.Popen(
            [binary_path],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        stdout, stderr = process.communicate(input=input_data, timeout=10)
    except Exception as e:
        raise RuntimeError(f"Failed to execute C++ solver at {binary_path}: {e}")
    
    if stderr:
        # Log algorithmic errors from C++
        print(f"C++ Engine Error: {stderr}")
        
    return stdout.strip().split('\n') if stdout else []