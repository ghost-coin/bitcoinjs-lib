import * as assert from 'assert';
import * as bip32 from 'bip32';
import * as bip39 from 'bip39';
import { describe, it } from 'mocha';
import * as bitcoin from '../..';

// Use Ghost network;
const NETWORK = bitcoin.networks.ghost;

function getAddress(node: any): string {
  return bitcoin.payments.p2pkh({ pubkey: node.publicKey, network: NETWORK }).address!;
}

describe('Ghost Network bitcoinjs-lib (BIP32) ', () => {

  it('can export a BIP32 xpriv, then import it', () => {
    const mnemonic =
      'praise you muffin lion enable neck grocery crumble super myself license ghost';
    const seed = bip39.mnemonicToSeedSync(mnemonic);
    const node = bip32.fromSeed(seed, NETWORK);
    const strng = node.toBase58();
    const restored = bip32.fromBase58(strng, NETWORK);

    assert.strictEqual(getAddress(node), getAddress(restored)); // same public key
    assert.strictEqual(node.toWIF(), restored.toWIF()); // same private key
  });

  it('can export a BIP32 xpub', () => {
    const mnemonic =
      'praise you muffin lion enable neck grocery crumble super myself license ghost';
    const seed = bip39.mnemonicToSeedSync(mnemonic);
    const node = bip32.fromSeed(seed, NETWORK);
    const strng = node.neutered().toBase58();

    assert.strictEqual(
      strng,
      'PGHSTWkosWm6uwa6fSxyff9eNr1j7bbqPeR9CPbELNM71wSRq4yCH3tkK1scbwypKiKWpBoFDbdZk6vLfRCFFtDumEpJzAZQPS4dqdmGVtz4JA18',
    );
  });

  it('can create a BIP32, ghost, account 0, external address', () => {
    const path = "m/0'/0/0";
    const root = bip32.fromSeed(
      Buffer.from(
        'dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
        'hex',
      ), NETWORK);

    const child1 = root.derivePath(path);

    // option 2, manually
    const child1b = root
      .deriveHardened(0)
      .derive(0)
      .derive(0);

    assert.strictEqual(
      getAddress(child1),
      'Gb8tb98LWmH98iq3bfYzASi519DPFXajNE',
    );
    assert.strictEqual(
      getAddress(child1b),
      'Gb8tb98LWmH98iq3bfYzASi519DPFXajNE',
    );
  });

  it('can create a BIP44, bitcoin, account 0, external address', () => {
    const root = bip32.fromSeed(
      Buffer.from(
        'dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
        'hex',
      ), NETWORK);

    const child1 = root.derivePath("m/44'/0'/0'/0/0");

    // option 2, manually
    const child1b = root
      .deriveHardened(44)
      .deriveHardened(0)
      .deriveHardened(0)
      .derive(0)
      .derive(0);

    assert.strictEqual(
      getAddress(child1),
      'GKJuLyLR71f7j6QHsHtaW7UWsD3t6niwMf',
    );
    assert.strictEqual(
      getAddress(child1b),
      'GKJuLyLR71f7j6QHsHtaW7UWsD3t6niwMf',
    );
  });

  it('can create a BIP49, ghost, account 0, external address', () => {
    const mnemonic =
      'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
    const seed = bip39.mnemonicToSeedSync(mnemonic);
    const root = bip32.fromSeed(seed, NETWORK);

    const path = "m/49'/1'/0'/0/0";
    const child = root.derivePath(path);

    const { address } = bitcoin.payments.p2sh({
      redeem: bitcoin.payments.p2wpkh({
        pubkey: child.publicKey,
        network: NETWORK,
      }),
      network: NETWORK,
    });
    assert.strictEqual(address, 'g7UR9T2sBxSYqkw7BzddBpKtUnRkmyhX9u');
  });

  it('can use BIP39 to generate BIP32 addresses', () => {
    // var mnemonic = bip39.generateMnemonic()
    const mnemonic =
      'praise you muffin lion enable neck grocery crumble super myself license ghost';
    assert(bip39.validateMnemonic(mnemonic));

    const seed = bip39.mnemonicToSeedSync(mnemonic);
    const root = bip32.fromSeed(seed, NETWORK);

    // receive addresses
    assert.strictEqual(
      getAddress(root.derivePath("m/0'/0/0")),
      'GTLKhibrDHgR1gPR6FNDhP9VXDDQr8LrWa',
    );
    assert.strictEqual(
      getAddress(root.derivePath("m/0'/0/1")),
      'GTU2D16nCrChsYsQwxrG2XG4b2LmADgDyQ',
    );

    // change addresses
    assert.strictEqual(
      getAddress(root.derivePath("m/0'/1/0")),
      'GKu4jcw2MYFvenQWrqsBNybrFHtFS21rnE',
    );
    assert.strictEqual(
      getAddress(root.derivePath("m/0'/1/1")),
      'GX1r9Byaoj7uX89LZrdhbPQDdarSGbWndG',
    );
  });
});
