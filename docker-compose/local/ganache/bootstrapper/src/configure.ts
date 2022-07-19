import {BN} from "ethereumjs-util";
import {Environment} from "./environment";
import {DeployContractSpec, DeployContractSpecArg} from "./util/deployContract";
import * as fs from "fs";
import {RpcGateway} from "./util/rpcGateway";
import {createEoas, CreateEoaSpec} from "./util/createEoas";
import {createSafes, DeploySafeProxySpec} from "./util/createSafes";
import {createContracts} from "./util/createContracts";
import {generateConfig} from "./util/generateConfig";
import {createTrusts} from "./util/createTrusts";

const environment: Environment = {
  rpcGateway: "http://localhost:8545",
  dockerRpcGateway: "http://ganache-cli:8545",
  initialKey: "0x5bc6328efff9fc724aad89edf1356a6ba7bee56368b4b9b47b1f29a5cd6d73c7"
};
RpcGateway.gateway = environment.rpcGateway;


const eoas: CreateEoaSpec[] = [{
  name: "Invitation No. 1",
  type: "INVITATION",
  fundEoa: 0.25
}];

const contracts: DeployContractSpecArg[] = [{
  name: "Circles Hub",
  privateKey: environment.initialKey,
  path: "contracts/Hub.json",
  arguments: [
    new BN("107"),
    new BN("31556952"),
    'CRC',
    'Circles',
    new BN("50000000000000000000"),
    new BN("92592592592592"),
    new BN("7776000")
  ],
  postDeploy: async (spec) => {
    environment.hubContractAddress = spec.contractAddress?.toLowerCase();
    environment.hubContractBlockNo = spec.deployTransaction?.blockNumber;
  }
}, {
  name: "Gnosis Safe (mastercopy)",
  privateKey: environment.initialKey,
  path: "contracts/GnosisSafe.json",
  arguments: [],
  postDeploy: async (spec) => {
    environment.masterSafeAddress = spec.contractAddress?.toLowerCase();
  }
},{
  name: "Gnosis Safe Proxy Factory",
  privateKey: environment.initialKey,
  path: "contracts/GnosisSafeProxyFactory.json",
  arguments: [],
  postDeploy: async (spec) => {
    environment.proxyFactoryAddress = spec.contractAddress?.toLowerCase();
  }
},/*{
  name: "Human Token",
  privateKey: environment.initialKey,
  path: "contracts/Hmn.json",
  arguments: [],
  postDeploy: async (spec) => {
    environment.rewardTokenAddress = spec.contractAddress?.toLowerCase();
  }
},*/{
  name: "MultiSend",
  privateKey: environment.initialKey,
  path: "contracts/MultiSend.json",
  arguments: [],
  postDeploy: async (spec) => {
    environment.multiSendContractAddress = spec.contractAddress?.toLowerCase();
  }
},{
  name: "GroupCurrencyTokenFactory",
  privateKey: environment.initialKey,
  path: "contracts/GroupCurrencyTokenFactory.json",
  arguments: [],
  postDeploy: async (spec) => {
    environment.groupCurrencyTokenFactoryAddress = spec.contractAddress?.toLowerCase();
  }
}, () => {
  return <DeployContractSpec>{
    name: "Circles Hub v2",
    privateKey: environment.initialKey,
    path: "contracts/HubV2.json",
    arguments: [
      environment.hubContractAddress,
      new BN("107"),
      new BN("31556952"),
      'CRC',
      'Circles',
      new BN("50000000000000000000"),
      new BN("92592592592592"),
      new BN("7776000")
    ],
    postDeploy: async (spec) => {
      environment.hubContractV2Address = spec.contractAddress?.toLowerCase();
      environment.hubContractV2BlockNo = spec.deployTransaction?.blockNumber;
    }
  }
},
() => {
  return {
    name: "FollowTrustVerifier",
    privateKey: environment.initialKey,
    path: "contracts/FollowTrustVerifier.json",
    arguments: [
      environment.hubContractAddress, // trust hub (v1 hub)
      environment.hubContractV2Address, // token hub (v2 hub)
      "0x5f04d401150d94bdc287bba47fd713aedb018f90" // Follow trust "The ticket shop"
    ],
    postDeploy: async (spec) => {
      environment.followTrustVerifier = spec.contractAddress?.toLowerCase();
    }
  }
}];


const safes: DeploySafeProxySpec[] = [{
  name: "Operator organisation",
  createProfile: true,
  fundEoa: 10,
  fundSafe: 0,
  type: "ORGANISATION",
  postDeploy: async (spec) => {
    environment.operationOrgaAddress = spec.safeProxy?.address.toLowerCase();
  }
}, {
  name: "Invitation funds",
  fundEoa: 1,
  fundSafe: 10,
  type: "SAFE",
  postDeploy: async (spec) => {
    environment.invitationFundsAddress = spec.safeProxy?.address.toLowerCase();
    environment.invitationFundsKey = spec.privateKey;
  }
}, {
  name: "Rewards funds",
  fundEoa: 1,
  fundSafe: 0,
  type: "SAFE",
  postDeploy: async (spec) => {
    environment.rewardsFundsAddress = spec.safeProxy?.address.toLowerCase();
    environment.rewardsFundsKey = spec.privateKey;
  }
},
// The circle
{
  // A new v2 user (created in fuckit)
  refId: 1,
  name: "Elastic Johnson",
  createProfile: true,
  fundEoa: 1,
  type: "SAFE",
  //trusts: [2, 11, 6]
},{
  refId: 2,
  name: "Michael Ilyes",
  createProfile: true,
  fundEoa: 1,
  type: "PERSON",
  trusts: [3]
},{
  refId: 3,
  name: "Bethania Puteri",
  createProfile: true,
  fundEoa: 1,
  type: "PERSON",
  trusts: [4]
},{
  refId: 4,
  name: "Danutė Júlia",
  createProfile: true,
  fundEoa: 1,
  type: "PERSON",
  trusts: [5]
},{
  refId : 5,
  name: "Glinda Arya",
  createProfile: true,
  fundEoa: 1,
  type: "PERSON",
  //trusts: [1]
},
// The Peerson family
{
  refId : 6,
  name: "Peter Peerson",
  createProfile: true,
  fundEoa: 1,
  type: "PERSON",
  trusts: [7,8]
},{
  refId : 7,
  name: "Petra Peerson",
  createProfile: true,
  fundEoa: 1,
  type: "PERSON",
  trusts: [6,8]
},{
  refId : 8,
  name: "Michael Peerson",
  createProfile: true,
  fundEoa: 1,
  type: "PERSON",
  trusts: [6,7]
},
// The superstar
{
  refId : 9,
  name: "Ringo Star",
  createProfile: true,
  fundEoa: 1,
  type: "PERSON",
  trusts: [10, 11]
},
{
  refId : 10,
  name: "Sarah Groupie",
  createProfile: true,
  fundEoa: 1,
  type: "PERSON",
  trusts: [9, 11, 12]
},
{
  refId : 11,
  name: "Petra Groupie",
  createProfile: true,
  fundEoa: 1,
  type: "PERSON",
  trusts: [9, 10]
},
{
  refId : 12,
  name: "Aylin Groupie",
  createProfile: true,
  fundEoa: 1,
  type: "PERSON",
  trusts: [9, 10]
},
{
  refId : 13,
  name: "Hans Groupie",
  createProfile: true,
  fundEoa: 1,
  type: "PERSON",
  trusts: [9, 10]
},
{
  refId : 14,
  name: "Boris Groupie",
  createProfile: true,
  fundEoa: 1,
  type: "PERSON",
  trusts: [9]
},
{
  refId : 15,
  name: "Mike Groupie",
  createProfile: true,
  fundEoa: 1,
  type: "PERSON",
  trusts: [9]
}, {
    refId : 16,
    name: "The ticket shop",
    createProfile: true,
    fundEoa: 1,
    fundSafe: 0,
    type: "ORGANISATION",
    trusts: [9, 2, 8]
}, {
    refId : 17,
    name: "Amsterdam Coffee Company",
    createProfile: true,
    fundEoa: 1,
    fundSafe: 0,
    type: "ORGANISATION",
    trusts: [9, 14]
  }, {
    refId : 18,
    name: "Munich Beerhouse",
    createProfile: true,
    fundEoa: 1,
    fundSafe: 0,
    type: "ORGANISATION",
    trusts: [3, 15, 7]
  }];

const start = Date.now();

createEoas(environment, eoas)
  .then(async () => {
    return createContracts(contracts);
  })
  .then(async (createdContracts) => {
    const createdSafes = await createSafes(environment, safes);
    return {
      createdSafes,
      createdContracts
    };
  })
  .then(async (prev) => {
    const trustgraphSIF = await createTrusts(environment, prev.createdSafes);
    fs.writeFileSync("../../trustgraph.sif", Buffer.from(trustgraphSIF, "utf8"));
    return prev;
  })
  .then(async (prev) => {
    const config = await generateConfig(
      environment,
      eoas,
      prev.createdContracts,
      prev.createdSafes,
      20);

    fs.writeFileSync("../tests/safes.json.ts", Buffer.from(`export const safes = ${JSON.stringify(config.accountsAndSafes, null, 2)};`));
    fs.writeFileSync("../tests/contracts.json.ts", Buffer.from(`export const contracts = ${JSON.stringify(prev.createdContracts, null, 2)};`));
  });
