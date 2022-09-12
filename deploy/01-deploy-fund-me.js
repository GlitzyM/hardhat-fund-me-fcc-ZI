// function deployFunc() {
//   console.log("Hi!");
// }

const { networkConfig, developmentChains } = require("../helper-hardhat-config") //pulling out just the network config from the helper file.
const { network } = require("hardhat")
//same as the following
// const helperConfig = require("../helper-hardhat-config");
// const networkConfig = helperConfig.networkConfig
const { verify } = require("../utils/verify")

// module.exports.default = deployFunc;

//module.exports = async (hre) => {
module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy, log } = deployments // deploy and log are functions, we are pulling them out of deployment
    const { deployer } = await getNamedAccounts() //grab the deployer account from the namedAccounts in config file.
    const chainId = network.config.chainId
    //const { getNamedAccounts, deployments } = hre;
    //hre.getNamedAccounts

    //const ethUsdPriceFeedAddress = networkConfig[chainId]["ethUsdPriceFeed"];

    let ethUsdPriceFeedAddress
    if (developmentChains.includes(network.name)) {
        const ethUsdAggregator = await deployments.get("MockV3Aggregator")
        ethUsdPriceFeedAddress = ethUsdAggregator.address
    } else {
        ethUsdPriceFeedAddress = networkConfig[chainId]["ethUsdPriceFeed"]
    }

    const args = [ethUsdPriceFeedAddress]
    const fundMe = await deploy("FundMe", {
        from: deployer,
        args: args, //put priceFeed address
        log: true, //so we don't have to do console.log anymore
        waitConfirmations: network.config.blockConfirmations || 1,
    })

    if (
        !developmentChains.includes(network.name) &&
        process.env.ETHERSCAN_API_KEY
    ) {
        await verify(fundMe.address, args)
    }

    log("----------------------------------------------------------")
    // When going for localhost or hardhat network, we want to use a mock. If the contract doesn't exist, we deploy a minimal version of it for our local testing.
}

module.exports.tags = ["all", "fundme"]
