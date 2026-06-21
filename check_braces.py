import re

with open(r'c:\Users\USER\Desktop\Immo App\preview.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Get the script block starting at line 179
# We can find the start index of the second '<script>' tag and check from there.
script_starts = [m.start() for m in re.finditer(r'<script>', html)]
if len(script_starts) < 2:
    print("Could not find the core script block")
    exit()

core_script_start = script_starts[1]
script_end = html.find('</script>', core_script_start)
script = html[core_script_start:script_end]

# Check braces, parentheses and brackets balance
stack = []
mapping = {')': '(', '}': '{', ']': '['}
lines = script.split('\n')

in_string = False
string_char = None
escaped = False

for line_idx, line in enumerate(lines, 1):
    i = 0
    while i < len(line):
        char = line[i]
        if escaped:
            escaped = False
            i += 1
            continue
        
        if char == '\\':
            escaped = True
            i += 1
            continue
        
        if in_string:
            if char == string_char:
                in_string = False
                string_char = None
            i += 1
            continue
        
        if char in ['"', "'", '`']:
            in_string = True
            string_char = char
            i += 1
            continue
        
        if char in ['(', '{', '[']:
            stack.append((char, line_idx, i, line))
        elif char in [')', '}', ']']:
            if not stack:
                print(f"Extra closing character '{char}' on line {line_idx} column {i}: {line}")
            else:
                top, top_line, top_col, top_text = stack.pop()
                if top != mapping[char]:
                    print(f"Mismatched closing character '{char}' on line {line_idx} column {i} (matches '{top}' on line {top_line} column {top_col})")
                    print(f"Opening line: {top_text}")
                    print(f"Closing line: {line}")
        i += 1

if stack:
    print(f"Unclosed opening characters: {len(stack)}")
    for item in stack[:5]:
        print(f"Character '{item[0]}' on line {item[1]}: {item[3].strip()}")
else:
    print("All brackets, braces and parentheses are balanced!")
