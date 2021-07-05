// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

interface Vault {
    function farmToken() external view returns (address);
    function rewardToken() external view returns (address);
    function pendingReward() external view returns (uint256);
    function totalRewardPerShare() external view returns (uint256);
    function userPendingReward(address) external view returns (uint256);
    function userInfo(address) external view returns(uint256 amount, uint256 rewardDebt, uint256 withdrawableBlock);
    function deposit(uint256, bytes calldata) external;
    function withdraw(uint256, bytes calldata) external;
    function withdrawAll(bytes calldata) external;
    function work(bytes calldata) external;
    function updateVault() external;
}