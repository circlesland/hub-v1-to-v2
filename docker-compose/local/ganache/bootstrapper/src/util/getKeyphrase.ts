import * as bip39 from "bip39";
import {RpcGateway} from "./rpcGateway";

export async function getKeyphrase(padLeft: number, acc: {privateKey:string, address:string}) {
  const keyPhrase = bip39.entropyToMnemonic(acc.privateKey.replace("0x", ""));
  const words = keyPhrase.split(" ");
  const firstHalf = words.slice(0, 12);
  const secondHalf = words.slice(12, 24);
  const multilineKeyphrase = firstHalf.join(" ") + "\n" + "".padStart(padLeft) + secondHalf.join(" ");
  const eoaBalance = await RpcGateway.get().eth.getBalance(acc.address.toLowerCase());
  return {multilineKeyphrase, eoaBalance};
}