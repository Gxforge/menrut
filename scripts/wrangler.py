"""Load local secrets without printing them or embedding them in command arguments."""
import os,sys,subprocess,json
from pathlib import Path
root=Path(__file__).resolve().parents[1]
env=os.environ.copy()
local_node=Path('/home/user/tools/runtime/node_modules/node/bin')
if local_node.exists():env['PATH']=str(local_node)+':'+env['PATH']
for line in (root/'.env').read_text().splitlines():
 if '=' in line:
  k,v=line.split('=',1);env[k]=v
state=root/'.infrastructure.json'
if state.exists():env['CLOUDFLARE_ACCOUNT_ID']=json.loads(state.read_text())['account_id']
raise SystemExit(subprocess.call(['npx','wrangler',*sys.argv[1:]],env=env,cwd=root))
