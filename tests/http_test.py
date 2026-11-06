"""Smoke tests against local Wrangler only. Run while Pages dev is listening."""
import json,urllib.request,urllib.error,unittest
BASE='http://127.0.0.1:8788'
def request(path,headers=None,method='GET',data=None):
 req=urllib.request.Request(BASE+'/api/v1'+path,headers=headers or {},method=method,data=data)
 try:
  with urllib.request.urlopen(req,timeout=10) as r:return r.status,json.load(r)
 except urllib.error.HTTPError as e:return e.code,json.load(e)
class HttpTests(unittest.TestCase):
 def test_health(self):self.assertEqual(request('/health')[1]['data']['service'],'MenRut')
 def test_directory_empty_not_fake(self):self.assertEqual(request('/directory')[1]['data']['items'],[])
 def test_cursor_limit(self):self.assertEqual(request('/directory?limit=10000')[0],400)
 def test_unauthed(self):self.assertEqual(request('/credits/wallets')[0],401)
 def test_cors(self):self.assertEqual(request('/health',{'Origin':'https://evil.example'})[0],403)
 def test_plans_draft(self):self.assertEqual(request('/membership/plans')[1]['data'],[])
 def test_private_post_size(self):self.assertEqual(request('/onboarding/courier',{'Content-Type':'application/json'},'POST',b' '*17000)[0],413)
 def test_no_public_profile(self):self.assertEqual(request('/couriers/nonexistent')[0],404)
if __name__=='__main__':unittest.main()
