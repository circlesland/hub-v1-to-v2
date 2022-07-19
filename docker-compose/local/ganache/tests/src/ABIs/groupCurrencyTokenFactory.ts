export const GROUP_CURRENCY_TOKEN_FACTORY_ABI = [
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "_address",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "_deployer",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "string",
        "name": "_name",
        "type": "string"
      }
    ],
    "name": "GroupCurrencyTokenCreated",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_hub",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_treasury",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_owner",
        "type": "address"
      },
      {
        "internalType": "uint8",
        "name": "_mintFeePerThousand",
        "type": "uint8"
      },
      {
        "internalType": "string",
        "name": "_name",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "_symbol",
        "type": "string"
      }
    ],
    "name": "createGroupCurrencyToken",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];
