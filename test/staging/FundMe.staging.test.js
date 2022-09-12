const { getNamedAccounts, ethers, network } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")
const { assert } = require("chai")

developmentChains.includes(network.name)
    ? describe.skip //another way of writing if statements. If the answer to the question is true, skip describe, else run it.
    : describe("FundMe", async function () {
          let fundMe
          let deployer
          let sendValue = ethers.utils.parseEther("0.15")

          beforeEach(async function () {
              deployer = (await getNamedAccounts()).deployer
              //not going to deploy with fixture like unit test, because this is on testnet so the contract should already be deployed. Also don't need Mock.
              fundMe = await ethers.getContract("FundMe", deployer)
          })

          it("allows people to fund and withdraw", async function () {
              await fundMe.fund({ value: sendValue })
              await fundMe.withdraw()
              const endingBalance = await fundMe.provider.getBalance(
                  fundMe.address
              )
              assert.equal(endingBalance.toString(), "0")
          })
      })
