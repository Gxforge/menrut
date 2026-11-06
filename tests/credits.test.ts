import {test} from 'node:test';
import assert from 'node:assert/strict';
import {remaining,SECONDS_PER_CREDIT} from '../src/modules/credits';
for(const [hours,credits] of [[12,5],[24,10],[168,70]]) {
 test(`${hours} horas consumen ${credits} créditos`,()=>assert.equal(remaining(70*SECONDS_PER_CREDIT,0,hours*3600),(70-credits)*SECONDS_PER_CREDIT));
}
test('nunca negativo',()=>assert.equal(remaining(10,0,100),0));
test('conserva fracciones',()=>assert.equal(remaining(remaining(8640,0,1),1,2),8638));
test('reintento en el mismo instante',()=>assert.equal(remaining(8639,1,1),8639));
test('reloj anterior no aumenta saldo',()=>assert.equal(remaining(100,10,9),100));
