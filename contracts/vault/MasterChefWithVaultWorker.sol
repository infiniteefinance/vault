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
import "../interface/IAlpacaVault.sol";
import "../interface/IFairLaunch.sol";
import "../interface/IMasterChef.sol";
import "../interface/IUniswapRouterETH.sol";
import "../interface/PriceOracle.sol";
import "hardhat/console.sol";

contract MasterChefWithVaultWorker is YieldWorker, Ownable, Pausable {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    // Tokens used
    IERC20 public farm;
    IERC20 public farmReward;
    IERC20 public userReward;
    IERC20 public fairLaunchReward;

    // Contract dependencies
    Vault public vault;
    IAlpacaVault public alpacaVault;
    IFairLaunch public fairLaunch;
    IUniswapRouterETH public router;
    IMasterChef public masterChef;
    PriceOracle public oracle;

    // Current pending reward amount
    uint256 public pending;
    // Current reward amount
    uint256 public currentReward;
    // MasterChef poolId
    uint256 public poolId;
    // Alpaca FairLaunch poolId
    uint256 public fairLaunchPoolId;
    // Minimum farmReward token before swap to reward
    uint256 public minFarmBeforeSwap;
    // Minimum fairLaunchReward token before swap to reward
    uint256 public minFairLaunchBeforeSwap;
    // Reward token route
    address[] public rewardRoute;
    address[] public fairLaunchRewardRoute;

    modifier onlyVault {
        require(msg.sender == address(vault), "permission: not vault!");
        _;
    }

    constructor(
        IERC20 _farmToken,
        IERC20 _farmRewardToken,
        IERC20 _userRewardToken,
        IERC20 _fairLaunchRewardToken,
        IAlpacaVault _alpacaVault,
        IFairLaunch _fairLaunch,
        IUniswapRouterETH _router,
        IMasterChef _masterChef,
        PriceOracle _oracle,
        uint256 _poolId,
        uint256 _fairLaunchPoolId,
        address[] memory _rewardRoute,
        address[] memory _fairLaunchRewardRoute
    ) public {
        farm = _farmToken;
        farmReward = _farmRewardToken;
        userReward = _userRewardToken;
        fairLaunchReward = _fairLaunchRewardToken;
        alpacaVault = _alpacaVault;
        fairLaunch = _fairLaunch;
        router = _router;
        masterChef = _masterChef;
        oracle = _oracle;
        poolId = _poolId;
        fairLaunchPoolId = _fairLaunchPoolId;
        rewardRoute = _rewardRoute;
        fairLaunchRewardRoute = _fairLaunchRewardRoute;
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
            IERC20(farm).safeApprove(address(masterChef), balance);
            masterChef.deposit(poolId, balance);
            IERC20(farm).safeApprove(address(masterChef), 0);
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
        require(!oracle.isPriceDiffOverThreshold(fairLaunchRewardRoute), "Price: price diff over threshold!");

        masterChef.deposit(poolId, 0);

        if (currentReward > 0) {
            fairLaunch.withdrawAll(address(this), fairLaunchPoolId);
        }

        uint256 farmRewardBalance = farmReward.balanceOf(address(this));
        uint256 fairLaunchRewardBalance = fairLaunchReward.balanceOf(address(this));
        (uint256 minOutFromFarm, uint256 minOutFromFairLaunch) = abi.decode(data, (uint256, uint256));

        // Work on selling reward
        if (farmRewardBalance > minFarmBeforeSwap) {
            swap(farmReward, farmRewardBalance, minOutFromFarm, rewardRoute);
        }

        // Work on selling extra reward from fair launch
        if (fairLaunchRewardBalance > minFairLaunchBeforeSwap) {
            swap(fairLaunchReward, fairLaunchRewardBalance, minOutFromFairLaunch, fairLaunchRewardRoute);
        }

        uint256 rewardBalance = userReward.balanceOf(address(this));

        if (rewardBalance > 0) {
            alpacaVault.withdraw(alpacaVault.balanceOf(address(this)));
            rewardBalance = userReward.balanceOf(address(this));
            pending = rewardBalance.sub(currentReward);
            currentReward = currentReward.add(pending);

            depositAllAlpacaVault();

            // Update vault reward value and reset pending for the next work
            vault.updateVault();
            pending = 0;
        }

        depositAllFairLaunch();
    }

    function claimReward(uint256 _amount) external override onlyVault {
        if (_amount > 0) {
            uint256 workerBalance = userReward.balanceOf(address(this));
            currentReward = currentReward.sub(_amount);

            if (_amount > workerBalance) {
                fairLaunch.withdrawAll(address(this), fairLaunchPoolId);
                alpacaVault.withdraw(alpacaVault.balanceOf(address(this)));

                userReward.safeTransfer(msg.sender, _amount);

                depositAllAlpacaVault();
                depositAllFairLaunch();
            } else {
                userReward.safeTransfer(msg.sender, _amount);
            }
        }
    }

    function emergencyWithdraw() external override onlyVault {
        masterChef.emergencyWithdraw(poolId);
        farm.safeTransfer(address(vault), farm.balanceOf(address(this)));
    }

    function setVault(address _vault) external onlyOwner {
        require(address(vault) == address(0), "Vault is already set.");
        vault = Vault(_vault);
    }

    function setMinSwap(uint256 _minFarmBeforeSwap, uint256 _minFairLaunchBeforeSwap) external onlyOwner {
        minFarmBeforeSwap = _minFarmBeforeSwap;
        minFairLaunchBeforeSwap = _minFairLaunchBeforeSwap;
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function swap(IERC20 _token, uint256 _amount, uint256 _minOut, address[] memory path) internal {
        _token.safeApprove(address(router), _amount);
        router.swapExactTokensForTokens(_amount, _minOut, path, address(this), now);
        _token.safeApprove(address(router), 0);
    }

    function depositAllAlpacaVault() internal {
        uint256 rewardBalance = userReward.balanceOf(address(this));

        if (rewardBalance > 0) {
            IERC20(userReward).safeApprove(address(alpacaVault), rewardBalance);
            alpacaVault.deposit(rewardBalance);
            IERC20(userReward).safeApprove(address(alpacaVault), 0);
        }
    }

    function depositAllFairLaunch() internal {
        uint256 alpacaVaultBalance = alpacaVault.balanceOf(address(this));

        if (alpacaVaultBalance > 0) {
            IERC20(alpacaVault).safeApprove(address(fairLaunch), alpacaVaultBalance);
            fairLaunch.deposit(address(this), fairLaunchPoolId, alpacaVaultBalance);
            IERC20(alpacaVault).safeApprove(address(fairLaunch), 0);
        }
    }

}
