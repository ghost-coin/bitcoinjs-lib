import * as assert from 'assert';
import * as bip32 from 'bip32';
import { describe, it } from 'mocha';
import * as bitcoin from '../..';
import { regtestUtils } from './_regtest';
const rng = require('randombytes');
const regtest = regtestUtils.network;
const NETWORK = bitcoin.networks.ghost;

// See bottom of file for some helper functions used to make the payment objects needed.

describe('bitcoinjs-lib (transactions with psbt)', () => {
  it('can create a 1-to-1 Transaction', () => {
    const alice = bitcoin.ECPair.fromWIF(
      'RZHyubhR5Ts1fFkfsWpMNbMr27WQqrsSa7dpwaA5KHjCmQhiEser', NETWORK,
    );
    const psbt = new bitcoin.Psbt({network: NETWORK});
    // Ghost version
    psbt.setVersion(160);

    psbt.addInput({
      // if hash is string, txid, if hash is Buffer, is reversed compared to txid
      hash: 'f3f595ee287da42810b1ac2697dce52445c8cc90bf5038e54cd5152ae6b696f6',
      index: 0,
      // non-segwit inputs now require passing the whole previous tx as Buffer
      nonWitnessUtxo: Buffer.from(
        'a000af0b000002603f9431fd94e3ea76044a28432ecfb4fb3f0cc20a6c7dc5fc86800d682758f90100000000fe' +
        'ffffff813e20c66144e1db3598a77ea0c9092388420aaf810d61a9b8d407cadb8674b80100000000feffffff02015f9' +
        'e1500000000001976a91402a8733846e55701c977e9ddf19e97f41b6d40cf88ac0140420f00000000001976a914d6fc68b67' +
        '6cbd9a7b5cefbceef1a684559a9a6da88ac0247304402205762820b5fc75001eae1f3b1f2172402fc4a1327fdbf8b2d49d2055' +
        'e244f8e7702200c92d4eb70f0214442dcb3eb9a4f076e49ee97f1b1744420dcdc541598b705a801210281c35c955b8387361a49' +
        'd4a493f78db9ef4d20ef43c622eeda38d216642aed45024730440220187df73b5fbaff690b45292afce91671327ee4f1df289ce8d9' +
        'a9656b5c5617e102201ac5c2cea7838ccb121912772c3475e88c160786bce92d536be76410ba53c6b801210233aa74f32d3692efef491bdaa582dc961dc4b43033aaceeaba7127fd3f02ea9f',
        'hex',
      ),

      // // If this input was segwit, instead of nonWitnessUtxo, you would add
      // // a witnessUtxo as follows. The scriptPubkey and the value only are needed.
      // witnessUtxo: {
      //   script: Buffer.from(
      //     '76a9148bbc95d2709c71607c60ee3f097c1217482f518d88ac',
      //     'hex',
      //   ),
      //   value: 90000,
      // },

      // Not featured here:
      //   redeemScript. A Buffer of the redeemScript for P2SH
      //   witnessScript. A Buffer of the witnessScript for P2WSH
    });
    psbt.addOutput({
      address: 'GRrxWSsnxRk6CnoRSbSz4WbJApac3pjEfA',
      value: 0.01,
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

  it('can create (and broadcast via 3PBP) a typical Transaction', async () => {
    // these are { payment: Payment; keys: ECPair[] }
    const alice1 = createPayment('p2pkh');
    const alice2 = createPayment('p2pkh');

    // give Alice 2 unspent outputs
    const inputData1 = await getInputData(
      5e4,
      alice1.payment,
      false,
      'noredeem',
    );
    const inputData2 = await getInputData(
      7e4,
      alice2.payment,
      false,
      'noredeem',
    );
    {
      const {
        hash, // string of txid or Buffer of tx hash. (txid and hash are reverse order)
        index, // the output index of the txo you are spending
        nonWitnessUtxo, // the full previous transaction as a Buffer
      } = inputData1;
      assert.deepStrictEqual({ hash, index, nonWitnessUtxo }, inputData1);
    }

    // network is only needed if you pass an address to addOutput
    // using script (Buffer of scriptPubkey) instead will avoid needed network.
    const psbt = new bitcoin.Psbt({ network: regtest })
      .addInput(inputData1) // alice1 unspent
      .addInput(inputData2) // alice2 unspent
      .addOutput({
        address: 'mwCwTceJvYV27KXBc3NJZys6CjsgsoeHmf',
        value: 8e4,
      }) // the actual "spend"
      .addOutput({
        address: alice2.payment.address, // OR script, which is a Buffer.
        value: 1e4,
      }); // Alice's change
    // (in)(5e4 + 7e4) - (out)(8e4 + 1e4) = (fee)3e4 = 30000, this is the miner fee

    // Let's show a new feature with PSBT.
    // We can have multiple signers sign in parrallel and combine them.
    // (this is not necessary, but a nice feature)

    // encode to send out to the signers
    const psbtBaseText = psbt.toBase64();

    // each signer imports
    const signer1 = bitcoin.Psbt.fromBase64(psbtBaseText);
    const signer2 = bitcoin.Psbt.fromBase64(psbtBaseText);

    // Alice signs each input with the respective private keys
    // signInput and signInputAsync are better
    // (They take the input index explicitly as the first arg)
    signer1.signAllInputs(alice1.keys[0]);
    signer2.signAllInputs(alice2.keys[0]);

    // If your signer object's sign method returns a promise, use the following
    // await signer2.signAllInputsAsync(alice2.keys[0])

    // encode to send back to combiner (signer 1 and 2 are not near each other)
    const s1text = signer1.toBase64();
    const s2text = signer2.toBase64();

    const final1 = bitcoin.Psbt.fromBase64(s1text);
    const final2 = bitcoin.Psbt.fromBase64(s2text);

    // final1.combine(final2) would give the exact same result
    psbt.combine(final1, final2);

    // Finalizer wants to check all signatures are valid before finalizing.
    // If the finalizer wants to check for specific pubkeys, the second arg
    // can be passed. See the first multisig example below.
    assert.strictEqual(psbt.validateSignaturesOfInput(0), true);
    assert.strictEqual(psbt.validateSignaturesOfInput(1), true);

    // This step it new. Since we separate the signing operation and
    // the creation of the scriptSig and witness stack, we are able to
    psbt.finalizeAllInputs();

    // build and broadcast our RegTest network
    await regtestUtils.broadcast(psbt.extractTransaction().toHex());
    // to build and broadcast to the actual Bitcoin network, see https://github.com/bitcoinjs/bitcoinjs-lib/issues/839
  });

  it('can create (and broadcast via 3PBP) a Transaction with an OP_RETURN output', async () => {
    const alice1 = createPayment('p2pkh');
    const inputData1 = await getInputData(
      2e5,
      alice1.payment,
      false,
      'noredeem',
    );

    const data = Buffer.from('bitcoinjs-lib', 'utf8');
    const embed = bitcoin.payments.embed({ data: [data] });

    const psbt = new bitcoin.Psbt({ network: regtest })
      .addInput(inputData1)
      .addOutput({
        script: embed.output!,
        value: 1000,
      })
      .addOutput({
        address: regtestUtils.RANDOM_ADDRESS,
        value: 1e5,
      })
      .signInput(0, alice1.keys[0]);

    assert.strictEqual(psbt.validateSignaturesOfInput(0), true);
    psbt.finalizeAllInputs();

    // build and broadcast to the RegTest network
    await regtestUtils.broadcast(psbt.extractTransaction().toHex());
  });

  it('can create (and broadcast via 3PBP) a Transaction, w/ a P2SH(P2MS(2 of 4)) (multisig) input', async () => {
    const multisig = createPayment('p2sh-p2ms(2 of 4)');
    const inputData1 = await getInputData(2e4, multisig.payment, false, 'p2sh');
    {
      const {
        hash,
        index,
        nonWitnessUtxo,
        redeemScript, // NEW: P2SH needs to give redeemScript when adding an input.
      } = inputData1;
      assert.deepStrictEqual(
        { hash, index, nonWitnessUtxo, redeemScript },
        inputData1,
      );
    }

    const psbt = new bitcoin.Psbt({ network: regtest })
      .addInput(inputData1)
      .addOutput({
        address: regtestUtils.RANDOM_ADDRESS,
        value: 1e4,
      })
      .signInput(0, multisig.keys[0])
      .signInput(0, multisig.keys[2]);

    assert.strictEqual(psbt.validateSignaturesOfInput(0), true);
    assert.strictEqual(
      psbt.validateSignaturesOfInput(0, multisig.keys[0].publicKey),
      true,
    );
    assert.throws(() => {
      psbt.validateSignaturesOfInput(0, multisig.keys[3].publicKey);
    }, new RegExp('No signatures for this pubkey'));
    psbt.finalizeAllInputs();

    const tx = psbt.extractTransaction();

    // build and broadcast to the Bitcoin RegTest network
    await regtestUtils.broadcast(tx.toHex());

    await regtestUtils.verify({
      txId: tx.getId(),
      address: regtestUtils.RANDOM_ADDRESS,
      vout: 0,
      value: 1e4,
    });
  });

  it('can create (and broadcast via 3PBP) a Transaction, w/ a P2SH(P2WPKH) input', async () => {
    const p2sh = createPayment('p2sh-p2wpkh');
    const inputData = await getInputData(5e4, p2sh.payment, true, 'p2sh');
    const inputData2 = await getInputData(5e4, p2sh.payment, true, 'p2sh');
    {
      const {
        hash,
        index,
        witnessUtxo, // NEW: this is an object of the output being spent { script: Buffer; value: Satoshis; }
        redeemScript,
      } = inputData;
      assert.deepStrictEqual(
        { hash, index, witnessUtxo, redeemScript },
        inputData,
      );
    }
    const keyPair = p2sh.keys[0];
    const outputData = {
      script: p2sh.payment.output, // sending to myself for fun
      value: 2e4,
    };
    const outputData2 = {
      script: p2sh.payment.output, // sending to myself for fun
      value: 7e4,
    };

    const tx = new bitcoin.Psbt()
      .addInputs([inputData, inputData2])
      .addOutputs([outputData, outputData2])
      .signAllInputs(keyPair)
      .finalizeAllInputs()
      .extractTransaction();

    // build and broadcast to the Bitcoin RegTest network
    await regtestUtils.broadcast(tx.toHex());

    await regtestUtils.verify({
      txId: tx.getId(),
      address: p2sh.payment.address,
      vout: 0,
      value: 2e4,
    });
  });

  it('can create (and broadcast via 3PBP) a Transaction, w/ a P2SH(P2WPKH) input with nonWitnessUtxo', async () => {
    // For learning purposes, ignore this test.
    // REPEATING ABOVE BUT WITH nonWitnessUtxo by passing false to getInputData
    const p2sh = createPayment('p2sh-p2wpkh');
    const inputData = await getInputData(5e4, p2sh.payment, false, 'p2sh');
    const inputData2 = await getInputData(5e4, p2sh.payment, false, 'p2sh');
    const keyPair = p2sh.keys[0];
    const outputData = {
      script: p2sh.payment.output,
      value: 2e4,
    };
    const outputData2 = {
      script: p2sh.payment.output,
      value: 7e4,
    };
    const tx = new bitcoin.Psbt()
      .addInputs([inputData, inputData2])
      .addOutputs([outputData, outputData2])
      .signAllInputs(keyPair)
      .finalizeAllInputs()
      .extractTransaction();
    await regtestUtils.broadcast(tx.toHex());
    await regtestUtils.verify({
      txId: tx.getId(),
      address: p2sh.payment.address,
      vout: 0,
      value: 2e4,
    });
  });

  it('can create (and broadcast via 3PBP) a Transaction, w/ a P2WPKH input', async () => {
    // the only thing that changes is you don't give a redeemscript for input data

    const p2wpkh = createPayment('p2wpkh');
    const inputData = await getInputData(5e4, p2wpkh.payment, true, 'noredeem');
    {
      const { hash, index, witnessUtxo } = inputData;
      assert.deepStrictEqual({ hash, index, witnessUtxo }, inputData);
    }

    const psbt = new bitcoin.Psbt({ network: regtest })
      .addInput(inputData)
      .addOutput({
        address: regtestUtils.RANDOM_ADDRESS,
        value: 2e4,
      })
      .signInput(0, p2wpkh.keys[0]);

    assert.strictEqual(psbt.validateSignaturesOfInput(0), true);
    psbt.finalizeAllInputs();

    const tx = psbt.extractTransaction();

    // build and broadcast to the Bitcoin RegTest network
    await regtestUtils.broadcast(tx.toHex());

    await regtestUtils.verify({
      txId: tx.getId(),
      address: regtestUtils.RANDOM_ADDRESS,
      vout: 0,
      value: 2e4,
    });
  });

  it('can create (and broadcast via 3PBP) a Transaction, w/ a P2WPKH input with nonWitnessUtxo', async () => {
    // For learning purposes, ignore this test.
    // REPEATING ABOVE BUT WITH nonWitnessUtxo by passing false to getInputData
    const p2wpkh = createPayment('p2wpkh');
    const inputData = await getInputData(
      5e4,
      p2wpkh.payment,
      false,
      'noredeem',
    );
    const psbt = new bitcoin.Psbt({ network: regtest })
      .addInput(inputData)
      .addOutput({
        address: regtestUtils.RANDOM_ADDRESS,
        value: 2e4,
      })
      .signInput(0, p2wpkh.keys[0]);
    psbt.finalizeAllInputs();
    const tx = psbt.extractTransaction();
    await regtestUtils.broadcast(tx.toHex());
    await regtestUtils.verify({
      txId: tx.getId(),
      address: regtestUtils.RANDOM_ADDRESS,
      vout: 0,
      value: 2e4,
    });
  });

  it('can create (and broadcast via 3PBP) a Transaction, w/ a P2WSH(P2PK) input', async () => {
    const p2wsh = createPayment('p2wsh-p2pk');
    const inputData = await getInputData(5e4, p2wsh.payment, true, 'p2wsh');
    {
      const {
        hash,
        index,
        witnessUtxo,
        witnessScript, // NEW: A Buffer of the witnessScript
      } = inputData;
      assert.deepStrictEqual(
        { hash, index, witnessUtxo, witnessScript },
        inputData,
      );
    }

    const psbt = new bitcoin.Psbt({ network: regtest })
      .addInput(inputData)
      .addOutput({
        address: regtestUtils.RANDOM_ADDRESS,
        value: 2e4,
      })
      .signInput(0, p2wsh.keys[0]);

    assert.strictEqual(psbt.validateSignaturesOfInput(0), true);
    psbt.finalizeAllInputs();

    const tx = psbt.extractTransaction();

    // build and broadcast to the Bitcoin RegTest network
    await regtestUtils.broadcast(tx.toHex());

    await regtestUtils.verify({
      txId: tx.getId(),
      address: regtestUtils.RANDOM_ADDRESS,
      vout: 0,
      value: 2e4,
    });
  });

  it('can create (and broadcast via 3PBP) a Transaction, w/ a P2WSH(P2PK) input with nonWitnessUtxo', async () => {
    // For learning purposes, ignore this test.
    // REPEATING ABOVE BUT WITH nonWitnessUtxo by passing false to getInputData
    const p2wsh = createPayment('p2wsh-p2pk');
    const inputData = await getInputData(5e4, p2wsh.payment, false, 'p2wsh');
    const psbt = new bitcoin.Psbt({ network: regtest })
      .addInput(inputData)
      .addOutput({
        address: regtestUtils.RANDOM_ADDRESS,
        value: 2e4,
      })
      .signInput(0, p2wsh.keys[0]);
    psbt.finalizeAllInputs();
    const tx = psbt.extractTransaction();
    await regtestUtils.broadcast(tx.toHex());
    await regtestUtils.verify({
      txId: tx.getId(),
      address: regtestUtils.RANDOM_ADDRESS,
      vout: 0,
      value: 2e4,
    });
  });

  it(
    'can create (and broadcast via 3PBP) a Transaction, w/ a ' +
      'P2SH(P2WSH(P2MS(3 of 4))) (SegWit multisig) input',
    async () => {
      const p2sh = createPayment('p2sh-p2wsh-p2ms(3 of 4)');
      const inputData = await getInputData(
        5e4,
        p2sh.payment,
        true,
        'p2sh-p2wsh',
      );
      {
        const {
          hash,
          index,
          witnessUtxo,
          redeemScript,
          witnessScript,
        } = inputData;
        assert.deepStrictEqual(
          { hash, index, witnessUtxo, redeemScript, witnessScript },
          inputData,
        );
      }

      const psbt = new bitcoin.Psbt({ network: regtest })
        .addInput(inputData)
        .addOutput({
          address: regtestUtils.RANDOM_ADDRESS,
          value: 2e4,
        })
        .signInput(0, p2sh.keys[0])
        .signInput(0, p2sh.keys[2])
        .signInput(0, p2sh.keys[3]);

      assert.strictEqual(psbt.validateSignaturesOfInput(0), true);
      assert.strictEqual(
        psbt.validateSignaturesOfInput(0, p2sh.keys[3].publicKey),
        true,
      );
      assert.throws(() => {
        psbt.validateSignaturesOfInput(0, p2sh.keys[1].publicKey);
      }, new RegExp('No signatures for this pubkey'));
      psbt.finalizeAllInputs();

      const tx = psbt.extractTransaction();

      // build and broadcast to the Bitcoin RegTest network
      await regtestUtils.broadcast(tx.toHex());

      await regtestUtils.verify({
        txId: tx.getId(),
        address: regtestUtils.RANDOM_ADDRESS,
        vout: 0,
        value: 2e4,
      });
    },
  );

  it(
    'can create (and broadcast via 3PBP) a Transaction, w/ a ' +
      'P2SH(P2WSH(P2MS(3 of 4))) (SegWit multisig) input with nonWitnessUtxo',
    async () => {
      // For learning purposes, ignore this test.
      // REPEATING ABOVE BUT WITH nonWitnessUtxo by passing false to getInputData
      const p2sh = createPayment('p2sh-p2wsh-p2ms(3 of 4)');
      const inputData = await getInputData(
        5e4,
        p2sh.payment,
        false,
        'p2sh-p2wsh',
      );
      const psbt = new bitcoin.Psbt({ network: regtest })
        .addInput(inputData)
        .addOutput({
          address: regtestUtils.RANDOM_ADDRESS,
          value: 2e4,
        })
        .signInput(0, p2sh.keys[0])
        .signInput(0, p2sh.keys[2])
        .signInput(0, p2sh.keys[3]);
      psbt.finalizeAllInputs();
      const tx = psbt.extractTransaction();
      await regtestUtils.broadcast(tx.toHex());
      await regtestUtils.verify({
        txId: tx.getId(),
        address: regtestUtils.RANDOM_ADDRESS,
        vout: 0,
        value: 2e4,
      });
    },
  );

  it(
    'can create (and broadcast via 3PBP) a Transaction, w/ a ' +
      'P2SH(P2MS(2 of 2)) input with nonWitnessUtxo',
    async () => {
      const myKey = bitcoin.ECPair.makeRandom({ network: regtest });
      const myKeys = [
        myKey,
        bitcoin.ECPair.fromPrivateKey(myKey.privateKey!, { network: regtest }),
      ];
      const p2sh = createPayment('p2sh-p2ms(2 of 2)', myKeys);
      const inputData = await getInputData(5e4, p2sh.payment, false, 'p2sh');
      const psbt = new bitcoin.Psbt({ network: regtest })
        .addInput(inputData)
        .addOutput({
          address: regtestUtils.RANDOM_ADDRESS,
          value: 2e4,
        })
        .signInput(0, p2sh.keys[0]);
      psbt.finalizeAllInputs();
      const tx = psbt.extractTransaction();
      await regtestUtils.broadcast(tx.toHex());
      await regtestUtils.verify({
        txId: tx.getId(),
        address: regtestUtils.RANDOM_ADDRESS,
        vout: 0,
        value: 2e4,
      });
    },
  );

  it('can create (and broadcast via 3PBP) a Transaction, w/ a P2WPKH input using HD', async () => {
    const hdRoot = bip32.fromSeed(rng(64), NETWORK);
    const masterFingerprint = hdRoot.fingerprint;
    const path = "m/84'/0'/0'/0/0";
    const childNode = hdRoot.derivePath(path);
    const pubkey = childNode.publicKey;

    // This information should be added to your input via updateInput
    // You can add multiple bip32Derivation objects for multisig, but
    // each must have a unique pubkey.
    //
    // This is useful because as long as you store the masterFingerprint on
    // the PSBT Creator's server, you can have the PSBT Creator do the heavy
    // lifting with derivation from your m/84'/0'/0' xpub, (deriving only 0/0 )
    // and your signer just needs to pass in an HDSigner interface (ie. bip32 library)
    const updateData = {
      bip32Derivation: [
        {
          masterFingerprint,
          path,
          pubkey,
        },
      ],
    };
    const p2wpkh = createPayment('p2wpkh', [childNode]);
    const inputData = await getInputData(5e4, p2wpkh.payment, true, 'noredeem');
    {
      const { hash, index, witnessUtxo } = inputData;
      assert.deepStrictEqual({ hash, index, witnessUtxo }, inputData);
    }

    // You can add extra attributes for updateData into the addInput(s) object(s)
    Object.assign(inputData, updateData);

    const psbt = new bitcoin.Psbt({ network: regtest })
      .addInput(inputData)
      // .updateInput(0, updateData) // if you didn't merge the bip32Derivation with inputData
      .addOutput({
        address: regtestUtils.RANDOM_ADDRESS,
        value: 2e4,
      })
      .signInputHD(0, hdRoot); // must sign with root!!!

    assert.strictEqual(psbt.validateSignaturesOfInput(0), true);
    assert.strictEqual(
      psbt.validateSignaturesOfInput(0, childNode.publicKey),
      true,
    );
    psbt.finalizeAllInputs();

    const tx = psbt.extractTransaction();

    // build and broadcast to the Bitcoin RegTest network
    await regtestUtils.broadcast(tx.toHex());

    await regtestUtils.verify({
      txId: tx.getId(),
      address: regtestUtils.RANDOM_ADDRESS,
      vout: 0,
      value: 2e4,
    });
  });
});

function createPayment(_type: string, myKeys?: any[], network?: any): any {
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
}

function getWitnessUtxo(out: any): any {
  delete out.address;
  out.script = Buffer.from(out.script, 'hex');
  return out;
}

async function getInputData(
  amount: number,
  payment: any,
  isSegwit: boolean,
  redeemType: string,
): Promise<any> {
  const unspent = await regtestUtils.faucetComplex(payment.output, amount);
  const utx = await regtestUtils.fetch(unspent.txId);
  // for non segwit inputs, you must pass the full transaction buffer
  const nonWitnessUtxo = Buffer.from(utx.txHex, 'hex');
  // for segwit inputs, you only need the output script and value as an object.
  const witnessUtxo = getWitnessUtxo(utx.outs[unspent.vout]);
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
    hash: unspent.txId,
    index: unspent.vout,
    ...mixin,
    ...mixin2,
  };
}
