export class ApiError extends Error {
 constructor(public code:string,public status:number){super(code);}
}
let accessToken:()=>Promise<string|null>=async()=>null;
export function tokenProvider(provider:()=>Promise<string|null>){accessToken=provider;}
export async function api<T=Record<string,unknown>>(path:string,options:RequestInit={}):Promise<T>{
 const token=await accessToken();
 const headers=new Headers(options.headers);
 if(options.body)headers.set('Content-Type','application/json');
 if(token)headers.set('Authorization',`Bearer ${token}`);
 const response=await fetch(`/api/v1${path}`,{...options,headers,signal:options.signal??AbortSignal.timeout(20000),cache:'no-store'});
 const result=await response.json();
 if(!response.ok)throw new ApiError(result.error?.code??'INTERNAL_ERROR',response.status);
 return result.data as T;
}
const errors:Record<string,string>={
 UNAUTHENTICATED:'Inicia sesión de nuevo para continuar.',FORBIDDEN:'No tienes permiso para realizar esta acción.',
 NOT_FOUND:'Todavía no has activado tu perfil, o el recurso no está disponible.',
 SHARD_CAPACITY_REACHED:'No hay capacidad verificada para nuevas altas. Contacta con soporte.',
 MEMBERSHIP_EXPIRED:'Tu permanencia ha vencido. Tu información se conserva.',VALIDATION_ERROR:'Revisa los datos del formulario.',
 RATE_LIMITED:'Has realizado muchas solicitudes. Espera un minuto.',
};
export function message(error:unknown):string{
 if(error instanceof ApiError)return errors[error.code]??'No pudimos completar la operación. Inténtalo de nuevo.';
 return 'No se pudo conectar. Comprueba tu conexión; los cambios no se han confirmado.';
}
