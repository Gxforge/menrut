import {route} from '../../../src/router';
import {ApiError,type Env} from '../../../src/core/env';
export const onRequest:PagesFunction<Env>=async ({request,env})=>{
 let apiRequest:Request=request;
 const requestId=crypto.randomUUID(),origin=request.headers.get('Origin');
 const sameOrigin=origin===new URL(request.url).origin;
 const originAllowed=!!origin&&(sameOrigin||origin===env.ALLOWED_ORIGIN);
 const headers:Record<string,string>={'Content-Type':'application/json; charset=utf-8',
 'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Request-Id':requestId,'Vary':'Origin'};
 if(originAllowed) {
  headers['Access-Control-Allow-Origin']=origin!;
  headers['Access-Control-Allow-Headers']='Authorization, Content-Type, Idempotency-Key';
  headers['Access-Control-Allow-Methods']='GET, POST, PUT, DELETE, OPTIONS';
 }
 try {
  if(origin && !originAllowed) throw new ApiError('FORBIDDEN',403);
  if(request.method==='OPTIONS') return new Response(null,{status:204,headers});
  if(!['GET','HEAD'].includes(request.method)) {
   if(!request.headers.get('Content-Type')?.startsWith('application/json')) throw new ApiError('VALIDATION_ERROR',415);
   // Read the stream with an enforced bound, including chunked requests.
   const reader=request.body?.getReader();let size=0;const parts:Uint8Array[]=[];
   if(reader) while(true) {const r=await reader.read();if(r.done) break;size+=r.value.byteLength;if(size>16384) {await reader.cancel();throw new ApiError('PAYLOAD_TOO_LARGE',413);}parts.push(r.value);}
   const bytes=new Uint8Array(size);let offset=0;for(const p of parts){bytes.set(p,offset);offset+=p.length;}
   apiRequest=new Request(request.url,{method:request.method,headers:request.headers,body:bytes});
  }
  return new Response(JSON.stringify({data:await route(apiRequest,env),request_id:requestId}),{headers});
 } catch(error) {
  const e=error instanceof ApiError?error:new ApiError(error instanceof SyntaxError?'VALIDATION_ERROR':'INTERNAL_ERROR',error instanceof SyntaxError?400:500);
  return new Response(JSON.stringify({error:{code:e.code},request_id:requestId}),{status:e.status,headers});
 }
};
