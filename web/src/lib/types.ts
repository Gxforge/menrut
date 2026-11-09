export interface Courier {user_id:string;slug:string;name:string;description:string;province_id:string|null;municipality_id:string|null;photo_path:string|null;available:number;review_count?:number;rating_sum?:number;contact_phone?:string|null;public_phone?:number;}
export interface Directory {items:Courier[];next_cursor:string|null;}
export interface Location {id:string;name:string;}
export interface Wallet {permanence_seconds:number;tool_credits:number;expires_at:number;plan_id:string;}
export interface Ledger {id:string;wallet:string;delta:number;balance_after:number;created_at:number;}
export interface Plan {id:string;name:string;level:number;duration_days:number;active:number;permanence_credits:number;tool_credits:number;price_minor:number;}
export interface PaymentSettings {method:string;card:string;phone:string;note:string;}
export interface PaymentRequest {id:string;plan_id:string;plan_name:string;plan_level:number;duration_days:number;status:string;price_minor:number;proof_path:string|null;created_at:number;confirmed_amount_minor:number|null;decided_at:number|null;decision_note:string|null;}
export interface AdminPayment extends PaymentRequest {user_id:string;courier_name:string|null;slug:string|null;proof_url:string|null;}
export interface AuditEntry {id:string;actor_id:string;action:string;entity_id:string;reason:string;created_at:number;}
export function priceCUP(minor:number){return (minor/100).toLocaleString('es',{maximumFractionDigits:0});}
export function monthsOf(days:number){return days>=365?12:days>=180?6:days>=90?3:1;}
export const statusLabel:Record<string,string>={draft:'Falta captura',pending:'En revisión',under_review:'En revisión',approved:'Aprobado',credited:'Acreditado',rejected:'Rechazado',cancelled:'Cancelado'};
