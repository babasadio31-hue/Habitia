import re

with open(r'c:\Users\USER\Desktop\Immo App\preview.html', 'r', encoding='utf-8') as f:
    html = f.read()

script_starts = [m.start() for m in re.finditer(r'<script>', html)]
if len(script_starts) < 2:
    print("Could not find the core script block")
    exit()

core_script_start = script_starts[1]
script_end = html.find('</script>', core_script_start)
script = html[core_script_start:script_end]

# Strip multiline comments /* ... */
script = re.sub(r'/\*.*?\*/', '', script, flags=re.DOTALL)
# Strip single line comments // ...
script = re.sub(r'//.*', '', script)

# A robust parser that handles strings (single, double, backticks) correctly, including escapes
# We want to keep curly braces and parens that are NOT inside strings.
# But template literals can contain expressions ${...} which contain curly braces!
# So we need to keep the curly braces that are inside ${...}!
# A full JS parser is best simulated by tracking template literal state and ${} nesting level.

i = 0
n = len(script)
clean_js = []
stack = [] # tracks template literal nested placeholders ${ }

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
            # Check if this is the start of a placeholder ${
            if char == '$' and i + 1 < n and script[i+1] == '{':
                # We entered a placeholder expression inside a template literal!
                # We suspend the string state, but keep track of it in stack.
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

    # Not in string
    if char in ['"', "'", '`']:
        in_string = True
        string_char = char
        i += 1
        continue
    
    # Check if we are inside a template placeholder and see a closing }
    if char == '}' and stack and stack[-1] == 'template_placeholder':
        # This closes the placeholder expression, we go back to template string state!
        stack.pop()
        in_string = True
        string_char = '`'
        clean_js.append('}')
        i += 1
        continue
        
    # Just standard JS character
    clean_js.append(char)
    i += 1

clean_js_str = "".join(clean_js)

# Now check brace balance on clean_js_str
check_stack = []
mapping = {')': '(', '}': '{', ']': '['}

for char_idx, char in enumerate(clean_js_str):
    if char in ['(', '{', '[']:
        check_stack.append((char, char_idx))
    elif char in [')', '}', ']']:
        if not check_stack:
            print(f"Extra closing character '{char}' at position {char_idx}")
        else:
            top, top_idx = check_stack.pop()
            if top != mapping[char]:
                print(f"Mismatched closing character '{char}' at position {char_idx} (matches '{top}' at position {top_idx})")

if check_stack:
    print(f"Unclosed opening characters in clean JS: {len(check_stack)}")
    for item in check_stack[:5]:
        start = max(0, item[1]-20)
        end = min(len(clean_js_str), item[1]+50)
        snippet = clean_js_str[start:end].replace('\n', ' ')
        print(f"Character '{item[0]}' at position {item[1]}: ... {snippet} ...")
else:
    print("JavaScript code is syntactically balanced!")
