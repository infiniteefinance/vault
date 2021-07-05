// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const { ethers } = require("hardhat");
const { utils } = ethers
const { tokens } = require("./config")

async function main() {
  const SimplePriceOracle = await ethers.getContractFactory("SimplePriceOracle");
  const oracle = SimplePriceOracle.attach("0xf3e0961dbea78bba291dd02b7565515e764b6e0c");

  console.info("Fetching storage pricing from router ...");

  const routes = getAllRewardRoutes()
  let tokenPrices = {
    tokenA: [],
    tokenB: [],
    price: []
  }

  for (const route of routes) {
    const priceRoute = await pancakeRouter.getAmountsOut(utils.parseEther("1"), route)
    const price = priceRoute[priceRoute.length - 1].toString()
    tokenPrices.tokenA.push(route[0])
    tokenPrices.tokenB.push(route[1])
    tokenPrices.price.push(price)
  }

  console.info(`Price fetch successfuly`, tokenPrices)
  console.info("Setting storage pricing ...");

  await oracle.setPrices(tokenPrices.tokenA, tokenPrices.tokenB, tokenPrices.price)

  console.info("Setting price on oracle storage done!");
}

function getAllRewardRoutes() {
  return [
    [tokens.alpaca, tokens.busd],
    [tokens.cake, tokens.busd],
  ]
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
