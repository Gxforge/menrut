// Pruebas de la promoción de lanzamiento: descuento del 20 % hasta el 30 de noviembre.
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { discountedPriceCup, launchDiscountActive, LAUNCH_DISCOUNT_ENDS_AT } from '../src/v2/launch-promo';

const END = Date.parse(LAUNCH_DISCOUNT_ENDS_AT);
const BEFORE = END - 1;

test('el descuento vale hasta el 30 de noviembre incluido y se apaga al llegar a la fecha de fin', () => {
  assert.equal(launchDiscountActive(BEFORE), true);
  assert.equal(launchDiscountActive(END), false);
  assert.equal(launchDiscountActive(END + 86_400_000), false);
});

test('el 20 % se aplica a cualquier plan de pago mientras la promo esté activa', () => {
  assert.equal(discountedPriceCup(1500, false, BEFORE), 1200);
  assert.equal(discountedPriceCup(4000, false, BEFORE), 3200);
});

test('redondea a entero en CUP', () => {
  assert.equal(discountedPriceCup(1999, false, BEFORE), 1599);
  assert.equal(Number.isInteger(discountedPriceCup(1333, false, BEFORE)), true);
});

test('la prueba gratuita nunca se descuenta', () => {
  assert.equal(discountedPriceCup(0, true, BEFORE), 0);
});

test('después de la fecha de fin el precio vuelve al de catálogo', () => {
  assert.equal(discountedPriceCup(1500, false, END), 1500);
});
