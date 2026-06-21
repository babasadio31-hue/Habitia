import re

with open(r'c:\Users\USER\Desktop\Immo App\preview.html', 'r', encoding='utf-8') as f:
    html = f.read()

script_starts = [m.start() for m in re.finditer(r'<script>', html)]
core_script_start = script_starts[1]
script_end = html.find('</script>', core_script_start)
script = html[core_script_start:script_end]

# Strip multiline comments /* ... */
script = re.sub(r'/\*.*?\*/', '', script, flags=re.DOTALL)
# Strip single line comments // ...
script = re.sub(r'//.*', '', script)

i = 0
n = len(script)
clean_js = []
stack = []

in_string = False
string_char = None
escaped = False

while i < n:
    char = script[i]
    if escaped:
        escaped = False
        i += 1
        continue
    if char == '\\':
        escaped = True
        i += 1
        continue
    if in_string:
        if string_char == '`':
            if char == '$' and i + 1 < n and script[i+1] == '{':
                stack.append('template_placeholder')
                clean_js.append('${')
                in_string = False
                string_char = None
                i += 2
                continue
            elif char == '`':
                in_string = False
                string_char = None
        else:
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
    if char == '}' and stack and stack[-1] == 'template_placeholder':
        stack.pop()
        in_string = True
        string_char = '`'
        clean_js.append('}')
        i += 1
        continue
    clean_js.append(char)
    i += 1

clean_js_str = "".join(clean_js)

# Perform checks and print mismatches with raw script line numbers!
# To do this, we need to map clean_js positions back to raw script lines!
# Let's map each index in clean_js_str back to the original index in the raw script!
# Let's write the mapping generator:
i = 0
clean_to_raw = []
stack = []
in_string = False
string_char = None
escaped = False

while i < n:
    char = script[i]
    raw_pos = i
    if escaped:
        escaped = False
        i += 1
        continue
    if char == '\\':
        escaped = True
        i += 1
        continue
    if in_string:
        if string_char == '`':
            if char == '$' and i + 1 < n and script[i+1] == '{':
                stack.append('template_placeholder')
                clean_to_raw.append(raw_pos) # for $
                clean_to_raw.append(raw_pos+1) # for {
                in_string = False
                string_char = None
                i += 2
                continue
            elif char == '`':
                in_string = False
                string_char = None
        else:
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
    if char == '}' and stack and stack[-1] == 'template_placeholder':
        stack.pop()
        in_string = True
        string_char = '`'
        clean_to_raw.append(raw_pos)
        i += 1
        continue
    clean_to_raw.append(raw_pos)
    i += 1

# Check balance and map mismatch back to raw script line/col
check_stack = []
mapping = {')': '(', '}': '{', ']': '['}

# Helper to find line/col in raw script
def get_line_col(pos):
    # pos is offset in script. Let's find line index
    snippet = script[:pos]
    line_num = snippet.count('\n') + 180 # script starts on line 180
    col_num = pos - snippet.rfind('\n') if snippet.rfind('\n') != -1 else pos
    return line_num, col_num

for char_idx, char in enumerate(clean_js_str):
    raw_idx = clean_to_raw[char_idx]
    if char in ['(', '{', '[']:
        check_stack.append((char, raw_idx))
    elif char in [')', '}', ']']:
        if not check_stack:
            line_num, col = get_line_col(raw_idx)
            print(f"Extra closing character '{char}' at line {line_num} col {col}: {script[raw_idx-10:raw_idx+10]}")
        else:
            top, top_raw_idx = check_stack.pop()
            if top != mapping[char]:
                line_num, col = get_line_col(raw_idx)
                top_line, top_col = get_line_col(top_raw_idx)
                print(f"Mismatched closing character '{char}' at line {line_num} col {col} (matches '{top}' at line {top_line} col {top_col})")
                print(f"  Opening context: {script[max(0, top_raw_idx-15):top_raw_idx+15].strip()}")
                print(f"  Closing context: {script[max(0, raw_idx-15):raw_idx+15].strip()}")

if check_stack:
    print(f"Unclosed opening characters: {len(check_stack)}")
    for item in check_stack[:5]:
        line_num, col = get_line_col(item[1])
        print(f"Character '{item[0]}' at line {line_num} col {col}: {script[item[1]:item[1]+40].strip().replace('\n', ' ')}")
