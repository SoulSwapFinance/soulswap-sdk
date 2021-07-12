import { Currency } from './entities/Currency'
import { CurrencyAmount } from './entities/CurrencyAmount'
import { Percent } from './entities/Percent'
import { Token } from './entities/Token'
import { Trade } from './entities/Trade'
import { TradeType } from './enums/TradeType'
import invariant from 'tiny-invariant'
import { validateAndParseAddress } from './functions/validateAndParseAddress'

// options for producing the arguments to send call to the router.
export interface TradeOptions {
  // execution price is allowed to move unfavorably from the trade execution price.
  allowedSlippage: Percent
  // time till expires used to produce a `deadline` parameter which is computed from when the swap call parameters
  ttl: number
  // account that should receive the output of the swap.
  recipient: string
  // whether any of the tokens in the path are fee on transfer tokens, which should be handled with special methods
  feeOnTransfer?: boolean
}

export interface TradeOptionsDeadline extends Omit<TradeOptions, 'ttl'> {
  // transaction expires
  deadline: number
}

// parameters to use in the call to the router to execute a trade.
export interface SwapParameters {
  // method to call on the router.
  methodName: string
  // arguments to pass to the method, all hex encoded.
  args: (string | string[])[]
  // amount of wei to send in hex.
  value: string
}

export function toHex(currencyAmount: CurrencyAmount<Currency>) {
  return `0x${currencyAmount.quotient.toString(16)}`
}

const ZERO_HEX = '0x0'

// represents the SoulSwap Router, and has static methods for helping execute trades.
export abstract class Router {
  // cannot be constructed.
  private constructor() {}
  // on-chain method name to call and the hex encoded parameters to pass as arguments for a given trade.
  public static swapCallParameters(
    trade: Trade<Currency, Currency, TradeType>,
    options: TradeOptions | TradeOptionsDeadline
  ): SwapParameters {
    const etherIn = trade.inputAmount.currency.isNative
    const etherOut = trade.outputAmount.currency.isNative
    // the router does not support both ether in and out
    invariant(!(etherIn && etherOut), 'ETHER_IN_OUT')
    invariant(!('ttl' in options) || options.ttl > 0, 'TTL')

    const to: string = validateAndParseAddress(options.recipient)
    const amountIn: string = toHex(
      trade.maximumAmountIn(options.allowedSlippage)
    )
    const amountOut: string = toHex(
      trade.minimumAmountOut(options.allowedSlippage)
    )
    const path: string[] = trade.route.path.map((token: Token) => token.address)
    const deadline =
      'ttl' in options
        ? `0x${(Math.floor(new Date().getTime() / 1000) + options.ttl).toString(
            16
          )}`
        : `0x${options.deadline.toString(16)}`

    const useFeeOnTransfer = Boolean(options.feeOnTransfer)

    let methodName: string
    let args: (string | string[])[]
    let value: string
    switch (trade.tradeType) {
      case TradeType.EXACT_INPUT:
        if (etherIn) {
          methodName = useFeeOnTransfer
            ? 'swapExactETHForTokensSupportingFeeOnTransferTokens'
            : 'swapExactETHForTokens'
          // (uint amountOutMin, address[] calldata path, address to, uint deadline)
          args = [amountOut, path, to, deadline]
          value = amountIn
        } else if (etherOut) {
          methodName = useFeeOnTransfer
            ? 'swapExactTokensForETHSupportingFeeOnTransferTokens'
            : 'swapExactTokensForETH'
          // (uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline)
          args = [amountIn, amountOut, path, to, deadline]
          value = ZERO_HEX
        } else {
          methodName = useFeeOnTransfer
            ? 'swapExactTokensForTokensSupportingFeeOnTransferTokens'
            : 'swapExactTokensForTokens'
          // (uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline)
          args = [amountIn, amountOut, path, to, deadline]
          value = ZERO_HEX
        }
        break
      case TradeType.EXACT_OUTPUT:
        invariant(!useFeeOnTransfer, 'EXACT_OUT_FOT')
        if (etherIn) {
          methodName = 'swapETHForExactTokens'
          // (uint amountOut, address[] calldata path, address to, uint deadline)
          args = [amountOut, path, to, deadline]
          value = amountIn
        } else if (etherOut) {
          methodName = 'swapTokensForExactETH'
          // (uint amountOut, uint amountInMax, address[] calldata path, address to, uint deadline)
          args = [amountOut, amountIn, path, to, deadline]
          value = ZERO_HEX
        } else {
          methodName = 'swapTokensForExactTokens'
          // (uint amountOut, uint amountInMax, address[] calldata path, address to, uint deadline)
          args = [amountOut, amountIn, path, to, deadline]
          value = ZERO_HEX
        }
        break
    }
    return { methodName, args, value }
  }
}
