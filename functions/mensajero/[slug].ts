import type {Env} from '../../src/core/env';
import {ApiError} from '../../src/core/env';
import {publicProfile} from '../../src/modules/directory';
import {profileHTML} from '../../src/public/profile-html';
import {rateLimit} from '../../src/core/rate-limit';
export const onRequestGet:PagesFunction<Env>=async({params,env,request})=>{
 const headers={'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; img-src 'self' https://orqskfecwtroppqimhnj.supabase.co; object-src 'none'; base-uri 'self'; form-action 'self'"};
 try{
  const slug=String(params.slug);
  if(!/^[a-z0-9-]{1,80}$/.test(slug))throw new ApiError('NOT_FOUND',404);
  await rateLimit(env,request.headers.get('CF-Connecting-IP')??'local');
  const profile=await publicProfile(env,slug);
  return new Response(profileHTML(profile,env.SUPABASE_URL),{headers});
 }catch(error){
  const status=error instanceof ApiError?error.status:503;
  return new Response('<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Perfil no disponible · MenRut</title><link rel="stylesheet" href="/profile.css"><main><h1>Perfil no disponible</h1><p>El perfil puede estar oculto, haber vencido o no existir.</p><a href="/">Volver a MenRut</a></main></html>',{status,headers});
 }
};
