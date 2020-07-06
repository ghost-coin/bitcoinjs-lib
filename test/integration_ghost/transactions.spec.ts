// import * as assert from 'assert';
import * as bip32 from 'bip32';
import * as bip39 from 'bip39';
import { UnspentTransaction } from '../../types/insight';

import { describe, it } from 'mocha';
import * as bitcoin from '../..';
import { testnetUtils } from './_testnet';


const NETWORK = bitcoin.networks.ghostTestnet;

// See bottom of file for some helper functions used to make the payment objects needed.

describe('bitcoinjs-lib (transactions with psbt)', () => {
  it('can create and broadcast transaction on testnet from menmonic ', async () => {
    const mnemonic =
      'praise you muffin lion enable neck grocery crumble super myself license ghost';
    const seed = bip39.mnemonicToSeedSync(mnemonic);
    const root = bip32.fromSeed(seed, NETWORK);
    const child = root.derivePath("m/44'/0'/0'/0/0");
    const payment = bitcoin.payments.p2pkh({ pubkey: child.publicKey, network: NETWORK });
    const key = bitcoin.ECPair.fromWIF(child.toWIF(), NETWORK);
    // alice payment address
    console.log(payment.address);

    const address = payment.address as string;
    // build the inputs from the unspent
    const unspents = await testnetUtils.fetchUnspents(address);
    const totalUnspent = unspents.map(u => u.satoshis).reduce((p, c) => p + c, 0);
    const feeValue = 35000;
    // 1 Ghost
    const fundValue = 1e8;
    const skipValue = totalUnspent - fundValue - feeValue;
    // const inputs = [];
    const psbt = new bitcoin.Psbt({ network: NETWORK });
    psbt.setVersion(160);
    // building inputs from unspent transactions
    for (const unspent of unspents) {
      const input = await getInputData(payment, unspent, false, 'noredeem');
      psbt.addInput(input);
    }

    // The amount to send
    psbt.addOutput({
      address: 'XPtT4tJWyepGAGRF9DR4AhRkJWB3DEBXT2',
      value: fundValue,
    });

    if (skipValue > 546) {
      // Output change
      psbt.addOutput({
        address,
        value: skipValue,
      });
    }

    psbt.signAllInputs(key);

    psbt.finalizeAllInputs();

    const rawTransaction = await psbt.extractTransaction().toHex();
    console.log(rawTransaction);
  });


  it('can create and broadcast transaction with segwit inputs on testnet from menmonic ', async () => {
    const mnemonic =
      'praise you muffin lion enable neck grocery crumble super myself license ghost';
    const seed = bip39.mnemonicToSeedSync(mnemonic);
    const root = bip32.fromSeed(seed, NETWORK);
    const child = root.derivePath("m/44'/0'/0'/0/0");
    const payment = bitcoin.payments.p2pkh({ pubkey: child.publicKey, network: NETWORK });
    // alice payment address
    console.log(payment.address);

    const address = payment.address as string;
    // build the inputs from the unspent
    const unspents = await testnetUtils.fetchUnspents(address);
    const totalUnspent = unspents.map(u => u.satoshis).reduce((p, c) => p + c, 0);
    const feeValue = 35000;
    // 1 Ghost
    const fundValue = 1e8;
    const skipValue = totalUnspent - fundValue - feeValue;
    // const inputs = [];
    const psbt = new bitcoin.Psbt({ network: NETWORK });
    psbt.setVersion(160);
    // building inputs from unspent transactions
    for (const unspent of unspents) {
      const input = await getInputData(payment, unspent, false, 'noredeem');
      psbt.addInput(input);
    }

    // The amount to send
    psbt.addOutput({
      address: 'XPtT4tJWyepGAGRF9DR4AhRkJWB3DEBXT2',
      value: fundValue,
    });

    if (skipValue > 546) {
      // Output change
      psbt.addOutput({
        address,
        value: skipValue,
      });
    }

    psbt.signAllInputs(child);

    psbt.finalizeAllInputs();

    const rawTransaction = await psbt.extractTransaction().toHex();
    console.log(rawTransaction);
  });

});

/* it('can create a 1-to-1 Transaction', () => {
   const alice = bitcoin.ECPair.fromWIF(
     'RZHyubhR5Ts1fFkfsWpMNbMr27WQqrsSa7dpwaA5KHjCmQhiEser', NETWORK,
   );
 
   const p2shObj = bitcoin.payments.p2sh({
     redeem: bitcoin.payments.p2pkh({ pubkey: alice.publicKey, network: NETWORK })
   });
   // @ts-ignore
   const redeemScript = p2shObj.redeem.output;
   console.log(redeemScript);
   const psbt = new bitcoin.Psbt({ network: NETWORK });
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
 });*/


/*function createPayment(_type: string, myKeys?: any[], network?: any): any {
  network = network || NETWORK;
  const splitType = _type.split('-').reverse();
  const isMultisig = splitType[0].slice(0, 4) === 'p2ms';
  const keys = myKeys || [];
  let m: number | undefined;
  if (isMultisig) {
    const match = splitType[0].match(/^p2ms\((\d+) of (\d+)\)$/);
    m = parseInt(match![1], 10);
    let n = parseInt(match![2], 10);
    if (keys.length > 0 && keys.length !== n) {
      throw new Error('Need n keys for multisig');
    }
    while (!myKeys && n > 1) {
      keys.push(bitcoin.ECPair.makeRandom({ network }));
      n--;
    }
  }
  if (!myKeys) keys.push(bitcoin.ECPair.makeRandom({ network }));

  let payment: any;
  splitType.forEach(type => {
    if (type.slice(0, 4) === 'p2ms') {
      payment = bitcoin.payments.p2ms({
        m,
        pubkeys: keys.map(key => key.publicKey).sort((a, b) => a.compare(b)),
        network,
      });
    } else if (['p2sh', 'p2wsh'].indexOf(type) > -1) {
      payment = (bitcoin.payments as any)[type]({
        redeem: payment,
        network,
      });
    } else {
      payment = (bitcoin.payments as any)[type]({
        pubkey: keys[0].publicKey,
        network,
      });
    }
  });

  return {
    payment,
    keys,
  };
}*/

async function getInputData(
  payment: any,
  unspent: UnspentTransaction,
  isSegwit: boolean,
  redeemType: string,
): Promise<any> {

  const { scriptPubKey, amount } = unspent;
  let nonWitnessUtxo;
  if (!isSegwit) {
    const utx = await testnetUtils.fetchRawTx(unspent.txid);
    // for non segwit inputs, you must pass the full transaction buffer
    nonWitnessUtxo = Buffer.from(utx.rawtx, 'hex');
  }
  // for segwit inputs, you only need the output script and value as an object.
  const witnessUtxo = {
    script: Buffer.from(scriptPubKey, 'hex'),
    value: Number(amount),
  };
  const mixin = isSegwit ? { witnessUtxo } : { nonWitnessUtxo };

  const mixin2: any = {};
  switch (redeemType) {
    case 'p2sh':
      mixin2.redeemScript = payment.redeem.output;
      break;
    case 'p2wsh':
      mixin2.witnessScript = payment.redeem.output;
      break;
    case 'p2sh-p2wsh':
      mixin2.witnessScript = payment.redeem.redeem.output;
      mixin2.redeemScript = payment.redeem.output;
      break;
  }
  return {
    hash: unspent.txid,
    index: unspent.vout,
    ...mixin,
    ...mixin2,
  };
}
