import os
import re

def check_file_braces(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # We will do a basic check for curly braces, parentheses, and brackets
    # while ignoring comments and strings.
    stack = []
    mapping = {')': '(', '}': '{', ']': '['}
    
    in_string = False
    string_char = None
    escaped = False
    in_single_comment = False
    in_multi_comment = False
    
    i = 0
    n = len(content)
    
    while i < n:
        char = content[i]
        
        if escaped:
            escaped = False
            i += 1
            continue
            
        if in_single_comment:
            if char == '\n':
                in_single_comment = False
            i += 1
            continue
            
        if in_multi_comment:
            if char == '*' and i + 1 < n and content[i+1] == '/':
                in_multi_comment = False
                i += 2
            else:
                i += 1
            continue
            
        if in_string:
            if char == '\\':
                escaped = True
                i += 1
                continue
            if char == string_char:
                in_string = False
                string_char = None
            i += 1
            continue
            
        # Check comments
        if char == '/' and i + 1 < n and content[i+1] == '/':
            in_single_comment = True
            i += 2
            continue
        if char == '/' and i + 1 < n and content[i+1] == '*':
            in_multi_comment = True
            i += 2
            continue
            
        # Check strings
        if char in ["'", '"', '`']:
            in_string = True
            string_char = char
            i += 1
            continue
            
        # Braces check
        if char in ['(', '{', '[']:
            stack.append((char, i))
        elif char in [')', '}', ']']:
            if not stack:
                return f"Extra closing character '{char}' at index {i} in {filepath}"
            top, top_pos = stack.pop()
            if top != mapping[char]:
                # find line number
                line = content[:i].count('\n') + 1
                return f"Mismatched closing character '{char}' at line {line} (matches '{top}' at index {top_pos}) in {filepath}"
        i += 1
        
    if stack:
        # find line number for the first unclosed character
        line = content[:stack[0][1]].count('\n') + 1
        return f"Unclosed character '{stack[0][0]}' starting at line {line} in {filepath}"
        
    return None

def main():
    root_dir = r"C:\Users\USER\Desktop\Immo App\apps"
    errors = []
    for root, dirs, files in os.walk(root_dir):
        if "node_modules" in root or ".git" in root or "dist" in root:
            continue
        for file in files:
            if file.endswith(('.ts', '.tsx')):
                path = os.path.join(root, file)
                err = check_file_braces(path)
                if err:
                    errors.append(err)
                    
    if errors:
        print(f"Found {len(errors)} files with brace mismatches:")
        for e in errors:
            print(e)
    else:
        print("ALL TS/TSX FILES HAVE BALANCED BRACES!")

if __name__ == "__main__":
    main()
