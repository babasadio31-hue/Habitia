with open(r'c:\Users\USER\Desktop\Immo App\preview.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Print lines around 949 (1-indexed, so index 948)
# We also print the representation (repr) to see raw characters and newlines!
for i in range(945, 958):
    print(f"Line {i+1}: {repr(lines[i])}")
