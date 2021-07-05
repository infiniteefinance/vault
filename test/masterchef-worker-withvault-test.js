const { expect, assert } = require("chai");
const { ethers } = require("hardhat");

let accounts = [];

describe("MasterChefWithVaultWorker", async function () {
  const minAmountData = "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"
  let farmToken;
  let farmRewardToken;
  let userRewardToken;
  let fairLaunchRewardToken;
  let mockRouter;
  let mockMasterChef;
  let mockFairLaunch;
  let worker;
  let mockAlpacaVault;
  let vault;
  let mockOracle;

  beforeEach(async function () {
    accounts = await ethers.getSigners();

    const initial = await getInitialContracts();
    farmToken = initial.farmToken;
    farmRewardToken = initial.farmRewardToken;
    userRewardToken = initial.userRewardToken;
    fairLaunchRewardToken = initial.fairLaunchRewardToken;
    mockRouter = initial.mockRouter;
    mockMasterChef = initial.mockMasterChef;
    mockFairLaunch = initial.mockFairLaunch;
    mockAlpacaVault = initial.mockAlpacaVault;
    worker = initial.worker;
    vault = initial.vault;
    mockOracle = initial.mockOracle;
  });

  it("Should has masterChef amount on vault address once deposit into vault", async function () {
    const farmAmount = ethers.utils.parseEther("1000");
    await farmToken.mint(farmAmount);
    await farmToken.approve(vault.address, farmAmount);
    await vault.deposit(farmAmount, minAmountData);

    const vaultInfo = await mockMasterChef.userInfo(0, worker.address);
    expect(vaultInfo[0]).to.equal(farmAmount, "Farm amount and Vault info on masterChef not match");
  });

  it("Should get farm token as input amount once withdraw from vault", async function () {
    const farmAmount = ethers.utils.parseEther("1000");
    await farmToken.mint(farmAmount);
    await farmToken.approve(vault.address, farmAmount);
    await vault.deposit(farmAmount, minAmountData);
    
    const afterDepositAmount = await farmToken.balanceOf(accounts[0].address)

    const withdrawAmount = ethers.utils.parseEther("500");
    await vault.withdraw(withdrawAmount, minAmountData)

    const afterWithdrawAmount = await farmToken.balanceOf(accounts[0].address)

    expect(afterDepositAmount).to.equal(0, "After deposit to vault, token should be zero");
    expect(afterWithdrawAmount).to.equal(withdrawAmount, "After withdraw from vault, token should be same as input amount");
  });

  it("Should get farm token same amount once withdrawAll from vault", async function () {
    const farmAmount = ethers.utils.parseEther("1000");
    await farmToken.mint(farmAmount);
    await farmToken.approve(vault.address, farmAmount);
    await vault.deposit(farmAmount, minAmountData);
    
    const afterDepositAmount = await farmToken.balanceOf(accounts[0].address)

    await vault.withdrawAll(minAmountData)

    const afterWithdrawAmount = await farmToken.balanceOf(accounts[0].address)

    expect(afterDepositAmount).to.equal(0, "After deposit to vault, token should be zero");
    expect(afterWithdrawAmount).to.equal(afterWithdrawAmount, "After withdrawAll from vault, token should be same as before deposit");
  });

  it("Should update vault once call work", async function () {
    const farmAmount = ethers.utils.parseEther("1000");
    await farmToken.mint(farmAmount);
    await farmToken.approve(vault.address, farmAmount);
    await vault.deposit(farmAmount, minAmountData);

    const pendingAmount = ethers.utils.parseEther("5000");
    await mockMasterChef.setPending(pendingAmount)

    const beforeWorkPerShare = await vault.rewardPerShare()

    await vault.work(minAmountData);

    const fairLaunchPending = ethers.utils.parseEther("1000");
    await mockFairLaunch.setPending(fairLaunchPending)
    
    await vault.work(minAmountData);

    const afterWorkPerShare = await vault.rewardPerShare()

    const expectPerShare = "6000000000000";
    expect(beforeWorkPerShare).to.equal(0, "Before work per share should be zero");
    expect(afterWorkPerShare).to.equal(expectPerShare, "After work per share should 10");
  });

  it("Should get reward on pending once call deposit", async function () {
    const farmAmount = ethers.utils.parseEther("1000");
    await farmToken.mint(farmAmount);
    await farmToken.approve(vault.address, farmAmount);
    await vault.deposit(farmAmount, minAmountData);

    const pendingAmount = ethers.utils.parseEther("5000");
    await mockMasterChef.setPending(pendingAmount)

    const fairLaunchPending = ethers.utils.parseEther("1000");
    await mockFairLaunch.setPending(fairLaunchPending)

    await vault.work(minAmountData);
    await vault.deposit(0, minAmountData);

    const rewardAmount = await userRewardToken.balanceOf(accounts[0].address);

    const expectRewardAmount = ethers.utils.parseEther("6000")
    expect(rewardAmount).to.equal(expectRewardAmount, "Should get reward correctly after call deposit");
  });

  it("Should get reward on pending once call withdraw", async function () {
    const farmAmount = ethers.utils.parseEther("1000");
    await farmToken.mint(farmAmount);
    await farmToken.approve(vault.address, farmAmount);
    await vault.deposit(farmAmount, minAmountData);

    const pendingAmount = ethers.utils.parseEther("5000");
    await mockMasterChef.setPending(pendingAmount)

    await vault.work(minAmountData);

    const fairLaunchPending = ethers.utils.parseEther("1000");
    await mockFairLaunch.setPending(fairLaunchPending)

    await vault.withdraw(0, minAmountData);

    const rewardAmount = await userRewardToken.balanceOf(accounts[0].address);

    const expectRewardAmount = ethers.utils.parseEther("6000")
    expect(rewardAmount).to.equal(expectRewardAmount, "Should get reward correctly after call withdraw");
  });

  it("Should get reward on pending once call withdraw twice", async function () {
    const farmAmount = ethers.utils.parseEther("1000");
    await farmToken.mint(farmAmount);
    await farmToken.approve(vault.address, farmAmount);
    await vault.deposit(farmAmount, minAmountData);

    const firstPendingAmount = ethers.utils.parseEther("5000");
    await mockMasterChef.setPending(firstPendingAmount)
        
    await vault.withdraw(0, minAmountData);

    const secondPendingAmount = ethers.utils.parseEther("2000");
    await mockMasterChef.setPending(secondPendingAmount)

    await vault.work(minAmountData);

    const fairLaunchPending = ethers.utils.parseEther("1000");
    await mockFairLaunch.setPending(fairLaunchPending)

    await vault.withdraw(0, minAmountData);

    const rewardAmount = await userRewardToken.balanceOf(accounts[0].address);

    const expectRewardAmount = ethers.utils.parseEther("8000")
    expect(rewardAmount).to.equal(expectRewardAmount, "Should get reward correctly after call withdraw twice");
  });

  it("Should get reward on pending once call work twice and deposit", async function () {
    const farmAmount = ethers.utils.parseEther("1000");
    await farmToken.mint(farmAmount);
    await farmToken.approve(vault.address, farmAmount);
    await vault.deposit(farmAmount, minAmountData);

    const firstPendingAmount = ethers.utils.parseEther("5000");
    await mockMasterChef.setPending(firstPendingAmount)
    
    await vault.work(minAmountData);

    const secondPendingAmount = ethers.utils.parseEther("2000");
    await mockMasterChef.setPending(secondPendingAmount)
    
    const fairLaunchPending = ethers.utils.parseEther("1000");
    await mockFairLaunch.setPending(fairLaunchPending)

    await vault.work(minAmountData);

    await vault.deposit(0, minAmountData);

    const rewardAmount = await userRewardToken.balanceOf(accounts[0].address);

    const expectRewardAmount = ethers.utils.parseEther("8000")
    expect(rewardAmount).to.equal(expectRewardAmount, "Should get reward correctly after call withdraw twice");
  });

  it("Should not able to deposit once pause", async function () {
    const farmAmount = ethers.utils.parseEther("1000");
    await farmToken.mint(farmAmount);
    await farmToken.approve(vault.address, farmAmount);

    await worker.pause()

    await expect(vault.deposit(farmAmount, minAmountData)).to.be.revertedWith("Pausable: paused")
  });

  it("Should revert the transaction once call method on worker that protect by onlyVault", async function () {
    await expect(worker.deposit()).to.be.revertedWith("permission: not vault!")
    await expect(worker.withdraw(0)).to.be.revertedWith("permission: not vault!")
    await expect(worker.claimReward(0)).to.be.revertedWith("permission: not vault!")
    await expect(worker.work(minAmountData)).to.be.revertedWith("permission: not vault!")
  });

  it("Should revert the transaction once call deposit while pause", async function () {
    const farmAmount = ethers.utils.parseEther("1000");
    await farmToken.mint(farmAmount);
    await farmToken.approve(vault.address, farmAmount);
    
    await worker.pause();

    await expect(vault.deposit(farmAmount, minAmountData)).to.be.revertedWith("Pausable: paused")
  });

  it("Should be able to deposit the transaction once unpaused", async function () {
    const farmAmount = ethers.utils.parseEther("1000");
    await farmToken.mint(farmAmount);
    await farmToken.approve(vault.address, farmAmount);
    
    await worker.pause();
    await worker.unpause();

    await expect(vault.deposit(farmAmount, minAmountData)).to.not.revertedWith("Pausable: paused")
  });

  it("Should revert transaction on deposit once oracle price over threshold", async function () {
    const farmAmount = ethers.utils.parseEther("1000");
    await farmToken.mint(farmAmount);
    await farmToken.approve(vault.address, farmAmount);

    await mockOracle.setDiff(true, [farmRewardToken.address, userRewardToken.address]);
    await mockOracle.setDiff(true, [fairLaunchRewardToken.address, userRewardToken.address]);

    await expect(vault.deposit(farmAmount, minAmountData)).to.revertedWith("Price: price diff over threshold!")
  });

  it("Should revert transaction on withdraw once oracle price over threshold", async function () {
    const farmAmount = ethers.utils.parseEther("1000");
    await farmToken.mint(farmAmount);
    await farmToken.approve(vault.address, farmAmount);
    await vault.deposit(farmAmount, minAmountData);

    await mockOracle.setDiff(true, [farmRewardToken.address, userRewardToken.address]);
    await mockOracle.setDiff(true, [fairLaunchRewardToken.address, userRewardToken.address]);

    await expect(vault.withdraw(farmAmount, minAmountData)).to.revertedWith("Price: price diff over threshold!")
  });

  it("Should revert transaction on work once oracle price over threshold", async function () {
    await mockOracle.setDiff(true, [farmRewardToken.address, userRewardToken.address]);
    await mockOracle.setDiff(true, [fairLaunchRewardToken.address, userRewardToken.address]);
    
    await expect(vault.work(minAmountData)).to.revertedWith("Price: price diff over threshold!")
  });

  it("Should revert transaction on work once oracle reward price over threshold", async function () {
    await mockOracle.setDiff(true, [farmRewardToken.address, userRewardToken.address]);
    
    await expect(vault.work(minAmountData)).to.revertedWith("Price: price diff over threshold!")
  });

  it("Should revert transaction on work once oracle fairlaunch price over threshold", async function () {
    await mockOracle.setDiff(true, [fairLaunchRewardToken.address, userRewardToken.address]);
    
    await expect(vault.work(minAmountData)).to.revertedWith("Price: price diff over threshold!")
  });

  it("Should able to work once oracle price less than threshold", async function () {
    await mockOracle.setDiff(false, [farmRewardToken.address, userRewardToken.address]);
    await mockOracle.setDiff(false, [fairLaunchRewardToken.address, userRewardToken.address]);

    await expect(vault.work(minAmountData)).to.not.revertedWith("Price: price diff over threshold!")
  });

});

async function getInitialContracts() {
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const farmToken = await MockERC20.deploy("Farm", "FARM");
  const farmRewardToken = await MockERC20.deploy("Farm Reward", "FARMREWARD");
  const userRewardToken = await MockERC20.deploy("Reward", "REWARD");
  const fairLaunchRewardToken = await MockERC20.deploy("FReward", "FREWARD");

  const MockOracle = await ethers.getContractFactory("MockOracle");
  const mockOracle = await MockOracle.deploy();

  const MockRouter = await ethers.getContractFactory("MockRouter");
  const mockRouter = await MockRouter.deploy();

  const InfiniteeFeeManager = await ethers.getContractFactory("InfiniteeFeeManager");
  const infiniteeFeeManager = await InfiniteeFeeManager.deploy(
    farmToken.address,
    accounts[0].address,
    0,
    0,
    0
  );

  const mintReward = ethers.utils.parseEther("100000000000");
  await userRewardToken.mint(mintReward);
  await userRewardToken.transfer(mockRouter.address, mintReward);

  const MockMasterChef = await ethers.getContractFactory("MockMasterChef");
  const mockMasterChef = await MockMasterChef.deploy(
    farmToken.address,
    farmRewardToken.address
  );

  const MockAlpacaVault = await ethers.getContractFactory("MockAlpacaVault");
  const mockAlpacaVault = await MockAlpacaVault.deploy(userRewardToken.address);

  const MockFairLaunch = await ethers.getContractFactory("MockFairLaunch");
  const mockFairLaunch = await MockFairLaunch.deploy(
    mockAlpacaVault.address,
    fairLaunchRewardToken.address
  );

  const Worker = await ethers.getContractFactory("MasterChefWithVaultWorker");
  const worker = await Worker.deploy(
    farmToken.address,
    farmRewardToken.address,
    userRewardToken.address,
    fairLaunchRewardToken.address,
    mockAlpacaVault.address,
    mockFairLaunch.address,
    mockRouter.address,
    mockMasterChef.address,
    mockOracle.address,
    0, // Pool Id
    0, // Fair Launch Pool Id
    [farmRewardToken.address, userRewardToken.address], // Farm reward to User reward path
    [fairLaunchRewardToken.address, userRewardToken.address] // Farm reward to User reward path
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
    fairLaunchRewardToken,
    mockAlpacaVault,
    mockRouter,
    mockMasterChef,
    mockFairLaunch,
    mockFairLaunch,
    worker,
    vault,
    mockOracle
  };
}
