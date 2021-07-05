// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const { ethers } = require("hardhat");

async function main() {
  const VaultViewer = await ethers.getContractFactory("InfiniteeVaultViewer");
  const vaultViewer = await VaultViewer.deploy();

  console.info(`Vault viewer deployed at ${vaultViewer.address}`)

  await vaultViewer.setVaults(
    [], // Vaults
    [] // Rewards
  )

  console.info(`Vault viewer set vaults successfuly!`)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
