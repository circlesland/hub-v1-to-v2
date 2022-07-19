import type { AbiItem } from "web3-utils";
import Web3 from "web3";
import { BN } from "ethereumjs-util";
import type { TransactionReceipt } from "web3-core";
import {Web3Contract} from "./web3Contract";
import {EMPTY_DATA, GNOSIS_SAFE_ABI, ZERO_ADDRESS} from "../consts";
import {SafeOps} from "./safeOps";
import {SafeTransaction} from "./safeTransaction";
import {RpcGateway} from "../util/rpcGateway";
const EthLibAccount = require("eth-lib/lib/account");

export class GnosisSafeProxy extends Web3Contract {
  constructor(web3: Web3, safeProxyAddress: string) {
    super(
      web3,
      safeProxyAddress,
      new web3.eth.Contract(<AbiItem[]>GNOSIS_SAFE_ABI, safeProxyAddress)
    );
  }

  static queryPastSuccessfulExecutions(address: string) {
    return {
      event: "ExecutionSuccess",
      address: address,
      fromBlock: "earliest",
      toBlock: "latest",
    };
  }

  static readonly AddedOwnerEvent = "AddedOwner";
  static readonly ApproveHashEvent = "ApproveHash";
  static readonly ChangedMasterCopyEvent = "ChangedMasterCopy";
  static readonly ChangedThresholdEvent = "ChangedThreshold";
  static readonly DisabledModuleEvent = "DisabledModule";
  static readonly EnabledModuleEvent = "EnabledModule";
  static readonly ExecutionFailureEvent = "ExecutionFailure";
  static readonly ExecutionFromModuleFailureEvent =
    "ExecutionFromModuleFailure";
  static readonly ExecutionFromModuleSuccessEvent =
    "ExecutionFromModuleSuccess";
  static readonly ExecutionSuccessEvent = "ExecutionSuccess";
  static readonly RemovedOwnerEvent = "RemovedOwner";
  static readonly SignMsgEvent = "SignMsg";

  async getOwners(): Promise<string[]> {
    return await this.contract.methods.getOwners().call();
  }

  async addOwnerWithThreshold(
    privateKey: string,
    owner: string,
    threshold: number
  ) {
    const txData = await this.contract.methods
      .addOwnerWithThreshold(owner, new BN(threshold.toString()))
      .encodeABI();
    const receipt = await this.execTransaction(privateKey, {
      to: this.address,
      data: txData,
      value: new BN("0"),
      refundReceiver: ZERO_ADDRESS,
      gasToken: ZERO_ADDRESS,
      operation: SafeOps.CALL,
    });

    return receipt;
  }

  async removeOwner(privateKey: string, address: string) {
    const sentinel = "0x0000000000000000000000000000000000000001";
    const txData = await this.contract.methods
      .removeOwner(sentinel, address, new BN("1"))
      .encodeABI();

    const receipt = await this.execTransaction(privateKey, {
      to: this.address,
      data: txData,
      value: new BN("0"),
      refundReceiver: ZERO_ADDRESS,
      gasToken: ZERO_ADDRESS,
      operation: SafeOps.CALL,
    }, true);

    return receipt;
  }

  async getNonce(): Promise<number> {
    return parseInt(await this.contract.methods.nonce().call());
  }

  async transferEth(
    privateKey: string,
    value: BN,
    to: string
  ): Promise<TransactionReceipt> {
    const safeTransaction = <SafeTransaction>{
      value: value,
      to: to,
      operation: SafeOps.CALL,
      data: "0x",
      gasToken: ZERO_ADDRESS,
      refundReceiver: ZERO_ADDRESS,
      gasPrice: await RpcGateway.getGasPrice(),
    };
    return await this.execTransaction(privateKey, safeTransaction, true);
  }

  async execTransaction(
    privateKey: string,
    safeTransaction: SafeTransaction,
    dontEstimate?: boolean
  ): Promise<TransactionReceipt> {
    this.validateSafeTransaction(safeTransaction);

    const estimatedBaseGas = dontEstimate
      ? new BN(this.web3.utils.toWei("1000000", "wei"))
      : (await this.estimateBaseGasCosts(safeTransaction, 1)).add(
          new BN(this.web3.utils.toWei("100000", "wei"))
        );

    const estimatedSafeTxGas = dontEstimate
      ? new BN(this.web3.utils.toWei("1000000", "wei"))
      : (await this.estimateSafeTxGasCosts(safeTransaction)).add(
          new BN(this.web3.utils.toWei("100000", "wei"))
        );

    const nonce = await this.getNonce();

    const executableTransaction = <SafeTransaction>{
      to: safeTransaction.to,
      value: safeTransaction.value,
      data: safeTransaction.data,
      operation: safeTransaction.operation,
      safeTxGas: new BN("0"),
      baseGas: new BN("0"),
      gasToken: ZERO_ADDRESS,
      refundReceiver: ZERO_ADDRESS,
      nonce: nonce,
    };
    // console.log("executableTransaction:", executableTransaction);

    const transactionHash = await this.getTransactionHash(
      executableTransaction
    );
    //console.log("Transaction hash to sign: ", transactionHash);

    const signatures = GnosisSafeProxy.signTransactionHash(
      this.web3,
      privateKey,
      transactionHash
    );

    const gasPrice = await RpcGateway.getGasPrice();
    //console.log("Gas price:", gasPrice.toString());

    const gasEstimationResult = await this.contract.methods
      .execTransaction(
        executableTransaction.to,
        executableTransaction.value,
        executableTransaction.data,
        executableTransaction.operation,
        executableTransaction.safeTxGas,
        executableTransaction.baseGas,
        new BN("0"),
        executableTransaction.gasToken,
        executableTransaction.refundReceiver,
        signatures.signature
      )
      .estimateGas();
    // console.log("EstimateGas:", gasPrice.toString())

    const gasEstimate = new BN(gasEstimationResult)
      .add(estimatedBaseGas)
      .add(estimatedSafeTxGas);
    //console.log("gasEstimate:", gasEstimate.toNumber());

    const execTransactionData = await this.toAbiMessage(
      executableTransaction,
      signatures.signature
    );
    // console.log("execTransactionData:", execTransactionData);

    const acc = RpcGateway.get().eth.accounts.privateKeyToAccount(privateKey);
    const signedTransactionData = await Web3Contract.signRawTransaction(
      acc.address,
      privateKey,
      this.address,
      execTransactionData,
      gasEstimate,
      new BN("0")
    );

    // console.log("signedRawTransaction:", signedTransactionData);
    return Web3Contract.sendSignedRawTransaction(signedTransactionData);
  }

  private validateSafeTransaction(safeTransaction: SafeTransaction) {
    if (safeTransaction.safeTxGas && !BN.isBN(safeTransaction.safeTxGas))
      throw new Error(
        "The 'safeTxGas' property of the transaction is not a valid bn.js BigNum."
      );
    if (safeTransaction.baseGas && !BN.isBN(safeTransaction.baseGas))
      throw new Error(
        "The 'baseGas' property of the transaction is not a valid bn.js BigNum."
      );
    if (!BN.isBN(safeTransaction.value))
      throw new Error(
        "The 'value' property of the transaction is not a valid bn.js BigNum."
      );
    if (!safeTransaction.data.startsWith("0x"))
      throw new Error(
        "The 'data' property doesn't have a '0x' prefix and therefore is not a valid byteString."
      );
    if (!this.web3.utils.isAddress(safeTransaction.gasToken))
      throw new Error(
        "The 'gasToken' property doesn't contain a valid Ethereum address."
      );
    if (!this.web3.utils.isAddress(safeTransaction.to))
      throw new Error(
        "The 'to' property doesn't contain a valid Ethereum address."
      );
    if (!this.web3.utils.isAddress(safeTransaction.refundReceiver))
      throw new Error(
        "The 'refundReceiver' property doesn't contain a valid Ethereum address."
      );
    if (safeTransaction.nonce && !Number.isInteger(safeTransaction.nonce))
      throw new Error(
        "The 'nonce' property doesn't contain a javascript integer value."
      );
  }

  /**
   * Asks the safe to create a message hash for the supplied safeTransaction that can be signed
   * by the owners of the safe to authorize it.
   * @param safeTransaction
   */
  private async getTransactionHash(safeTransaction: SafeTransaction) {
    this.validateSafeTransaction(safeTransaction);

    return await this.contract.methods
      .getTransactionHash(
        safeTransaction.to,
        safeTransaction.value,
        safeTransaction.data,
        safeTransaction.operation,
        safeTransaction.safeTxGas,
        safeTransaction.baseGas,
        new BN("0"),
        safeTransaction.gasToken,
        safeTransaction.refundReceiver,
        safeTransaction.nonce
      )
      .call();
  }

  private async estimateSafeTxGasCosts(
    safeTransaction: SafeTransaction
  ): Promise<BN> {
    // from https://github.com/gnosis/safe-react -> /src/logic/safe/transactions/gasNew.ts
    this.validateSafeTransaction(safeTransaction);

    const estimateDataCallData = this.contract.methods
      .requiredTxGas(
        safeTransaction.to,
        safeTransaction.value,
        safeTransaction.data,
        safeTransaction.operation
      )
      .encodeABI();

    let txGasEstimation = new BN("0");

    await this.web3.eth
      .call({
        from: this.address,
        to: this.address,
        data: estimateDataCallData,
      })
      .catch((e:Error & { data: string }) => {
        // TODO: This is a quick fix because xdai.poanetwork.dev updated their geth version
        //       and it now returns other revert messages.
        //       Consider all other major gateways in future.
        console.error(e);
        if (
          e.data &&
          e.data.startsWith("Reverted 0x") /* && e.data.length == 211*/
        ) {
          const revertMessageHexPart = e.data.replace("Reverted 0x", "");
          txGasEstimation = new BN(revertMessageHexPart, 16);
        } else if (
          e.data &&
          e.data.startsWith("revert: ") &&
          e.data.length == 40
        ) {
          const gasEstimateDataBuffer = Buffer.from(
            e.data.toString().substr(8)
          );
          txGasEstimation = new BN(gasEstimateDataBuffer);
        } else {
          console.warn(
            `Expected a 'revert'-error with the estimated gas cost in the 'data'-property.`
          );
          throw new Error(JSON.stringify(e));
        }
      });

    if (txGasEstimation.eq(new BN("0")))
      throw new Error(
        "The safe's txGas cost estimation function should always fail with a 'revert' error that contains the cost from character 11 on."
      );

    const dataGasEstimation = this.estimateDataGasCosts(
      safeTransaction.data
    ).add(new BN("21000"));

    return txGasEstimation.add(dataGasEstimation);
  }

  private async estimateBaseGasCosts(
    safeTransaction: SafeTransaction,
    signatureCount: number
  ): Promise<BN> {
    const abiMessage = await this.toAbiMessage(safeTransaction);
    const dataGasCosts = this.estimateDataGasCosts(abiMessage);
    const signatureCosts =
      signatureCount == 0
        ? new BN(0)
        : GnosisSafeProxy.estimateSignatureCosts(signatureCount);

    return dataGasCosts.add(signatureCosts);
  }

  private static estimateSignatureCosts(signatureCount: number): BN {
    // (array count (3 -> r, s, v) + ecrecover costs) * signature count;
    return new BN(signatureCount * (68 + 2176 + 2176 + 6000));
  }

  private async toAbiMessage(
    safeTransaction: SafeTransaction,
    signatures?: string
  ) {
    this.validateSafeTransaction(safeTransaction);

    return this.contract.methods
      .execTransaction(
        safeTransaction.to,
        safeTransaction.value,
        safeTransaction.data,
        safeTransaction.operation,
        safeTransaction.safeTxGas ?? new BN("0"),
        safeTransaction.baseGas ?? new BN("0"),
        new BN("0"),
        safeTransaction.gasToken,
        safeTransaction.refundReceiver,
        signatures ?? "0x"
      )
      .encodeABI();
  }

  private estimateDataGasCosts(data: string): BN {
    const reducer = (accumulator: any, currentValue: string) => {
      if (currentValue === EMPTY_DATA) {
        return accumulator + 0;
      }

      if (currentValue === "00") {
        return accumulator + 4;
      }

      return accumulator + 16;
    };

    return new BN(data.match(/.{2}/g)?.reduce(reducer, 0));
  }

  private static signTransactionHash(
    web3: Web3,
    safeOwnerPrivateKey: string,
    transactionHash: string
  ) {
    const signature = EthLibAccount.sign(transactionHash, safeOwnerPrivateKey);
    const vrs = EthLibAccount.decodeSignature(signature);

    return {
      signature,
      r: web3.utils.toBN(vrs[1]).toString("hex"),
      s: web3.utils.toBN(vrs[2]).toString("hex"),
      v: web3.utils.toDecimal(vrs[0]), // Leave the 'v' value at 27 or 28 to get into the EOA verification in GnosisSafe.sol:255
    };
  }
}
