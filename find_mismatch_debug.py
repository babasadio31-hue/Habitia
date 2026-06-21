with open(r'c:\Users\USER\Desktop\Immo App\preview.html', 'r', encoding='utf-8') as f:
    html = f.read()

import re
script_starts = [m.start() for m in re.finditer(r'<script>', html)]
core_script_start = script_starts[1]
script_end = html.find('</script>', core_script_start)
script = html[core_script_start:script_end]

n = len(script)
check_stack = []
mapping = {')': '(', '}': '{', ']': '['}

in_string = False
string_char = None
escaped = False
in_comment = False
comment_type = None

template_placeholders = []
brace_level = 0

def get_line_col(pos):
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
            if char == '$' and i + 1 < n and script[i+1] == '{':
                template_placeholders.append(brace_level)
                in_string = False
                string_char = None
                i += 2
                # Print debug for placeholders in renderWithdrawTab
                line_num, col = get_line_col(i)
                if line_num >= 1190 and line_num <= 1430:
                    print(f"[{line_num}:{col}] PUSH placeholder (brace_level={brace_level})")
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

    # Debug operations in renderWithdrawTab (lines 1190 to 1430)
    line_num, col = get_line_col(i)
    is_debug_line = line_num >= 1190 and line_num <= 1430

    if char == '{':
        brace_level += 1
        check_stack.append((char, i))
        if is_debug_line:
            print(f"[{line_num}:{col}] PUSH '{char}' (brace_level={brace_level})")
    elif char == '}':
        brace_level -= 1
        if template_placeholders and brace_level < template_placeholders[-1]:
            template_placeholders.pop()
            in_string = True
            string_char = '`'
            if is_debug_line:
                print(f"[{line_num}:{col}] POP placeholder (brace_level={brace_level})")
            i += 1
            continue
        
        if not check_stack:
            if is_debug_line:
                print(f"[{line_num}:{col}] EXTRA closing '{char}'")
        else:
            top, top_pos = check_stack.pop()
            if is_debug_line:
                top_line, top_col = get_line_col(top_pos)
                print(f"[{line_num}:{col}] POP '{char}' matching '{top}' from {top_line}:{top_col} (brace_level={brace_level})")
    elif char in ['(', '[']:
        check_stack.append((char, i))
        if is_debug_line:
            print(f"[{line_num}:{col}] PUSH '{char}'")
    elif char in [')', ']']:
        if not check_stack:
            if is_debug_line:
                print(f"[{line_num}:{col}] EXTRA closing '{char}'")
        else:
            top, top_pos = check_stack.pop()
            if is_debug_line:
                top_line, top_col = get_line_col(top_pos)
                print(f"[{line_num}:{col}] POP '{char}' matching '{top}' from {top_line}:{top_col}")
    i += 1
