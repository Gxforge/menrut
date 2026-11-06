import {useEffect,useState} from 'react';
import {api,message} from '../lib/api';
import type {Courier} from '../lib/types';
import {Icon} from '../components/Icons';
import {Notice} from '../components/Layout';
export default function Profile({slug}:{slug:string}){
 const [profile,setProfile]=useState<Courier|null>(null),[error,setError]=useState('');
 useEffect(()=>{const ctrl=new AbortController();api<Courier>(`/couriers/${encodeURIComponent(slug)}`,{signal:ctrl.signal}).then(p=>{setProfile(p);document.title=`${p.name} · MenRut`;}).catch(e=>{if(!ctrl.signal.aborted)setError(message(e));});return()=>ctrl.abort();},[slug]);
 return <section className="wrap page"><a className="text-link" href="/#buscar">← Volver al directorio</a>{error?<Notice title="Perfil no disponible" error><p>{error}</p></Notice>:!profile?<p role="status">Cargando el perfil…</p>:<article className="public-profile"><span className="eyebrow">PERFIL PROFESIONAL</span><span className="avatar large">{profile.name.slice(0,1)}</span><h1>{profile.name}</h1><span className="availability">{profile.available?'Disponible':'No disponible'}</span><p>{profile.description||'Este mensajero aún no ha añadido una descripción.'}</p>{profile.contact_phone?<><h2>Conecta directamente</h2><p>{profile.contact_phone}</p><a className="button" href={`tel:${profile.contact_phone.replace(/[^+\d]/g,'')}`}><Icon name="user"/>Llamar al mensajero</a></>:<p>El mensajero no ha publicado un teléfono de contacto.</p>}<p className="form-note">Acuerda precios, disponibilidad y detalles directamente. MenRut no realiza asignación automática ni seguimiento GPS.</p></article>}</section>;
}
