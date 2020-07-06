import { UnspentTransaction } from '../../types/insight';
const fetch = require('node-fetch');

const APIURL = process.env.APIURL || 'https://testnet.ghostscan.io/ghost-insight-api';

export const testnetUtils = {
    async fetchTx(txid: string): Promise<any> {
       const response = await fetch(`${APIURL}/tx/${txid}`);
       const json =  await response.json();
       return json;
    },
    async fetchRawTx(txid: string): Promise<{rawtx: string}> {
        const response = await fetch(`${APIURL}/rawtx/${txid}`);
        const json =  await response.json();
        return json;
     },

    async fetchUnspents(address: string): Promise<UnspentTransaction[]> {
        const response = await fetch(`${APIURL}/addr/${address}/utxo`);
        const json =  await response.json();
        return json;
    },

    async fetchBalance(address: string): Promise<any> {
        const response = await fetch(`${APIURL}/addr/${address}`);
        const json =  await response.json();
        return json;
    },

    async broadcastRawTX(txRaw: string): Promise<any> {
    /*    const headers = new Headers();
        headers.append*/
        const body = JSON.stringify({rawtx: txRaw});
        const init: RequestInit = {
            method: 'POST',
            body,
            headers: { 'Content-Type': 'application/json' },
        };

        const request = new Request(`${APIURL}/tx/send`, init);
        const response = await fetch(request);
        const json =  await response.json();
        return json;
    },


}
