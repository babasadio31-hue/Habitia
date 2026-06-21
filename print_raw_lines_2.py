with open(r'c:\Users\USER\Desktop\Immo App\preview.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i in range(208, 235):
    print(f"Line {i+1}: {repr(lines[i])}")
