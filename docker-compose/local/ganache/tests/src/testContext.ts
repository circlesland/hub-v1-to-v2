import {contracts} from "../contracts.json";
import {safes} from "../safes.json";
import {ethers, Wallet} from "ethers";

const groupTokenFactoryInfo = contracts.find(o => o.name === "GroupCurrencyTokenFactory");
const multiSendInfo = contracts.find(o => o.name === "MultiSend");
const safeMasterCopyInfo = contracts.find(o => o.name === "Gnosis Safe (mastercopy)");
const hubContractInfo = contracts.find(o => o.name === "Circles Hub");
const hubV2ContractInfo = contracts.find(o => o.name === "Circles Hub v2");
const safePRoxyFactoryInfo = contracts.find(o => o.name === "Gnosis Safe Proxy Factory");
const operatorOrgaSafeInfo = safes.find(o => o.name === "Operator organisation");
const collateralOwnerSafe1 = safes.find(o => o.name === "Elastic Johnson");
const collateralOwnerSafe2 = safes.find(o => o.name === "Michael Ilyes");
const ringosSafe = safes.find(o => o.name === "Ringo Star");
const followTrustVerifier = contracts.find(o => o.name === "FollowTrustVerifier");

const testProvider = new ethers.providers.JsonRpcProvider({
  url: "http://localhost:8545",
});
const johnsonsSigner = new Wallet(collateralOwnerSafe1.privateKey, testProvider);
const michaelsSigner = new Wallet(collateralOwnerSafe2.privateKey, testProvider);
const ringosSigner = new Wallet(ringosSafe.privateKey, testProvider);

export const TestContext = {
  johnsonsSigner: johnsonsSigner,
  michaelsSigner: michaelsSigner,
  ringosSigner: ringosSigner,
  provider: testProvider,
  groupTokenFactoryInfo,
  hubContractInfo,
  operatorOrgaSafeInfo,
  multiSendInfo,
  safeMasterCopyInfo,
  safeProxyFactoryInfo: safePRoxyFactoryInfo,
  hubV2ContractInfo,
  elasticJohnson: collateralOwnerSafe1,
  michael: collateralOwnerSafe2,
  followTrustVerifier
}
