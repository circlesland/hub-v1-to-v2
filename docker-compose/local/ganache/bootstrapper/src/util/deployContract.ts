import {TransactionReceipt} from "web3-core";
import fs from "fs";
import {RpcGateway} from "./rpcGateway";

export type DeployContractSpecArg = (() => DeployContractSpec) | DeployContractSpec;

export type DeployContractSpec = {
  contractAddress?: string;
  deployTransaction?: TransactionReceipt;
  name: string,
  privateKey: string,
  path: string,
  arguments: any[],
  postDeploy?: (result:DeployContractSpec) => Promise<void>
};

export async function deployContract(specArg: DeployContractSpecArg) : Promise<{
  contractAddress: string
  deployTransaction: TransactionReceipt
}> {
  const materializedSpec:DeployContractSpec = typeof specArg === "function"
    ? specArg()
    : specArg;

  const contractFile = JSON.parse(fs.readFileSync(materializedSpec.path).toString());
  const bytecode = contractFile.bytecode;
  const abi = contractFile.abi;

  const contract = new (RpcGateway.get()).eth.Contract(abi);

  const deployContractTx = contract.deploy({
    data: bytecode,
    arguments: materializedSpec.arguments
  });

  // Sign Transaction and Send
  const acc = RpcGateway.get().eth.accounts.privateKeyToAccount(materializedSpec.privateKey);

  const createTransaction = await acc.signTransaction({
    data: deployContractTx.encodeABI(),
    gas: await deployContractTx.estimateGas()
  });

  // Send Tx and Wait for Receipt
  const createReceipt = await RpcGateway.get().eth.sendSignedTransaction(
    createTransaction.rawTransaction
  );

  return {
    contractAddress: createReceipt.contractAddress?.toLowerCase(),
    deployTransaction: createReceipt
  }
}