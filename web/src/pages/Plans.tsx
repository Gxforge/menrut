import {useEffect,useState} from 'react';
import {api,message} from '../lib/api';
import {Icon} from '../components/Icons';
import type {Plan} from '../lib/types';
import {priceCUP,monthsOf} from '../lib/types';
const durations=[1,3,6,12] as const;
const levelInfo:Record<number,{tag:string;desc:string;featured?:boolean}>={
 1:{tag:'Para empezar',desc:'Presencia en el directorio con tu ficha pública y contacto.'},
 2:{tag:'El más elegido',desc:'Mayor visibilidad, más créditos de herramientas y prioridad en resultados.'},
 3:{tag:'Máxima exposición',desc:'Encabeza las búsquedas de tu zona con el doble de créditos de herramientas.'},
};
export default function Plans(){
 const [plans,setPlans]=useState<Plan[]>([]),[months,setMonths]=useState<number>(1),[loading,setLoading]=useState(true),[error,setError]=useState('');
 useEffect(()=>{api<Plan[]>('/membership/plans').then(setPlans).catch(e=>setError(message(e))).finally(()=>setLoading(false));},[]);
 const byLevel=[1,2,3].map(level=>({level,items:plans.filter(p=>p.level===level).sort((a,b)=>a.duration_days-b.duration_days)})).filter(g=>g.items.length);
 const monthly=byLevel.map(g=>({level:g.level,base:g.items.find(p=>monthsOf(p.duration_days)===1)?.price_minor??g.items[0].price_minor}));
 return <div className="page wrap plans-page">
  <header className="plans-head">
   <p className="eyebrow"><span/>PLANES DE MENSAJERO</p>
   <h1>Elige tu camino.</h1>
   <p className="plans-sub">Todos los planes activan tu ficha en el directorio público. Pago único por Transfermóvil; el propietario confirma cada pago antes de activar.</p>
   <div className="duration-tabs" role="tablist" aria-label="Duración del plan">
    {durations.map(m=><button key={m} role="tab" aria-selected={months===m} className={months===m?'selected':''} onClick={()=>setMonths(m)}>{m===12?'12 meses':`${m} ${m===1?'mes':'meses'}`}</button>)}
   </div>
  </header>
  {error&&<p className="feedback error" role="alert">{error}</p>}
  {loading?<p role="status">Consultando planes disponibles…</p>:<><div className="plans-grid">
   {byLevel.map(group=>{
    const plan=group.items.find(p=>monthsOf(p.duration_days)===months)??group.items.find(p=>monthsOf(p.duration_days)===1)??group.items[0];
    const base=monthly.find(m=>m.level===group.level)!.base;
    const full=Math.round(base*(plan.duration_days/30));
    const save=full>plan.price_minor?Math.round((1-plan.price_minor/full)*100):0;
    const info=levelInfo[group.level];
    return <article key={group.level} className={`plan-card ${info.featured?'featured':''}`}>
     {info.featured&&<span className="plan-badge">RECOMENDADO</span>}
     <p className="plan-tag">{info.tag}</p>
     <h2>{plan.name}</h2>
     <p className="plan-price"><strong>{priceCUP(plan.price_minor)}</strong><small> CUP · {monthsOf(plan.duration_days)===1?'al mes':`por ${monthsOf(plan.duration_days)} meses`}</small></p>
     {save>0&&<p className="plan-save">Ahorras {save}% frente al mes a mes</p>}
     <p className="plan-desc">{info.desc}</p>
     <ul className="plan-features">
      <li><Icon name="check" size={15}/> Ficha pública en el directorio</li>
      <li><Icon name="check" size={15}/> {monthsOf(plan.duration_days)===1?'30 días':`${plan.duration_days} días`} de permanencia activa</li>
      <li><Icon name="check" size={15}/> {plan.tool_credits} créditos de herramientas</li>
      {group.level>=2&&<li><Icon name="check" size={15}/> Prioridad en resultados de búsqueda</li>}
      {group.level===3&&<li><Icon name="check" size={15}/> Posición destacada en tu zona</li>}
     </ul>
     <a className={`button full ${group.level===2?'':'secondary'}`} href={`/cuenta?plan=${plan.id}`}>Activar {plan.name}<Icon name="arrow" size={17}/></a>
    </article>;})}
  </div>
  <section className="panel subdued pay-notice">
   <h3>Cómo se paga</h3>
   <p>1 · Elige tu plan y crea la solicitud en tu cuenta. 2 · Transfiere el importe exacto por <strong>Transfermóvil</strong>. 3 · Sube la captura del pago. 4 · El propietario confirma la recepción y tu plan se activa. Renovar antes de vencer acumula los días restantes.</p>
  </section></>}
 </div>;
}
