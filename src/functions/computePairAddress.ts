import { keccak256, pack } from '@ethersproject/solidity'

import { Token } from '../entities/Token'
import { getCreate2Address } from '@ethersproject/address'

export const computePairAddress = ({
  factoryAddress,
  tokenA,
  tokenB,
  codeHash,
}: {
  factoryAddress: string
  tokenA: Token
  tokenB: Token
  codeHash: string
}): string => {
  const [token0, token1] = tokenA.sortsBefore(tokenB)
    ? [tokenA, tokenB]
    : [tokenB, tokenA] // does safety checks
  return getCreate2Address(
    factoryAddress,
    keccak256(
      ['bytes'],
      [pack(['address', 'address'], [token0.address, token1.address])]
    ),
    codeHash
  )
}
