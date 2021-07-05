// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const { ethers } = require("hardhat");

async function main() {
  const MasterChefWithVaultWorker = await ethers.getContractFactory("MasterChefWithVaultWorker");
  const worker = MasterChefWithVaultWorker.attach("0xb004a6a732755FDF08Eae898e5292411179303a5");

  console.info("Setting worker's vault address ...");

  await worker.setVault("0xEDfCdf3275b71749f2e4bce7875b588E33952ACC")

  console.info("Setting worker's vault done!");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
