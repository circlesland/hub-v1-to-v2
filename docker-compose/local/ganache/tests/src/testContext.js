"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestContext = void 0;
var contracts_json_1 = require("../contracts.json");
var safes_json_1 = require("../safes.json");
var ethers_1 = require("ethers");
var groupTokenFactoryInfo = contracts_json_1.contracts.find(function (o) { return o.name === "GroupCurrencyTokenFactory"; });
var hubContractInfo = contracts_json_1.contracts.find(function (o) { return o.name === "Circles Hub"; });
var operatorOrgaSafeInfo = safes_json_1.safes.find(function (o) { return o.name === "Operator organisation"; });
var provider = new ethers_1.ethers.providers.JsonRpcProvider({
    url: "http://localhost:8545",
});
var signer = new ethers_1.Wallet(operatorOrgaSafeInfo.privateKey, provider);
exports.TestContext = {
    signer: signer,
    provider: provider,
    groupTokenFactoryInfo: groupTokenFactoryInfo,
    hubContractInfo: hubContractInfo,
    operatorOrgaSafeInfo: operatorOrgaSafeInfo
};
