import {Environment} from "../environment";
import {DeploySafeProxySpec} from "./createSafes";

export async function generateTrustGraph(
  environment: Environment,
  safes: DeploySafeProxySpec[]
) :Promise<string> {
  const safesByRefId = safes.reduce((acc, safe) => {
    if (safe.refId) {
      acc[safe.refId] = [];
    }
    return acc;
  }, <{[refId:string]:string[]}>{});

  for(let safe of safes) {
    if (!safe.refId)
      continue;

    if (!safe.trusts)
      continue;

    for(let trustedSafe of safe.trusts) {
      safesByRefId[safe.refId].push(trustedSafe.toString());
    }
  }

  const sif:string[] = []
  Object.keys(safesByRefId).forEach(refId => {
    sif.push(`${refId} trusts ${safesByRefId[refId].join(" ")}`);
  });

  return sif.join("\n");
}
