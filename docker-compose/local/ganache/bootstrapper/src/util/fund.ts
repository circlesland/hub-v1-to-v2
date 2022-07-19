import {TransactionReceipt} from "web3-core";
import {BN} from "ethereumjs-util";
import {RpcGateway} from "./rpcGateway";

export async function fund(funderKey: string, address:string, amount: number) : Promise<TransactionReceipt> {
  const ownerAcc = RpcGateway.get().eth.accounts.privateKeyToAccount(funderKey);
  const signedTransaction = await ownerAcc.signTransaction({
    from: ownerAcc.address,
    to: address,
    value: new BN(RpcGateway.get().utils.toWei(amount.toString(), "ether")),
    gasPrice: new BN("2000000000"),
    gas: new BN("50000")
  });
  return RpcGateway.get().eth.sendSignedTransaction(signedTransaction.rawTransaction);
}
