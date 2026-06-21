with open(r'c:\Users\USER\Desktop\Immo App\preview.html', 'r', encoding='utf-8') as f:
    html = f.read()

script_starts = [m.start() for m in re.finditer(r'<script>', html)] if 're' in globals() else []
if not script_starts:
    import re
    script_starts = [m.start() for m in re.finditer(r'<script>', html)]

core_script_start = script_starts[1]
script_end = html.find('</script>', core_script_start)
script = html[core_script_start:script_end]

# We will loop through the raw script string directly.
# This ensures that indices correspond exactly to offsets in the original script!
n = len(script)
check_stack = []
mapping = {')': '(', '}': '{', ']': '['}

in_string = False
string_char = None
escaped = False
in_comment = False
comment_type = None # 'single' or 'multi'

# We track nested template literal placeholders ${ }
# Each entry in this stack is the brace nesting level at which the placeholder was opened.
template_placeholders = []
brace_level = 0

def get_line_col(pos):
    # pos is offset in script. Let's find line index in the original preview.html
    absolute_pos = core_script_start + pos
    snippet = html[:absolute_pos]
    line_num = snippet.count('\n') + 1
    col_num = absolute_pos - snippet.rfind('\n') if snippet.rfind('\n') != -1 else absolute_pos
    return line_num, col_num

i = 0
while i < n:
    char = script[i]
    
    if escaped:
        escaped = False
        i += 1
        continue
        
    if in_comment:
        if comment_type == 'single' and char == '\n':
            in_comment = False
            comment_type = None
        elif comment_type == 'multi' and char == '*' and i + 1 < n and script[i+1] == '/':
            in_comment = False
            comment_type = None
            i += 2
            continue
        i += 1
        continue

    if in_string:
        if char == '\\':
            escaped = True
            i += 1
            continue
        if string_char == '`':
            # Check for placeholder start ${
            if char == '$' and i + 1 < n and script[i+1] == '{':
                template_placeholders.append(brace_level)
                # Enter placeholder expression
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

    # Normal JS logic
    if char == '/' and i + 1 < n and script[i+1] == '/':
        in_comment = True
        comment_type = 'single'
        i += 2
        continue
    elif char == '/' and i + 1 < n and script[i+1] == '*':
        in_comment = True
        comment_type = 'multi'
        i += 2
        continue

    if char in ['"', "'", '`']:
        in_string = True
        string_char = char
        i += 1
        continue

    # Track brace level to know when a placeholder closes
    if char == '{':
        brace_level += 1
        check_stack.append((char, i))
    elif char == '}':
        # Check if this closes a template placeholder
        if template_placeholders and (brace_level - 1) < template_placeholders[-1]:
            # This } closes the template placeholder!
            brace_level = template_placeholders.pop()
            in_string = True
            string_char = '`'
            i += 1
            continue
        
        brace_level -= 1
        
        # Regular closing brace
        if not check_stack:
            line_num, col = get_line_col(i)
            print(f"Extra closing character '{char}' at line {line_num} col {col}: {script[max(0, i-20):i+20].strip()}")
        else:
            top, top_pos = check_stack.pop()
            if top != '{':
                line_num, col = get_line_col(i)
                top_line, top_col = get_line_col(top_pos)
                print(f"Mismatched closing character '{char}' at line {line_num} col {col} (matches '{top}' at line {top_line} col {top_col})")
    elif char in ['(', '[']:
        check_stack.append((char, i))
    elif char in [')', ']']:
        if not check_stack:
            line_num, col = get_line_col(i)
            print(f"Extra closing character '{char}' at line {line_num} col {col}: {script[max(0, i-20):i+20].strip()}")
        else:
            top, top_pos = check_stack.pop()
            if top != mapping[char]:
                line_num, col = get_line_col(i)
                top_line, top_col = get_line_col(top_pos)
                print(f"Mismatched closing character '{char}' at line {line_num} col {col} (matches '{top}' at line {top_line} col {top_col})")
                print(f"  Opening: {script[top_pos-10:top_pos+20].strip()}")
                print(f"  Closing: {script[i-10:i+20].strip()}")
    i += 1

if check_stack:
    print(f"Unclosed opening characters: {len(check_stack)}")
    for item in check_stack[:5]:
        line_num, col = get_line_col(item[1])
        print(f"Character '{item[0]}' at line {line_num} col {col}: {script[item[1]:item[1]+40].strip().replace('\n', ' ')}")
else:
    print("ALL BRACKETS AND BRACES ARE BALANCED!")
