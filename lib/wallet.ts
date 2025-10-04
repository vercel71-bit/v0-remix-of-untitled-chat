// Wallet utility functions for carbon credit platform
import { ethers } from "ethers"
import { BlockchainService, CONTRACTS } from "./blockchain"

export interface WalletConnection {
  address: string
  chainId: number
  isConnected: boolean
  provider: string
}

export interface TokenBalance {
  symbol: string
  name: string
  balance: number
  decimals: number
  contractAddress: string
  priceUSD: number
  value: number
}

export interface Transaction {
  hash: string
  from: string
  to: string
  value: string
  token: string
  timestamp: string
  status: "pending" | "confirmed" | "failed"
  gasUsed?: string
  gasPrice?: string
}

export class WalletService {
  static async connectWallet(provider: "metamask" | "walletconnect" = "metamask"): Promise<WalletConnection> {
    console.log("Connecting to wallet:", provider)

    if (provider === "metamask") {
      const address = await BlockchainService.connectWallet()
      return {
        address,
        chainId: 80002, // Polygon Amoy
        isConnected: true,
        provider: "metamask",
      }
    }

    throw new Error("Only MetaMask is currently supported")
  }

  static async disconnectWallet(): Promise<void> {
    console.log("Disconnecting wallet")
    // MetaMask doesn't have a disconnect method, user must disconnect from extension
  }

  static async getTokenBalances(address: string): Promise<TokenBalance[]> {
    console.log("Fetching token balances for:", address)

    try {
      const balance = await BlockchainService.getTokenBalance(address)

      return [
        {
          symbol: "CCT",
          name: "Carbon Credit Token",
          balance,
          decimals: 0, // ERC721 tokens don't have decimals
          contractAddress: CONTRACTS.BLUE_CHAIN_CARBON,
          priceUSD: 25.5, // This would need to come from a price oracle
          value: balance * 25.5,
        },
      ]
    } catch (error) {
      console.error("Error fetching token balances:", error)
      return []
    }
  }

  static async sendTokens(
    tokenAddress: string,
    recipientAddress: string,
    amount: string,
    senderAddress: string,
  ): Promise<string> {
    console.log("Sending tokens:", {
      tokenAddress,
      recipientAddress,
      amount,
      senderAddress,
    })

    // For ERC721, this would be a transfer of a specific tokenId
    // This is a simplified implementation
    throw new Error("Direct token transfers should use the marketplace functions")
  }

  static async getTransactionHistory(address: string): Promise<Transaction[]> {
    console.log("Fetching transaction history for:", address)

    try {
      // Query PolygonScan API for transaction history
      // Note: You would need a PolygonScan API key for production
      const response = await fetch(
        `https://api-amoy.polygonscan.com/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc&apikey=YourApiKeyToken`,
      )

      if (!response.ok) {
        throw new Error("Failed to fetch transaction history")
      }

      const data = await response.json()

      if (data.status === "1" && data.result) {
        return data.result.slice(0, 10).map((tx: any) => ({
          hash: tx.hash,
          from: tx.from,
          to: tx.to,
          value: ethers.formatEther(tx.value),
          token: "MATIC",
          timestamp: new Date(Number(tx.timeStamp) * 1000).toISOString(),
          status: tx.isError === "0" ? "confirmed" : "failed",
          gasUsed: tx.gasUsed,
          gasPrice: tx.gasPrice,
        }))
      }

      return []
    } catch (error) {
      console.error("Error fetching transaction history:", error)
      // Return empty array if API fails
      return []
    }
  }

  static async estimateGasFee(
    tokenAddress: string,
    recipientAddress: string,
    amount: string,
  ): Promise<{ gasLimit: string; gasPrice: string; totalFee: string }> {
    console.log("Estimating gas fee for transfer:", {
      tokenAddress,
      recipientAddress,
      amount,
    })

    try {
      if (typeof window !== "undefined" && window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum)
        const feeData = await provider.getFeeData()

        const gasLimit = "100000" // Estimated for NFT transfer
        const gasPrice = feeData.gasPrice || ethers.parseUnits("30", "gwei")
        const totalFee = ethers.formatEther(BigInt(gasLimit) * gasPrice)

        return {
          gasLimit,
          gasPrice: ethers.formatUnits(gasPrice, "gwei"),
          totalFee,
        }
      }
    } catch (error) {
      console.error("Error estimating gas fee:", error)
    }

    // Fallback estimates
    return {
      gasLimit: "100000",
      gasPrice: "30",
      totalFee: "0.003",
    }
  }

  static async switchNetwork(chainId: number): Promise<void> {
    console.log("Switching to network:", chainId)

    if (typeof window !== "undefined" && window.ethereum) {
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: `0x${chainId.toString(16)}` }],
        })
      } catch (error: any) {
        if (error.code === 4902) {
          throw new Error("Network not added to MetaMask")
        }
        throw error
      }
    }
  }

  static async addTokenToWallet(tokenAddress: string, symbol: string, decimals: number): Promise<void> {
    console.log("Adding token to wallet:", { tokenAddress, symbol, decimals })

    if (typeof window !== "undefined" && window.ethereum) {
      try {
        await window.ethereum.request({
          method: "wallet_watchAsset",
          params: {
            type: "ERC20",
            options: {
              address: tokenAddress,
              symbol,
              decimals,
            },
          },
        })
      } catch (error) {
        console.error("Error adding token to wallet:", error)
      }
    }
  }
}

// Utility functions
export const formatTokenAmount = (amount: number, decimals = 18): string => {
  return (amount / Math.pow(10, decimals)).toFixed(4)
}

export const parseTokenAmount = (amount: string, decimals = 18): string => {
  return (Number.parseFloat(amount) * Math.pow(10, decimals)).toString()
}

export const formatAddress = (address: string): string => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export const formatTransactionHash = (hash: string): string => {
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`
}

export const calculatePortfolioValue = (tokens: TokenBalance[]): number => {
  return tokens.reduce((total, token) => total + token.value, 0)
}

export const calculatePortfolioChange = (
  currentValue: number,
  previousValue: number,
): { change: number; percentage: number } => {
  const change = currentValue - previousValue
  const percentage = previousValue > 0 ? (change / previousValue) * 100 : 0
  return { change, percentage }
}

// Constants
export const SUPPORTED_NETWORKS = {
  POLYGON_AMOY: {
    chainId: 80002,
    name: "Polygon Amoy Testnet",
    rpcUrl:
      process.env.NEXT_PUBLIC_RPC_URL ||
      "https://newest-billowing-thunder.matic-amoy.quiknode.pro/3b8570557ac27520a694d0b445b617f95991cee5/",
    blockExplorer: "https://amoy.polygonscan.com",
  },
} as const

export const TOKEN_CONTRACTS = {
  CCT: CONTRACTS.BLUE_CHAIN_CARBON,
} as const
