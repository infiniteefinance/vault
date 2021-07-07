// SPDX-License-Identifier: MIT
pragma solidity >=0.6.12;

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

contract MasterChefSingleCompoundWorker is YieldWorker, Ownable, Pausable {
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
    IMasterChef public rewardMasterChef;
    PriceOracle public oracle;

    // Current pending reward amount
    uint256 public pending;
    // Current reward amount
    uint256 public currentReward;
    // MasterChef poolId
    uint256 public poolId;
    // Reward MasterChef poolId
    uint256 public rewardPoolId;
    // Minimum farmReward token before swap to reward
    uint256 public minFarmBeforeSwap;
    // Reward token route
    address[] public rewardRoute;
    // Operator address.
    address public operator;

    modifier onlyVault {
        require(msg.sender == address(vault), "permission: not vault!");
        _;
    }

    modifier onlyOperator {
        require(msg.sender == operator, "permission: not operator!");
        _;
    }

    constructor(
        IERC20 _farmToken,
        IERC20 _farmRewardToken,
        IERC20 _userRewardToken,
        IUniswapRouterETH _router,
        IMasterChef _masterChef,
        IMasterChef _rewardMasterChef,
        PriceOracle _oracle,
        uint256 _poolId,
        uint256 _rewardPoolId,
        address[] memory _rewardRoute
    ) public {
        farm = _farmToken;
        farmReward = _farmRewardToken;
        userReward = _userRewardToken;
        router = _router;
        masterChef = _masterChef;
        rewardMasterChef = _rewardMasterChef;
        oracle = _oracle;
        poolId = _poolId;
        rewardPoolId = _rewardPoolId;
        rewardRoute = _rewardRoute;
        operator = msg.sender;
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

        masterChef.deposit(poolId, 0);

        if (currentReward > 0) {
            rewardMasterChef.deposit(rewardPoolId, 0);
        }

        uint256 farmRewardBalance = farmReward.balanceOf(address(this));
        uint256 minOutFromFarm = abi.decode(data, (uint256));

        // Work on selling reward
        if (farmRewardBalance > minFarmBeforeSwap) {
            swap(farmReward, farmRewardBalance, minOutFromFarm, rewardRoute);
        }

        uint256 rewardBalance = userReward.balanceOf(address(this));

        if (rewardBalance > 0) {
            pending = rewardBalance;
            currentReward = currentReward.add(pending);

            // Update vault reward value and reset pending for the next work
            vault.updateVault();
            pending = 0;

            depositRewardMasterChef(rewardBalance);
        }
    }

    function claimReward(uint256 _amount) external override onlyVault {
        if (_amount > 0) {
            uint256 workerBalance = userReward.balanceOf(address(this));
            currentReward = currentReward.sub(_amount);

            if (_amount > workerBalance) {
                rewardMasterChef.withdraw(rewardPoolId, _amount.sub(workerBalance));
            }

            userReward.safeTransfer(msg.sender, _amount);
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

    function setMinSwap(uint256 _minFarmBeforeSwap) external onlyOwner {
        minFarmBeforeSwap = _minFarmBeforeSwap;
    }

    function setOperator(address _operator) external onlyOperator {
        operator = _operator;
    }

    function pause() public onlyOperator {
        _pause();
    }

    function unpause() external onlyOperator {
        _unpause();
    }

    function swap(IERC20 _token, uint256 _amount, uint256 _minOut, address[] memory path) internal {
        _token.safeApprove(address(router), _amount);
        router.swapExactTokensForTokens(_amount, _minOut, path, address(this), now);
        _token.safeApprove(address(router), 0);
    }

    function depositRewardMasterChef(uint256 _amount) internal {
        IERC20(userReward).safeApprove(address(rewardMasterChef), _amount);
        rewardMasterChef.deposit(rewardPoolId, _amount);
        IERC20(userReward).safeApprove(address(rewardMasterChef), 0);
    }

}
