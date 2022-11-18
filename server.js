// API runnable on any EVM compatible blockchain to get the allowance of an address to all the contracts

const { ethers } = require("ethers");
const { BigNumber } = require("ethers");
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const cors = require("cors")
const fs = require("fs");
const { parse } = require("path");

app.use(bodyParser.json());
app.use(cors());

// save the examples html in a variable from the examples.html file
const INDEX_HTML = fs.readFileSync("./index.html", "utf8");
const ALLOWANCE_HTML = fs.readFileSync("./pages/allowance.html", "utf8");
const SWAPS_HTML = fs.readFileSync("./pages/swaps.html", "utf8");

const ETH_RPC = "https://mainnet.infura.io/v3/52aee165600a40718b05b78def0c0212";

const PORT = 3000;

// allowance ABI from ERC20
// This is a simplified Contract Application Binary Interface (ABI) of an ERC-20 Token Contract.
// It will expose only the methods: balanceOf(address), decimals(), symbol(), totalSupply(), and allowance(address, address)
const simplifiedABI = [
    {
        'inputs': [{'internalType': 'address', 'name': 'account', 'type': 'address'}],
        'name': 'balanceOf',
        'outputs': [{'internalType': 'uint256', 'name': '', 'type': 'uint256'}],
        'stateMutability': 'view', 'type': 'function', 'constant': true
    },
    {
        'inputs': [],
        'name': 'decimals',
        'outputs': [{'internalType': 'uint8', 'name': '', 'type': 'uint8'}],
        'stateMutability': 'view', 'type': 'function', 'constant': true
    },
    {
        'inputs': [],
        'name': 'symbol',
        'outputs': [{'internalType': 'string', 'name': '', 'type': 'string'}],
        'stateMutability': 'view', 'type': 'function', 'constant': true
    },
    {
        'inputs': [],
        'name': 'totalSupply',
        'outputs': [{'internalType': 'uint256', 'name': '', 'type': 'uint256'}],
        'stateMutability': 'view', 'type': 'function', 'constant': true
    },
    {
        "inputs":   [{"internalType": "address","name": "","type": "address"},{"internalType": "address","name": "","type": "address"}],
        "name": "allowance",
        "outputs": [{"internalType": "uint256","name": "","type": "uint256"}],
        "payable": false,
        "stateMutability": "view", "type": "function", "constant": true,
      }
]


/************************
 * These are the get endpoints
*************************/

app.get("/", (req, res) => {
    res.send(INDEX_HTML);
});

app.get("/allowances", sendAllowancePage);

app.get("/swaps", sendSwapsPage);

// expects the parameters "userAddress" and "tokenAddress"
app.get("/v1.0/:chainID/getSingleAllowance", getSingleAllowance);

// expects the parameters "userAddress"
app.get("/v1.0/:chainID/getAllAllowances", getAllAllowances);

/************************
 * These are the get functions
*************************/

function getSingleAllowance(req, res) {
    const { address, tokenAddress } = req.query;
    const { chainID } = req.params;
    let provider;
    switch (chainID) {
        case "1":
            provider = new ethers.providers.JsonRpcProvider(ETH_RPC);
            break;

        case "custom":
            provider = new ethers.providers.JsonRpcProvider(customRPC);
            break;
        default:
            provider = undefined;
    }

    if (provider === undefined) {
        res.status(400).send({
            status: 400,
            details: {
                msg: "Invalid chain ID",
                error: "bad request"
            }
        });
        return;
    }
    const contract = new ethers.Contract(tokenAddress, simplifiedABI, provider);
    // use a try catch to catch any errors if the address is not a valid erc20 token
    try {
        // resolve address if it's an ENS
        if(address.includes(".eth")){
            provider.resolveName(address).then((resolvedAddress) => {
                contract.allowance(resolvedAddress, tokenAddress).then((allowance) => {
                    res.status(200).send({
                        status: 200,
                        details: {
                            allowance: allowance.toString(),
                            tokenAddress: tokenAddress,
                            address: resolvedAddress
                        }
                    });
                });
            });
        } else {
            contract.allowance(address, tokenAddress).then((allowance) => {
                res.status(200).send({
                    status: 200,
                    details: {
                        allowance: allowance.toString(),
                        tokenAddress: tokenAddress,
                        address: address
                    }
                });
            });
        }
    } catch (error) { 
        res.send({ status: 400, details: { error: "bad request", msg: "Error: address is not a valid ERC20 token" } });
    }
}

function sendExamplePage(req, res) {
    res.send(EXAMPLES_HTML);
}

function sendAllowancePage(req, res) {
    res.send(ALLOWANCE_HTML);
}

function sendSwapsPage(req, res) {
    res.send(SWAPS_HTML);
}

function getAllAllowances(req, res) {
    const address = req.query.address;
    const customRPC = req.query.customRPC;
    const chainID = req.params.chainID;
    let provider;
    switch (chainID) {
        case "1":
            provider = new ethers.providers.JsonRpcProvider(ETH_RPC);
            break;

        case "custom":
            provider = new ethers.providers.JsonRpcProvider(customRPC);
            break;
        default:
            provider = undefined;
    }
    if(provider === undefined){
        res.status(400).send({
            status: 400,
            details: {
                msg: "Invalid chain ID",
                error: "bad request"
            }
        });
        return;
    }



    // we need to know when the address was first active
    // we can get this from the first transaction
    if(address.includes(".eth")){
        provider.resolveName(address).then((resolvedAddress) => {
            // get the block number of the latest block
            provider.getBlockNumber().then((latestBlock) => {
                // now we can build a filter to get all event logs from the first transaction to the latest block
                const filter = {
                    fromBlock: 'earliest', // WARNING INFURA CAN ONLY HANDLE 10K EVENT LOGS RETURNED, BOTS MAY HAVE MORE THAN THIS LIMIT
                    toBlock: latestBlock,
                    topics: [
                        ethers.utils.id("Approval(address,address,uint256)"), // topic encoded
                        ethers.utils.hexZeroPad(resolvedAddress, 32), // the owner
                        null // the spender

                    ],
                }
                // now we can get all the logs
                provider.getLogs(filter).then((logs) => {
                    // now we need to go through the logs and take the latest allowance for each "address"
                    let latestAllowances = {}; // this will be a one spender to many tokens and allowances and blocks
                    logs.forEach((log) => {
                        // get the token address
                        const tokenAddress = log.address;
                        // get the spender address
                        const spenderAddress = "0x" + log.topics[2].slice(26);
                        // get the allowance
                        const allowance = BigNumber.from(log.data);
                        // get the block number
                        const blockNumber = log.blockNumber;
                        
                        // check if the spender is already in the latestAllowances object
                        if(latestAllowances[spenderAddress] === undefined){
                            // if not, add it
                            latestAllowances[spenderAddress] = {};
                        }
                        // check if the token is already in the latestAllowances object
                        if(latestAllowances[spenderAddress][tokenAddress] === undefined){
                            // if not, add it
                            latestAllowances[spenderAddress][tokenAddress] = {};
                        }
                        // now we want to check if the block number is higher than the current block number
                        if(latestAllowances[spenderAddress][tokenAddress].blockNumber === undefined || latestAllowances[spenderAddress][tokenAddress].blockNumber < blockNumber){
                            // if it is, we want to update the allowance and block number
                            latestAllowances[spenderAddress][tokenAddress].allowance = allowance;
                            latestAllowances[spenderAddress][tokenAddress].blockNumber = blockNumber;
                        }
                    });
                    // now we can return the latestAllowances object
                    res.status(200).send({
                        status: 200,
                        details: {
                            address: resolvedAddress,
                            allowances: latestAllowances
                        }
                    });
                });
            });
        });
    } else {
        provider.getBlockNumber().then((latestBlock) => {
            // now we can build a filter to get all event logs from the first transaction to the latest block
            const filter = {
                fromBlock: 'earliest', // WARNING INFURA CAN ONLY HANDLE 10K EVENT LOGS RETURNED, BOTS MAY HAVE MORE THAN THIS LIMIT
                toBlock: latestBlock,
                topics: [
                    ethers.utils.id("Approval(address,address,uint256)"), // topic encoded
                    ethers.utils.hexZeroPad(address, 32), // the owner
                    null // this would be the spender, we can leave it as null or even nothing at all.
                ],
                address: address
            }

            // now we can get all the logs
            provider.getLogs(filter).then((logs) => {
                // now we need to go through the logs and take the latest allowance for each "address"
                let latestAllowances = {}; // this will be a tokenAddress : [{spender: address, allowance: number, blockNumber: number}, ...]
                const parsedLogs = logs.forEach((log) => {
                    // get the token address
                    const tokenAddress = log.address;
                    // get the spender address
                    const spenderAddress = "0x" + log.topics[2].slice(26);
                    // get the allowance
                    const allowance = BigNumber.from(log.data);
                    // get the block number
                    const blockNumber = log.blockNumber;
                    
                    // check if the token address is already in the latestAllowances object
                    if(latestAllowances[tokenAddress] === undefined){
                        // if it's not, add it
                        latestAllowances[tokenAddress] = [];
                    }
                    // now we can add the spender address, allowance, and block number to the array
                    latestAllowances[tokenAddress].push({
                        spender: spenderAddress,
                        allowance: allowance.toString(),
                        blockNumber: blockNumber
                    });
                });
                // now we can return the latestAllowances object
                res.status(200).send({
                    status: 200,
                    details: {
                        address: resolvedAddress,
                        allowances: latestAllowances
                    }
                });
            });
        });
    }
}



/************************
 * These are the post endpoints
*************************/


/************************
 * These are the post functions
*************************/


app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});