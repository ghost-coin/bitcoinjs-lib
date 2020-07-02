import * as assert from 'assert';
import { describe, it } from 'mocha';
import * as bitcoin from '../..';

describe('bitcoinjs-lib (addresses) ghost', () => {
  it('can generate a Ghost address', () => {

    const keyPair = bitcoin.ECPair.makeRandom({ network: bitcoin.networks.ghost });
    const { address } = bitcoin.payments.p2pkh({
      pubkey: keyPair.publicKey,
      network: bitcoin.networks.ghost,
    });

    assert.strictEqual(address!.startsWith('G'), true);
  });
});
