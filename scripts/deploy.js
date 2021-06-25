// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");

async function main() {
  const ethers = hre.ethers;
  const accounts = await ethers.getSigners();

  // Setup Token
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const farmToken = await MockERC20.deploy("Farm", "FARM");
  const rewardToken = await MockERC20.deploy("Reward", "REWARD");

  await farmToken.deployed();
  await rewardToken.deployed();

  // Setup Worker
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
    "infFARM",
    "infFARM"
  );

  await vault.deployed();

  await mockWorker.setVault(vault.address);

  // Action
  const farmAmount = ethers.utils.parseEther("1000");
  await farmToken.mint(farmAmount);

  await farmToken.approve(vault.address, farmAmount);
  await vault.deposit(farmAmount);
  await mockWorker.setPending(ethers.utils.parseEther("5").toString());

  console.log(
    await vault.pendingReward().then(ethers.utils.formatEther),
    await vault.totalSupply().then(ethers.utils.formatEther),
    await vault.totalRewardPerShare().then(ethers.utils.formatEther),
    await vault
      .userPendingReward(accounts[0].address)
      .then(ethers.utils.formatEther)
  );

  await mockWorker.work();

  await mockWorker.setPending(ethers.utils.parseEther("50").toString());

  console.log(
    await vault.pendingReward().then(ethers.utils.formatEther),
    await vault.totalSupply().then(ethers.utils.formatEther),
    await vault.totalRewardPerShare().then(ethers.utils.formatEther),
    await vault.userPendingReward(accounts[0].address).then(ethers.utils.formatEther),
    await vault.userInfos(accounts[0].address),
  );

  const secondFarmAmount = ethers.utils.parseEther("200");
  await farmToken.connect(accounts[1]).mint(secondFarmAmount);
  await farmToken.connect(accounts[1]).approve(vault.address, secondFarmAmount);
  await vault.connect(accounts[1]).deposit(secondFarmAmount);

  console.log(
    await vault.pendingReward().then(ethers.utils.formatEther),
    await vault.totalSupply().then(ethers.utils.formatEther),
    await vault.totalRewardPerShare().then(ethers.utils.formatEther),
    await vault.userPendingReward(accounts[0].address).then(ethers.utils.formatEther),
    await vault.userInfos(accounts[0].address),
  );

  console.log(
    await vault.pendingReward().then(ethers.utils.formatEther),
    await vault.totalSupply().then(ethers.utils.formatEther),
    await vault.totalRewardPerShare().then(ethers.utils.formatEther),
    await vault.userPendingReward(accounts[1].address).then(ethers.utils.formatEther),
    await vault.userInfos(accounts[1].address),
  );

  await mockWorker.setPending(ethers.utils.parseEther("100").toString());
  await mockWorker.work();

  console.log(
    await vault.pendingReward().then(ethers.utils.formatEther),
    await vault.totalSupply().then(ethers.utils.formatEther),
    await vault.totalRewardPerShare().then(ethers.utils.formatEther),
    await vault.userPendingReward(accounts[0].address).then(ethers.utils.formatEther),
  );

  console.log(
    await vault.pendingReward().then(ethers.utils.formatEther),
    await vault.totalSupply().then(ethers.utils.formatEther),
    await vault.totalRewardPerShare().then(ethers.utils.formatEther),
    await vault.userPendingReward(accounts[1].address).then(ethers.utils.formatEther),
  );

  await vault.withdrawAll();

  console.log(
    "Balance of account after withdraw all",
    await farmToken.balanceOf(accounts[0].address).then(ethers.utils.formatEther),
    await rewardToken.balanceOf(accounts[0].address).then(ethers.utils.formatEther),
    await rewardToken.balanceOf(mockWorker.address).then(ethers.utils.formatEther),
    await vault.balanceOf(accounts[0].address).then(ethers.utils.formatEther)
  )
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
