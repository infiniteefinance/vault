// SPDX-License-Identifier: MIT
pragma solidity >=0.6.0 <0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "../interface/Vault.sol";
import "../interface/YieldWorker.sol";
import "../interface/IMasterChef.sol";
import "../interface/IUniswapRouterETH.sol";
import "../interface/PriceOracle.sol";
import "hardhat/console.sol";

contract MasterChefWorker is YieldWorker, Ownable, Pausable {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    // Tokens used
    IERC20 public farm;
    IERC20 public farmReward;
    IERC20 public userReward;

    // Contract dependencies
    Vault public vault;
    IUniswapRouterETH public router;
    IMasterChef public masterChef;
    PriceOracle public oracle;

    // Current pending reward amount
    uint256 public pending;
    // MasterChef poolId
    uint256 public poolId;
    // Reward token route
    address[] public rewardRoute;

    modifier onlyVault {
        require(msg.sender == address(vault), "permission: not vault!");
        _;
    }

    constructor(
        IERC20 _farmToken,
        IERC20 _farmRewardToken,
        IERC20 _userRewardToken,
        IUniswapRouterETH _router,
        IMasterChef _masterChef,
        PriceOracle _oracle,
        uint256 _poolId,
        address[] memory _rewardRoute
    ) public {
        farm = _farmToken;
        farmReward = _farmRewardToken;
        userReward = _userRewardToken;
        router = _router;
        masterChef = _masterChef;
        oracle = _oracle;
        poolId = _poolId;
        rewardRoute = _rewardRoute;
    }

    // View

    function farmToken() external view override returns (address) {
        return address(farm);
    }

    function farmRewardToken() external view override returns (address) {
        return address(farmReward);
    }

    function userRewardToken() external view override returns (address) {
        return address(userReward);
    }

    function pendingReward() external view override returns (uint256) {
        return pending;
    }

    // Mutation

    function deposit() external override onlyVault whenNotPaused {
        uint256 balance = farm.balanceOf(address(this));

        if (balance > 0) {
            farm.safeApprove(address(masterChef), balance);
            masterChef.deposit(poolId, balance);
            farm.safeApprove(address(masterChef), 0);
        }
    }

    function withdraw(uint256 _amount) external override onlyVault {
        uint256 wantBalance = farm.balanceOf(address(this));

        if (wantBalance < _amount) {
            masterChef.withdraw(poolId, _amount.sub(wantBalance));
            wantBalance = farm.balanceOf(address(this));
        }

        if (wantBalance > _amount) {
          wantBalance = _amount;
        }

        farm.safeTransfer(address(vault), wantBalance);
    }

    function work(bytes calldata data) external override onlyVault {
        require(!oracle.isPriceDiffOverThreshold(rewardRoute), "Price: price diff over threshold!");

        masterChef.deposit(poolId, 0);

        uint256 farmRewardBalance = farmReward.balanceOf(address(this));
        uint256 minOutFromFarm = abi.decode(data, (uint256));

        if (farmRewardBalance > 0) {
            uint256 beforeRewardBalance = userReward.balanceOf(address(this));

            IERC20(farmReward).safeApprove(address(router), farmRewardBalance);
            router.swapExactTokensForTokens(farmRewardBalance, minOutFromFarm, rewardRoute, address(this), now);
            IERC20(farmReward).safeApprove(address(router), 0);

            uint256 rewardBalance = userReward.balanceOf(address(this)).sub(beforeRewardBalance);
            pending = rewardBalance;
            vault.updateVault();
            pending = 0;
        }
    }

    function claimReward(uint256 _amount) external override onlyVault {
        userReward.safeTransfer(msg.sender, _amount);
    }

    function setVault(address _vault) external onlyOwner {
        require(address(vault) == address(0), "Vault is already set.");
        vault = Vault(_vault);
    }

    function emergencyWithdraw() external override onlyVault {
        masterChef.emergencyWithdraw(poolId);
        farm.safeTransfer(address(vault), farm.balanceOf(address(this)));
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

}
