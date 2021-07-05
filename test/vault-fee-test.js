const { expect } = require("chai");
const { ethers } = require("hardhat");

const feeRate = 100;
const govFeeRate = 50;
const minGov = 10000;

let accounts = []

describe("InfiniteeVault with FeeManager", async function () {
  const minAmountData = "0x0000000000000000000000000000000000000000000000000000000000000000"
  let farmToken;
  let rewardToken;
  let mockWorker;
  let vault;

  beforeEach(async function() {
    accounts = await ethers.getSigners();

    const initial = await getInitialContracts()
    farmToken = initial.farmToken
    rewardToken = initial.rewardToken
    mockWorker = initial.mockWorker
    vault = initial.vault
  });

  it("Should transfer reward and pay fee once withdraw", async function () {    
    const farmAmount = ethers.utils.parseEther("1000");
    await farmToken.mint(farmAmount);
    await farmToken.approve(vault.address, farmAmount);
    await vault.deposit(farmAmount, minAmountData);
    
    const pending = ethers.utils.parseEther("500")
    await mockWorker.setPending(pending)

    await vault.withdraw("0", minAmountData);
    const rewardBalance = await rewardToken.balanceOf(accounts[0].address)
    const feeAddressRewardBalance = await rewardToken.balanceOf(accounts[2].address)

    const expectReward = ethers.utils.parseEther("495")
    const expectFee = ethers.utils.parseEther("5")

    expect(rewardBalance).to.equal(expectReward, "Reward balance after withdraw must match with pending after pay fee");
    expect(feeAddressRewardBalance).to.equal(expectFee, "Fee Reward balance after withdraw must match with expect pay fee");
  });

  it("Should transfer reward and pay fee once deposit", async function () {    
    const farmAmount = ethers.utils.parseEther("1000");
    await farmToken.mint(farmAmount);
    await farmToken.approve(vault.address, farmAmount);
    await vault.deposit(farmAmount, minAmountData);
    
    const pending = ethers.utils.parseEther("500")
    await mockWorker.setPending(pending)

    await vault.deposit("0", minAmountData);
    const rewardBalance = await rewardToken.balanceOf(accounts[0].address)
    const feeAddressRewardBalance = await rewardToken.balanceOf(accounts[2].address)

    const expectReward = ethers.utils.parseEther("495")
    const expectFee = ethers.utils.parseEther("5")

    expect(rewardBalance).to.equal(expectReward, "Reward balance after withdraw must match with pending after pay fee");
    expect(feeAddressRewardBalance).to.equal(expectFee, "Fee Reward balance after withdraw must match with expect pay fee");
  });

  it("Should transfer reward and pay govFee once withdraw", async function () {    
    const farmAmount = ethers.utils.parseEther("1000");
    await farmToken.mint(farmAmount);
    await farmToken.approve(vault.address, farmAmount);
    await vault.deposit(farmAmount, minAmountData);
    
    await farmToken.mint(minGov);
    
    const pending = ethers.utils.parseEther("500")
    await mockWorker.setPending(pending)

    await vault.withdraw("0", minAmountData);
    const rewardBalance = await rewardToken.balanceOf(accounts[0].address)
    const feeAddressRewardBalance = await rewardToken.balanceOf(accounts[2].address)

    const expectReward = ethers.utils.parseEther("497.5")
    const expectFee = ethers.utils.parseEther("2.5")

    expect(rewardBalance).to.equal(expectReward, "Reward balance after withdraw must match with pending after pay fee");
    expect(feeAddressRewardBalance).to.equal(expectFee, "Fee Reward balance after withdraw must match with expect pay fee");
  });

  it("Should transfer reward and pay govFee once deposit", async function () {    
    const farmAmount = ethers.utils.parseEther("1000");
    await farmToken.mint(farmAmount);
    await farmToken.approve(vault.address, farmAmount);
    await vault.deposit(farmAmount, minAmountData);
    
    await farmToken.mint(minGov);
    
    const pending = ethers.utils.parseEther("500")
    await mockWorker.setPending(pending)

    await vault.deposit("0", minAmountData);
    const rewardBalance = await rewardToken.balanceOf(accounts[0].address)
    const feeAddressRewardBalance = await rewardToken.balanceOf(accounts[2].address)

    const expectReward = ethers.utils.parseEther("497.5")
    const expectFee = ethers.utils.parseEther("2.5")

    expect(rewardBalance).to.equal(expectReward, "Reward balance after withdraw must match with pending after pay fee");
    expect(feeAddressRewardBalance).to.equal(expectFee, "Fee Reward balance after withdraw must match with expect pay fee");
  });

  it("Should transfer reward and pay fee once govToken not enough and withdraw", async function () {    
    const farmAmount = ethers.utils.parseEther("1000");
    await farmToken.mint(farmAmount);
    await farmToken.approve(vault.address, farmAmount);
    await vault.deposit(farmAmount, minAmountData);
    
    await farmToken.mint(minGov - 1);
    
    const pending = ethers.utils.parseEther("500")
    await mockWorker.setPending(pending)

    await vault.withdraw("0", minAmountData);
    const rewardBalance = await rewardToken.balanceOf(accounts[0].address)
    const feeAddressRewardBalance = await rewardToken.balanceOf(accounts[2].address)

    const expectReward = ethers.utils.parseEther("495")
    const expectFee = ethers.utils.parseEther("5")

    expect(rewardBalance).to.equal(expectReward, "Reward balance after withdraw must match with pending after pay fee");
    expect(feeAddressRewardBalance).to.equal(expectFee, "Fee Reward balance after withdraw must match with expect pay fee");
  });

  it("Should transfer reward and pay fee once govToken not enough and deposit", async function () {    
    const farmAmount = ethers.utils.parseEther("1000");
    await farmToken.mint(farmAmount);
    await farmToken.approve(vault.address, farmAmount);
    await vault.deposit(farmAmount, minAmountData);
    
    await farmToken.mint(minGov - 1);
    
    const pending = ethers.utils.parseEther("500")
    await mockWorker.setPending(pending)

    await vault.deposit("0", minAmountData);
    const rewardBalance = await rewardToken.balanceOf(accounts[0].address)
    const feeAddressRewardBalance = await rewardToken.balanceOf(accounts[2].address)

    const expectReward = ethers.utils.parseEther("495")
    const expectFee = ethers.utils.parseEther("5")

    expect(rewardBalance).to.equal(expectReward, "Reward balance after withdraw must match with pending after pay fee");
    expect(feeAddressRewardBalance).to.equal(expectFee, "Fee Reward balance after withdraw must match with expect pay fee");
  });

});


async function getInitialContracts() {
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const farmToken = await MockERC20.deploy("Farm", "FARM");
  const rewardToken = await MockERC20.deploy("Reward", "REWARD");

  await farmToken.deployed();
  await rewardToken.deployed();

  const InfiniteeFeeManager = await ethers.getContractFactory("InfiniteeFeeManager");
  const infiniteeFeeManager = await InfiniteeFeeManager.deploy(
    farmToken.address,
    accounts[2].address,
    feeRate,
    govFeeRate,
    minGov
  );

  const MockWorker = await ethers.getContractFactory("MockWorker");
  const mockWorker = await MockWorker.deploy(
    farmToken.address,
    rewardToken.address
  );

  await mockWorker.deployed();

  // Setup Vault
  const InfiniteeVault = await ethers.getContractFactory("InfiniteeVault");
  const vault = await InfiniteeVault.deploy(
    mockWorker.address,
    infiniteeFeeManager.address,
    "infFARM",
    "infFARM"
  );

  await vault.deployed();

  await mockWorker.setVault(vault.address);

  return { farmToken, rewardToken, mockWorker, vault }
}