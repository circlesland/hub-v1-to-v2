"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MULTI_SEND_ABI = void 0;
exports.MULTI_SEND_ABI = [
    {
        "constant": false,
        "inputs": [
            {
                "name": "transactions",
                "type": "bytes"
            }
        ],
        "name": "multiSend",
        "outputs": [],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "constructor"
    }
];
