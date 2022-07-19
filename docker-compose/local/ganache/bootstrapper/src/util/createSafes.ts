import {RpcGateway} from "./rpcGateway";
import {TransactionReceipt} from "web3-core";
import {Environment} from "../environment";
import {fund} from "./fund";
import {deploySafeProxy} from "./deploySafeProxy";
import {GnosisSafeProxy} from "../contracts/gnosisSafeProxy";
import {CirclesHub} from "../contracts/circlesHub";

export type DeploySafeProxySpec = {
  refId?: number, // Can be used to identify the spec for trust links
  ownerAddress?: string;
  fundEoa?: number,
  fundSafe?: number,
  privateKey?: string,
  name: string,
  safeProxy?: GnosisSafeProxy,
  fundEoaReceipt?: TransactionReceipt,
  fundSafeReceipt?: TransactionReceipt,
  signupReceipt?: TransactionReceipt,
  type: "SAFE"|"PERSON"|"ORGANISATION",
  postDeploy?: (result:DeploySafeProxySpec) => Promise<void>,
  createProfile?: boolean,
  trusts?: number[] // Array of refIds of safes to trust
  tokenAddress?: string;
};

export async function createSafes(environment:Environment, safes:DeploySafeProxySpec[]) : Promise<DeploySafeProxySpec[]> {
  for (let newSafe of safes) {
    console.log("Processing DeploySafeProxySpec '" + newSafe.name + "'");
    const account = newSafe.privateKey
      ? RpcGateway.get().eth.accounts.privateKeyToAccount(newSafe.privateKey)
      : RpcGateway.get().eth.accounts.create();

    newSafe.privateKey = account.privateKey;

    if (newSafe.fundEoa) {
      console.log("  * " + `funding Safe Owner ${account.address.toLowerCase()} with ${newSafe.fundEoa} eth ...`);
      newSafe.fundEoaReceipt = await fund(environment.initialKey, account.address.toLowerCase(), newSafe.fundEoa);
    }
    console.log("  * " + `deploying Safe Proxy ...`);
    newSafe.safeProxy = await deploySafeProxy(environment, newSafe.name, account.privateKey);

    newSafe.ownerAddress = account.address.toLowerCase();
    console.log("    " + `address: ${newSafe.safeProxy.address.toLowerCase()}`);

    if (newSafe.fundSafe) {
      console.log("  * " + `funding Safe ${newSafe.safeProxy.address.toLowerCase()} with ${newSafe.fundSafe} eth ...`);
      newSafe.fundEoaReceipt = await fund(environment.initialKey, newSafe.safeProxy.address.toLowerCase(), newSafe.fundSafe);
    }

    if (!environment.hubContractAddress) {
      throw new Error(`The Circles Hub contract isn't deployed yet. (!environment.hubContractAddress)`)
    }
    const hub = new CirclesHub(RpcGateway.get(), environment.hubContractAddress);
    if (newSafe.type == "PERSON") {
      console.log("  * " + `signing up as Circles UBI account ...`);
      newSafe.signupReceipt = await hub.signup(account.privateKey, newSafe.safeProxy);
      const signupLog = newSafe.signupReceipt.logs.find(o => !!o.topics.find(p => p == "0x358ba8f768af134eb5af120e9a61dc1ef29b29f597f047b555fc3675064a0342"));
      const tokenAddress = signupLog?.data?.replace("000000000000000000000000", "");
      newSafe.tokenAddress = tokenAddress;
    } else if (newSafe.type == "ORGANISATION") {
      console.log("  * " + `signing up as Circles Organisation account ...`);
      newSafe.signupReceipt = await hub.signupOrganisation(account.privateKey, newSafe.safeProxy);
    } else {
      // Just keep it as a plain safe
    }
    if (newSafe.postDeploy) {
      await newSafe.postDeploy(newSafe);
    }
  }
  return safes;
}
