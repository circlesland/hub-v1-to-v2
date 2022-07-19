import type {Contract} from "web3-eth-contract";
import {Transaction, TxData} from "ethereumjs-tx";
const Web3 = require("web3");
import type {TransactionReceipt} from "web3-core";
import {BN} from "ethereumjs-util";
import {RpcGateway} from "../util/rpcGateway";
import Common from "ethereumjs-common";

export abstract class Web3Contract {
    readonly web3: typeof Web3;
    readonly address: string;
    readonly contract: Contract;

    constructor(web3: typeof Web3, contractAddress: string, contractInstance: Contract) {
        if (!web3)
            throw new Error("The 'web3' parameter must be set.");
        if (!web3.utils.isAddress(contractAddress))
            throw new Error("The 'contractAddress' parameter is not a valid ethereum address.");
        if (!contractInstance)
            throw new Error("The 'contractInstance' parameter must have a valid value.");

        this.web3 = web3;
        this.address = contractAddress;
        this.contract = contractInstance;
    }

    static async signRawTransaction(ownerAddress: string, privateKey: string, to: string, data: string, gasLimit: BN, value: BN)
        : Promise<string> {
        const web3 = RpcGateway.get();
        const ethJsCommon: Common = await RpcGateway.getEthJsCommon();
        const nonce = "0x" + Web3.utils.toBN(await web3.eth.getTransactionCount(ownerAddress)).toString("hex");

        const rawTx: TxData = {
            gasPrice: "0x" + (await RpcGateway.getGasPrice()).toString("hex"),
            gasLimit: "0x" + gasLimit.toString("hex"),
            to: to,
            value: "0x" + value.toString("hex"),
            data: data,
            nonce: nonce
        };

        const txOptions = ethJsCommon
            ? {common: ethJsCommon}
            : {};

        const tx = new Transaction(rawTx, txOptions);
        tx.sign(Buffer.from(privateKey.slice(2), "hex"));

        return '0x' + tx.serialize().toString('hex');
    }

    static async sendSignedRawTransaction(serializedTx: string): Promise<TransactionReceipt> {
        const web3 = RpcGateway.get();
        return web3.eth.sendSignedTransaction(serializedTx);
    }
}
