import {HttpProvider} from "web3-core";
import {BN} from "ethereumjs-util";
const Web3 = require("web3");
import Common from "ethereumjs-common";

export class RpcGateway {
  static gateway = "";
  private static _web3?: typeof Web3;
  private static _provider?: HttpProvider;

  static get(): typeof Web3 {
    if (!this._web3) {
      this.init();
    }
    if (!this._web3) {
      throw new Error(`Couldn't create a web3 instance.`);
    }
    return this._web3;
  }

  static async getEthJsCommon(): Promise<Common> {
    return Common.forCustomChain(
      "mainnet",
      {
        name: "xDai",
        networkId: await this.get().eth.net.getId(),
        chainId: await this.get().eth.getChainId(),
      },
      "istanbul"
    );
  }

  private static _lastGasPrice?: {
    gasPriceInWei: BN;
    time: number;
  };

  static async getGasPrice() {
    const defaultGasPrice = 1;

    if (
      this._lastGasPrice &&
      this._lastGasPrice.time > Date.now() - 60 * 1000
    ) {
      return this._lastGasPrice.gasPriceInWei;
    }

    const gasPriceInWei = new BN(
      RpcGateway.get().utils.toWei(defaultGasPrice.toString(), "gwei")
    );

    this._lastGasPrice = {
      gasPriceInWei,
      time: Date.now(),
    };

    return gasPriceInWei;
  }

  static init() {
    if (!this._web3) {
      this._web3 = new Web3();
    }

    const nextProvider = this.gateway;
    this._provider = new Web3.providers.HttpProvider(
      nextProvider,
      {
        timeout: 30000
      }
    );
    this._web3.setProvider(this._provider);
  }
}
