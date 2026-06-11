import xml.etree.ElementTree as ET

tree = ET.parse(r'd:\mychaniug\Chaniug\img\valkjin.svg')
root = tree.getroot()

ns = {'svg': 'http://www.w3.org/2000/svg'}

paths = root.findall('.//svg:path', ns)
if not paths:
    paths = root.findall('.//path')

print(f'Total paths: {len(paths)}')
print()

for i, path in enumerate(paths):
    d = path.get('d', '')[:80]
    style = path.get('style', '')
    # Try to estimate start point from d attribute
    parts = d.replace(',', ' ').split()
    start_x = parts[0] if parts else '?'
    start_y = parts[1] if len(parts) > 1 else '?'
    print(f'Path {i}: start=({start_x}, {start_y}) style={style[:50]}')
    print(f'  d={d}...')
    print()
