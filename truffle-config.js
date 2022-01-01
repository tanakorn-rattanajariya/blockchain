const HDWalletProvider = require("@truffle/hdwallet-provider");
const Web3 = require("web3");
const SECRET = "lend very analyst decorate kick arm chunk basic milk custom orphan buffalo";
const mnemonicPhrase = SECRET;

module.exports = {
  networks: {
    development: {
      host: "localhost",
      port: 7545,
      network_id: "*", // Match any network id
    },
    ropsten: {
      // must be a thunk, otherwise truffle commands may hang in CI
      provider: () =>
        new HDWalletProvider({
          mnemonic: {
            phrase: mnemonicPhrase,
          },
          providerOrUrl: "https://ropsten.infura.io/v3/YOUR-PROJECT-ID",
          numberOfAddresses: 1,
          shareNonce: true,
          derivationPath: "m/44'/1'/0'/0/",
        }),
      network_id: "3",
    },
  },
  compilers: {
    solc: {
      version: "^0.8.0"
    }
  }
};
