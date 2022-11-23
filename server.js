// API runnable on any EVM compatible blockchain to get the allowance of an address to all the contracts

const { ethers } = require("ethers");
const { BigNumber } = require("ethers");
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const cors = require("cors")
const fs = require("fs");
const axios = require('axios');
// const { parse } = require("path");

// store all the RPC endpoints here
const ETH_RPC = "https://mainnet.infura.io/v3/52aee165600a40718b05b78def0c0212"; //"https://cloudflare-eth.com";
const BSC_RPC = "https://bsc-dataseed.binance.org";
const MATIC_RPC = "https://rpc-mainnet.maticvigil.com";
const AVALANCHE_RPC = "https://api.avax.network/ext/bc/C/rpc";
const FANTOM_RPC = "https://rpcapi.fantom.network";
// const HECO_RPC = "https://http-mainnet.hecochain.com";
// const MOONBEAM_RPC = "https://rpc.testnet.moonbeam.network";
const XDAI_RPC = "https://rpc.xdaichain.com";
const ARBITRUM_RPC = "https://arb1.arbitrum.io/rpc";
// const CELO_RPC = "https://forno.celo.org";
const OPTIMISM_RPC = "https://mainnet.optimism.io";
// const OKEX_RPC = "https://exchainrpc.okex.org";
// const KCC_RPC = "https://rpc-mainnet.kcc.network";
// const HARMONY_RPC = "https://api.s0.b.hmny.io";
const AURORA_RPC = "https://mainnet.aurora.dev";
const KLAYTN_RPC = "https://node-api.klaytnapi.com/v1/klaytn";

const IMPORT_ERROR = 4001;
const ACCOUNT_ERROR = 4002;
const CHAIN_ERROR = 4003;
const RPC_ERROR = 4004;
const TOKEN_ERROR = 4005;
const SIMULATION_ERROR = 4006;
const AMOUNT_ERROR = 4007;
const RENDER_ERROR = 4008;
const REMOTE_ERROR = 4009;

const MAX_ALLOWANCE = "115792089237316195423570985008687907853269984665640564039457584007913129639935";

// read in the .env file as json
require('dotenv').config();
const {

    TENDERLY_TOKEN,
    TENDERLY_PROJECT,
    TENDERLY_USER,
    TENDERLY_FORK_RPC,

 } = process.env;

app.use(bodyParser.json());
app.use(cors());

// save the examples html in a variable from the examples.html file
const INDEX_HTML = fs.readFileSync("./index.html", "utf8");
const ALLOWANCE_HTML = fs.readFileSync("./pages/allowance.html", "utf8");
const SWAPS_HTML = fs.readFileSync("./pages/swaps.html", "utf8");

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
            const filter = {
                fromBlock: 'earliest', // WARNING INFURA CAN ONLY HANDLE 10K EVENT LOGS RETURNED, BOTS MAY HAVE MORE THAN THIS LIMIT
                toBlock: latestBlock,
                topics: [
                    ethers.utils.id("Approval(address,address,uint256)"), // topic encoded
                    ethers.utils.hexZeroPad(address, 32), // the owner
                    null // the spender
                ],
            }
            provider.getLogs(filter).then((logs) => {
                let latestAllowances = {};
                logs.forEach((log) => {
                    const tokenAddress = log.address;
                    const spenderAddress = "0x" + log.topics[2].slice(26);
                    const allowance = BigNumber.from(log.data);
                    const blockNumber = log.blockNumber;
                    if(latestAllowances[spenderAddress] === undefined){
                        latestAllowances[spenderAddress] = {};
                    }
                    if(latestAllowances[spenderAddress][tokenAddress] === undefined){
                        latestAllowances[spenderAddress][tokenAddress] = {};
                    }
                    if(latestAllowances[spenderAddress][tokenAddress].blockNumber === undefined || latestAllowances[spenderAddress][tokenAddress].blockNumber < blockNumber){
                        latestAllowances[spenderAddress][tokenAddress].allowance = allowance;
                        latestAllowances[spenderAddress][tokenAddress].blockNumber = blockNumber;
                    }
                }
                );
                res.status(200).send({
                    status: 200,
                    details: {
                        address: address,
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

app.post('/simulate',  bodyParser.urlencoded({ extended: false }),  simulate);

/************************
 * These are the post functions
*************************/

async function simulate(req, res) {

    const TENDERLY_SIMULATION_API = `https://api.tenderly.co/api/v1/account/${TENDERLY_USER}/project/${TENDERLY_PROJECT}/simulate`
    const TENDERLY_ENCODING_API = `https://api.tenderly.co/api/v1/account/${TENDERLY_USER}/project/${TENDERLY_PROJECT}/contracts/encode-states`
    // const TENDERLY_FORK_API = `http://api.tenderly.co/api/v1/account/${TENDERLY_USER}/project/${TENDERLY_PROJECT}/fork`; // we don't need this because /simulate has 
    const fromTokenAddress = req.body.fromTokenAddress;
    const toTokenAddress = req.body.toTokenAddress;
    const amount = req.body.amount;
    const fromAddress = req.body.fromAddress;
    const slippage = req.body.slippage == null ? 50 : req.body.slippage;
    const chainID = req.body.chainID;

    let provider;
    switch (chainID) {
        case "1":
            provider = new ethers.providers.JsonRpcProvider(ETH_RPC);
            break;
        case "10":
            provider = new ethers.providers.JsonRpcProvider(OVM_RPC);
            break;
        case "56":
            provider = new ethers.providers.JsonRpcProvider(BSC_RPC);
            break;
        case "137":
            provider = new ethers.providers.JsonRpcProvider(MATIC_RPC);
            break;
        case "250":
            provider = new ethers.providers.JsonRpcProvider(FANTOM_RPC);
            break;
        case "42161":
            provider = new ethers.providers.JsonRpcProvider(ARBITRUM_RPC);
            break;
        case "43114":
            provider = new ethers.providers.JsonRpcProvider(AVALANCHE_RPC);
            break;
    }

    //why don't we use our own getSingleAllowance function???? TODO
    const ALLOWANCE_GET_API = `https://api.1inch.io/v5.0/${chainID}/approve/allowance`
    // first lets call the allowance API
    const allowanceURL = ALLOWANCE_GET_API + "?tokenAddress=" + fromTokenAddress + "&walletAddress=" + fromAddress;
    let allowance;
    if(fromTokenAddress.toLowerCase() != '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'.toLowerCase())
        await axios.get(allowanceURL).then((response) => {
            allowance = response.data.allowance;
        }).catch((error) => {
            console.log(error);
        });

    // now we need to check if the allowance is enough
    if(allowance < amount && fromTokenAddress.toLowerCase() != '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'.toLowerCase()){
        // we need to approve the token somehow...
        // TODO get approval

        const opts = {
            headers: {
                'X-Access-Key': TENDERLY_TOKEN,
            }
        }

        let inchBaseURL = `https://api.1inch.io/v5.0/${chainID}/swap`
        let inchURL = inchBaseURL + `?fromTokenAddress=${fromTokenAddress}&toTokenAddress=${toTokenAddress}&amount=${amount}&fromAddress=${fromAddress}&slippage=${slippage}&disableEstimate=true`;
        let inchResponse;
        await axios.get(inchURL).then((response) => {
            inchResponse = response.data.tx;
        }).catch((error) => {
            console.log(error);
            res.send(
                {
                    "status": 400,
                    "details": {
                        "msg": "Error while calling 1inch API",
                        "error": SIMULATION_ERROR
                    }
                });
        });

        // modify the inchResponse here so we can pass it into the simulation API
        inchResponse.gas = 8000000;
        inchResponse.gasPrice = 0;
        inchResponse.input = inchResponse.data;
        inchResponse.block_number = null;
        inchResponse.save = true;
        inchResponse.network_id = chainID;
        inchResponse.simulation_type = "quick";
        // may not work for every token since some are not ERC20 standard
        let stateObjectKey_allowances = "_allowances[" + fromAddress.toLowerCase() + "][0x1111111254EEB25477B68fb85Ed929f73A960582]".toLowerCase();
        let stateObjectKeyAllowance = "allowance[" + fromAddress.toLowerCase() + "][0x1111111254EEB25477B68fb85Ed929f73A960582]".toLowerCase();
        // now we can encode the state object
        // let exampleRequest = {
        //     "networkID": "1",
        //     "blockNumber": "15999120",
        //     "stateOverrides": {
        //         "0x111111111117dc0aa78b770fa6a738034120c302": {
        //             "value": {
        //                 "_allowances[0x111111111117dC0aa78b770fA6A738034120C302][0x2ae41f46be3e8870d49bfd361b74ac5ad510c1e2]": "100000000000000000000000"
        //             }
        //         }
        //     }
        // }
        let blockNumber = await provider.getBlockNumber();
        // state overrides don't work with wETH :/ it also doesn't work for proxies sometimes (like USDC)
        // it also requires super specific variable naming, so even though it'd be better to use a fork that would be messy
        let stateObject = {
            "networkID": chainID,
            "blockNumber": blockNumber.toString(),
            "stateOverrides": {
                [fromTokenAddress]: {
                    "value": {
                        [stateObjectKey_allowances]: MAX_ALLOWANCE,
                        [stateObjectKeyAllowance]: MAX_ALLOWANCE
                            },
                        }
                    }
                };
        let encodedStateObject;
        await axios.post(TENDERLY_ENCODING_API, stateObject, opts).then((response) => {
            encodedStateObject = response.data;
            // console.log(JSON.stringify(encodedStateObject));
        }).catch((error) => {
            console.log(error);
            res.send(
                {
                    "status": 400,
                    "details": {
                        "msg": "Error while encoding state object",
                        "error": SIMULATION_ERROR
                    }
                });
        });


        
        //state_objects is a map[address]StateObject
        // but first stateOverrides[fromTokenAddress].value needs to be changed to stateOverrides[fromTokenAddress].storage
        encodedStateObject.stateOverrides[fromTokenAddress].storage = encodedStateObject.stateOverrides[fromTokenAddress].value;
        inchResponse.state_objects = encodedStateObject.stateOverrides


        await axios.post(TENDERLY_SIMULATION_API, inchResponse, opts).then((response) => {
            simulateResponse = response.data;
        }).catch((error) => {
            console.log(error);
            res.send({
                status: 400,
                details: {
                    msg: "Error simulating transaction",
                    error: SIMULATION_ERROR
                }

            })
        });

        // console.log(simulateResponse);
        if(simulateResponse.simulation.status === true){
            res.send({
                status: 200,
                details: {
                    msg: "Simulation Successful",
                    simulationID: simulateResponse.simulation.id,
                    success: simulateResponse.simulation.status,
                }
            })
        } else {
            res.send({
                status: 200,
                details: {
                    msg: "Simulation Failed, may require a fork or custom state override",
                    simulationID: simulateResponse.simulation.id,
                    success: simulateResponse.simulation.status,
                }
            })
        }

    } 
    else {
        // check if the from Token address isn't the same as the to Token address
        if (fromTokenAddress.toLowerCase() == toTokenAddress.toLowerCase()) {
            res.send(
                {
                    "status": 400,
                    "details": {
                        "msg": "From and To Tokens can't be the same",
                        "error": SIMULATION_ERROR
                    }
                }
            )
        }

        // we can just call the swap API and simulate the transaction
        let inchBaseURL = `https://api.1inch.io/v5.0/${chainID}/swap`
        let inchURL = inchBaseURL + `?fromTokenAddress=${fromTokenAddress}&toTokenAddress=${toTokenAddress}&amount=${amount}&fromAddress=${fromAddress}&slippage=${slippage}&disableEstimate=true`;
        let inchResponse;
        await axios.get(inchURL).then((response) => {
            inchResponse = response.data.tx;
        }).catch((error) => {
            console.log(error);
            res.send(
                {
                    "status": 400,
                    "details": {
                        "msg": "Error while calling 1inch API",
                        "error": SIMULATION_ERROR
                    }
                });
        });

        const opts = {
            headers: {
                'X-Access-Key': TENDERLY_TOKEN,
            }
        }

        inchResponse.gas = 8000000;
        inchResponse.gasPrice = 0;
        inchResponse.input = inchResponse.data;
        inchResponse.block_number = null;
        inchResponse.save = true;
        inchResponse.network_id = chainID;
        inchResponse.simulation_type = "quick"; // we don't need contract source code

        let simulateResponse;
        await axios.post(TENDERLY_SIMULATION_API, inchResponse, opts).then((response) => {
            simulateResponse = response.data;
        }).catch((error) => {
            console.log(error.response.data);
            res.send({
                "status": 400,
                "details": {
                    "msg": "Error while simulating the transaction",
                    "error": SIMULATION_ERROR
                }
            })
        });

        // now we can return the simulation id
        res.send({
            status: 200,
            details: {
                msg: "Simulation Successful",
                simulationID: simulateResponse.simulation.id,
                success: simulateResponse.simulation.status,
            }
        })
    }


}


app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});