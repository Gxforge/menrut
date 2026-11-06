import {useEffect,useState,lazy,Suspense} from 'react';
import type {Session} from '@supabase/supabase-js';
import {supabase} from '../lib/auth';
import {Icon} from '../components/Icons';
const Dashboard=lazy(()=>import('./Dashboard'));
type Mode='login'|'register'|'recover'|'password';
export default function Account(){
 const [session,setSession]=useState<Session|null>(null),[ready,setReady]=useState(false);
 const [mode,setMode]=useState<Mode>(new URLSearchParams(location.search).has('registro')?'register':'login');
 const [busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[error,setError]=useState('');
 useEffect(()=>{
  supabase.auth.getSession().then(({data,error})=>{if(error)setError('No se pudo recuperar la sesión.');setSession(data.session);setReady(true);});
  const {data}=supabase.auth.onAuthStateChange((event,next)=>{setSession(next);if(event==='PASSWORD_RECOVERY')setMode('password');});
  return()=>data.subscription.unsubscribe();
 },[]);
 async function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();const form=new FormData(e.currentTarget);const email=String(form.get('email')||'').trim(),password=String(form.get('password')||'');
  setBusy(true);setError('');setNotice('');
  try{
   if(mode==='login'){const {error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error;}
   if(mode==='register'){const {error}=await supabase.auth.signUp({email,password,options:{emailRedirectTo:`${location.origin}/cuenta`}});if(error)throw error;setNotice('Revisa tu correo para confirmar la cuenta. La confirmación depende de la entrega de correo de Supabase.');}
   if(mode==='recover'){const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:`${location.origin}/cuenta`});if(error)throw error;setNotice('Si la cuenta existe y el envío está disponible, recibirás un enlace de recuperación.');}
   if(mode==='password'){const {error}=await supabase.auth.updateUser({password});if(error)throw error;setNotice('Contraseña actualizada.');setMode('login');}
  }catch{setError(mode==='login'?'No se pudo iniciar sesión. Revisa tus datos, la confirmación de correo y tu conexión.':'No se pudo completar la solicitud. Revisa los datos o inténtalo más tarde.');}
  finally{setBusy(false);}
 }
 if(!ready)return <div className="page wrap" role="status">Comprobando tu sesión…</div>;
 if(session&&mode!=='password')return <Suspense fallback={<div className="page wrap">Cargando tu espacio…</div>}><Dashboard email={session.user.email??''}/></Suspense>;
 return <div className="auth-layout wrap"><aside><p className="eyebrow">BIENVENIDO A MENRUT</p><h1>Un espacio para<br/>abrir caminos.</h1><p>Gestiona tu perfil, conserva tu información y conecta con nuevas oportunidades.</p><div className="auth-benefit"><Icon name="shield"/><span>Tu sesión se gestiona con Supabase Auth.<br/>Nunca te pediremos contraseñas por WhatsApp.</span></div><img src="/brand/icon.webp" width="128" height="128" alt="Icono MenRut"/></aside><section className="auth-card"><p className="eyebrow">TU CUENTA</p><h2>{mode==='login'?'Qué bueno verte.':mode==='register'?'Tu camino empieza aquí.':mode==='password'?'Una nueva contraseña.':'Recupera tu acceso.'}</h2><p>{mode==='register'?'Crea una sola cuenta para buscar y ofrecer servicios.':'Continúa con tu correo electrónico.'}</p><p className="form-note">Acceso conectado a Supabase. El envío de confirmaciones y recuperación para el público requiere configurar SMTP; el servicio de correo predeterminado es solo para pruebas autorizadas.</p><form onSubmit={submit}>{mode!=='password'&&<label>Correo electrónico<input name="email" type="email" autoComplete="email" required maxLength={254}/></label>}{mode!=='recover'&&<label>Contraseña<input name="password" type="password" autoComplete={mode==='login'?'current-password':'new-password'} minLength={8} maxLength={128} required/></label>}{mode==='register'&&<p className="form-note">Registro no equivale a visibilidad pública. La prueba gratuita requiere verificar una identidad estable; la alternativa administrada está pendiente.</p>}<button className="button full" disabled={busy}>{busy?'Enviando…':mode==='login'?'Iniciar sesión':mode==='register'?'Crear cuenta':mode==='password'?'Guardar contraseña':'Enviar instrucciones'}<Icon name="arrow" size={18}/></button></form>{error&&<p className="feedback error" role="alert">{error}</p>}{notice&&<p className="feedback" role="status">{notice}</p>}<div className="auth-switch">{mode==='login'?<><button onClick={()=>{setMode('recover');setError('');}}>Olvidé mi contraseña</button><p>¿Aún no tienes cuenta? <button onClick={()=>{setMode('register');setError('');}}>Regístrate</button></p></>:<button onClick={()=>{setMode('login');setError('');}}>Volver a iniciar sesión</button>}</div></section></div>;
}
