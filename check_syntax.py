import re

with open(r'c:\Users\USER\Desktop\Immo App\preview.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Extract script block
script_match = re.search(r'<script>(.*?)</script>', html, re.DOTALL)
if not script_match:
    print("No script block found")
    exit()

script_content = script_match.group(1)

# Let's search for double quoted strings that span multiple lines
# We can find all double quotes and check if they span multiple lines without backslash escape.
lines = script_content.split('\n')
in_string = False
string_char = None
string_lines = []

for i, line in enumerate(lines, 1):
    # This is a very simple parser to check for unclosed strings
    # We can just count the number of quotes on each line
    # If the line ends and we are in a double-quoted or single-quoted string, and there is no trailing backslash, it's a syntax error!
    stripped = line.strip()
    # Let's check for double quotes and single quotes, ignoring escaped ones
    # But template literals (backticks) are allowed to span multiple lines.
    # Let's check if there are unescaped newlines in double/single quoted strings.
    # We can do this by searching for strings using regex.
    pass

# A simpler check: let's look for '"' followed by text and newlines
# JavaScript string literal regex: "([^"\\]|\\.)*"
# Let's write a python script that attempts to find any multi-line double quoted strings
matches = re.finditer(r'"[^"\\]*(?:\\.[^"\\]*)*"', script_content)
# Let's find any literal newlines inside double quotes or single quotes
# Double quote multi-line search:
multiline_double = re.findall(r'"[^"]*\n[^"]*"', script_content)
if multiline_double:
    print(f"Found {len(multiline_double)} multiline double-quoted strings:")
    for m in multiline_double:
        print("---")
        print(m)
        print("---")
else:
    print("No multiline double-quoted strings found")

# Single quote multi-line search:
multiline_single = re.findall(r"'[^']*\n[^']*'", script_content)
if multiline_single:
    print(f"Found {len(multiline_single)} multiline single-quoted strings:")
    for m in multiline_single:
        print("---")
        print(m)
        print("---")
else:
    print("No multiline single-quoted strings found")
