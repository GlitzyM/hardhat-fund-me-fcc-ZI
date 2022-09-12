//SPDX-License-Identifier: MIT

pragma solidity 0.8.9;

import "./PriceConverter.sol";

error Fundme__NotOwner();

/** @title A contract for crowdfunding
 *  @author Z Islam
 *  @notice This contract is to demo a sample funding contract
 *  @dev This impliments pricefeeds as our library
 */
contract FundMe {
    using PriceConverter for uint256;

    AggregatorV3Interface private s_priceFeed;

    address private immutable i_owner; //immutable works the same as "constant" to save gas. But it's use when the variable is assigned on a different line than where it's declared.
    uint256 public constant MIN_USD = 50 * 1e18; //we can use constant because the variable will not be reassigned. Saves gas. All caps for constant.
    address[] private s_donors;
    mapping(address => uint256) private s_addressToAmountDonated;

    modifier onlyOwner() {
        //require(msg.sender == i_owner, "You're Not the Owner");
        if (msg.sender != i_owner) {
            //using if instead of require for gas efficiency. NotOwner is declared before the contract line.
            revert Fundme__NotOwner();
        }
        _; //whenever used in a function, the underscore represents doing the rest of the code after the first line is validated.
    }

    constructor(address priceFeedAddress) {
        i_owner = msg.sender; //i for immutable. convention
        s_priceFeed = AggregatorV3Interface(priceFeedAddress);
    }

    receive() external payable {
        fund();
    }

    fallback() external payable {
        fund();
    }

    function fund() public payable {
        require(
            msg.value.getConversionRate(s_priceFeed) >= MIN_USD,
            "Minimum not met"
        ); //first parameter is msg.value(Eth amount), 2nd parameter is priceFeed.
        //require(getConversionRate(msg.value) >= MIN_USD, "Minimum not met"); //getconversion rate of msg.value will have to be larger than or equal to MIN_USD.
        //But get conversionrate of msg.value is in Wei. so the MIN_USD value has to be 1e18 times for the wei.
        s_donors.push(msg.sender);
        s_addressToAmountDonated[msg.sender] += msg.value;
    }

    function withdraw() public payable onlyOwner {
        //require(msg.sender == owner, "You're Not the Owner"); //to make this require statement reusable, we can use a modifier.
        //for loop in Solidity in sifferent than Javascript. /*for(strting index; condition; step)*/
        for (
            uint256 donorIndex = 0;
            donorIndex < s_donors.length;
            donorIndex++
        ) {
            //looping through all the donors.
            address donor = s_donors[donorIndex]; //donorIndex is like i in Javascript.
            s_addressToAmountDonated[donor] = 0; //setting the donors donation to zero, as the money has been withdrawn.
        }
        s_donors = new address[](0); //after all the ETh is withdrawn,  the donors array is set to a new array with 0 objects in it.
        //3 ways to withdraw funds:
        //transfer
        //payable(msg.sender).transfer(address(this).balance);
        //send
        //bool sendSuccess = payable(msg.sender).send(address(this).balance);
        //require(sendSuccess, "Send failure");
        //call --- the preferable one -- lower level function
        (bool callSuccess, ) = payable(msg.sender).call{
            value: address(this).balance
        }(""); //call takes 2 variables, bool and bytes. For withdrawal, we only need bool.
        require(callSuccess, "Call Failure");
    }

    function cheaperWithdraw() public payable onlyOwner {
        address[] memory donors = s_donors; //reading from the s_donors array 1 time and storing it in a memory instead of global storage.
        //mappings cannot be in memory!
        for (uint256 donorIndex = 0; donorIndex < donors.length; donorIndex++) {
            address donor = donors[donorIndex];
            s_addressToAmountDonated[donor] = 0; //mapping, so cannot be in memory
        }
        s_donors = new address[](0);

        (bool callSuccess, ) = payable(msg.sender).call{
            value: address(this).balance
        }("");
        require(callSuccess, "Call Failure");
    }

    //What happens when someone sends ETH to this contract without using the fund() function. How to keep track of the donors?
    //Fallback Function
    //Receive Function
    //with these functions, if someone sends us ETH without using the fund functions, the fund() function will still be triggered.

    //We made some of the variables private, so adding the following public view functions, so that anyone can call these to get the info from the blockchain.
    function getOwner() public view returns (address) {
        return i_owner;
    }

    function getDonors(uint256 index) public view returns (address) {
        return s_donors[index];
    }

    function getAddressToAmount(address donor) public view returns (uint256) {
        return s_addressToAmountDonated[donor];
    }

    function getPriceFeed() public view returns (AggregatorV3Interface) {
        return s_priceFeed;
    }
}
