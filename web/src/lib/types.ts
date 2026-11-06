export interface Courier {user_id:string;slug:string;name:string;description:string;province_id:string|null;municipality_id:string|null;photo_path:string|null;available:number;review_count?:number;rating_sum?:number;contact_phone?:string|null;public_phone?:number;}
export interface Directory {items:Courier[];next_cursor:string|null;}
export interface Location {id:string;name:string;}
export interface Wallet {permanence_seconds:number;tool_credits:number;expires_at:number;plan_id:string;}
export interface Ledger {id:string;wallet:string;delta:number;balance_after:number;created_at:number;}
