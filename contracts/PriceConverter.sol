//SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

//Libraries cannot declare state variables. All the functions in a library must be internal.

library PriceConverter {
    function getPrice(AggregatorV3Interface priceFeed)
        internal
        view
        returns (uint256)
    {
        //We need to interact with a contract outside of our contract.
        //we need the ABI (Application Binary Interface) of the contract
        //we need the address of the contract -- 	0xD4a33860578De61DBAbDc8BFdb98FD742fA7028e -- Goerli ETH/USD address
        // AggregatorV3Interface priceFeed = AggregatorV3Interface(
        //     0xD4a33860578De61DBAbDc8BFdb98FD742fA7028e
        //);
        //(uint80 roundID, int price, uint staretedAt, uint timeStamp, uint80 answeredInRound) = priceFeed.latestRoundData();
        (, int256 price, , , ) = priceFeed.latestRoundData(); //only pulling the price. ETH in terms of USD. This returns the price with 8 decimal places. But msg.value will return ETH with 18 decimal places.
        //So we need to multiply the price with 1e10.
        return uint256(price * 1e10);
    }

    function getConversionRate(
        uint256 ethAmount,
        AggregatorV3Interface priceFeed
    ) internal view returns (uint256) {
        uint256 ethPrice = getPrice(priceFeed);
        uint256 ethAmountInUSD = (ethPrice * ethAmount) / 1e18; //ETH price is in Wei. So have to divide by 1e18.
        return ethAmountInUSD;
    }
}
