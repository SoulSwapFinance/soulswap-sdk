import { Ether, Fantom } from '../entities/natives'

import { ChainId } from '../enums'

export const NATIVE = {
  [ChainId.MAINNET]: Ether.onChain(ChainId.MAINNET),
  [ChainId.FANTOM]: Fantom.onChain(ChainId.FANTOM),
  [ChainId.FANTOM_TESTNET]: Fantom.onChain(ChainId.FANTOM_TESTNET),
}
