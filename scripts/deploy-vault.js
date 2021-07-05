// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const { ethers } = require("hardhat");
const { tokens, alpacaVaults, router, farm } = require("./config")

async function main() {
  const worker = await deployWorker();
  const vault = await deployVault(worker.address, "VaultBUSD CAKE-BNB", "vBUSD-CAKEBNB")

  await worker.setMinSwap(100, 100);

  console.info(`Worker deployed at address ${worker.address}`);
  console.info(`Vault deployed at address ${vault.address}`);
}

async function deployWorker() {
  const MasterChefWithVaultWorker = await ethers.getContractFactory("MasterChefWithVaultWorker");
  return MasterChefWithVaultWorker.deploy(
    tokens.cakeBNB, // Masterchef farm lp token
    tokens.cake, // Masterchef reward token
    tokens.busd, // User reward token
    tokens.alpaca, // FairLaunch reward token
    alpacaVaults.ibBUSD, // Alpaca Vault
    farm.alpacaFairLaunch, // FairLaunch
    router.pancake, // Router
    farm.pancakeChef, // Masterchef
    "0xf3e0961dbea78bba291dd02b7565515e764b6e0c", // SimplePriceOracle
    farm.poolIds.cakeBNB, // Masterchef pool id
    farm.poolIds.ibBUSD, // FairLaunch pool id
    [tokens.cake, tokens.busd], // Farm reward route
    [tokens.alpaca, tokens.busd] // FairLaunch reward route
  );
}

async function deployVault(workerAddress, name, symbol) {
  const InfiniteeVault = await ethers.getContractFactory("InfiniteeVault");
  return InfiniteeVault.deploy(
    workerAddress,
    "0x8a24B159d3Eca84f2B991Ed1d341cc3588884053", // Fee Manager,
    name,
    symbol
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
