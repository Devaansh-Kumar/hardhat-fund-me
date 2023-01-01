const { assert, expect } = require("chai");
const { deployments, ethers, getNamedAccounts } = require("hardhat");
const { developmentChains } = require("../../helper-hardhat-config");

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("FundMe", async () => {
  let fundMe;
  let deployer;
  let mockV3Aggregator;
  const sendValue = ethers.utils.parseEther("1");
  beforeEach(async () => {
    //deploy using hardhat deploy
    deployer = (await getNamedAccounts()).deployer;
    // const accounts = await ethers.getSigners();

    await deployments.fixture(["all"]);
    fundMe = await ethers.getContract("FundMe", deployer);
    mockV3Aggregator = await ethers.getContract("MockV3Aggregator", deployer);
  });

  describe("Constructor", async () => {
    it("sets the aggregator address correctly", async () => {
      const response = await fundMe.getPriceFeed();
      assert.equal(response, mockV3Aggregator.address);
    });
  });

  describe("Fund", async () => {
    it("Fails if you don't send enough ETH", async () => {
      await expect(fundMe.fund()).to.be.revertedWith(
        "You need to spend more ETH!"
      );
    });

    it("Updates the amountFunded data structure", async () => {
      await fundMe.fund({ value: sendValue });
      const response = await fundMe.getAddressToAmountFunded(deployer);
      assert.equal(response.toString(), sendValue.toString());
    });

    it("Adds funder to array of funders", async () => {
      await fundMe.fund({ value: sendValue });
      const response = await fundMe.getFunders(0);
      assert.equal(response, deployer);
    });
  });

  describe("withdraw", async () => {
    beforeEach(async () => {
      await fundMe.fund({ value: sendValue });
    });

    it("withdraw ETH from a single founder", async () => {
      const startingFundMeBalance = await fundMe.provider.getBalance(
        fundMe.address
      );
      const startingDeployerBalance = await fundMe.provider.getBalance(
        deployer
      );

      const transactionResponse = await fundMe.withdraw();
      const transactionReceipt = await transactionResponse.wait(1);
      const { gasUsed, effectiveGasPrice } = transactionReceipt;
      const gasCost = gasUsed.mul(effectiveGasPrice);

      const endingFundMeBalance = await fundMe.provider.getBalance(
        fundMe.address
      );
      const endingDeployerBalance = await fundMe.provider.getBalance(deployer);

      assert.equal(endingFundMeBalance, 0);
      assert.equal(
        startingFundMeBalance.add(startingDeployerBalance).toString(),
        endingDeployerBalance.add(gasCost).toString()
      );
    });

    it("allow us to withdraw with multiple funders", async () => {
      const accounts = await ethers.getSigners();
      for (let i = 1; i < 6; i++) {
        const fundMeConnectedContract = await fundMe.connect(accounts[i]);
        await fundMeConnectedContract.fund({ value: sendValue });
      }
      const startingFundMeBalance = await fundMe.provider.getBalance(
        fundMe.address
      );
      const startingDeployerBalance = await fundMe.provider.getBalance(
        deployer
      );

      const transactionResponse = await fundMe.withdraw();
      const transactionReceipt = await transactionResponse.wait(1);
      const { gasUsed, effectiveGasPrice } = transactionReceipt;
      const withdrawGasCost = gasUsed.mul(effectiveGasPrice);

      const endingFundMeBalance = await fundMe.provider.getBalance(
        fundMe.address
      );
      const endingDeployerBalance = await fundMe.provider.getBalance(deployer);

      assert.equal(endingFundMeBalance, 0);
      assert.equal(
        startingFundMeBalance.add(startingDeployerBalance).toString(),
        endingDeployerBalance.add(withdrawGasCost).toString()
      );

      await expect(fundMe.getFunders(0)).to.be.reverted;
      for (i = 1; i < 6; i++) {
        assert.equal(
          await fundMe.getAddressToAmountFunded(accounts[i].address),
          0
        );
      }
    });

    it("Only allows the owner to withdraw", async function () {
        const accounts = await ethers.getSigners();
        const attacker = accounts[1];
        const attackerConnectedContract = await fundMe.connect(attacker);
        await expect(attackerConnectedContract.withdraw()).to.be.reverted;
    })


    // cheaper withdraw tests
    it("withdraw ETH from a single founder", async () => {
        const startingFundMeBalance = await fundMe.provider.getBalance(
          fundMe.address
        );
        const startingDeployerBalance = await fundMe.provider.getBalance(
          deployer
        );
  
        const transactionResponse = await fundMe.cheaperWithdraw();
        const transactionReceipt = await transactionResponse.wait(1);
        const { gasUsed, effectiveGasPrice } = transactionReceipt;
        const gasCost = gasUsed.mul(effectiveGasPrice);
  
        const endingFundMeBalance = await fundMe.provider.getBalance(
          fundMe.address
        );
        const endingDeployerBalance = await fundMe.provider.getBalance(deployer);
  
        assert.equal(endingFundMeBalance, 0);
        assert.equal(
          startingFundMeBalance.add(startingDeployerBalance).toString(),
          endingDeployerBalance.add(gasCost).toString()
        );
      });

    it("cheaperWithdraw testing...", async () => {
        const accounts = await ethers.getSigners();
        for (let i = 1; i < 6; i++) {
          const fundMeConnectedContract = await fundMe.connect(accounts[i]);
          await fundMeConnectedContract.fund({ value: sendValue });
        }
        const startingFundMeBalance = await fundMe.provider.getBalance(
          fundMe.address
        );
        const startingDeployerBalance = await fundMe.provider.getBalance(
          deployer
        );
  
        const transactionResponse = await fundMe.cheaperWithdraw();
        const transactionReceipt = await transactionResponse.wait(1);
        const { gasUsed, effectiveGasPrice } = transactionReceipt;
        const withdrawGasCost = gasUsed.mul(effectiveGasPrice);
  
        const endingFundMeBalance = await fundMe.provider.getBalance(
          fundMe.address
        );
        const endingDeployerBalance = await fundMe.provider.getBalance(deployer);
  
        assert.equal(endingFundMeBalance, 0);
        assert.equal(
          startingFundMeBalance.add(startingDeployerBalance).toString(),
          endingDeployerBalance.add(withdrawGasCost).toString()
        );
  
        await expect(fundMe.getFunders(0)).to.be.reverted;
        for (i = 1; i < 6; i++) {
          assert.equal(
            await fundMe.getAddressToAmountFunded(accounts[i].address),
            0
          );
        }
      });
  });
});
