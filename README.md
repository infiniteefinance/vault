# Infinitee Vaults

This is the primary code repository for the Infinitee Vaults smart contract. For documentation see [here](https://docs.infinitee.finance/platform/cumulative-vaults).

- [Infinitee Vaults](#infinitee-vaults)
- [Getting Started](#getting-started)
- [Optional configuration options](#optional-configuration-options)
- [Environment variables](#environment-variables)
- [Base system](#base-system)
- [Development](#development)
- [Test](#test)
- [Notes](#notes)
- [Hardhat compatible](#hardhat-compatible)
- [MasterChef Worker](#masterchef-worker)
- [Vault Flow Diagram](#vault-flow-diagram)
- [Deployed Contracts](#deployed-contracts)

## Getting Started

These libraries must be installed and available in your system in

order to run all of the VmX functionality:

- [NodeJS](https://nodejs.org/)

- [Npm](https://www.npmjs.com/)

- [Hardhat](https://yarnpkg.com/)

Dependencies are managed with npm. To get started:

```
git clone https://github.com/infiniteefinance/vault-contract.git

cd vault-contract

npm install

npx hardhat node
```

Run deployment script to local node:

```
npx hardhat run scripts/deploy.js --network localhost
npx hardhat run scripts/deploy-farm.js --network localhost
```

## Optional configuration options

TBA

## Environment variables

Local development environment variable are managed by `.env` file. You may need to ask it from other developer for specific value

| Variable                | Comment                                 |
| ----------------------- | --------------------------------------- |
| LOCAL_PRIVATE_KEY       | Account's private key for local network |
| BSC_TESTNET_PRIVATE_KEY | Account's private key for testnet       |
| BSC_MAINNET_PRIVATE_KEY | Account's private key for mainnet       |
| BSC_SCAN_API_KEY        | BSC's api key used by hardhat           |

## Contents

All of the following have been installed and pre-configured:

### Base system

- NodeJs

- Solidity >=0.6.0 <0.8.0

- Hathat

- EtherJs

NOTE: We recommend that you install and manage these system dependencies using a combination of [Homebrew](https://brew.sh/), [asdf-vm](https://asdf-vm.com/#/) (Ruby, NodeJS) and [npm](https://www.npmjs.com/) / [yarn](https://yarnpkg.com/). If you are starting fresh on a new system you may want to manage these package managers with a script like the [thoughtbot laptop script](https://github.com/thoughtbot/laptop) with the option to add your own opinionated extensions.

### Development

- [Hardhat](https://hardhat.org/)
- [Ethers](https://github.com/ethers-io/ethers.js/)

### Test

Project's tests are managed by `chai`, `hardhat-waffle` with runtime injected `hardhat` nodes. Test coverage generate by `solidity-coverage` in `/coverage` folder.

- [hardhat-waffle](https://hardhat.org/plugins/nomiclabs-hardhat-waffle.html)
- [chai](https://www.chaijs.com/)
- [solidity-coverage](https://github.com/sc-forks/solidity-coverage/)

## Note

### Hardhat

Hardhat supports solidity version 0.5.1 or greater only. For more informations about solidity compatible see [here](https://hardhat.org/reference/solidity-support.html).

### TimeLock

Timelock contract is utilzed along with masterchef contract for improving security by providing prevention of rugg pulls attack.

### MasterChef Worker

The vaults use worker smart contract extensively which extended form typical Masterchef contract. `MasterChefWorker` will convert the profit received from farming into rewards. `MasterChefWithVaultWorker` will use the reward converted from farming's profit to farm again to get more reward.

## Vault Flow Diagram

![Inf1](https://user-images.githubusercontent.com/86235409/123587065-e7cccd80-d80f-11eb-9e1e-d688e87d476b.png)

![Inf1-Page-2 (1)](https://user-images.githubusercontent.com/86235409/123607608-40a86000-d828-11eb-9e03-423f9265d751.png)

## Deployed Contracts

### Binance Smart Chain Testnet

- **Vaults** - [TBA](https://bscscan.com/address/TBA)
- **MasterChef:** [TBA](https://bscscan.com/address/TBA)
- **Timelock:** [TBA](https://www.bscscan.com/address/0x3278a9feadf2a461f6e35008e1ca611b64317ac6) (delay: 24h)

### Binance Smart Chain Mainnet

- **Vaults:** [TBA](https://bscscan.com/address/TBA)
- **MasterChef:** [TBA](https://bscscan.com/address/TBA)
- **Timelock:** [TBA](https://bscscan.com/address/TBA) (delay: 24h)

---
