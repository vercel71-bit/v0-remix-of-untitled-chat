export interface Window {
  ethereum?: {
    request: (args: { method: string; params?: any[] }) => Promise<any>
    on: (event: string, callback: (accounts: string[]) => void) => void
    removeListener: (event: string, callback: (accounts: string[]) => void) => void
    isMetaMask?: boolean
  }
}

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>
      on: (event: string, callback: (accounts: string[]) => void) => void
      removeListener: (event: string, callback: (accounts: string[]) => void) => void
      isMetaMask?: boolean
    }
  }
}

export interface WalletState {
  address: string | null
  isConnected: boolean
  chainId: number | null
}

export interface TransactionResult {
  hash: string
  blockNumber?: number
  gasUsed?: string
  status?: number
}
