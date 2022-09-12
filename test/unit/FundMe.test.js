const { assert, expect } = require("chai")
const { deployments, ethers, getNamedAccounts } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("FundMe", async function () {
          let fundMe
          let deployer
          let mockV3Aggregator
          const sendValue = ethers.utils.parseEther("1") //ParseEther makes the 1 into 1 ETH. utils here is not the utils folder. it's an ethers command/method.
          beforeEach(async function () {
              deployer = (await getNamedAccounts()).deployer // Tells ethers, which account we want connected to FundMe
              await deployments.fixture(["all"]) // the fixture method will deploy all the files inside the deploy folder. (notice the "all" tag)
              fundMe = await ethers.getContract("FundMe", deployer) //getContract will get the latest deployment of the contract we ask for. In this case, FundMe. deployer will connect
              //it with the deployer account
              mockV3Aggregator = await ethers.getContract(
                  "MockV3Aggregator",
                  deployer
              )
          })
          describe("constructor", async function () {
              //testing the constructor function
              it("sets the aggregator addresses correctly", async function () {
                  const response = await fundMe.getPriceFeed()
                  assert.equal(response, mockV3Aggregator.address)
              })
          })
          describe("fund", async function () {
              //testing the fund function
              it("Fails if you don't send enough ETH", async function () {
                  await expect(fundMe.fund()).to.be.revertedWith(
                      "Minimum not met"
                  )
              })
              it("Updates the amount donated data structure", async function () {
                  await fundMe.fund({ value: sendValue }) //funding the sendValue amount
                  const response = await fundMe.getAddressToAmount(deployer) //gives us the amount sent from the deployer address
                  assert.equal(response.toString(), sendValue.toString())
              })
              it("Adds donator to donators array", async function () {
                  await fundMe.fund({ value: sendValue })
                  const donator = await fundMe.getDonors(0)
                  assert.equal(donator, deployer) //donator should be the same as deployer
              })
          })
          describe("withdraw", async function () {
              beforeEach(async function () {
                  //another before each to fund the contract before we can test withdraw.
                  await fundMe.fund({ value: sendValue })
              })
              it("Withdraw Eth from a single donator", async function () {
                  //because this is a longer test, we need to arrange, act assert.
                  //Arrange
                  const startingFundMeBalance =
                      await fundMe.provider.getBalance(fundMe.address) //getting the balance of the contract after funding.
                  const startingDeployerBalance =
                      await fundMe.provider.getBalance(deployer) //getting the balance of the deployer(original founder) after funding.

                  //Act
                  const transactionResponse = await fundMe.withdraw() //calling the withdraw function
                  const transactionReceipt = await transactionResponse.wait(1)
                  const { gasUsed, effectiveGasPrice } = transactionReceipt //this syntax is used to pullout the objects in the curly BKTs from the object on the right.
                  const gasCost = gasUsed.mul(effectiveGasPrice) //.mul is like .add for multiplication of bigNumber type

                  //Assert
                  const endingfundMeBalance = await fundMe.provider.getBalance(
                      //ending balance of the contract after the withdraw function has been called.
                      fundMe.address
                  )
                  const endingDeployerBalance =
                      await fundMe.provider.getBalance(
                          //ending balance of the founder after withdraw. Should be equal to his starting balance + the withdrawn ammount (starting fundMe balance, after funding).
                          deployer
                      )

                  assert.equal(endingfundMeBalance, 0)
                  assert.equal(
                      startingFundMeBalance
                          .add(startingDeployerBalance)
                          .toString(), //using .add instead of "+" because startingFundMeBalance is of type "bigNumber" and .add works better.
                      endingDeployerBalance.add(gasCost).toString() //adding the gas cost because the deployer spent some gas to while calling the withdraw function.
                  )
              })
              it("allows us to withdraw ETH from multiple donators", async function () {
                  //arrange
                  const accounts = await ethers.getSigners()
                  for (let i = 1; i < 6; i++) {
                      //Not i = 0, because the zeroeth index is the deployer
                      const fundMeConnectedContract = await fundMe.connect(
                          //fundeMeConnectedContract is now associated with all the funders addresses
                          accounts[i]
                      )
                      await fundMeConnectedContract.fund({ value: sendValue })
                  }
                  const startingFundMeBalance =
                      await fundMe.provider.getBalance(fundMe.address)
                  const startingDeployerBalance =
                      await fundMe.provider.getBalance(deployer)

                  //Act
                  const transactionResponse = await fundMe.withdraw()
                  const transactionReceipt = await transactionResponse.wait(1)
                  const { gasUsed, effectiveGasPrice } = transactionReceipt
                  const gasCost = gasUsed.mul(effectiveGasPrice)

                  //Assert
                  const endingfundMeBalance = await fundMe.provider.getBalance(
                      fundMe.address
                  )
                  const endingDeployerBalance =
                      await fundMe.provider.getBalance(deployer)

                  assert.equal(endingfundMeBalance, 0)
                  assert.equal(
                      startingFundMeBalance
                          .add(startingDeployerBalance)
                          .toString(),
                      endingDeployerBalance.add(gasCost).toString()
                  )

                  //To make sure that the funders are reset properly
                  await expect(fundMe.getDonors(0)).to.be.reverted

                  for (let i = 1; i < 6; i++) {
                      assert.equal(
                          await fundMe.getAddressToAmount(accounts[i].address),
                          0
                      )
                  }
              })
              it("Only allows the owner to withdraw", async function () {
                  const accounts = await ethers.getSigners()
                  const attacker = accounts[1] //1st account, not the deployer.
                  const attackerConnectedContract = await fundMe.connect(
                      attacker
                  ) //connecting attacker account to fundMe
                  await expect(
                      attackerConnectedContract.withdraw()
                  ).to.be.revertedWith("Fundme__NotOwner") //they should not be able to withdraw
              })
              it("cheaperWithdraw testing", async function () {
                  //arrange
                  const accounts = await ethers.getSigners()
                  for (let i = 1; i < 6; i++) {
                      //Not i = 0, because the zeroeth index is the deployer
                      const fundMeConnectedContract = await fundMe.connect(
                          //fundeMeConnectedContract is now associated with all the funders addresses
                          accounts[i]
                      )
                      await fundMeConnectedContract.fund({ value: sendValue })
                  }
                  const startingFundMeBalance =
                      await fundMe.provider.getBalance(fundMe.address)
                  const startingDeployerBalance =
                      await fundMe.provider.getBalance(deployer)

                  //Act
                  const transactionResponse = await fundMe.cheaperWithdraw()
                  const transactionReceipt = await transactionResponse.wait(1)
                  const { gasUsed, effectiveGasPrice } = transactionReceipt
                  const gasCost = gasUsed.mul(effectiveGasPrice)

                  //Assert
                  const endingfundMeBalance = await fundMe.provider.getBalance(
                      fundMe.address
                  )
                  const endingDeployerBalance =
                      await fundMe.provider.getBalance(deployer)

                  assert.equal(endingfundMeBalance, 0)
                  assert.equal(
                      startingFundMeBalance
                          .add(startingDeployerBalance)
                          .toString(),
                      endingDeployerBalance.add(gasCost).toString()
                  )

                  //To make sure that the funders are reset properly
                  await expect(fundMe.getDonors(0)).to.be.reverted

                  for (let i = 1; i < 6; i++) {
                      assert.equal(
                          await fundMe.getAddressToAmount(accounts[i].address),
                          0
                      )
                  }
              })
          })
      })
