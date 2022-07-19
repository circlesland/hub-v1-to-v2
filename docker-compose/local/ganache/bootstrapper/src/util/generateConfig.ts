import {RpcGateway} from "./rpcGateway";
import {Environment} from "../environment";
import {CreateEoaSpec} from "./createEoas";
import {DeploySafeProxySpec} from "./createSafes";
import {DeployContractSpec} from "./deployContract";
import {getKeyphrase} from "./getKeyphrase";
import {TransactionReceipt} from "web3-core";
import {Erc20} from "../contracts/erc20";

export async function generateConfig(
  environment:Environment,
  eoas: CreateEoaSpec[],
  contracts: DeployContractSpec[],
  safes: DeploySafeProxySpec[],
  runtimeInSec: number)
  : Promise<{
    accountsAndSafes: {
      id?: number
      type: string
      name: string
      ownerAddress?: string
      privateKey?: string
      safeAddress?: string
      keyphrase?: string
      eoaBalance?: string
      safeBalance?: string
      trusts?: number[]
      crcTokenAddress?:string
      crcTokenBalance?:string
    }[],
    contracts: {
      contractAddress?: string;
      name: string,
      privateKey: string,
      path: string,
      arguments: any[],
    }[]
  }> {

  console.log(``);
  console.log(`Environment:`);
  console.log(`---------------------------------------------`);
  let nameColWidth = Object.keys(environment).reduce((p, c) => Math.max(p, c.length), 0);
  for (let e of Object.entries(environment)) {
    console.log(`${e[0].padEnd(nameColWidth, " ")}: ${e[1]}`);
  }

  console.log(``);
  console.log(`Created EOAs:`);
  console.log(`---------------------------------------------`);
  nameColWidth = eoas.map(o => o.name.length).reduce((p, c) => Math.max(p, c), 0);
  for (let newEoa of eoas) {
    const acc = RpcGateway.get().eth.accounts.privateKeyToAccount(newEoa.privateKey);
    const {multilineKeyphrase, eoaBalance} = await getKeyphrase(nameColWidth + " EOA address:   ".length, acc);
    console.log(`${newEoa.name.padEnd(nameColWidth, " ")} EOA address:   ${newEoa.address?.toLowerCase()}`);
    console.log(`${"".padEnd(nameColWidth, " ")} EOA key:       ${newEoa.privateKey}`);
    console.log(`${"".padEnd(nameColWidth, " ")} EOA keyPhrase: ${multilineKeyphrase}`);
    console.log(`${"".padEnd(nameColWidth, " ")} EOA balance:   ${eoaBalance.toString()}`);
    console.log(`${"".padEnd(nameColWidth, " ")} Funding tx:    ${newEoa.fundEoaReceipt?.transactionHash}`);
    console.log(`---`);
  }

  let deployedContracts: {
    contractAddress?: string;
    name: string,
    privateKey: string,
    path: string,
    arguments: any[]
  }[] = [];

  console.log(``);
  console.log(`Created contracts:`);
  console.log(`---------------------------------------------`);
  nameColWidth = contracts.map(o => o.name.length).reduce((p, c) => Math.max(p, c), 0);
  for (let contract of contracts) {
    const acc = RpcGateway.get().eth.accounts.privateKeyToAccount(contract.privateKey);
    const {multilineKeyphrase, eoaBalance} = await getKeyphrase(nameColWidth + " Contract address: ".length, acc);

    console.log(`${contract.name.padEnd(nameColWidth, " ")} Contract address: ${contract.contractAddress?.toLowerCase()}`);
    console.log(`${"".padEnd(nameColWidth, " ")} EOA key:          ${contract.privateKey}`);
    console.log(`${"".padEnd(nameColWidth, " ")} EOA keyPhrase:    ${multilineKeyphrase}`);
    console.log(`${"".padEnd(nameColWidth, " ")} EOA balance:      ${eoaBalance.toString()}`);
    console.log(`${"".padEnd(nameColWidth, " ")} Deploy tx:        ${contract.deployTransaction?.transactionHash}`);
    console.log(`---`);

    deployedContracts.push({
      contractAddress: contract.contractAddress,
      name: contract.name,
      privateKey: contract.privateKey,
      path: contract.path,
      arguments: contract.arguments,
    });
  }

  let accountsAndSafes:{
    id?: number
    type: string
    name: string
    ownerAddress?: string
    privateKey?: string
    safeAddress?: string
    keyphrase?: string
    eoaBalance?: string
    safeBalance?: string
    trusts?: number[]
    crcTokenAddress?:string
    crcTokenBalance?:string
  }[] = [];
  console.log(``);
  console.log(`Created Safes:`);
  console.log(`---------------------------------------------`);
  nameColWidth = safes.map(o => o.name.length).reduce((p, c) => Math.max(p, c), 0);
  for (let newSafe of safes) {
    const acc = RpcGateway.get().eth.accounts.privateKeyToAccount(newSafe.privateKey?.replace("0x", ""));
    const {multilineKeyphrase, eoaBalance} = await getKeyphrase(nameColWidth + " Safe balance:    ".length, acc);
    const safeBalance = await RpcGateway.get().eth.getBalance(newSafe.safeProxy?.address.toLowerCase());
    console.log(`${newSafe.name.padEnd(nameColWidth, " ")} Safe address:    ${newSafe.safeProxy?.address.toLowerCase()}`);
    console.log(`${"".padEnd(nameColWidth, " ")} Safe balance:    ${safeBalance.toString()}`);
    console.log(`${"".padEnd(nameColWidth, " ")} Type:            ${newSafe.type}`);
    console.log(`${"".padEnd(nameColWidth, " ")} Owner address:   ${acc.address.toLowerCase()}`);
    console.log(`${"".padEnd(nameColWidth, " ")} Owner key:       ${acc.privateKey}`);
    console.log(`${"".padEnd(nameColWidth, " ")} Owner keyPhrase: ${multilineKeyphrase}`);
    console.log(`${"".padEnd(nameColWidth, " ")} Owner balance:   ${eoaBalance.toString()}`);
    console.log(`${"".padEnd(nameColWidth, " ")} Funding tx:      ${newSafe.fundEoaReceipt?.transactionHash}`);
    console.log(`${"".padEnd(nameColWidth, " ")} Signup tx:       ${newSafe.signupReceipt?.transactionHash}`);
    console.log(`---`);

    accountsAndSafes.push({
      id: newSafe.refId,
      type: newSafe.type,
      name: newSafe.name,
      ownerAddress: acc.address.toLowerCase(),
      privateKey: acc.privateKey,
      safeAddress: newSafe.safeProxy?.address.toLowerCase(),
      keyphrase: multilineKeyphrase,
      eoaBalance: eoaBalance.toString(),
      safeBalance: safeBalance.toString(),
      trusts: newSafe.trusts,
      crcTokenAddress: newSafe.tokenAddress,
      crcTokenBalance: (newSafe.tokenAddress
        ? (await new Erc20(RpcGateway.get(), newSafe.tokenAddress)
                  .getBalance(newSafe.safeProxy?.address??"0x0000000000000000000000000000000000000000"))
        : "0").toString(),
    });
  }

  return {
    accountsAndSafes: accountsAndSafes,
    contracts: deployedContracts
  }
}
