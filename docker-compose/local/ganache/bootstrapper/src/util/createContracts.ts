import {deployContract, DeployContractSpec, DeployContractSpecArg} from "./deployContract";

export async function createContracts(contracts:DeployContractSpecArg[]) : Promise<DeployContractSpec[]> {
  const r:DeployContractSpec[] = [];
  for (let contract of contracts) {
    const c = typeof contract === "function"
      ? contract()
      : contract;

    console.log("Processing DeployContractSpec '" + contract.name + "'");
    const result = await deployContract(c);
    c.deployTransaction = result.deployTransaction;
    c.contractAddress = result.contractAddress?.toLowerCase();
    if (c.postDeploy) {
      await c.postDeploy(c);
    }
    r.push(c);
  }
  return r;
}