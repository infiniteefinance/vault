const { expect, assert } = require("chai");
const { ethers } = require("hardhat");

let accounts = [];

describe("MasterChefWorker", async function () {
  let farmToken;
  let farmRewardToken;
  let userRewardToken;
  let mockRouter;
  let mockMasterChef;
  let worker;
  let vault;

  beforeEach(async function () {
    accounts = await ethers.getSigners();

    const initial = await getInitialContracts();
    farmToken = initial.farmToken;
    farmRewardToken = initial.farmRewardToken;
    userRewardToken = initial.userRewardToken;
    mockRouter = initial.mockRouter;
    mockMasterChef = initial.mockMasterChef;
    worker = initial.worker;
    vault = initial.vault;
  });

  it("Should has masterChef amount on vault address once deposit into vault", async function () {
    const farmAmount = ethers.utils.parseEther("1000");
    await farmToken.mint(farmAmount);
    await farmToken.approve(vault.address, farmAmount);
    await vault.deposit(farmAmount);

    const vaultInfo = await mockMasterChef.userInfo(0, worker.address);
    expect(vaultInfo[0]).to.equal(farmAmount, "Farm amount and Vault info on masterChef not match");
  });

  it("Should get farm token as input amount once withdraw from vault", async function () {
    const farmAmount = ethers.utils.parseEther("1000");
    await farmToken.mint(farmAmount);
    await farmToken.approve(vault.address, farmAmount);
    await vault.deposit(farmAmount);
    
    const afterDepositAmount = await farmToken.balanceOf(accounts[0].address)

    const withdrawAmount = ethers.utils.parseEther("500");
    await vault.withdraw(withdrawAmount)

    const afterWithdrawAmount = await farmToken.balanceOf(accounts[0].address)

    expect(afterDepositAmount).to.equal(0, "After deposit to vault, token should be zero");
    expect(afterWithdrawAmount).to.equal(withdrawAmount, "After withdraw from vault, token should be same as input amount");
  });

  it("Should get farm token same amount once withdrawAll from vault", async function () {
    const farmAmount = ethers.utils.parseEther("1000");
    await farmToken.mint(farmAmount);
    await farmToken.approve(vault.address, farmAmount);
    await vault.deposit(farmAmount);
    
    const afterDepositAmount = await farmToken.balanceOf(accounts[0].address)

    await vault.withdrawAll()

    const afterWithdrawAmount = await farmToken.balanceOf(accounts[0].address)

    expect(afterDepositAmount).to.equal(0, "After deposit to vault, token should be zero");
    expect(afterWithdrawAmount).to.equal(afterWithdrawAmount, "After withdrawAll from vault, token should be same as before deposit");
  });

  it("Should update vault once call work", async function () {
    const farmAmount = ethers.utils.parseEther("1000");
    await farmToken.mint(farmAmount);
    await farmToken.approve(vault.address, farmAmount);
    await vault.deposit(farmAmount);

    const pendingAmount = ethers.utils.parseEther("5000");
    await mockMasterChef.setPending(pendingAmount)

    const beforeWorkPerShare = await vault.rewardPerShare()

    await vault.work();

    const afterWorkPerShare = await vault.rewardPerShare()

    const expectPerShare = "5000000000000";
    expect(beforeWorkPerShare).to.equal(0, "Before work per share should be zero");
    expect(afterWorkPerShare).to.equal(expectPerShare, "After work per share should 10");
  });

  it("Should get reward on pending once call deposit", async function () {
    const farmAmount = ethers.utils.parseEther("1000");
    await farmToken.mint(farmAmount);
    await farmToken.approve(vault.address, farmAmount);
    await vault.deposit(farmAmount);

    const pendingAmount = ethers.utils.parseEther("5000");
    await mockMasterChef.setPending(pendingAmount)

    await vault.work();
    await vault.deposit(0);

    const rewardAmount = await userRewardToken.balanceOf(accounts[0].address);

    const expectRewardAmount = ethers.utils.parseEther("5000")
    expect(rewardAmount).to.equal(expectRewardAmount, "Should get reward correctly after call deposit");
  });

  it("Should get reward on pending once call withdraw", async function () {
    const farmAmount = ethers.utils.parseEther("1000");
    await farmToken.mint(farmAmount);
    await farmToken.approve(vault.address, farmAmount);
    await vault.deposit(farmAmount);

    const pendingAmount = ethers.utils.parseEther("5000");
    await mockMasterChef.setPending(pendingAmount)

    await vault.withdraw(0);

    const rewardAmount = await userRewardToken.balanceOf(accounts[0].address);

    const expectRewardAmount = ethers.utils.parseEther("5000")
    expect(rewardAmount).to.equal(expectRewardAmount, "Should get reward correctly after call withdraw");
  });

  it("Should get reward on pending once call withdraw twice", async function () {
    const farmAmount = ethers.utils.parseEther("1000");
    await farmToken.mint(farmAmount);
    await farmToken.approve(vault.address, farmAmount);
    await vault.deposit(farmAmount);

    const firstPendingAmount = ethers.utils.parseEther("5000");
    await mockMasterChef.setPending(firstPendingAmount)

    await vault.withdraw(0);

    const secondPendingAmount = ethers.utils.parseEther("2000");
    await mockMasterChef.setPending(secondPendingAmount)

    await vault.withdraw(0);

    const rewardAmount = await userRewardToken.balanceOf(accounts[0].address);

    const expectRewardAmount = ethers.utils.parseEther("7000")
    expect(rewardAmount).to.equal(expectRewardAmount, "Should get reward correctly after call withdraw twice");
  });

  it("Should get reward on pending once call work twice and deposit", async function () {
    const farmAmount = ethers.utils.parseEther("1000");
    await farmToken.mint(farmAmount);
    await farmToken.approve(vault.address, farmAmount);
    await vault.deposit(farmAmount);

    const firstPendingAmount = ethers.utils.parseEther("5000");
    await mockMasterChef.setPending(firstPendingAmount)

    await vault.work();

    const secondPendingAmount = ethers.utils.parseEther("2000");
    await mockMasterChef.setPending(secondPendingAmount)

    await vault.work();

    await vault.deposit(0);

    const rewardAmount = await userRewardToken.balanceOf(accounts[0].address);

    const expectRewardAmount = ethers.utils.parseEther("7000")
    expect(rewardAmount).to.equal(expectRewardAmount, "Should get reward correctly after call withdraw twice");
  });

  it("Should revert the transaction once call method on worker that protect by onlyVault", async function () {
    await expect(worker.deposit()).to.be.revertedWith("permission: not vault!")
    await expect(worker.withdraw(0)).to.be.revertedWith("permission: not vault!")
    await expect(worker.claimReward(0)).to.be.revertedWith("permission: not vault!")
    await expect(worker.work()).to.be.revertedWith("permission: not vault!")
  });
});

async function getInitialContracts() {
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const farmToken = await MockERC20.deploy("Farm", "FARM");
  const farmRewardToken = await MockERC20.deploy("Farm Reward", "FARMREWARD");
  const userRewardToken = await MockERC20.deploy("Reward", "REWARD");

  const InfiniteeFeeManager = await ethers.getContractFactory("InfiniteeFeeManager");
  const infiniteeFeeManager = await InfiniteeFeeManager.deploy(
    farmToken.address,
    accounts[0].address,
    0,
    0,
    0
  );

  const MockRouter = await ethers.getContractFactory("MockRouter");
  const mockRouter = await MockRouter.deploy();

  const mintReward = ethers.utils.parseEther("100000000000");
  await userRewardToken.mint(mintReward);
  await userRewardToken.transfer(mockRouter.address, mintReward);

  const MockMasterChef = await ethers.getContractFactory("MockMasterChef");
  const mockMasterChef = await MockMasterChef.deploy(
    farmToken.address,
    farmRewardToken.address
  );

  const Worker = await ethers.getContractFactory("MasterChefWorker");
  const worker = await Worker.deploy(
    farmToken.address,
    farmRewardToken.address,
    userRewardToken.address,
    mockRouter.address,
    mockMasterChef.address,
    0, // Pool Id
    [farmRewardToken.address, userRewardToken.address]
  );

  await worker.deployed();

  // Setup Vault
  const InfiniteeVault = await ethers.getContractFactory("InfiniteeVault");
  const vault = await InfiniteeVault.deploy(
    worker.address,
    infiniteeFeeManager.address,
    "infFARM",
    "infFARM"
  );

  await vault.deployed();

  await worker.setVault(vault.address);

  return {
    farmToken,
    farmRewardToken,
    userRewardToken,
    mockRouter,
    mockMasterChef,
    worker,
    vault,
  };
}
