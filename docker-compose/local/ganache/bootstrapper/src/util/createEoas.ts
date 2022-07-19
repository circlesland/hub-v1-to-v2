import {RpcGateway} from "./rpcGateway";
import {TransactionReceipt} from "web3-core";
import {Environment} from "../environment";
import {fund} from "./fund";

export type CreateEoaSpec = {
  name: string,
  privateKey?: string,
  address?: string,
  fundEoa: number,
  fundEoaReceipt?: TransactionReceipt,
  type: "EOA"|"INVITATION"
  postDeploy?: (result:CreateEoaSpec) => Promise<void>
};

export async function createEoas(environment: Environment, eoas:CreateEoaSpec[]) : Promise<CreateEoaSpec[]> {
  for (let eoa of eoas) {
    console.log("Processing CreateEoaSpec '" + eoa.name + "'");
    const account = eoa.privateKey
      ? RpcGateway.get().eth.accounts.privateKeyToAccount(eoa.privateKey)
      : RpcGateway.get().eth.accounts.create();

    eoa.privateKey = account.privateKey;

    eoa.address = account.address.toLowerCase();
    if (eoa.fundEoa) {
      console.log("  * " + `Funding ${account.address} with ${eoa.fundEoa} eth ..`);
      eoa.fundEoaReceipt = await fund(environment.initialKey, account.address.toLowerCase(), eoa.fundEoa);
    }
    if (eoa.postDeploy) {
      await eoa.postDeploy(eoa);
    }
  }
  return eoas;
}