import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { verifyPulseSignature } from '../lib/billing/verify-pulse.ts';
import { toChariowPhone } from '../lib/billing/phone.ts';
import { parsePulse, isValidEmail, isChariowEnabled } from '../lib/billing/chariow.ts';

const secret = 'whsec_test';
const body = '{"sale":{"id":"sal_1","amount":{"value":5000,"currency":"XOF"},"custom_metadata":{"payment_reference":"CHW-RENEW-a-1"}},"product":{"id":"prd_1"},"url":"https:\\/\\/x.io"}';
const sig = 'sha256=' + createHmac('sha256', secret).update(body).digest('hex');

test('signature valide sur le corps brut', () => {
  assert.equal(verifyPulseSignature(body, sig, secret), true);
});
test('corps re-sérialisé, mauvais secret, en-tête absent/court rejetés', () => {
  assert.equal(verifyPulseSignature(JSON.stringify(JSON.parse(body)), sig, secret), false);
  assert.equal(verifyPulseSignature(body, sig, 'autre'), false);
  assert.equal(verifyPulseSignature(body, null, secret), false);
  assert.equal(verifyPulseSignature(body, 'sha256=ab', secret), false);
});
test('normalisation du téléphone sénégalais', () => {
  assert.deepEqual(toChariowPhone('+221 77 123 45 67'), { number: '771234567', country_code: 'SN' });
  assert.deepEqual(toChariowPhone('00221771234567'), { number: '771234567', country_code: 'SN' });
  assert.equal(toChariowPhone('12'), null);
});
test('parsePulse extrait référence, montant, devise', () => {
  const p = parsePulse('successful.sale', JSON.parse(body));
  assert.deepEqual(p, { eventType: 'success', saleId: 'sal_1', reference: 'CHW-RENEW-a-1', amount: 5000, currency: 'XOF', productId: 'prd_1' });
  assert.equal(parsePulse('failed.sale', {}).eventType, 'failed');
  assert.equal(parsePulse('abandoned.sale', {}).eventType, 'abandoned');
  assert.equal(parsePulse('license.issued', {}).eventType, 'other');
  assert.equal(parsePulse('successful.sale', {}).reference, null);
});
test('validation e-mail et drapeau fournisseur', () => {
  assert.equal(isValidEmail('a@b.sn'), true);
  assert.equal(isValidEmail('a@b'), false);
  delete process.env.PAYMENT_PROVIDER;
  assert.equal(isChariowEnabled(), false);
  process.env.PAYMENT_PROVIDER = 'Chariow';
  assert.equal(isChariowEnabled(), true);
});
