// SPDX-License-Identifier: MIT
pragma solidity >= 0.6.6;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "../interface/PriceOracle.sol";
import "../interface/IUniswapRouterETH.sol";

contract SimplePriceOracle is PriceOracle, Ownable {
  using SafeMath for uint256;

  event PriceUpdate(address indexed token0, address indexed token1, uint256 price);

  IUniswapRouterETH router;
  address feeder;
  uint256 threshold;

  struct PriceData {
    uint192 price;
    uint64 lastUpdate;
  }

  /// @notice Public price data mapping storage.
  mapping (address => mapping (address => PriceData)) public store;

  modifier onlyFeeder() {
    require(msg.sender == feeder, "only feeder");
    _;
  }

  constructor (IUniswapRouterETH _router, address _feeder, uint256 _threshold) public {
    router = _router;
    feeder = _feeder;
    threshold = _threshold;
  }

  function setFeeder(address _feeder) public onlyOwner {
    feeder = _feeder;
  }

  function setThreshold(uint256 _threshold) public onlyOwner {
    threshold = _threshold;
  }

  /// @dev Set the prices of the token token pairs. Must be called by the owner.
  function setPrices(
    address[] calldata token0s,
    address[] calldata token1s,
    uint256[] calldata prices
  )
    external
    onlyFeeder
  {
    uint256 len = token0s.length;
    require(token1s.length == len, "bad token1s length");
    require(prices.length == len, "bad prices length");
    for (uint256 idx = 0; idx < len; idx++) {
      address token0 = token0s[idx];
      address token1 = token1s[idx];
      uint256 price = prices[idx];
      store[token0][token1] = PriceData({
        price: uint192(price),
        lastUpdate: uint64(now)
      });
      emit PriceUpdate(token0, token1, price);
    }
  }

  /// @dev Return the price of token0/token1, multiplied by 1e18
  /// NOTE: (if you have 1 token0 how much you can sell it for token1)
  function getPrice(address token0, address token1) public view override returns (uint256 price, uint256 lastUpdate) {
    PriceData memory data = store[token0][token1];
    price = uint256(data.price);
    lastUpdate = uint256(data.lastUpdate);
    require(price != 0 && lastUpdate != 0, "bad price data");
    return (price, lastUpdate);
  }

  /// @dev Return the price of token path from router, multiplied by 1e18
  function getPriceFromRouter(address[] memory path)  public view override returns (uint256 price)  {
    uint256[] memory prices = router.getAmountsOut(1 ether, path);
    return prices[prices.length - 1];
  }

  /// @dev Return the boolean of price different between storage and router greater than threshold percent
  function isPriceDiffOverThreshold(address[] calldata path) external view override returns (bool) {
      (uint256 storagePrice,) = getPrice(path[0], path[path.length - 1]);
      uint256 routerPrice = getPriceFromRouter(path);
      require(storagePrice > 0 && routerPrice > 0, "bad price data");

      // Base multiplier for calculate decimal of uint
      uint256 baseMultiplier = 1e6;
      uint256 diffPercent = routerPrice.mul(baseMultiplier).div(storagePrice);
      return diffPercent.add(threshold.mul(baseMultiplier).div(100)) < baseMultiplier;
  }
  
}