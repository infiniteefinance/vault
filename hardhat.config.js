require('@nomiclabs/hardhat-waffle');
require('@nomiclabs/hardhat-ethers');
require("@nomiclabs/hardhat-etherscan");
require('solidity-coverage');
require('hardhat-gas-reporter');
require('dotenv').config();

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task('accounts', 'Prints the list of accounts', async () => {
  const accounts = await ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
// 0x7162BAb048105A643BB639f8d4fb9d4625f9Be0b

module.exports = {
  solidity: {
    compilers: [
      { 
        version: '0.4.18',
        settings: {
          optimizer: {
            enabled: true,
            runs: 1000
          }
        }
      },
      { 
        version: '0.5.16',
        settings: {
          optimizer: {
            enabled: true,
            runs: 1000
          }
        }
      },
      { 
        version: '0.6.6',
        settings: {
          optimizer: {
            enabled: true,
            runs: 1000
          }
        }
      },
      { 
        version: '0.6.12',
        settings: {
          optimizer: {
            enabled: true,
            runs: 1000
          }
        }
      },
    ],
  },
  defaultNetwork: 'hardhat',
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
    },
    local: {
      url: 'http://localhost:8545/',
      accounts: [`0x${process.env.LOCAL_PRIVATE_KEY}`],
      gas: 12000000,
      network_id: '9999',
    },
    bscmainnet: {
      url: 'https://bsc-dataseed1.defibit.io/',
      accounts: [`0x${process.env.BSC_MAINNET_PRIVATE_KEY}`],
    },
    bsctestnet: {
      url: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
      chainId: 97,
      gas: 'auto',
      gasPrice: 20000000000,
      accounts: [`0x${process.env.BSC_TESTNET_PRIVATE_KEY}`],
    },
  },
  gasReporter: {
    enabled: false,
    currency: 'BNB',
    gasPrice: 5,
  },
  etherscan: {
    apiKey: process.env.BSC_SCAN_API_KEY, //BSC-BSCScan
  },
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts',
  },
  typechain: {
    outDir: './typechain',
    target: process.env.TYPECHAIN_TARGET || 'ethers-v5',
  },
  mocha: {
    timeout: 50000,
  },
};
