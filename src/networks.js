'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.bitcoin = {
  messagePrefix: '\x18Bitcoin Signed Message:\n',
  bech32: 'bc',
  bip32: {
    public: 0x0488b21e,
    private: 0x0488ade4,
  },
  pubKeyHash: 0x00,
  scriptHash: 0x05,
  wif: 0x80,
};
exports.ghost = {
  messagePrefix: '\x18Bitcoin Signed Message:\n',
  bech32: 'gp',
  bip32: {
    public: 0x68df7cbd,
    private: 0x8e8ea8ea,
  },
  pubKeyHash: 0x26,
  scriptHash: 0x61,
  wif: 0xa6,
};
exports.regtest = {
  messagePrefix: '\x18Bitcoin Signed Message:\n',
  bech32: 'bcrt',
  bip32: {
    public: 0x043587cf,
    private: 0x04358394,
  },
  pubKeyHash: 0x6f,
  scriptHash: 0xc4,
  wif: 0xef,
};
exports.testnet = {
  messagePrefix: '\x18Bitcoin Signed Message:\n',
  bech32: 'tb',
  bip32: {
    public: 0x043587cf,
    private: 0x04358394,
  },
  pubKeyHash: 0x6f,
  scriptHash: 0xc4,
  wif: 0xef,
};
exports.ghostRegtest = {
  messagePrefix: '\x18Bitcoin Signed Message:\n',
  bech32: 'ghost',
  bip32: {
    public: 0xe1427800,
    private: 0x04889478,
  },
  pubKeyHash: 0x76,
  scriptHash: 0x7a,
  wif: 0x2e,
};
exports.ghostTestnet = {
  messagePrefix: '\x18Bitcoin Signed Message:\n',
  bech32: 'tghost',
  bip32: {
    public: 0xe1427800,
    private: 0x04889478,
  },
  pubKeyHash: 0x4b,
  scriptHash: 0x89,
  wif: 0x2e,
};
