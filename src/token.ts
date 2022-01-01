const USDT = "0xc2132d05d31c914a87c6611c10748aeb04b58e8f";
const WMATIC = "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270";
const USDC = "0x2791bca1f2de4661ed88a30c99a7a9449aa84174";
const BUSD = "0xdab529f40e671a1d4bf91361c21bf9f0c9712ab7";
const WBTC = "0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6";
const DAI = "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063";
const WETH = "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619";
const QUICK_SWAP_ADDRESS = "0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff";
const TOKENS: { [key: string]: string } = {
  [`${USDT}`]: "USDT",
  [`${WMATIC}`]: "WMATIC",
  [`${USDC}`]: "USDC",
  [`${WBTC}`]: "WBTC",
  [`${WETH}`]: "WETH",
};
const getEdges = (data: Array<Array<string>>) => {
  const edges: { [key: string]: Array<string> } = {};
  data.map((d) => {
    if (!edges[d[0]]) {
      edges[d[0]] = [];
    }
    if (!edges[d[1]]) {
      edges[d[1]] = [];
    }
    edges[d[0]].push(d[1]);
    edges[d[1]].push(d[0]);
  });
  return edges;
};
const QUICK_SWAP = {
  address: QUICK_SWAP_ADDRESS,
  fee: 0.997,
  // tokens: [USDT, WMATIC, USDC, WBTC, DAI, WETH],
  tokens: [
    USDC,
    USDT,
    WETH,
    WBTC,
    WETH,
    WMATIC,
    USDC,
    WETH,
    USDT,
    WMATIC,
    //
    USDC,
    USDT,
    WETH,
    WBTC,
    WETH,
    WMATIC,
    USDC,
    WETH,
    USDT,
    WMATIC,
  ],
};
const ROUTER_EDGES = [
  {
    address: QUICK_SWAP_ADDRESS,
    edges: getEdges([
      [USDC, WETH],
      [WBTC, WETH],
      [WMATIC, WETH],
      [WMATIC, USDT],
      [WETH, USDT],
      [WMATIC, USDC],
      [USDC, USDT],
    ]),
  },
];

const BALANCE_LIST = [USDT, USDC, WMATIC, BUSD, DAI];

const PRICES: { [key: string]: number } = {
  [`${USDT}`]: 33,
  [`${USDC}`]: 33,
  [`${BUSD}`]: 33,
  [`${DAI}`]: 33,
  [`${WMATIC}`]: 33 * 1.26,
};

export { QUICK_SWAP, TOKENS, ROUTER_EDGES, BALANCE_LIST, PRICES };
