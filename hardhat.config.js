require("@nomiclabs/hardhat-waffle");
require('@nomiclabs/hardhat-ethers');
require('solidity-coverage');
require("hardhat-gas-reporter");

/**
 * @type import('hardhat/config').HardhatUserConfig
 */

module.exports = {
  solidity: {
    compilers: [
      { version: '0.4.18' },
      { version: '0.5.16' },
      { version: '0.6.6' },
      { version: '0.6.12' },
    ]
  },
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true
    },
    testnet: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545",
      chainId: 97,
      accounts: { mnemonic: "" }
    },
  },
  gasReporter: {
    enabled: false,
    currency: 'BNB',
    gasPrice: 5
  }
};

