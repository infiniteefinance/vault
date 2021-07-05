const { expect, assert } = require("chai");
const { ethers } = require("hardhat");

let accounts = [];

describe("SimplePriceOracle", async function () {
  const BUSD = "0xe9e7cea3dedca5984780bafc599bd69add087d56"
  const WBNB = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c"
  const BTCB = "0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c"
  const ETH = "0x2170ed0880ac9a755fd29b2688956bd959f933f8"
  const INFTEE = "0xc350caa89eb963d5d6b964324a0a7736d8d65533"
  const CAKE = "0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82"
  const ALPACA = "0x8f0528ce5ef7b51152a59745befdd91d97091d2f"
  
  let oracle;
  let mockRouter;
  
  beforeEach(async function () {
    accounts = await ethers.getSigners();

    const initial = await getInitialContracts();
    oracle = initial.oracle;
    mockRouter = initial.mockRouter;
  });

  it("Should set price succesfuly once set by feeder", async function () {
    await oracle.setFeeder(accounts[0].address)
    await expect(oracle.setPrices([CAKE], [BUSD], ["1000"])).to.not.revertedWith("only feeder")
  });

  it("Should revert on set price succesfuly once not set by feeder", async function () {
    await oracle.setFeeder(accounts[1].address)
    await expect(oracle.setPrices([CAKE], [BUSD], ["1000"])).to.revertedWith("only feeder")
  });

  it("Should get price correctly once call getPrice", async function () {
    const cakePrice = ethers.utils.parseEther("1000")
    await oracle.setFeeder(accounts[0].address)
    await oracle.setPrices([CAKE], [BUSD], [cakePrice])
    
    const [price] = await oracle.getPrice(CAKE, BUSD)
    
    expect(cakePrice).to.equal(price)
  });

  it("Should set lastUpdate correctly once call setPrices", async function () {
    const cakePrice = ethers.utils.parseEther("1000")
    await oracle.setFeeder(accounts[0].address)
    await oracle.setPrices([CAKE], [BUSD], [cakePrice])
    const updatedTime = await ethers.provider.getBlock('latest')
      .then(block => block.timestamp)
    
    const [, lastUpdate] = await oracle.getPrice(CAKE, BUSD)
    
    expect(lastUpdate).to.equal(updatedTime)
  });

  it("Should not update lastUpdate to latestBlock once call setPrices", async function () {
    const cakePrice = ethers.utils.parseEther("1000")
    await oracle.setFeeder(accounts[0].address)
    await oracle.setPrices([CAKE], [BUSD], [cakePrice])
    const updatedTime = await ethers.provider.getBlock('latest')
      .then(block => block.timestamp)

      await oracle.setPrices([CAKE], [ALPACA], [cakePrice])
    
    const [, lastUpdate] = await oracle.getPrice(CAKE, BUSD)
    
    expect(lastUpdate).to.equal(updatedTime)
  });

  it("Should get price correctly once call set multiple prices", async function () {
    const cakeBUSDPrice = ethers.utils.parseEther("10")
    const cakeETHPrice = ethers.utils.parseEther("0.5")
    const cakeBTCBPrice = ethers.utils.parseEther("0.00002")
    const alpacaINFTEEPrice = ethers.utils.parseEther("0.0000000014")

    await oracle.setFeeder(accounts[0].address)
    await oracle.setPrices(
      [CAKE, CAKE, CAKE, ALPACA],
      [BUSD, ETH, BTCB, INFTEE],
      [cakeBUSDPrice, cakeETHPrice, cakeBTCBPrice, alpacaINFTEEPrice]
    )
    
    const [cakeBUSD] = await oracle.getPrice(CAKE, BUSD)
    const [cakeETH] = await oracle.getPrice(CAKE, ETH)
    const [cakeBTCB] = await oracle.getPrice(CAKE, BTCB)
    const [alpacaINFTEE] = await oracle.getPrice(ALPACA, INFTEE)
    
    expect(cakeBUSD).to.equal(cakeBUSDPrice)
    expect(cakeETH).to.equal(cakeETHPrice)
    expect(cakeBTCB).to.equal(cakeBTCBPrice)
    expect(alpacaINFTEE).to.equal(alpacaINFTEEPrice)
  });
  
  it("Should return false on price diff once price from router and storage not more than threshold", async function () {
    const cakePrice = ethers.utils.parseEther("1000")
    await oracle.setFeeder(accounts[0].address)
    await oracle.setPrices([CAKE], [BUSD], [cakePrice])
    await oracle.setThreshold(10);
    await mockRouter.setMockOut(["0", cakePrice]);

    const priceDiff = await oracle.isPriceDiffOverThreshold([CAKE, BUSD])
    
    expect(priceDiff).to.be.false;
  });

  it("Should return false on price diff once price from router higher than storage", async function () {
    const cakePrice = ethers.utils.parseEther("1000")
    const cakePriceRouter = ethers.utils.parseEther("1001")
    await oracle.setFeeder(accounts[0].address)
    await oracle.setPrices([CAKE], [BUSD], [cakePrice])
    await oracle.setThreshold(10);
    await mockRouter.setMockOut(["0", cakePriceRouter]);

    const priceDiff = await oracle.isPriceDiffOverThreshold([CAKE, BUSD])
    
    expect(priceDiff).to.be.false;
  });

  it("Should return false on price diff once price from router and storage at boundary of threshold", async function () {
    const cakePrice = ethers.utils.parseEther("1000")
    const cakePriceRouter = ethers.utils.parseEther("900")
    await oracle.setFeeder(accounts[0].address)
    await oracle.setPrices([CAKE], [BUSD], [cakePrice])
    await oracle.setThreshold(10);
    await mockRouter.setMockOut(["0", cakePriceRouter]);

    const priceDiff = await oracle.isPriceDiffOverThreshold([CAKE, BUSD])
    
    expect(priceDiff).to.be.false;
  });

  it("Should return true on price diff once price from router and storage over boundary of threshold", async function () {
    const cakePrice = ethers.utils.parseEther("1000")
    const cakePriceRouter = ethers.utils.parseEther("899")
    await oracle.setFeeder(accounts[0].address)
    await oracle.setPrices([CAKE], [BUSD], [cakePrice])
    await oracle.setThreshold(10);
    await mockRouter.setMockOut(["0", cakePriceRouter]);

    const priceDiff = await oracle.isPriceDiffOverThreshold([CAKE, BUSD])
    
    expect(priceDiff).to.be.true;
  });

  it("Should revert once unset price", async function () {
    await expect(oracle.getPrice(CAKE, BUSD)).to.revertedWith("bad price data")
  });

});

async function getInitialContracts() {
  const MockRouter = await ethers.getContractFactory("MockRouter");
  const mockRouter = await MockRouter.deploy();

  const SimplePriceOracle = await ethers.getContractFactory("SimplePriceOracle");
  const simplePriceOracle = await SimplePriceOracle.deploy(mockRouter.address, accounts[0].address, "0")

  return {
    mockRouter,
    oracle: simplePriceOracle
  }
}
