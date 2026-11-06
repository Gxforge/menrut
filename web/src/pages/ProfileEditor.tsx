import {useState,useEffect} from 'react';
import {api,message} from '../lib/api';
import {supabase} from '../lib/auth';
import type {Courier,Location} from '../lib/types';
import {Icon} from '../components/Icons';
export default function ProfileEditor({profile,onSaved}:{profile:Courier;onSaved:(p:Courier)=>void}){
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [provinces,setProvinces]=useState<Location[]>([]),[municipalities,setMunicipalities]=useState<Location[]>([]);
 const [province,setProvince]=useState(profile.province_id??'');
 useEffect(()=>{api<Location[]>('/locations/provinces').then(setProvinces).catch(()=>{});},[]);
 useEffect(()=>{setMunicipalities([]);if(province)api<Location[]>(`/locations/municipalities?province=${province}`).then(setMunicipalities).catch(()=>{});},[province]);
 async function save(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();const data=new FormData(e.currentTarget);setBusy(true);setError('');setNotice('');
  const update={name:String(data.get('name')),description:String(data.get('description')),province_id:province||null,municipality_id:data.get('municipality')||null,available:data.has('available'),public_phone:data.has('public_phone'),contact_phone:String(data.get('contact_phone')||'')||null};
  try{const result=await api<{sync:string}>('/courier/profile',{method:'PUT',body:JSON.stringify(update)});const p=await api<Courier>('/courier/profile');onSaved(p);setNotice(result.sync==='pending'?'Guardado. La actualización del directorio está pendiente; puedes reintentar la sincronización.':'Guardado y sincronizado.');}catch(e){setError(message(e));}finally{setBusy(false);}
 }
 async function upload(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();const form=e.currentTarget,data=new FormData(form),file=data.get('photo') as File;
  if(!file?.size)return;setBusy(true);setError('');setNotice('');let path='';
  try{
   if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>2*1024*1024)throw new Error('Formato o tamaño inválido');
   const bitmap=await createImageBitmap(file);const canvas=document.createElement('canvas');const scale=Math.min(1,600/Math.max(bitmap.width,bitmap.height));canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d')!.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
   const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error()),'image/webp',0.8));
   if(blob.size>512000)throw new Error('Imagen demasiado grande');
   const {data:{user}}=await supabase.auth.getUser();if(!user)throw new Error('Sin sesión');
   path=`${user.id}/avatar/${crypto.randomUUID()}.webp`;
   const {error:storageError}=await supabase.storage.from('courier-public').upload(path,blob,{contentType:'image/webp',cacheControl:'3600',upsert:false});if(storageError)throw storageError;
   const result=await api<{sync:string}>('/courier/photo',{method:'PUT',body:JSON.stringify({path,consent:true})});
   const p=await api<Courier>('/courier/profile');onSaved(p);setNotice(result.sync==='pending'?'Fotografía guardada; sincronización del directorio pendiente.':'Fotografía pública guardada.');form.reset();
  }catch(e){setError('No se confirmó la publicación. Revisa la conexión y vuelve a consultar tu perfil antes de reintentar. Si la imagen llegó a subirse, no la eliminamos automáticamente para evitar borrar una publicación ya guardada. Usa JPG, PNG o WebP de hasta 2 MB.');}finally{setBusy(false);}
 }
 return <><form className="panel editor" onSubmit={save}><h2>Tu presentación profesional</h2><label>Nombre público<input name="name" required minLength={2} maxLength={80} defaultValue={profile.name}/></label><label>Descripción<textarea name="description" rows={4} maxLength={1200} defaultValue={profile.description}/></label><div className="form-grid"><label>Provincia<select value={province} onChange={e=>setProvince(e.target.value)}><option value="">Sin seleccionar</option>{provinces.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label>Municipio<select name="municipality" key={province} defaultValue={profile.municipality_id??''}><option value="">Sin seleccionar</option>{municipalities.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label></div>{!provinces.length&&<p className="form-note">El catálogo geográfico está pendiente de verificación oficial.</p>}<label>Teléfono de contacto<input name="contact_phone" type="tel" maxLength={24} defaultValue={profile.contact_phone??''}/></label><label className="checkbox"><input type="checkbox" name="public_phone" defaultChecked={profile.public_phone===1}/> Mostrar mi teléfono en el perfil público</label><label className="checkbox"><input type="checkbox" name="available" defaultChecked={profile.available===1}/> Estoy disponible para contactos</label><button className="button" disabled={busy}>{busy?'Guardando…':'Guardar perfil'}<Icon name="check"/></button></form>
 <form className="panel editor" onSubmit={upload}><h2>Fotografía pública</h2>{profile.photo_path&&<img className="profile-photo" alt="Tu fotografía pública" width="96" height="96" src={`${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/courier-public/${profile.photo_path}`}/>}<p>La imagen se optimiza antes de subirla. No publiques comprobantes ni documentos privados aquí.</p><label>Selecciona una fotografía<input type="file" name="photo" accept="image/jpeg,image/png,image/webp" required/></label><label className="checkbox"><input type="checkbox" required/> Autorizo publicar esta imagen en Internet. Entiendo que será accesible por su URL incluso si mi perfil vence.</label><button className="button secondary" disabled={busy}>{busy?'Publicando…':'Publicar fotografía'}</button></form>{error&&<p className="feedback error" role="alert">{error}</p>}{notice&&<p className="feedback" role="status">{notice}</p>}</>;
}
