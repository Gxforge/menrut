from pathlib import Path
root=Path(__file__).resolve().parents[1]
excluded={'.git','node_modules','.dart_tool','build','.wrangler'}
bad=[]
for p in root.rglob('*'):
 if any(x in excluded for x in p.parts) or not p.is_file():continue
 if p.suffix in {'.ts','.dart','.sql','.py'}:
  n=len(p.read_text().splitlines())
  if n>300:bad.append(f'{p.relative_to(root)}: {n}')
if bad:raise SystemExit('\n'.join(bad))
print('OK: fuentes <=300 líneas')
