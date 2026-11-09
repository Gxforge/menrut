import {useEffect,useState} from 'react';
import type {Session} from '@supabase/supabase-js';
import {supabase} from '../lib/auth';
import {api,message} from '../lib/api';
import {Icon} from '../components/Icons';
import type {AdminPayment,AuditEntry} from '../lib/types';
import {priceCUP,monthsOf,statusLabel} from '../lib/types';
const tabs=['Pagos pendientes','Historial','Auditoría'] as const;
type Tab=typeof tabs[number];
export default function Admin(){
 const [session,setSession]=useState<Session|null>(null),[ready,setReady]=useState(false);
 const [perms,setPerms]=useState<string[]>([]),[tab,setTab]=useState<Tab>('Pagos pendientes');
 const [queue,setQueue]=useState<AdminPayment[]>([]),[history,setHistory]=useState<AdminPayment[]>([]),[audit,setAudit]=useState<AuditEntry[]>([]);
 const [loading,setLoading]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [amounts,setAmounts]=useState<Record<string,string>>({}),[notes,setNotes]=useState<Record<string,string>>({}),[busyId,setBusyId]=useState('');
 useEffect(()=>{supabase.auth.getSession().then(({data})=>{setSession(data.session);setReady(true);});},[]);
 async function load(){
  setLoading(true);setError('');
  try{
   const p=await api<{permission:string}[]>('/me/permissions');setPerms(p.map(x=>x.permission));
   const allowed=p.some(x=>x.permission==='owner'||x.permission==='payments.review');
   if(allowed){
    const [q,h]=await Promise.all([api<AdminPayment[]>('/admin/payments?status=pending'),api<AdminPayment[]>('/admin/payments?status=all')]);
    setQueue(q);setHistory(h);
    setAmounts(Object.fromEntries(q.map(r=>[r.id,(r.price_minor/100).toFixed(0)])));
    // La auditoría exige un permiso aparte (audit.read): un moderador de pagos
    // no debe romper la carga de su cola por no tenerlo.
    setAudit(await api<AuditEntry[]>('/admin/audit').catch(()=>[]));
   }
  }catch(e){setError(message(e));}finally{setLoading(false);}
 }
 useEffect(()=>{if(session&&ready)void load();},[session,ready]);
 async function decide(id:string,decision:'approved'|'rejected'){
  setBusyId(id);setError('');setNotice('');
  try{
   const body=decision==='approved'
    ?{decision,confirmed_amount_minor:Math.round(Number(amounts[id]??'0')*100)}
    :{decision,note:(notes[id]??'').trim()||'Sin motivo especificado'};
   if(decision==='approved'&&(!Number.isFinite(Number(amounts[id]))||Number(amounts[id])<=0))throw new Error('monto');
   const r=await api<{status:string;plan_name?:string}>(`/admin/payments/${id}/decision`,{method:'POST',body:JSON.stringify(body)});
   setNotice(decision==='approved'?`Plan ${r.plan_name??''} acreditado. El mensajero ya está activo.`:'Solicitud rechazada. El mensajero verá la nota.');
   await load();
  }catch(e){setError(e instanceof Error&&e.message==='monto'?'Escribe el monto confirmado en CUP.':message(e));}
  finally{setBusyId('');}
 }
 if(!ready)return <div className="page wrap" role="status">Comprobando tu sesión…</div>;
 if(!session)return <div className="page wrap"><div className="notice"><Icon name="user" size={30}/><h3>Panel del propietario</h3><p>Inicia sesión con la cuenta del propietario para revisar pagos.</p><a className="button" href="/cuenta">Iniciar sesión<Icon name="arrow" size={17}/></a></div></div>;
 const allowed=perms.some(p=>p==='owner'||p==='payments.review');
 if(!allowed&&loading)return <div className="page wrap" role="status">Verificando permisos…</div>;
 if(!allowed)return <div className="page wrap"><div className="notice error"><Icon name="wifi" size={30}/><h3>Acceso restringido</h3><p>Esta sección es solo para el propietario y moderadores autorizados.</p></div></div>;
 const pendingProof=queue.filter(r=>r.status==='pending');
 return <div className="page wrap admin-page">
  <header className="plans-head">
   <p className="eyebrow"><span/>PANEL DEL PROPIETARIO</p>
   <h1>Revisiones de pago</h1>
   <p className="plans-sub">Confirma cada captura con el SMS recibido en tu teléfono. El monto que indiques queda registrado en la auditoría.</p>
   <div className="duration-tabs" role="tablist" aria-label="Secciones del panel">
    {tabs.map(t=><button key={t} role="tab" aria-selected={tab===t} className={tab===t?'selected':''} onClick={()=>setTab(t)}>{t}{t==='Pagos pendientes'&&pendingProof.length?` (${pendingProof.length})`:''}</button>)}
   </div>
  </header>
  {error&&<p className="feedback error" role="alert">{error}</p>}
  {notice&&<p className="feedback" role="status">{notice}</p>}
  {loading?<p role="status">Consultando solicitudes…</p>:<>
  {tab==='Pagos pendientes'&&<>{pendingProof.length?pendingProof.map(r=><article key={r.id} className="panel pay-review">
   <header className="review-head">
    <div><h3>{r.courier_name||'Mensajero sin nombre público'}</h3>
    <p className="form-note">{r.slug?<>Perfil: <a className="text-link" href={`/mensajero/${encodeURIComponent(r.slug)}`}>@{r.slug}</a> · </>:null}Solicitado el {new Date(r.created_at*1000).toLocaleString('es')}</p></div>
    <span className="pay-status pending">En revisión</span>
   </header>
   <div className="review-body">
    <div className="review-info">
     <p className="review-plan"><strong>{r.plan_name}</strong> · {monthsOf(r.duration_days)===1?'1 mes':`${monthsOf(r.duration_days)} meses`} · {r.duration_days} días</p>
     <p>Importe solicitado: <strong>{priceCUP(r.price_minor)} CUP</strong></p>
     <label>Monto confirmado por SMS (CUP)<input type="number" inputMode="numeric" min={1} max={1000000} value={amounts[r.id]??''} onChange={e=>setAmounts(a=>({...a,[r.id]:e.target.value}))} required/></label>
     <label>Motivo (solo si rechazas)<input type="text" maxLength={500} value={notes[r.id]??''} onChange={e=>setNotes(n=>({...n,[r.id]:e.target.value}))} placeholder="Ej.: la captura no coincide con el SMS recibido"/></label>
     <div className="pay-actions">
      <button className="button" disabled={busyId===r.id} onClick={()=>void decide(r.id,'approved')}><Icon name="check" size={16}/>{busyId===r.id?'Procesando…':'Confirmar y activar plan'}</button>
      <button className="button secondary" disabled={busyId===r.id} onClick={()=>void decide(r.id,'rejected')}>Rechazar</button>
     </div>
     <p className="form-note">Al confirmar, el plan se acredita con renovación acumulativa y el mensajero vuelve al directorio.</p>
    </div>
    {r.proof_url&&<a className="review-proof" href={r.proof_url} target="_blank" rel="noreferrer" title="Abrir captura en pestaña nueva"><img src={r.proof_url} alt={`Captura del pago de ${r.courier_name||r.user_id}`} loading="lazy"/></a>}
   </div>
  </article>):<div className="notice"><Icon name="check" size={30}/><h3>Sin pagos pendientes</h3><p>Cuando un mensajero suba una captura, aparecerá aquí para tu revisión.</p></div>}</>}
  {tab==='Historial'&&<div className="panel">{history.length?<div className="table-scroll"><table><thead><tr><th>Fecha</th><th>Mensajero</th><th>Plan</th><th>Solicitado</th><th>Estado</th><th>Confirmado</th><th>Nota</th></tr></thead>
   <tbody>{history.map(r=><tr key={r.id}><td>{new Date(r.created_at*1000).toLocaleDateString('es')}</td><td>{r.courier_name??r.user_id.slice(0,8)}</td><td>{r.plan_name} {monthsOf(r.duration_days)===1?'1m':`${monthsOf(r.duration_days)}m`}</td><td>{priceCUP(r.price_minor)}</td><td><span className={`pay-status ${r.status}`}>{statusLabel[r.status]??r.status}</span></td><td>{r.confirmed_amount_minor?`${priceCUP(r.confirmed_amount_minor)} CUP`:'—'}</td><td>{r.decision_note??''}</td></tr>)}</tbody></table></div>:<p>Sin solicitudes registradas todavía.</p>}</div>}
  {tab==='Auditoría'&&<div className="panel">{audit.length?<div className="table-scroll"><table><thead><tr><th>Fecha</th><th>Acción</th><th>Detalle</th></tr></thead>
   <tbody>{audit.map(a=><tr key={a.id}><td>{new Date(a.created_at*1000).toLocaleString('es')}</td><td>{a.action}</td><td>{a.reason}</td></tr>)}</tbody></table></div>:<p>Sin eventos de auditoría todavía.</p>}</div>}
  </>}
 </div>;
}
