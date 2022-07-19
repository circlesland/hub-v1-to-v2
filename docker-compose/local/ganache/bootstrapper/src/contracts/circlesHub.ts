import Web3 from "web3";
import type { AbiItem } from "web3-utils";
import { BN } from "ethereumjs-util";
import type { TransactionReceipt } from "web3-core";
import {Web3Contract} from "./web3Contract";
import {GnosisSafeProxy} from "./gnosisSafeProxy";
import {SafeOps} from "./safeOps";
import {CIRCLES_HUB_ABI, ZERO_ADDRESS} from "../consts";

export class CirclesHub extends Web3Contract {
  constructor(web3: Web3, hubAddress: string) {
    super(
      web3,
      hubAddress,
      new web3.eth.Contract(<AbiItem[]>CIRCLES_HUB_ABI, hubAddress)
    );
  }

  async signup(
    privateKey: string,
    safeProxy: GnosisSafeProxy
  ): Promise<TransactionReceipt> {
    const txData = this.contract.methods.signup().encodeABI();

    return await safeProxy.execTransaction(privateKey, {
      to: this.address,
      data: txData,
      value: new BN("0"),
      refundReceiver: ZERO_ADDRESS,
      gasToken: ZERO_ADDRESS,
      operation: SafeOps.CALL,
    }, true);
  }

  async signupOrganisation(
    privateKey: string,
    safeProxy: GnosisSafeProxy
  ): Promise<TransactionReceipt> {
    const txData = this.contract.methods.organizationSignup().encodeABI();

    return await safeProxy.execTransaction(privateKey, {
      to: this.address,
      data: txData,
      value: new BN("0"),
      refundReceiver: ZERO_ADDRESS,
      gasToken: ZERO_ADDRESS,
      operation: SafeOps.CALL,
    }, true);
  }

  async setTrust(
    privateKey: string,
    safeProxy: GnosisSafeProxy,
    to: string,
    trustPercentage: BN
  ): Promise<TransactionReceipt> {
    const txData = this.contract.methods.trust(to, trustPercentage).encodeABI();

    const a = await safeProxy.execTransaction(privateKey, {
      to: this.address,
      data: txData,
      value: new BN("0"),
      refundReceiver: ZERO_ADDRESS,
      gasToken: ZERO_ADDRESS,
      operation: SafeOps.CALL,
    }, true);

    return await a;
  }

  async transferTrough(
    privateKey: string,
    safeProxy: GnosisSafeProxy,
    tokenOwners: string[],
    sources: string[],
    destinations: string[],
    values: BN[]
  ): Promise<TransactionReceipt> {
    const transfer = {
      tokenOwners: tokenOwners,
      sources: sources,
      destinations: destinations,
      values: values,
    };

    // TODO: Check the send limit for each edge with the hub contract
    /*
    const sendLimit = await this.contract.methods
      .checkSendLimit(_safeProxy.address, _safeProxy.address, to)
      .call();

    if (new BN(sendLimit).lt(amount))
      throw new Error("You cannot transfer " + amount.toString() + "units to " + to + " because the recipient doesn't trust your tokens.");
    */

    const txData = await this.contract.methods
      .transferThrough(
        transfer.tokenOwners,
        transfer.sources,
        transfer.destinations,
        transfer.values
      )
      .encodeABI();

    return await safeProxy.execTransaction(privateKey, {
      to: this.address,
      data: txData,
      value: new BN("0"),
      refundReceiver: ZERO_ADDRESS,
      gasToken: ZERO_ADDRESS,
      operation: SafeOps.CALL,
    }, true);
  }
}
