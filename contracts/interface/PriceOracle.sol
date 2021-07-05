// SPDX-License-Identifier: MIT
pragma solidity >= 0.6.12;

interface PriceOracle {
    /// @dev Return the price of token0/token1, multiplied by 1e18
    /// NOTE: (if you have 1 token0 how much you can sell it for token1)
    function getPrice(address token0, address token1)
        external view
        returns (uint256 price, uint256 lastUpdate);

    /// @dev Return the price from router of token path, multiplied by 1e18
    function getPriceFromRouter(address[] calldata path)
        external view
        returns (uint256 price);

    function isPriceDiffOverThreshold(address[] calldata path) external view returns (bool);
}