import {TestContext} from "./testContext";
import {safes} from "../safes.json";
import {BigNumber, ethers, Signer} from "ethers";
import EthersAdapter from '@gnosis.pm/safe-ethers-lib'
import Safe, {ContractNetworksConfig} from '@gnosis.pm/safe-core-sdk'
import {SafeTransactionOptionalProps} from '@gnosis.pm/safe-core-sdk'
import {MetaTransactionData} from '@gnosis.pm/safe-core-sdk-types'
import {OperationType} from "@gnosis.pm/safe-core-sdk-types/dist/src/types";
import {HUBV2_ABI} from "./ABIs/hubv2";
import {HUB_ABI} from "./ABIs/hub";
import {CRC_ABI} from "./ABIs/crc";
import {toUtf8Bytes} from "ethers/lib/utils";

const oneCrc = "1000000000000000000";
const tenCrc = oneCrc + "0";
const deadAddress = "0x000000000000000000000000000000000000dEaD";
const signupEventTopic = ethers.utils.keccak256(toUtf8Bytes("Signup(address,address)"));
const tokensMigratedEventTopic = ethers.utils.keccak256(toUtf8Bytes("TokensMigrated(address,address,address,uint256)"));
const transferV1TokenToV2HubEventTopic = ethers.utils.keccak256(toUtf8Bytes("Transfer(address,address,uint256)"));

async function sendAndMint(hubv2: string, v1Token: string, amount: BigNumber, safe: Safe) {
    const tokenInterface = new ethers.utils.Interface(CRC_ABI);
    const hubV2Interface = new ethers.utils.Interface(HUBV2_ABI);
    const transferCallData = tokenInterface.encodeFunctionData("transfer", [
        hubv2,
        amount
    ]);
    const mintCallData = hubV2Interface.encodeFunctionData("mint", [
        v1Token,
        amount
    ]);
    const transactions: MetaTransactionData[] = [{
        to: v1Token,
        data: transferCallData,
        value: "0x00",
        operation: OperationType.Call
    }, {
        to: hubv2,
        data: mintCallData,
        value: "0x00",
        operation: OperationType.Call
    }];

    const options: SafeTransactionOptionalProps = {}

    const transaction = await safe.createTransaction(transactions, options);
    await safe.signTransaction(transaction);

    const executeTxResponse = await safe.executeTransaction(transaction);
    const receipt = await executeTxResponse.transactionResponse.wait()
    return receipt;
}

async function execSafeTx(to: string, callData: string, safeSdk: Safe) {
    // Craft a tx that sends the "transfer" call to the CRC token contract
    const transactions: MetaTransactionData[] = [{
        to: to,
        data: callData,
        value: "0x00",
        operation: OperationType.Call
    }]

    const options: SafeTransactionOptionalProps = {}

    const transaction = await safeSdk.createTransaction(transactions, options);
    await safeSdk.signTransaction(transaction);

    const executeTxResponse = await safeSdk.executeTransaction(transaction);
    const receipt = await executeTxResponse.transactionResponse.wait()
    return receipt;
}

async function testMigration() {
    const johnsonsSafeInfo = safes.find(o => o.name === "Elastic Johnson");
    const johnsonsEthAdapter = new EthersAdapter({
        ethers,
        signer: TestContext.johnsonsSigner
    });

    const michaelsSafeInfo = safes.find(o => o.name === "Michael Ilyes");
    const michaelsEthAdapter = new EthersAdapter({
        ethers,
        signer: TestContext.michaelsSigner
    });

    const ringosSafeInfo = safes.find(o => o.name === "Ringo Star");
    const ringosEthAdapter = new EthersAdapter({
        ethers,
        signer: TestContext.ringosSigner
    });

    const id = await johnsonsEthAdapter.getChainId()
    const contractNetworks: ContractNetworksConfig = {
        [id]: {
            multiSendAddress: TestContext.multiSendInfo.contractAddress,
            safeMasterCopyAddress: TestContext.safeMasterCopyInfo.contractAddress,
            safeProxyFactoryAddress: TestContext.safeProxyFactoryInfo.contractAddress
        }
    }

    const johnsonsSafeSdk = await Safe.create({
        ethAdapter: johnsonsEthAdapter,
        safeAddress: johnsonsSafeInfo.safeAddress,
        contractNetworks: contractNetworks
    });

    const michaelsSafeSdk = await Safe.create({
        ethAdapter: michaelsEthAdapter,
        safeAddress: michaelsSafeInfo.safeAddress,
        contractNetworks: contractNetworks
    });

    const ringosSafeSdk = await Safe.create({
        ethAdapter: ringosEthAdapter,
        safeAddress: ringosSafeInfo.safeAddress,
        contractNetworks: contractNetworks
    });

    // Migrate Ringo's account
    await migrateTokens(ringosSafeSdk, ringosEthAdapter.getSigner());

    // Elastic johnson signs up at hubv1
    const hubV1Interface = new ethers.utils.Interface(HUB_ABI);
    const signupV1CallData = hubV1Interface.encodeFunctionData("signup", []);
    const signupV1Receipt = await execSafeTx(TestContext.hubContractInfo.contractAddress, signupV1CallData, johnsonsSafeSdk);
    console.log(signupV1Receipt);

    // Get the new token address from the receipt
    const signupLog = signupV1Receipt.logs.find(o => !!o.topics.find(p => p == signupEventTopic));
    const johsonsV1Token = signupLog.data.replace("000000000000000000000000", "");
    console.log("johsonsV1Token:", johsonsV1Token);

    const tokenInterface = new ethers.utils.Interface(CRC_ABI);
    // Elastic mints the remaining UBI of his token
    const getUbiCallData = tokenInterface.encodeFunctionData("update", []);
    const tokenMintedReceipt = await execSafeTx(johsonsV1Token, getUbiCallData, johnsonsSafeSdk);
    console.log(tokenMintedReceipt);

    // Elastic johnson stops his v1 token
    const stopTokenCallData = tokenInterface.encodeFunctionData("stop", []);
    const stopTokenReceipt = await execSafeTx(johsonsV1Token, stopTokenCallData, johnsonsSafeSdk);
    console.log(stopTokenReceipt);

    // Check if stopped
    const johnsonsV1TokenContract = new ethers.Contract(johsonsV1Token, CRC_ABI, TestContext.johnsonsSigner);
    const isStopped = await johnsonsV1TokenContract.stopped();
    console.log("testMigration.isStopped: ", isStopped);

    // Elastic johnson signs-up at hubv2
    const hubV2Interface = new ethers.utils.Interface(HUBV2_ABI);
    const migrateV2CallData = hubV2Interface.encodeFunctionData("migrate", []);
    const migrateV2Receipt = await execSafeTx(TestContext.hubV2ContractInfo.contractAddress, migrateV2CallData, johnsonsSafeSdk);
    console.log(migrateV2Receipt);

    // Get johnson's v2Token address
    const migrateV2Log = migrateV2Receipt.logs.find(o => !!o.topics.find(p => p == signupEventTopic));
    const johsonsV2Token = migrateV2Log.data.replace("000000000000000000000000", "");
    const johnsonsV2TokenContract = new ethers.Contract(johsonsV2Token, CRC_ABI, TestContext.johnsonsSigner);
    console.log("johsonsV2Token:", johsonsV2Token);

    // Check if the newly signed-up user trusts himself (100%)
    const hubv1 = new ethers.Contract(TestContext.hubContractInfo.contractAddress, HUB_ABI, TestContext.johnsonsSigner);
    const trustLimit = await hubv1.limits(johnsonsSafeSdk.getAddress(), johnsonsSafeSdk.getAddress());
    console.log("v2 user trusts himself:", trustLimit);

    // Send some of johnson's tokens to a different safe we control
    const spendSomeJohnsonTokensCallData = tokenInterface.encodeFunctionData("transfer", [
        TestContext.michael.safeAddress,
        BigNumber.from(tenCrc)
    ]);
    const spendSomeJohnsonTokensReceipt = await execSafeTx(johsonsV1Token, spendSomeJohnsonTokensCallData, johnsonsSafeSdk);
    console.log(spendSomeJohnsonTokensReceipt);

    // Get johnson's remaining balance of his own token
    const johnsonsBalance = await johnsonsV1TokenContract.balanceOf(johnsonsSafeSdk.getAddress());
    console.log("johnsonsBalance:", johnsonsBalance);

    // Send all of johnson's old tokens to the new hub
    const transferv1TokenToV2HubCallData = tokenInterface.encodeFunctionData("transfer", [
        TestContext.hubV2ContractInfo.contractAddress,
        johnsonsBalance
    ]);
    const transferV1TokenToV2HubReceipt = await execSafeTx(johsonsV1Token, transferv1TokenToV2HubCallData, johnsonsSafeSdk);
    const transferV1TokenToV2HubEventTopic = ethers.utils.keccak256(toUtf8Bytes("Transfer(address,address,uint256)"));
    const transferOldTokenLog = transferV1TokenToV2HubReceipt.logs.find(o => !!o.topics.find(p => p == transferV1TokenToV2HubEventTopic));
    console.log(transferOldTokenLog);

    // Get johnson's balance of his old and new tokens (johnson shouldn't have any of his old tokens. The hubv2 should have all instead)
    const johnsonsOldBalance = await johnsonsV1TokenContract.balanceOf(johnsonsSafeSdk.getAddress());
    console.log("johnsonsV1TokenBalance:", johnsonsOldBalance);
    const hubV2JohnsonBalance = await johnsonsV1TokenContract.balanceOf(TestContext.hubV2ContractInfo.contractAddress);
    console.log("hubV2JohnsonBalance:", hubV2JohnsonBalance);

    // Let johnson mint his new tokens at the hubv2
    const mintCallData = hubV2Interface.encodeFunctionData("mint", [
        johnsonsV1TokenContract.address,
        johnsonsBalance
    ]);
    const mintJohnsonsNewTokensReceipt = await execSafeTx(TestContext.hubV2ContractInfo.contractAddress, mintCallData, johnsonsSafeSdk);
    const tokensMigratedEventTopic = ethers.utils.keccak256(toUtf8Bytes("TokensMigrated(address,address,address,uint256)"));
    const tokensMigratedLog = mintJohnsonsNewTokensReceipt.logs.find(o => !!o.topics.find(p => p == tokensMigratedEventTopic));
    console.log(tokensMigratedLog);

    // Johnson should now have his old balance in new tokens + signup bonus
    const johnsonsSignupBonus = BigNumber.from("0x" + TestContext.hubV2ContractInfo.arguments[5]);
    console.log("johnsonsSignupBonus: ", johnsonsSignupBonus);

    const johnsonsNewV2Balance = await johnsonsV2TokenContract.balanceOf(johnsonsSafeSdk.getAddress());
    console.log("johnsonsNewV2Balance:", johnsonsNewV2Balance);

    const hubv2JohnsonV1Balance = await johnsonsV1TokenContract.balanceOf(TestContext.hubV2ContractInfo.contractAddress);
    console.log("hubv2JohnsonV1Balance:", hubv2JohnsonV1Balance);

    const burnAddressJohnsonV1Balance = await johnsonsV1TokenContract.balanceOf(deadAddress);
    console.log("burnAddressJohnsonV1Balance:", burnAddressJohnsonV1Balance);

    const balanceMinusBonus = johnsonsNewV2Balance.sub(johnsonsSignupBonus);
    console.log("balanceMinusBonus:", balanceMinusBonus);
    console.log("johnson's old Balance:", johnsonsBalance);

    // Michael should be able to exchange his one v1 JohnsonCRC to a v2 Johnson CRC
    const sendAndMintReceipt = await sendAndMint(
        TestContext.hubV2ContractInfo.contractAddress,
        johnsonsV1TokenContract.address,
        BigNumber.from(tenCrc),
        michaelsSafeSdk
    );
    console.log(sendAndMintReceipt);

    const transferMichaelsTokenToHubv2CallData = tokenInterface.encodeFunctionData("transfer", [
        TestContext.hubV2ContractInfo.contractAddress,
        BigNumber.from(tenCrc)
    ]);
    const transferMichaelsTokenReceipt = await execSafeTx(johnsonsV1TokenContract.address, transferMichaelsTokenToHubv2CallData, michaelsSafeSdk);
    console.log(transferMichaelsTokenReceipt);

    // Michael should now have no v1 johnson circles and the v2 hub should have it instead
    const michaelsJohnsonBalance = await johnsonsV1TokenContract.balanceOf(michaelsSafeInfo.safeAddress);
    console.log("michaelsJohnsonBalance: ", michaelsJohnsonBalance);
    const hubv2sJohnsonBalance = await johnsonsV1TokenContract.balanceOf(TestContext.hubV2ContractInfo.contractAddress);
    console.log("hubv2sJohnsonBalance: ", hubv2sJohnsonBalance);

    // Let michael mint johnson's new tokens at the hubv2
    const michaelMintCallData = hubV2Interface.encodeFunctionData("mint", [
        johnsonsV1TokenContract.address,
        BigNumber.from(tenCrc)
    ]);
    const michaelMintJohnsonsNewTokensReceipt = await execSafeTx(
        TestContext.hubV2ContractInfo.contractAddress, michaelMintCallData, johnsonsSafeSdk);
    const michaelTokensMigratedLog = michaelMintJohnsonsNewTokensReceipt.logs.find(o => !!o.topics.find(p => p == tokensMigratedEventTopic));
    console.log(michaelTokensMigratedLog);

    // Add a custom verifier for michael (follow trusts "The ticket shop - 0x5f04d401150d94bdc287bba47fd713aedb018f90")
    const useVerifierCallData = hubV2Interface.encodeFunctionData("useVerifier", [
        // verifier:
        TestContext.followTrustVerifier.contractAddress
    ]);
    const receipt = await execSafeTx(TestContext.hubV2ContractInfo.contractAddress, useVerifierCallData, michaelsSafeSdk);
    console.log(receipt);

    // Send money from "Ringo Star" to "Michael Ilyes" (who doesn't trust Ringo but follow trusts The ticket shop).
    // Use the hub transfer in conjunction with follow trust.
    const hubTransferCallData = hubV2Interface.encodeFunctionData("transferThrough", [
        /*
        address[] memory tokenOwners,
        address[] memory srcs,
        address[] memory dests,
        uint[] memory wads */
        [ringosSafeInfo.safeAddress],
        [ringosSafeInfo.safeAddress],
        [michaelsSafeSdk.getAddress()],
        [oneCrc]
    ]);

}

/**
 * Migrates a safe and all its holdings of its own tokens to the new version
 * @param safe
 * @param signer
 */
async function migrateTokens(safe:Safe, signer:Signer) : Promise<{
    v1TokenAddress:string,
    v2TokenAddress:string,
    balance: BigNumber
}> {
    const hubV1Contract = new ethers.Contract(TestContext.hubContractInfo.contractAddress, HUB_ABI, signer);
    const hubV2Interface = new ethers.utils.Interface(HUBV2_ABI);
    const tokenInterface = new ethers.utils.Interface(CRC_ABI);

    // Find the token of the supplied safe
    const v1TokenAddress = await hubV1Contract.userToToken(safe.getAddress());

    // Mint the remaining UBI so that all the available tokens will be converted to v2 tokens in the next step
    const getUbiCallData = tokenInterface.encodeFunctionData("update", []);
    const tokenMintedReceipt = await execSafeTx(v1TokenAddress, getUbiCallData, safe);
    console.log(`Minted remaining UBI for safe ${safe.getAddress()} (token: ${v1TokenAddress}): `, tokenMintedReceipt);

    // Stop the minting of new v1 tokens
    const stopTokenCallData = tokenInterface.encodeFunctionData("stop", []);
    const stopTokenReceipt = await execSafeTx(v1TokenAddress, stopTokenCallData, safe);
    console.log(`Stopped the minting of new UBI for token ${v1TokenAddress}: `, stopTokenReceipt);

    // Check if the minting was successfully stopped
    const v1TokenContract = new ethers.Contract(v1TokenAddress, CRC_ABI, TestContext.johnsonsSigner);
    const isStopped = await v1TokenContract.stopped();
    console.log(`Minting of token ${v1TokenAddress} is stopped: `, isStopped);

    // Sign up at the new hub using the "migrate" function
    const migrateV2CallData = hubV2Interface.encodeFunctionData("migrate", []);
    const migrateV2Receipt = await execSafeTx(TestContext.hubV2ContractInfo.contractAddress, migrateV2CallData, safe);
    console.log(`Signed ${safe.getAddress()} up at the v2 hub: `, migrateV2Receipt);

    // Get the address of the new v2 token
    const migrateV2Log = migrateV2Receipt.logs.find(o => !!o.topics.find(p => p == signupEventTopic));
    const v2TokenAddress = migrateV2Log.data.replace("000000000000000000000000", "");
    //const v2TokenContract = new ethers.Contract(v2TokenAddress, CRC_ABI, TestContext.johnsonsSigner);
    console.log("Got the v2 token address: ", v2TokenAddress);

    // Get the balance of the account's own token holdings
    const v1TokenHoldings = await v1TokenContract.balanceOf(safe.getAddress());
    console.log("v1 token holdings that need to be re-minted:", v1TokenHoldings);

    // Send all the v1 tokens to the new hub
    // TODO: This and the next step (mint) must be executed in the same transaction
    const transferv1TokenToV2HubCallData = tokenInterface.encodeFunctionData("transfer", [
        TestContext.hubV2ContractInfo.contractAddress,
        v1TokenHoldings
    ]);
    const transferV1TokenToV2HubReceipt = await execSafeTx(v1TokenAddress, transferv1TokenToV2HubCallData, safe);
    const transferOldTokenLog = transferV1TokenToV2HubReceipt.logs.find(o => !!o.topics.find(p => p == transferV1TokenToV2HubEventTopic));
    console.log(`Transferred ${v1TokenHoldings.toString()} v1 tokens to the v2 hub for conversion: `, transferOldTokenLog);

    // Mint the same amount of new v2 tokens
    // TODO: This and the previous step (transfer) must be executed in the same transaction
    const mintCallData = hubV2Interface.encodeFunctionData("mint", [
        v1TokenContract.address,
        v1TokenHoldings
    ]);
    const mintV2TokensReceipt = await execSafeTx(TestContext.hubV2ContractInfo.contractAddress, mintCallData, safe);
    const tokensMigratedLog = mintV2TokensReceipt.logs.find(o => !!o.topics.find(p => p == tokensMigratedEventTopic));
    console.log(`Minted ${v1TokenHoldings.toString()} new v2 tokens:`, tokensMigratedLog);

    return {
        v1TokenAddress: v1TokenAddress,
        v2TokenAddress: v2TokenAddress,
        balance: v1TokenHoldings
    };
}

testMigration().then(o => {
    console.log('Test fucked');
});