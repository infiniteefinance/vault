// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const { ethers } = require("hardhat");
const { utils } = ethers
const { tokens } = require("./config")

async function main() {
  const accounts = await ethers.getSigners();  
  const InfiniteeFeeManager = await ethers.getContractFactory("InfiniteeFeeManager");
  const feeManager = await InfiniteeFeeManager.deploy(
    tokens.inftee,
    accounts[0].address,
    200,
    100,
    utils.parseEther("800")
  );

  console.info(`Fee manager deployed at address ${feeManager.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
