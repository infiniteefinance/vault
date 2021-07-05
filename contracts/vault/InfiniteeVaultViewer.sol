// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../interface/Vault.sol";

contract InfiniteeVaultViewer is Ownable {

  struct VaultInfo {
    address vault;
    address reward;
  }

  VaultInfo[] public vaultInfos;

  function userInfo(address user) external view returns (address[] memory vaults, address[] memory rewards, uint256[] memory balances, uint256[] memory pending) {
    address[] memory _vaultAddresses = new address[](vaultInfos.length);
    address[] memory _rewardAddresses = new address[](vaultInfos.length);
    uint256[] memory _balances = new uint256[](vaultInfos.length);
    uint256[] memory _pending = new uint256[](vaultInfos.length);

    for (uint vaultIndex = 0; vaultIndex < vaultInfos.length; vaultIndex++) {
      VaultInfo memory vaultInfo = vaultInfos[vaultIndex];
      Vault vault = Vault(vaultInfo.vault);
      (uint256 amount,,) = vault.userInfo(user);
      
      _pending[vaultIndex] = vault.userPendingReward(user);
      _balances[vaultIndex] = amount;
      _vaultAddresses[vaultIndex] = vaultInfo.vault;
      _rewardAddresses[vaultIndex] = vaultInfo.reward;
    }

    return (_vaultAddresses, _rewardAddresses, _balances, _pending);
  }

  function getVaultInfos() external view returns (VaultInfo[] memory) {
    return vaultInfos;
  }

  function setVaults(address[] calldata _vaults, address[] calldata _rewards) external onlyOwner {
    require(_vaults.length == _rewards.length, "set: bad array length!!!!");

    delete vaultInfos;

    for (uint256 vaultIndex = 0; vaultIndex < _vaults.length; vaultIndex++) {
      vaultInfos.push(VaultInfo({
        vault: _vaults[vaultIndex],
        reward: _rewards[vaultIndex]
      }));
    }
  }

}