const { expect } = require("chai");
const { ethers } = require("hardhat");

let accounts = []

describe("InfiniteeVaultViewer", async function () {
  const minAmountData = "0x0000000000000000000000000000000000000000000000000000000000000000"
  let farmToken;
  let rewardToken;
  let mockWorker;
  let vault;
  let vaultViewer;

  beforeEach(async function() {
    accounts = await ethers.getSigners();

    const initial = await getInitialContracts()
    farmToken = initial.farmToken
    rewardToken = initial.rewardToken
    mockWorker = initial.mockWorker
    vault = initial.vault
    vaultViewer = initial.vaultViewer
  });

  it("Should return correct vault, reward, balance, pending once not deposit", async function () {  
    const userInfos = await vaultViewer.userInfo(accounts[0].address)

    expect(userInfos.vaults).to.include.members([vault.address])
    expect(userInfos.rewards).to.include.members([rewardToken.address])
    expect(userInfos.balances.map(b => b.toString())).to.include.members(["0"])
    expect(userInfos.pending.map(p => p.toString())).to.include.members(["0"])
  });

  it("Should return correct vault, reward, balance, pending once no pending", async function () {  
    const farmAmount = ethers.utils.parseEther("1000");
    await farmToken.mint(farmAmount);
    await farmToken.approve(vault.address, farmAmount);
    await vault.deposit(farmAmount, minAmountData);
    
    const userInfos = await vaultViewer.userInfo(accounts[0].address)

    expect(userInfos.vaults).to.include.members([vault.address])
    expect(userInfos.rewards).to.include.members([rewardToken.address])
    expect(userInfos.balances.map(b => b.toString())).to.include.members([farmAmount.toString()])
    expect(userInfos.pending.map(p => p.toString())).to.include.members(["0"])
  });

  it("Should return correct vault, reward, balance, pending once has pending", async function () {  
    const farmAmount = ethers.utils.parseEther("1000");
    await farmToken.mint(farmAmount);
    await farmToken.approve(vault.address, farmAmount);
    await vault.deposit(farmAmount, minAmountData);

    const pending = ethers.utils.parseEther("500")
    await mockWorker.setPending(pending)
    
    const userInfos = await vaultViewer.userInfo(accounts[0].address)

    expect(userInfos.vaults).to.include.members([vault.address])
    expect(userInfos.rewards).to.include.members([rewardToken.address])
    expect(userInfos.balances.map(b => b.toString())).to.include.members([farmAmount.toString()])
    expect(userInfos.pending.map(p => p.toString())).to.include.members([pending.toString()])
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

  const VaultViewer = await ethers.getContractFactory("InfiniteeVaultViewer");
  const vaultViewer = await VaultViewer.deploy()

  await vaultViewer.setVaults([vault.address], [rewardToken.address])

  return { farmToken, rewardToken, mockWorker, vault, vaultViewer }
}