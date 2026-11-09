import {useEffect,useState} from 'react';
import {api,message} from '../lib/api';
import {supabase} from '../lib/auth';
import {Icon} from '../components/Icons';
import type {Plan,PaymentSettings,PaymentRequest,Wallet} from '../lib/types';
import {priceCUP,monthsOf,statusLabel} from '../lib/types';
const durations=[1,3,6,12] as const;
export default function Payments({wallet,preselect,onWallet}:{wallet:Wallet|null;preselect?:string|null;onWallet:(w:Wallet)=>void;}){
 const [plans,setPlans]=useState<Plan[]>([]),[settings,setSettings]=useState<PaymentSettings|null>(null),[requests,setRequests]=useState<PaymentRequest[]>([]);
 const [months,setMonths]=useState<number>(1);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const open=requests.find(r=>['draft','pending','under_review'].includes(r.status))??null;
 async function load(){setError('');try{
  const [p,s,r,w]=await Promise.all([api<Plan[]>('/membership/plans'),api<PaymentSettings>('/payments/settings'),api<PaymentRequest[]>('/me/payments'),api<Wallet>('/credits/wallets')]);
  setPlans(p);setSettings(s);setRequests(r);onWallet(w);
  const pre=preselect?p.find(x=>x.id===preselect):null;
  if(pre)setMonths(monthsOf(pre.duration_days));
 }catch(e){setError(message(e));}}
 useEffect(()=>{void load();},[]);
 const active=!!wallet&&wallet.expires_at>Date.now()/1000;
 const remainingDays=wallet?Math.max(0,Math.ceil((wallet.expires_at-Date.now()/1000)/86400)):0;
 const currentPlan=plans.find(p=>p.id===wallet?.plan_id);
 const byLevel=[1,2,3].map(level=>({level,items:plans.filter(p=>p.level===level).sort((a,b)=>a.duration_days-b.duration_days)})).filter(g=>g.items.length);
 async function request(plan:Plan){
  setBusy(true);setError('');setNotice('');
  try{await api('/payments/requests',{method:'POST',body:JSON.stringify({plan_id:plan.id})});setNotice('Solicitud creada. Transfiere el importe y sube la captura para completarla.');await load();}
  catch(e){setError(message(e));}finally{setBusy(false);}
 }
 async function uploadProof(e:React.FormEvent<HTMLFormElement>,requestId:string){
  e.preventDefault();const data=new FormData(e.currentTarget),file=data.get('proof') as File;
  if(!file?.size)return;setBusy(true);setError('');setNotice('');
  try{
   if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>4*1024*1024)throw new Error('formato');
   const bitmap=await createImageBitmap(file);const canvas=document.createElement('canvas');
   const scale=Math.min(1,1280/Math.max(bitmap.width,bitmap.height));
   canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
   canvas.getContext('2d')!.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
   const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error()),'image/webp',0.82));
   if(blob.size>768000)throw new Error('tamaño');
   const {data:{user}}=await supabase.auth.getUser();if(!user)throw new Error('sesión');
   const path=`${user.id}/payments/${crypto.randomUUID()}.webp`;
   const {error:storageError}=await supabase.storage.from('courier-public').upload(path,blob,{contentType:'image/webp',cacheControl:'3600',upsert:false});
   if(storageError)throw storageError;
   await api(`/payments/requests/${requestId}/proof`,{method:'POST',body:JSON.stringify({proof_path:path,consent:true})});
   setNotice('Captura enviada. El propietario revisará el pago y activará tu plan.');(e.target as HTMLFormElement).reset();await load();
  }catch{setError('No se confirmó el envío. Usa una imagen JPG, PNG o WebP de hasta 4 MB (se comprime antes de subir). Revisa tu conexión y reintenta.');}
  finally{setBusy(false);}
 }
 async function cancel(id:string){
  setBusy(true);setError('');try{await api(`/payments/requests/${id}/cancel`,{method:'POST'});setNotice('Solicitud cancelada.');await load();}catch(e){setError(message(e));}finally{setBusy(false);}
 }
 return <div className="payments">
  {error&&<p className="feedback error" role="alert">{error}</p>}
  {notice&&<p className="feedback" role="status">{notice}</p>}
  <div className="wallet-grid">
   <article className="wallet-card"><Icon name="clock"/><p>PLAN ACTUAL</p><strong>{currentPlan?currentPlan.name:active?'Activo':'Sin plan'}</strong><span>{active?`Vigencia: ${remainingDays} día${remainingDays===1?'':'s'} restantes`:'Tu perfil no es visible sin permanencia vigente'}</span></article>
   <article className="wallet-card"><Icon name="shield"/><p>RENOVACIÓN</p><strong>Acumulativa</strong><span>Si pagas antes de vencer, los días restantes se suman al nuevo período</span></article>
  </div>
  {open?<>
   <div className="panel pay-open">
    <span className={`pay-status ${open.status}`}>{statusLabel[open.status]??open.status}</span>
    <h2>{open.plan_name} · {monthsOf(open.duration_days)===1?'1 mes':`${monthsOf(open.duration_days)} meses`} · {priceCUP(open.price_minor)} CUP</h2>
    {open.status==='draft'?<>
     <div className="pay-instructions">
      <h3><Icon name="shield" size={18}/> Paga por {settings?.method??'Transfermóvil'}</h3>
      <p className="pay-card-number">{settings?.card}</p>
      <p>Teléfono de confirmación: <strong>{settings?.phone}</strong></p>
      <p className="form-note">{settings?.note}</p>
     </div>
     <form className="pay-upload" onSubmit={e=>void uploadProof(e,open.id)}>
      <h3>Sube la captura del pago</h3>
      <label>Imagen de la confirmación de {settings?.method??'Transfermóvil'}<input type="file" name="proof" accept="image/jpeg,image/png,image/webp" required/></label>
      <label className="checkbox"><input type="checkbox" required/> Confirmo que realicé la transferencia de <strong>{priceCUP(open.price_minor)} CUP</strong> y la captura es auténtica.</label>
      <div className="pay-actions"><button className="button" disabled={busy}>{busy?'Enviando…':'Enviar captura'}<Icon name="arrow" size={17}/></button>
      <button type="button" className="button secondary" disabled={busy} onClick={()=>void cancel(open.id)}>Cancelar solicitud</button></div>
     </form>
    </>:<>
     <p>La captura fue enviada. El propietario confirmará la recepción del pago y tu plan se activará automáticamente. Te notificaremos en esta sección.</p>
     <button className="button secondary" disabled={busy} onClick={()=>void cancel(open.id)}>Cancelar solicitud</button>
    </>}
   </div>
  </>:<div className="panel">
    <h2>Activar o renovar tu plan</h2>
    <p>Elige la duración y el nivel. El pago es único, por {settings?.method??'Transfermóvil'}.</p>
    <div className="duration-tabs" role="tablist" aria-label="Duración del plan">
     {durations.map(m=><button key={m} role="tab" aria-selected={months===m} className={months===m?'selected':''} onClick={()=>setMonths(m)}>{m===12?'12 meses':`${m} ${m===1?'mes':'meses'}`}</button>)}
    </div>
    <div className="plans-grid compact">
     {byLevel.map(group=>{
      const plan=group.items.find(p=>monthsOf(p.duration_days)===months)??group.items[0];
      const base=group.items.find(p=>monthsOf(p.duration_days)===1)?.price_minor??group.items[0].price_minor;
      const full=Math.round(base*(plan.duration_days/30));
      const save=full>plan.price_minor?Math.round((1-plan.price_minor/full)*100):0;
      return <article key={group.level} className={`plan-card ${group.level===3?'featured':''}`}>
       <p className="plan-tag">{group.level===1?'Básico':group.level===2?'Profesional':'Destacado'}</p>
       <p className="plan-price"><strong>{priceCUP(plan.price_minor)}</strong><small> CUP</small></p>
       {save>0&&<p className="plan-save">Ahorras {save}%</p>}
       <ul className="plan-features"><li><Icon name="check" size={14}/>{plan.duration_days} días de permanencia</li><li><Icon name="check" size={14}/>{plan.tool_credits} créditos de herramientas</li></ul>
       <button className="button full" disabled={busy} onClick={()=>void request(plan)}>Solicitar activación<Icon name="arrow" size={16}/></button>
      </article>;})}
    </div>
   </div>}
  {requests.length>0&&<div className="panel">
   <h2>Mis solicitudes de pago</h2>
   <div className="table-scroll"><table><thead><tr><th>Fecha</th><th>Plan</th><th>Importe</th><th>Estado</th><th>Nota</th></tr></thead>
   <tbody>{requests.map(r=><tr key={r.id}><td>{new Date(r.created_at*1000).toLocaleDateString('es')}</td><td>{r.plan_name} {monthsOf(r.duration_days)===1?'1m':`${monthsOf(r.duration_days)}m`}</td><td>{priceCUP(r.price_minor)} CUP</td><td><span className={`pay-status ${r.status}`}>{statusLabel[r.status]??r.status}</span></td><td>{r.decision_note??(r.status==='credited'&&r.confirmed_amount_minor?`Confirmado: ${priceCUP(r.confirmed_amount_minor)} CUP`:'')}</td></tr>)}</tbody></table></div>
  </div>}
 </div>;
}
