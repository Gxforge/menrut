// Regresión: el historial de cartera debe llegar al frontend con createdAt como texto ISO
// (la pantalla de membresía hace createdAt.localeCompare; con número se rompía).
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {toWalletDto} from '../src/v2/dto';

const txs = [
  { id: 'a', walletType: 'tools', reason: 'Saldo inicial', reference: 'initial', delta: 2, balanceAfter: 5, createdAt: 1_700_000_000_000 },
  { id: 'b', walletType: 'tools', reason: 'Consumo', reference: 'settle:x', delta: -1, balanceAfter: 4, createdAt: 1_700_000_100_000 },
];

test('el DTO de cartera devuelve createdAt como texto ISO', () => {
  const dto = toWalletDto(null, null, false, txs) as { transactions: Array<{ createdAt: unknown }> };
  for (const t of dto.transactions) assert.equal(typeof t.createdAt, 'string');
  assert.equal(dto.transactions[0].createdAt, new Date(1_700_000_000_000).toISOString());
});

test('las transacciones ordenan con localeCompare sin lanzar', () => {
  const dto = toWalletDto(null, null, false, txs) as { transactions: Array<{ createdAt: string }> };
  assert.doesNotThrow(() => [...dto.transactions].sort((x, y) => y.createdAt.localeCompare(x.createdAt)));
});
