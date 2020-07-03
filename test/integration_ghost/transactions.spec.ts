import * as assert from 'assert';

import { describe, it } from 'mocha';
import * as bitcoin from '../..';

const NETWORK = bitcoin.networks.ghost;

// See bottom of file for some helper functions used to make the payment objects needed.

describe('bitcoinjs-lib (transactions with psbt)', () => {
  it('can create a 1-to-1 Transaction', () => {
    const alice = bitcoin.ECPair.fromWIF(
      'RZHyubhR5Ts1fFkfsWpMNbMr27WQqrsSa7dpwaA5KHjCmQhiEser', NETWORK,
    );

    const p2shObj = bitcoin.payments.p2sh({
      redeem: bitcoin.payments.p2wpkh({ pubkey: alice.publicKey, network: NETWORK })});
    // @ts-ignore
    const redeemScript = p2shObj.redeem.output;
    console.log(redeemScript);
    const psbt = new bitcoin.Psbt({network: NETWORK});
    // Ghost version
    psbt.setVersion(160);

    psbt.addInput({
      // if hash is string, txid, if hash is Buffer, is reversed compared to txid
      hash: '210f0253e807ea56bee242c4c8257c4471d9a07fa9c826cabd9ddee9d068f5b6',
      index: 0,
      // // If this input was segwit, instead of nonWitnessUtxo, you would add
      // // a witnessUtxo as follows. The scriptPubkey and the value only are needed.
      witnessUtxo: {
         script: Buffer.from(
          '76a9140ce9222e6139bfb1254f1d8f34e210b2637a3f6488ac',
           'hex',
        ),
        value: 0.1,
       },

      // Not featured here:
          redeemScript,
      //   witnessScript. A Buffer of the witnessScript for P2WSH
    });
    psbt.addOutput({
      address: 'GRrxWSsnxRk6CnoRSbSz4WbJApac3pjEfA',
      value: 1000000,
    });
    psbt.signInput(0, alice);
    psbt.validateSignaturesOfInput(0);
    psbt.finalizeAllInputs();
    console.log(psbt.extractTransaction().toHex());
    assert.strictEqual(
      psbt.extractTransaction().toHex(),
      '02000000013ebc8203037dda39d482bf41ff3be955996c50d9d4f7cfc3d2097a694a7' +
        'b067d000000006b483045022100931b6db94aed25d5486884d83fc37160f37f3368c0' +
        'd7f48c757112abefec983802205fda64cff98c849577026eb2ce916a50ea70626a766' +
        '9f8596dd89b720a26b4d501210365db9da3f8a260078a7e8f8b708a1161468fb2323f' +
        'fda5ec16b261ec1056f455ffffffff0180380100000000001976a914ca0d36044e0dc' +
        '08a22724efa6f6a07b0ec4c79aa88ac00000000',
    );
  });


});

