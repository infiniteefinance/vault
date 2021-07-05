// SPDX-License-Identifier: MIT
pragma solidity >= 0.6.6;

import "../interface/PriceOracle.sol";

contract MockOracle is PriceOracle {

    mapping(address => mapping(address =>bool)) public _mockDiff;

    function setDiff(bool isDiff, address[] calldata path) external {
      _mockDiff[path[0]][path[1]] = isDiff;
    }

    function getPrice(address, address)
        external view override
        returns (uint256 price, uint256 lastUpdate)
    {
      return (0, 0);
    }

    function getPriceFromRouter(address[] calldata)
        external view override
        returns (uint256 price)
    {
      return 0;
    }

    function isPriceDiffOverThreshold(address[] calldata path) external view override returns (bool) {
      return _mockDiff[path[0]][path[1]];
    }
    
}