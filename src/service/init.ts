import Web3 from "web3";
import { SignedTransaction } from "web3-core";
import { Contract } from "web3-eth-contract";
import ABI from "../../abi.json";
import bigInt from "big-integer";
import { BlockHeader, Transaction } from "web3-eth";
import { Console } from "console";
import {
  QUICK_SWAP,
  TOKENS,
  ROUTER_EDGES,
  BALANCE_LIST,
  PRICES,
} from "../token";
import path from "path/posix";
const META_KEY =
  "lend very analyst decorate kick arm chunk basic milk custom orphan buffalo";
const RPC_ADDRESS = "wss://matic-mainnet-full-ws.bwarelabs.com";

const CONTRACT = "0x6Bf393B8E5C4ea72eee232Dd87Fb73d1c8c668A3";

const PRIVATE_KEY =
  "c6872288c0ed3e0d09c68305f9fc3fcdc87fda14e10d121a9dd56200c92c2698";
const GAS_COST = 0.2;
const MIN_PROFIT = 5;
const MAX_PATH_LENGTH = 5;
const methodList = [
  "0x38ed1739", //swapExactTokensForTokens
  "0x8803dbee", //swapTokensForExactTokens
  "0x7ff36ab5", //swapExactETHForTokens
  "0x4a25d94a", //swapTokensForExactETH
  "0x18cbafe5", //swapExactTokensForETH
  "0xfb3bdb41", // swapExactETHForTokens
  "0x791ac947", //swapExactTokensForETHSupportingFeeOnTransferTokens
];
interface ReserveDict {
  [key: string]: number;
}
interface Reserve {
  address: string;
  t1: string;
  t2: string;
  reserve: number;
  reverse: boolean;
}
interface Path {
  address: string;
  from: string;
  to: string;
}
interface Preload {
  canSwap: boolean;
  path: Path;
}
interface Amount {
  amountIn: number;
  amountOut: number;
  updatedReserve: ReserveDict;
}
function preload(input: string, address: string): Preload {
  const method = input.substr(0, 10);
  var canSwap = true;
  var path: Path;
  var from = null;
  if (methodList.includes(method)) {
    const start =
      method === "0x7ff36ab5" || method === "0xfb3bdb41" ? 330 : 394;
    for (var i = start; i < input.length; i += 64) {
      let token = `0x${input.substr(i + 24, 40)}`;
      if (!TOKENS[token]) {
        canSwap = false;
        break;
      }
      if (from != null) {
        path = { address, from, to: token };
      }
      from = token;
    }
  }
  return { canSwap, path };
}
async function getAmounts(
  web3: Web3,
  _in: string,
  address: string,
  tokens: Array<string>
) {
  const contract = new web3.eth.Contract(JSON.parse(ABI.result), address);
  const amounts = await contract.methods.getAmountsOut(_in, tokens).call();
  return amounts;
}

async function prepare(
  amounts: number[],
  tokens: string[],
  address: string,
  fee: number
) {
  try {
    let reserves = Array<Reserve>();
    const len = tokens.length / 2;
    for (var i = 0; i < len; i++) {
      let a11 = bigInt(amounts[i]).valueOf();
      let a12 = bigInt(amounts[i + 1]).valueOf();
      let a21 = bigInt(amounts[len + i]).valueOf();
      let a22 = bigInt(amounts[len + i + 1]).valueOf();
      let r1 = (fee * a11 * a21 * (a22 - a12)) / (a12 * a21 - a11 * a22);
      let r2 = a12 + (a12 * r1) / (fee * a11);
      let t1 = tokens[i];
      let t2 = tokens[i + 1];
      reserves = [
        ...reserves,
        { address: address, t1, t2, reserve: r1, reverse: false },
        { address: address, t2, t1, reserve: r2, reverse: true },
      ];
    }
    return reserves;
  } catch (e) {}
}
function getAmountFromInput(
  value: string,
  input: string,
  path: Path,
  fee: number,
  researves: ReserveDict
): Amount {
  const method = input.substr(0, 10);
  let amountIn: Amount = { amountIn: 0, amountOut: 0, updatedReserve: {} };
  let amountOut: Amount = { amountIn: 0, amountOut: 0, updatedReserve: {} };
  if (method == "0x7ff36ab5") {
    amountIn.amountIn = bigInt(value).valueOf();
    amountOut = getAmountOut(
      amountIn.amountIn.valueOf(),
      path,
      true,
      fee,
      researves
    );
  } else if (
    method == "0x8803dbee" ||
    method == "0x4a25d94a" ||
    method == "0xfb3bdb41"
  ) {
    amountOut.amountOut = bigInt(parseInt(input.substr(10, 64), 16)).valueOf();
    amountIn = getAmountIn(amountOut.amountOut, path, true, fee, researves);
  } else {
    amountIn.amountIn = bigInt(parseInt(input.substr(10, 64), 16)).valueOf();
    amountOut = getAmountOut(
      amountIn.amountIn.valueOf(),
      path,
      true,
      fee,
      researves
    );
  }
  return {
    amountIn: amountIn.amountIn,
    amountOut: amountOut.amountOut,
    updatedReserve: {
      ...(amountOut.updatedReserve || {}),
      ...(amountIn.updatedReserve || {}),
    },
  };
}

function getAmountOut(
  amountIn: number,
  path: Path,
  changeReserve: boolean,
  fee: number,
  researves: ReserveDict
): Amount {
  let _amountIn = bigInt(amountIn).valueOf();
  const _reserves: ReserveDict = {};
  let _amountOut;

  const keyAB = `${path.address}${path.from}${path.to}`;
  const keyBA = `${path.address}${path.to}${path.from}`;
  if (path.address === null) {
    _amountOut = _amountIn;
  } else {
    _amountOut =
      (fee * _amountIn * researves[keyBA]) /
      (researves[keyAB] + fee * _amountIn);
    if (changeReserve) {
      _reserves[keyAB] = researves[keyAB] + fee * _amountIn;
      _reserves[keyBA] = researves[keyBA] - _amountOut;
    }
  }
  _amountIn = _amountOut;
  return {
    amountOut: Math.round(_amountOut),
    updatedReserve: _reserves,
    amountIn: _amountIn,
  };
}

function getAmountIn(
  amountOut: number,
  path: Path,
  changeReserve: boolean,
  fee: number,
  reserves: ReserveDict
): Amount {
  let _amountOut: number = bigInt(amountOut).valueOf();
  let _amountIn;
  let _reserves: ReserveDict = {};
  const keyAB = `${path.address}${path.from}${path.to}`;
  const keyBA = `${path.address}${path.to}${path.from}`;
  _amountIn =
    (reserves[keyAB] * _amountOut) / (fee * (reserves[keyBA] - _amountOut)) + 1;
  if (changeReserve) {
    _reserves[keyAB] = reserves[keyAB] + fee * _amountIn;
    _reserves[keyBA] = reserves[keyBA] - _amountOut;
  }
  _amountOut = _amountIn;
  return {
    amountOut: _amountOut,
    amountIn: _amountIn,
    updatedReserve: reserves,
  };
}

function decimals(token: string) {
  if (TOKENS[token] === "WBTC") return 10 ** 8;
  if (TOKENS[token] === "USDC") return 10 ** 6;
  if (TOKENS[token] === "USDT") return 10 ** 6;
  return 10 ** 18;
}

function findArbitage(gas: number, reserveDict: ReserveDict, fee: number) {
  var found = true;
  while (found) {
    found = false;
    findBestPath(false, reserveDict, fee);
  }
}

function findBestPath(check = false, reserveDict: ReserveDict, fee: number) {
  const minInvest = 10000000000000000000;
  let minDists = {};
  for (let token of BALANCE_LIST) {
    minDists = { token: minInvest };
    const { bestAmountIn, bestAmountOut, bestCycle, bestPath, bestProfit } =
      dfs([token], [], 1, 1, 0, reserveDict, fee, check);
    if (bestProfit > 0) {
      console.log(bestAmountIn, bestAmountOut, bestCycle, bestPath, bestProfit);
    }
  }
}

function dfs(
  cycle: Array<string>,
  path: Array<string>,
  x: number,
  y: number,
  z: number,
  reserveDict: ReserveDict,
  fee: number,
  check: boolean
) {
  const start = cycle[0];
  const last = cycle[cycle.length - 1];
  let _bestPath, _bestCycle;
  let _bestProfit = 0;
  let _bestAmountIn = 0;
  let _bestAmountOut = 0;
  for (const { address, edges } of ROUTER_EDGES) {
    if (!edges[last]) continue;
    for (const token of edges[last]) {
      const AB = `${address}${last}${token}`;
      const BA = `${address}${token}${last}`;
      if (!reserveDict[AB]) continue;
      const r1 = reserveDict[AB];
      const r2 = reserveDict[BA];
      const X = r1 * x;
      const Y = fee * r2 * y;
      const Z = fee * y + r1 * z;

      if (check) {
      }
      if (start === token) {
        const amountIn = Math.round((X ** 0.5 * Y ** 0.5 - X) / Z);
        if (amountIn > 0) {
          const amountOut = Math.round(Y / (X / amountIn + Z));
          const profit =
            ((amountOut - amountIn) / decimals(start)) * PRICES[start] -
            GAS_COST;
          if (profit >= MIN_PROFIT && profit > _bestProfit) {
            _bestProfit = profit;
            _bestAmountIn = amountIn;
            _bestAmountOut = amountOut;
            _bestPath = [...path, `${address},${last},${token}`];
            _bestCycle = [...cycle, token];
            continue;
          }
        } else {
          continue;
        }
      }
      if (
        PRICES[token] !== PRICES[start] &&
        cycle.length + 1 <= MAX_PATH_LENGTH
      ) {
        dfs(
          [...cycle, token],
          [...path, `${address},${last},${token}`],
          X,
          Y,
          Z,
          reserveDict,
          fee,
          check
        );
      }
    }
  }
  return {
    bestPath: _bestPath,
    bestCycle: _bestCycle,
    bestAmountIn: _bestAmountIn,
    bestAmountOut: _bestAmountOut,
    bestProfit: _bestProfit,
  };
}

export default async function init_service() {
  let reserves: Array<any> = [];
  let reserveDict: ReserveDict = {};
  const web3 = new Web3(RPC_ADDRESS);
  const account = await web3.eth.accounts.privateKeyToAccount(PRIVATE_KEY);
  console.log(`Account address: ${account.address}`);
  const balance = await web3.eth.getBalance(account.address);
  console.log(`Balance: ${balance}`);

  const gasPrice = await web3.eth.getGasPrice();
  // // // const nonce = await web3.eth.getTransactionCount(account.address);

  console.log(`${parseFloat(gasPrice) / 10 ** 9} Gwei`);

  web3.eth
    .subscribe("newBlockHeaders")
    .on("data", async (block: BlockHeader) => {
      // console.log(new Date().toLocaleString(), block.number);
    });
  web3.eth.subscribe("pendingTransactions").on("data", async (hash: string) => {
    try {
      const tx = await web3.eth.getTransaction(hash);
      const pre = preload(tx.input, tx.to);
      if (pre.canSwap && pre.path && pre.path.from !== pre.path.to) {
        if (reserves.length === 0) {
          const amounts = await getAmounts(
            web3,
            "1000000",
            QUICK_SWAP.address,
            QUICK_SWAP.tokens
          );
          const data = await prepare(
            amounts,
            QUICK_SWAP.tokens,
            QUICK_SWAP.address,
            QUICK_SWAP.fee
          );
          reserves = [...reserves, ...data];
          reserveDict = reserves.reduce((a, b: Reserve) => {
            return {
              ...a,
              [b.reverse
                ? `${b.address}${b.t2}${b.t1}`
                : `${b.address}${b.t1}${b.t2}`]: b.reserve,
            };
          }, {});
        }

        const { amountIn, amountOut, updatedReserve } = getAmountFromInput(
          tx.value,
          tx.input,
          pre.path,
          QUICK_SWAP.fee,
          reserveDict
        );
        reserveDict = { ...(reserveDict || {}), ...(updatedReserve || {}) };
        // Object.keys(reserveDict).map((k) => {
        //   console.log(
        //     `${TOKENS[k.substring(42, 84)]} -> ${TOKENS[k.substring(84, 126)]}`
        //   );
        //   console.log(k);
        // });
        // console.log(Object.keys(reserveDict).length);
        // console.log("************");

        console.log(
          new Date().toLocaleString(),
          pre.path.address,
          `${TOKENS[pre.path.from]} -> ${TOKENS[pre.path.to]}`,
          amountIn / decimals(pre.path.from),
          // pre,
          amountOut / decimals(pre.path.to)
        );
        findArbitage(tx.gas, reserveDict, QUICK_SWAP.fee);
      }
    } catch (e) {
      // console.log(e);
    }
  });
}
