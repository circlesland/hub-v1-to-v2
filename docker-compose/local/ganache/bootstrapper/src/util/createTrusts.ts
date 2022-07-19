import {Environment} from "../environment";
import {DeploySafeProxySpec} from "./createSafes";
import {CirclesHub} from "../contracts/circlesHub";
import {RpcGateway} from "./rpcGateway";
import {BN} from "ethereumjs-util";

function replaceAll (str:string, search:string, replacement:string) {
  return str.split(search).join(replacement);
}

export async function createTrusts(environment: Environment, safes: DeploySafeProxySpec[]) {
  if (!environment.hubContractAddress)
    throw new Error(`The Circles Hub contract isn't deployed yet. (!environment.hubContractAddress)`);

  const safesByRefId = safes.reduce((acc, safe) => {
    if (safe.refId) {
      acc[safe.refId] = safe;
    }
    return acc;
  }, <{[refId:string]:DeploySafeProxySpec}>{});

  const edges:string[] = [];

  for(let safe of safes) {
    if (!safe.trusts)
      continue;

    for(let trustRefId of safe.trusts) {
      const trustSafe = safesByRefId[trustRefId];

      if (!trustSafe)
        throw new Error(`Could not find safe with refId ${trustRefId}`);
      if (!trustSafe.safeProxy)
        throw new Error(`Safe with refId ${trustRefId} has no safe proxy`);
      if (!safe.safeProxy)
        throw new Error(`Safe with name ${safe.name} has no safe proxy`);
      if (!safe.privateKey)
        throw new Error(`Safe with name ${safe.name} has no private key`);

      const hub = new CirclesHub(RpcGateway.get(), environment.hubContractAddress);
      const trustResult = await hub.setTrust(
        safe.privateKey, safe.safeProxy, trustSafe.safeProxy.address, new BN("100"));

      console.log(`  * ${safe.name} trusts ${trustSafe.name}`);

      edges.push(`${replaceAll(safe.name, " ", "_")} trusts ${replaceAll(trustSafe.name, " ", "_")}`);
    }
  }

  return edges.join("\n");
}
