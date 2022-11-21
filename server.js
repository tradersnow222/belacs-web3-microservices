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
    const TENDERLY_FORK_API = `http://api.tenderly.co/api/v1/account/${TENDERLY_USER}/project/${TENDERLY_PROJECT}/fork`;
    const fromTokenAddress = req.body.fromTokenAddress;
    const toTokenAddress = req.body.toTokenAddress;
    const amount = req.body.amount;
    const fromAddress = req.body.fromAddress;
    const slippage = req.body.slippage;
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
    await axios.get(allowanceURL).then((response) => {
        allowance = response.data.allowance;
    }).catch((error) => {
        console.log(error);
    });

    // now we need to check if the allowance is enough
    if(allowance < amount){
        // we need to approve the token somehow...

        // TODO get approval

        const opts = {
            headers: {
                'X-Access-Key': TENDERLY_TOKEN,
            }
        }
        const body = {
            "network_id": chainID,
            "block_number": await provider.getBlockNumber(),
        }

        let forkResponse;
        await axios.post(TENDERLY_FORK_API, body, opts).then((response) => {
            forkResponse = response.data;
        }).catch((error) => {
            console.log(error);
        });

        console.log(forkResponse);
        // example fork response
        exampleForkResponse = {
            simulation_fork: {
              id: 'a46866e9-dee8-48ef-9236-2c441536109a',
              project_id: '896bd6a6-16fb-4b81-9824-18f83b7bd7f2',
              network_id: '1',
              block_number: 16014846,
              transaction_index: 0,
              chain_config: {
                type: 'ethereum',
                chain_id: 1,
                homestead_block: 1150000,
                dao_fork_block: 1920000,
                eip_150_block: 2463000,
                eip_150_hash: '0x2086799aeebeae135c246c65021c82b4e15a2c451340993aacfd2751886514f0',
                eip_155_block: 2675000,
                eip_158_block: 2675000,
                byzantium_block: 4370000,
                constantinople_block: 7280000,
                petersburg_block: 7280000,
                istanbul_block: 9069000,
                muir_glacier_block: 9200000,
                berlin_block: 12244000,
                london_block: 12965000,
                ethash: {}
              },
              fork_config: null,
              created_at: '2022-11-21T00:36:21.967114861Z',
              accounts: {
                '0x0E1E746Fb8e560638E701fDf948b4C5cAC53EcBb': '0x62e4927ca331097738d9d418e3a9aab5fe0b88ac50cae4f2f548427dbf146566',
                '0x1eb346c7A640A36113da509FB85fD591E517C81E': '0x2beb392b15255a6f1640d7d8d9cd3ed7f1467af73c56868c4eb0084c754c7981',
                '0x3787E5D2D163ee562214C4B28406f4768cf88030': '0xe7fc3dd78cc7d1e3ce353738002cbccad03fccd9444a4417f1f02ac68effae52',
                '0x43B278275f473403794b1A13fc1D76D5cB6F5E2D': '0xbead44dd7583ce9b493db64a1844dcc454b49b3a8ec2ce279d4f4336cca87b12',
                '0x4D0Da2bAD73298E8988e5319c56a4e512876234f': '0x0e71621e360abad341e314fc2b9cab86e099e7c1fd88e94f98da8eb7a290511c',
                '0x855E561Ea6f9DFD54Ddc59c97351335C377ad890': '0xa210da25dc2be70cd5f9212ab6a674a3c36051cc9e7b8789eaf1c4b6cac0a0eb',
                '0xB96679a85b304eaC3AfA89962b63Bdf36C5013AB': '0x13c2980a6d78bce46cf29e1e9318e55472c124a2a72ad8a7203b8e82b851e7f9',
                '0xD6172e5e82482dd64421c9632130f612fB50f0d8': '0x2d51ae9d411bca3df5f55d110bbfd9496d7d0277f1e07b594cbcce6344b41443',
                '0xE93b6b224d7bDfF7098B8654DcED453F197DF8e4': '0x4adb3eab855d70de89580dc09108a12fe2a1943bfc794134e608cf53796184f1',
                '0xc702Fe30eE6Ec08305d3717eAAf6Bb09126f38FF': '0xbd661ed45f08b2a0e19a20f9b3f1aef01e83c6cdfaca5941ce4974514815110f'
              }
            },
            root_transaction: {
              id: '40ec41b4-a652-496c-988e-04746a504daf',
              project_id: '896bd6a6-16fb-4b81-9824-18f83b7bd7f2',
              fork_id: 'a46866e9-dee8-48ef-9236-2c441536109a',
              alias: 'Initialization',
              description: 'Sets the balance of the fork accounts to 100ETH',
              internal: true,
              hash: '0xc5b2c658f5fa236c598a6e7fbf7f21413dc42e2a41dd982eb772b30707cba2eb',
              state_objects: [
                [Object], [Object],
                [Object], [Object],
                [Object], [Object],
                [Object], [Object],
                [Object], [Object]
              ],
              network_id: '1',
              block_number: 16014846,
              transaction_index: 0,
              from: '0x0000000000000000000000000000000000000000',
              to: '0x0000000000000000000000000000000000000000',
              input: '0x',
              gas: 30000000,
              l1_message_sender: '0x0000000000000000000000000000000000000000',
              l1_block_number: 0,
              l1_timestamp: 1668990981,
              gas_price: '0',
              value: '0',
              status: true,
              fork_height: 0,
              block_hash: '0xbf0f26a8af8bd2ead758feab5a4794b39a1bb882c687bbef5c94873782838b52',
              nonce: 0,
              receipt: {
                transactionHash: '0xc5b2c658f5fa236c598a6e7fbf7f21413dc42e2a41dd982eb772b30707cba2eb',
                transactionIndex: '0x0',
                blockHash: '0xbf0f26a8af8bd2ead758feab5a4794b39a1bb882c687bbef5c94873782838b52',
                blockNumber: '0xf45dff',
                from: '0x0000000000000000000000000000000000000000',
                to: '0x0000000000000000000000000000000000000000',
                cumulativeGasUsed: '0x0',
                gasUsed: '0x0',
                effectiveGasPrice: '0x0',
                contractAddress: null,
                logs: [],
                logsBloom: '0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
                status: '0x1',
                type: '0x0'
              },
              access_list: null,
              block_header: {
                number: '0xf45dfe',
                hash: '0x8e1da3af8c6d6c6d229b33efa1dde31837d659f33a9518ec23552d12b0b0bd94',
                stateRoot: '0x2ef156114937cc14886d85567f239cd33877d35c2b766d79b77eb025a8345755',
                parentHash: '0x0abaa44b98772f5cb6849b39999639cb40d60a3557d6c516a6752482622aa2c2',
                sha3Uncles: '0x1dcc4de8dec75d7aab85b567b6ccd41ad312451b948a7413f0a142fd40d49347',
                transactionsRoot: '0x511e9b8bd12e11087e7f5e48b6982e44d822003f045cf1f2a27d2cbab71bd8cb',
                receiptsRoot: '0x72378baf528719ee096376a2efb18f4e93b40e42374556a446bac5f6c885a1ac',
                logsBloom: '0xb9b1130751741088f0a85019a3257a395182455905129341009db86a5c00afb31d00b5280089349ac4655a40113917330a28d5081f9ef8140a7b0036f162340746d3917012a28c3c694356b9d52166f606326091cde9ca0181badc8a9a818d211aca06f4220b064038ce5a44294a28d802121059de280e641688eefb285e8d0457a5f5040a63971841edb5454b596e2602c0cc815588146945222c4165b42c1bbb10814b5981786a160fc880c8a086b61ef46a13384a0a03106a44612c2b07035519bd860a1f145a1d3e88221a1b33c520e8d267aa0f08bacb053d3b7904202a68f33d9e310199d292dd721182c98ad8bc280a6ad9cb07521039b892404a59c1',
                timestamp: '0x637ac7fb',
                difficulty: '0x0',
                gasLimit: '0x1c9c380',
                gasUsed: '0x1066e26',
                miner: '0x27f011c08be7b4bfd8a635d967274743a85c1588',
                extraData: '0x',
                mixHash: '0xae2e5ed6c46b15d5aff7e58e34342e9087a179e87b57ae3cb4bdbf00ab1c6eaa',
                nonce: '0x0000000000000000',
                baseFeePerGas: '0x23719e033',
                size: '0x0',
                totalDifficulty: '0x0',
                uncles: null,
                transactions: null
              },
              parent_id: '',
              created_at: '2022-11-21T00:36:21.974359032Z',
              timestamp: '2022-11-21T00:36:21.974359032Z',
              branch_root: false
            }
          }

          // Append the simulation_fork id to a file so we can delete them later

    } 
    else {
        // we can just call the swap API and simulate the transaction
        let inchBaseURL = `https://api.1inch.io/v5.0/${chainID}/swap`
        let inchURL = inchBaseURL + `?fromTokenAddress=${fromTokenAddress}&toTokenAddress=${toTokenAddress}&amount=${amount}&fromAddress=${fromAddress}&slippage=${slippage}&disableEstimate=true`;
        let inchResponse;
        await axios.get(inchURL).then((response) => {
            inchResponse = response.data.tx;
        }).catch((error) => {
            console.log(error);
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

        let simulateResponse;
        await axios.post(TENDERLY_SIMULATION_API, inchResponse, opts).then((response) => {
            simulateResponse = response.data;
        }).catch((error) => {
            console.log(error.response.data);
        });

        // now we can return the simulation id
        res.send({
            status: 200,
            details: {
                simulationID: simulateResponse.simulation.id,
                success: simulateResponse.simulation.status,
            }
        })
    }


}


app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});