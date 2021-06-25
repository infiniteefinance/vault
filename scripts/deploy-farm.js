// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const { ethers } = require("hardhat");
const { utils } = ethers

async function main() {
  const accounts = await ethers.getSigners();

  // Setup Token
  const FarmToken = await ethers.getContractFactory("MockERC20");
  const farmToken = await FarmToken.deploy("FARM", "FARM");

  const Cake = await ethers.getContractFactory("CakeToken");
  const cake = await Cake.deploy();

  const Syrup = await ethers.getContractFactory("SyrupBar");
  const syrup = await Syrup.deploy(cake.address);

  const MasterChef = await ethers.getContractFactory("MasterChef");
  const cakePerBlock = utils.parseEther("10");
  const masterChef = await MasterChef.deploy(cake.address, syrup.address, accounts[0].address, cakePerBlock, 1);

  const depositAmount = utils.parseEther("100");
  await farmToken.mint(depositAmount);
  await farmToken.approve(masterChef.address, depositAmount);

  await cake.transferOwnership(masterChef.address);
  await masterChef.add(3000, farmToken.address, true);
  await masterChef.deposit(1, depositAmount)

  console.log(await masterChef.pendingCake(1, accounts[0].address).then(utils.formatEther));

  ethers.provider.send('evm_mine');

  console.log(await masterChef.pendingCake(1, accounts[0].address).then(utils.formatEther));
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
