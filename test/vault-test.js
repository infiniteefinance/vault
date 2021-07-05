const { expect } = require("chai");
const { ethers } = require("hardhat");

let accounts = []

describe("InfiniteeVault", async function () {
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

  it("Should return exactly input amount and zero debt once be the first to deposit", async function () {  
    const farmAmount = ethers.utils.parseEther("1000");
    await farmToken.mint(farmAmount);
    await farmToken.approve(vault.address, farmAmount);
    await vault.deposit(farmAmount, minAmountData);
    
    const user = await vault.userInfos(accounts[0].address)
    const vaultTokenAmount = await vault.balanceOf(accounts[0].address)
    
    expect(user.amount).to.equal(farmAmount, "User amount and deposit amount not matched");
    expect(user.rewardDebt).to.equal(0, "Reward debt must be zero");
    expect(vaultTokenAmount).to.equal(farmAmount, "Vault token must mint exactly the same with deposit amount");
  });

  it("Should return correctly pending reward on worker once pending change", async function () {
    const farmAmount = ethers.utils.parseEther("1000");
    await farmToken.mint(farmAmount);
    await farmToken.approve(vault.address, farmAmount);
    await vault.deposit(farmAmount, minAmountData);
    
    const pending = ethers.utils.parseEther("500")
    await mockWorker.setPending(pending)

    const expectRewardPerShare = "500000000000"
    
    expect(await vault.pendingReward()).to.equal(pending, "Pending reward must equal to pending on worker");
    expect(await vault.totalRewardPerShare()).to.equal(expectRewardPerShare, "Reward per share not equal to expect");
  });

  it("Should return correct rewardDebt once not the first to deposit", async function () {  
    const farmAmount = ethers.utils.parseEther("1000");
    await farmToken.mint(farmAmount);
    await farmToken.approve(vault.address, farmAmount);
    await vault.deposit(farmAmount, minAmountData);
    
    const pending = ethers.utils.parseEther("500")
    await mockWorker.setPending(pending)

    const secondFarmAmount = ethers.utils.parseEther("100");
    await farmToken.connect(accounts[1]).mint(secondFarmAmount);
    await farmToken.connect(accounts[1]).approve(vault.address, secondFarmAmount);
    await vault.connect(accounts[1]).deposit(secondFarmAmount, minAmountData);

    const user = await vault.userInfos(accounts[1].address)
    const expectRewardDebt = ethers.utils.parseEther("50")

    expect(user.rewardDebt).to.equal(expectRewardDebt, "Reward debt not match with expect value")
  });

  it("Should transfer reward once withdraw", async function () {    
    const farmAmount = ethers.utils.parseEther("1000");
    await farmToken.mint(farmAmount);
    await farmToken.approve(vault.address, farmAmount);
    await vault.deposit(farmAmount, minAmountData);
    
    const pending = ethers.utils.parseEther("500")
    await mockWorker.setPending(pending)

    await vault.withdraw("0", minAmountData);
    const rewardBalance = await rewardToken.balanceOf(accounts[0].address)

    expect(rewardBalance).to.equal(pending, "Reward balance after withdraw must match with pending");
  });

  it("Should transfer reward once deposit", async function () {
    const farmAmount = ethers.utils.parseEther("1000");
    await farmToken.mint(farmAmount);
    await farmToken.approve(vault.address, farmAmount);
    await vault.deposit(farmAmount, minAmountData);
    
    const pending = ethers.utils.parseEther("500")
    await mockWorker.setPending(pending)

    await vault.deposit("0", minAmountData);
    const rewardBalance = await rewardToken.balanceOf(accounts[0].address)

    expect(rewardBalance).to.equal(pending, "Reward balance after withdraw must match with pending");
  });

  it("Should be able to withdraw once deposit after block withdrawal delay", async function () {
    const farmAmount = ethers.utils.parseEther("1000");
    await farmToken.mint(farmAmount);
    await farmToken.approve(vault.address, farmAmount);
    
    await vault.setDelayWithdrawalBlock(1);
    await vault.deposit(farmAmount, minAmountData);
    
    await vault.withdraw(farmAmount, minAmountData);
    const balance = await farmToken.balanceOf(accounts[0].address)

    expect(balance).to.equal(farmAmount, "Amount after withdraw should remain the same as deposit");
  });

  it("Should not be able to withdraw once deposit after block withdrawal delay", async function () {
    const farmAmount = ethers.utils.parseEther("1000");
    await farmToken.mint(farmAmount);
    await farmToken.approve(vault.address, farmAmount);
    
    await vault.setDelayWithdrawalBlock(5);
    await vault.deposit(farmAmount, minAmountData);
    
    await expect(vault.withdraw(farmAmount, minAmountData)).to.be.revertedWith("withdraw: too fast after deposit!")
  });

  it("Should not be able to call userEmergencyWithdraw once withdraw before owner call emergencyWithdrawWorker ", async function () {
    const farmAmount = ethers.utils.parseEther("1000");
    await farmToken.mint(farmAmount);
    await farmToken.approve(vault.address, farmAmount);
    
    await vault.deposit(farmAmount, minAmountData);

    await expect(vault.userEmergencyWithdraw()).to.be.revertedWith("ERC20: transfer amount exceeds balance");
  });

  it("Should get all farm token once owner call emergencyWithdrawWorker ", async function () {
    const farmAmount = ethers.utils.parseEther("1000");
    await farmToken.mint(farmAmount);
    await farmToken.approve(vault.address, farmAmount);
    
    await vault.deposit(farmAmount, minAmountData);

    const secondFarmAmount = ethers.utils.parseEther("2000");
    await farmToken.connect(accounts[1]).mint(secondFarmAmount);
    await farmToken.connect(accounts[1]).approve(vault.address, secondFarmAmount);
    
    await vault.connect(accounts[1]).deposit(secondFarmAmount, minAmountData);

    await vault.emergencyWithdrawWorker();
    const vaultBalance = await farmToken.balanceOf(vault.address);

    expect(vaultBalance).to.equal(farmAmount.add(secondFarmAmount));
  });

  it("Should able to call userEmergencyWithdraw once owner call emergencyWithdrawWorker ", async function () {
    const farmAmount = ethers.utils.parseEther("1000");
    await farmToken.mint(farmAmount);
    await farmToken.approve(vault.address, farmAmount);
    
    await vault.deposit(farmAmount, minAmountData);

    const secondFarmAmount = ethers.utils.parseEther("2000");
    await farmToken.connect(accounts[1]).mint(secondFarmAmount);
    await farmToken.connect(accounts[1]).approve(vault.address, secondFarmAmount);
    
    await vault.connect(accounts[1]).deposit(secondFarmAmount, minAmountData);

    await vault.emergencyWithdrawWorker();
    
    await vault.connect(accounts[1]).userEmergencyWithdraw();
    const secondAccountAmount = await farmToken.balanceOf(accounts[1].address);

    expect(secondAccountAmount).to.equal(secondFarmAmount);
  });

  it("Should reset reward once call userEmergencyWithdraw ", async function () {
    const farmAmount = ethers.utils.parseEther("1000");
    await farmToken.mint(farmAmount);
    await farmToken.approve(vault.address, farmAmount);
    
    await vault.deposit(farmAmount, minAmountData);

    const secondFarmAmount = ethers.utils.parseEther("2000");
    await farmToken.connect(accounts[1]).mint(secondFarmAmount);
    await farmToken.connect(accounts[1]).approve(vault.address, secondFarmAmount);

    const pending = ethers.utils.parseEther("500")
    await mockWorker.setPending(pending)
    await vault.work(minAmountData);
    
    await vault.connect(accounts[1]).deposit(secondFarmAmount, minAmountData);
    await vault.emergencyWithdrawWorker();
    await vault.connect(accounts[1]).userEmergencyWithdraw();

    await mockWorker.setPending(pending)
    await mockWorker.work(minAmountData)

    await vault.connect(accounts[1]).deposit(0, minAmountData);
    
    const rewardBalance = await rewardToken.balanceOf(accounts[1].address)

    expect(rewardBalance).to.equal(0);
  });

  it("Should calculate reward correctly on non withdraw user once other user call userEmergencyWithdraw ", async function () {
    const farmAmount = ethers.utils.parseEther("1000");
    await farmToken.mint(farmAmount);
    await farmToken.approve(vault.address, farmAmount);
    
    await vault.deposit(farmAmount, minAmountData);

    const secondFarmAmount = ethers.utils.parseEther("1000");
    await farmToken.connect(accounts[1]).mint(secondFarmAmount);
    await farmToken.connect(accounts[1]).approve(vault.address, secondFarmAmount);

    const pending = ethers.utils.parseEther("500")
    await mockWorker.setPending(pending)
    await vault.work(minAmountData);
    
    await vault.connect(accounts[1]).deposit(secondFarmAmount, minAmountData);
    await vault.emergencyWithdrawWorker();
    await vault.connect(accounts[1]).userEmergencyWithdraw();

    await mockWorker.setPending(pending)
    await mockWorker.work(minAmountData)

    await vault.deposit(0, minAmountData);
    
    const rewardBalance = await rewardToken.balanceOf(accounts[0].address)
    const expectRewardBalance = ethers.utils.parseEther("1000")

    expect(rewardBalance).to.equal(expectRewardBalance);
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
    accounts[0].address,
    0,
    0,
    0
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