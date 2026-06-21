import os

def find_file(filename, search_paths):
    for path in search_paths:
        if os.path.exists(path):
            for root, dirs, files in os.walk(path):
                if filename in files:
                    return os.path.join(root, filename)
    return None

def main():
    search_paths = [
        r"C:\Program Files",
        r"C:\Program Files (x86)",
        os.environ.get("APPDATA", ""),
        os.environ.get("LOCALAPPDATA", ""),
        r"C:\Users\USER"
    ]
    
    print("Searching for node.exe...")
    node_path = find_file("node.exe", search_paths)
    if node_path:
        print(f"Found node.exe: {node_path}")
    else:
        print("node.exe not found.")
        
    print("Searching for npm.cmd...")
    npm_path = find_file("npm.cmd", search_paths)
    if npm_path:
        print(f"Found npm.cmd: {npm_path}")
    else:
        print("npm.cmd not found.")

if __name__ == "__main__":
    main()
