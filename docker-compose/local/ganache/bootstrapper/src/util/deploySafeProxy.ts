import {Environment} from "../environment";
import {RpcGateway} from "./rpcGateway";
import {GnosisSafeProxy} from "../contracts/gnosisSafeProxy";
import {GnosisSafeProxyFactory} from "../contracts/gnosisSafeProxyFactory";

export async function deploySafeProxy(environment: Environment, name:string, privateKey:string) : Promise<GnosisSafeProxy> {
  if (!environment.proxyFactoryAddress) {
    throw new Error(`The safe proxy factory isn't deployed yet. (!environment.proxyFactoryAddress)`)
  }
  if (!environment.masterSafeAddress) {
    throw new Error(`The master safe copy isn't deployed yet. (!environment.masterSafeAddress)`)
  }
  const safeFac = new GnosisSafeProxyFactory(RpcGateway.get(),
    environment.proxyFactoryAddress,
    environment.masterSafeAddress);

  return await safeFac.deployNewSafeProxy(privateKey);
}