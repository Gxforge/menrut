"""Fail validation if initial JS/CSS regress past the slow-network budget."""
import gzip,re
from pathlib import Path
root=Path(__file__).resolve().parents[1]/'web/build'
html=(root/'index.html').read_text()
files=re.findall(r'(?:src|href)="(/assets/[^\"]+\.(?:js|css))"',html)
totals={'.js':0,'.css':0}
for name in files:
 p=root/name.lstrip('/');totals[p.suffix]+=len(gzip.compress(p.read_bytes()))
limits={'.js':95*1024,'.css':10*1024}
for ext,size in totals.items():
 print(f'Inicial {ext}: {size/1024:.1f} KiB gzip; límite {limits[ext]/1024:.0f} KiB')
 if size>limits[ext]:raise SystemExit('Presupuesto de transferencia inicial superado')
