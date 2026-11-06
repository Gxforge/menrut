import {jwtVerify,type JWTVerifyGetKey} from 'jose';
export async function verifyIdentity(token:string,key:JWTVerifyGetKey,issuer:string){
 const {payload}=await jwtVerify(token,key,{issuer,audience:'authenticated',algorithms:['ES256','RS256'],requiredClaims:['sub','exp','iat']});
 if(!payload.sub||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(payload.sub))throw new Error('Invalid subject');
 return payload as typeof payload & {sub:string};
}
