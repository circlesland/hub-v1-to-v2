import Web3 from "web3";
import type { AbiItem } from "web3-utils";
import {Web3Contract} from "./web3Contract";
import {ERC20_ABI} from "../consts";
import {BN} from "ethereumjs-util";

export class Erc20 extends Web3Contract {
  constructor(web3: Web3, tokenAddress: string) {
    super(
      web3,
      tokenAddress,
      new web3.eth.Contract(<AbiItem[]>ERC20_ABI, tokenAddress)
    );
  }

  async getBalance(ofAddress: string): Promise<BN> {
    return await this.contract.methods.balanceOf(ofAddress).call();
  }
}
