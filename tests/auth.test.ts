import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPair,exportJWK,createLocalJWKSet,SignJWT} from 'jose';
import {verifyIdentity} from '../src/core/tokens';
const issuer='https://test-project.supabase.co/auth/v1';
const subject='b7387044-43b7-4ac4-9229-dccefb78632a';
const pair=await generateKeyPair('ES256');
const pub=await exportJWK(pair.publicKey);
const keys=createLocalJWKSet({keys:[{...pub,alg:'ES256',kid:'key-1'}]});
async function sign(options:{iss?:string;aud?:string;exp?:number;sub?:string}={}){
 return new SignJWT({}).setProtectedHeader({alg:'ES256',kid:'key-1'}).setIssuer(options.iss??issuer).setAudience(options.aud??'authenticated').setSubject(options.sub??subject).setIssuedAt().setExpirationTime(options.exp??Math.floor(Date.now()/1000)+60).sign(pair.privateKey);
}
test('JWT firmado con identidad válida',async()=>assert.equal((await verifyIdentity(await sign(),keys,issuer)).sub,subject));
test('JWT caducado',async()=>assert.rejects(()=>sign({exp:1}).then(t=>verifyIdentity(t,keys,issuer))));
test('Emisor incorrecto',async()=>assert.rejects(()=>sign({iss:'https://attacker.invalid'}).then(t=>verifyIdentity(t,keys,issuer))));
test('Audiencia incorrecta',async()=>assert.rejects(()=>sign({aud:'anon'}).then(t=>verifyIdentity(t,keys,issuer))));
test('Sujeto mal formado',async()=>assert.rejects(()=>sign({sub:'admin'}).then(t=>verifyIdentity(t,keys,issuer))));
test('Firma manipulada',async()=>{const t=await sign();const parts=t.split('.');parts[1]=Buffer.from(JSON.stringify({sub:subject,exp:9999999999})).toString('base64url');await assert.rejects(()=>verifyIdentity(parts.join('.'),keys,issuer));});
test('JWT HS256 no permitido',async()=>{const t=await new SignJWT({sub:subject}).setProtectedHeader({alg:'HS256'}).sign(new Uint8Array(32));await assert.rejects(()=>verifyIdentity(t,keys,issuer));});
