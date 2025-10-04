// Blockchain utility functions for carbon credit platform
import { ethers } from "ethers"
import { put } from "@vercel/blob"

export interface CarbonCreditToken {
  tokenId: string
  projectId: string
  creditsAmount: number
  issueDate: string
  verifierAddress: string
  metadataURI: string
}

export interface ProjectRecord {
  projectId: string
  ngoAddress: string
  verifierAddress: string
  location: {
    latitude: number
    longitude: number
  }
  area: number
  projectType: string
  carbonSequestration: number
  verificationDate: string
  metadataURI: string
  transactionHash: string
  blockNumber: number
}

export const CONTRACTS = {
  BLUE_CHAIN_CARBON: "0xeb4cba4759bf91b0d3252564b951f1d577e744df",
} as const

const RPC_URLS = {
  polygonAmoy:
    process.env.NEXT_PUBLIC_RPC_URL ||
    "https://newest-billowing-thunder.matic-amoy.quiknode.pro/3b8570557ac27520a694d0b445b617f95991cee5/",
} as const

export const NETWORK_CONFIG = {
  chainId: 80002, // Polygon Amoy testnet
  chainName: "Polygon Amoy Testnet",
  nativeCurrency: {
    name: "MATIC",
    symbol: "MATIC",
    decimals: 18,
  },
  rpcUrls: [RPC_URLS.polygonAmoy],
  blockExplorerUrls: ["https://amoy.polygonscan.com/"],
} as const

export const BLOCKCHAIN_CONFIG = {
  VERIFIER_ADDRESS: "0x087573bec726A13d77F521318b3FD7dE3c830988",
  OWNER_ADDRESS: "0x087573bec726A13d77F521318b3FD7dE3c830988",
  FEE_RECIPIENT: "0x087573bec726A13d77F521318b3FD7dE3c830988",
  PLATFORM_FEE_BP: 250, // 2.5%
} as const

const chainIdHex = NETWORK_CONFIG.chainId.toString(16)
const HEX_CHAIN_ID = "0x" + chainIdHex

const BLUE_CHAIN_CARBON_ABI = [
  "function mintCredit(address to, uint256 amount, string memory metadataURI) external returns (uint256)",
  "function listCredit(uint256 tokenId, uint256 price) external",
  "function buyCredit(uint256 tokenId) external payable",
  "function delistCredit(uint256 tokenId) external",
  "function retireCredit(uint256 tokenId) external",
  "function rateSeller(address seller, uint8 rating) external",
  "function addVerifier(address verifier) external",
  "function removeVerifier(address verifier) external",
  "function updatePlatformFee(uint256 newFeeBP) external",
  "function updateFeeRecipient(address newRecipient) external",
  "function withdrawFees() external",
  "function balanceOf(address owner) external view returns (uint256)",
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "function tokenURI(uint256 tokenId) external view returns (string)",
  "function getListingPrice(uint256 tokenId) external view returns (uint256)",
  "function isListed(uint256 tokenId) external view returns (bool)",
  "function isRetired(uint256 tokenId) external view returns (bool)",
  "function getSellerRating(address seller) external view returns (uint256, uint256)",
  "function isVerifier(address account) external view returns (bool)",
  "function platformFeeBP() external view returns (uint256)",
  "function feeRecipient() external view returns (address)",
  "function accumulatedFees() external view returns (uint256)",
  "event CreditMinted(uint256 indexed tokenId, address indexed to, uint256 amount, string metadataURI)",
  "event CreditListed(uint256 indexed tokenId, address indexed seller, uint256 price)",
  "event CreditSold(uint256 indexed tokenId, address indexed seller, address indexed buyer, uint256 price)",
  "event CreditDelisted(uint256 indexed tokenId, address indexed seller)",
  "event CreditRetired(uint256 indexed tokenId, address indexed owner)",
  "event SellerRated(address indexed seller, address indexed rater, uint8 rating)",
  "event VerifierAdded(address indexed verifier)",
  "event VerifierRemoved(address indexed verifier)",
]

export class BlockchainService {
  private static getProvider(): ethers.JsonRpcProvider {
    const rpcUrl = RPC_URLS.polygonAmoy
    return new ethers.JsonRpcProvider(rpcUrl)
  }

  private static async getSigner(): Promise<ethers.Signer> {
    if (typeof window !== "undefined" && window.ethereum) {
      const provider = new ethers.BrowserProvider(window.ethereum)

      try {
        await provider.send("wallet_switchEthereumChain", [{ chainId: HEX_CHAIN_ID }])
      } catch (switchError: any) {
        // If the chain hasn't been added to MetaMask, add it
        if (switchError.code === 4902) {
          await provider.send("wallet_addEthereumChain", [NETWORK_CONFIG])
        }
      }

      await provider.send("eth_requestAccounts", [])
      return provider.getSigner()
    }
    throw new Error("MetaMask not found. Please install MetaMask to interact with the blockchain.")
  }

  static async mintCarbonCredits(
    recipientAddress: string,
    creditsAmount: number,
    metadataURI: string,
  ): Promise<{ transactionHash: string; tokenId: string }> {
    try {
      const signer = await this.getSigner()
      const contract = new ethers.Contract(CONTRACTS.BLUE_CHAIN_CARBON, BLUE_CHAIN_CARBON_ABI, signer)

      console.log("[v0] Minting carbon credits:", { recipientAddress, creditsAmount, metadataURI })

      // Call mintCredit function - only verifiers can call this
      const tx = await contract.mintCredit(recipientAddress, creditsAmount, metadataURI)
      const receipt = await tx.wait()

      // Extract tokenId from CreditMinted event
      const event = receipt.logs.find((log: any) => {
        try {
          const parsed = contract.interface.parseLog(log)
          return parsed?.name === "CreditMinted"
        } catch {
          return false
        }
      })

      let tokenId = "0"
      if (event) {
        const parsed = contract.interface.parseLog(event)
        tokenId = parsed?.args[0].toString()
      }

      console.log("[v0] Carbon credits minted successfully:", tx.hash, "TokenID:", tokenId)
      return { transactionHash: tx.hash, tokenId }
    } catch (error) {
      console.error("[v0] Error minting carbon credits:", error)
      throw error
    }
  }

  static async listCredit(tokenId: string, priceInMatic: number): Promise<string> {
    try {
      const signer = await this.getSigner()
      const contract = new ethers.Contract(CONTRACTS.BLUE_CHAIN_CARBON, BLUE_CHAIN_CARBON_ABI, signer)

      const priceInWei = ethers.parseEther(priceInMatic.toString())

      console.log("[v0] Listing credit:", { tokenId, priceInMatic })

      const tx = await contract.listCredit(tokenId, priceInWei)
      await tx.wait()

      console.log("[v0] Credit listed successfully:", tx.hash)
      return tx.hash
    } catch (error) {
      console.error("[v0] Error listing credit:", error)
      throw error
    }
  }

  static async buyCredit(tokenId: string): Promise<string> {
    try {
      const signer = await this.getSigner()
      const contract = new ethers.Contract(CONTRACTS.BLUE_CHAIN_CARBON, BLUE_CHAIN_CARBON_ABI, signer)

      // Get listing price
      const price = await contract.getListingPrice(tokenId)

      console.log("[v0] Buying credit:", { tokenId, price: ethers.formatEther(price) })

      const tx = await contract.buyCredit(tokenId, { value: price })
      await tx.wait()

      console.log("[v0] Credit purchased successfully:", tx.hash)
      return tx.hash
    } catch (error) {
      console.error("[v0] Error buying credit:", error)
      throw error
    }
  }

  static async retireCredit(tokenId: string): Promise<string> {
    try {
      const signer = await this.getSigner()
      const contract = new ethers.Contract(CONTRACTS.BLUE_CHAIN_CARBON, BLUE_CHAIN_CARBON_ABI, signer)

      console.log("[v0] Retiring credit:", tokenId)

      const tx = await contract.retireCredit(tokenId)
      await tx.wait()

      console.log("[v0] Credit retired successfully:", tx.hash)
      return tx.hash
    } catch (error) {
      console.error("[v0] Error retiring credit:", error)
      throw error
    }
  }

  static async rateSeller(sellerAddress: string, rating: number): Promise<string> {
    try {
      const signer = await this.getSigner()
      const contract = new ethers.Contract(CONTRACTS.BLUE_CHAIN_CARBON, BLUE_CHAIN_CARBON_ABI, signer)

      console.log("[v0] Rating seller:", { sellerAddress, rating })

      const tx = await contract.rateSeller(sellerAddress, rating)
      await tx.wait()

      console.log("[v0] Seller rated successfully:", tx.hash)
      return tx.hash
    } catch (error) {
      console.error("[v0] Error rating seller:", error)
      throw error
    }
  }

  static async getTokenBalance(address: string): Promise<number> {
    try {
      const provider = this.getProvider()
      const contract = new ethers.Contract(CONTRACTS.BLUE_CHAIN_CARBON, BLUE_CHAIN_CARBON_ABI, provider)

      console.log("[v0] Fetching token balance for:", address)

      const balance = await contract.balanceOf(address)
      return Number(balance)
    } catch (error) {
      console.error("[v0] Error fetching token balance:", error)
      return 0
    }
  }

  static async getTokenOwner(tokenId: string): Promise<string> {
    try {
      const provider = this.getProvider()
      const contract = new ethers.Contract(CONTRACTS.BLUE_CHAIN_CARBON, BLUE_CHAIN_CARBON_ABI, provider)

      const owner = await contract.ownerOf(tokenId)
      return owner
    } catch (error) {
      console.error("[v0] Error fetching token owner:", error)
      throw error
    }
  }

  static async getTokenURI(tokenId: string): Promise<string> {
    try {
      const provider = this.getProvider()
      const contract = new ethers.Contract(CONTRACTS.BLUE_CHAIN_CARBON, BLUE_CHAIN_CARBON_ABI, provider)

      const uri = await contract.tokenURI(tokenId)
      return uri
    } catch (error) {
      console.error("[v0] Error fetching token URI:", error)
      throw error
    }
  }

  static async isTokenListed(tokenId: string): Promise<boolean> {
    try {
      const provider = this.getProvider()
      const contract = new ethers.Contract(CONTRACTS.BLUE_CHAIN_CARBON, BLUE_CHAIN_CARBON_ABI, provider)

      const listed = await contract.isListed(tokenId)
      return listed
    } catch (error) {
      console.error("[v0] Error checking if token is listed:", error)
      return false
    }
  }

  static async getListingPrice(tokenId: string): Promise<string> {
    try {
      const provider = this.getProvider()
      const contract = new ethers.Contract(CONTRACTS.BLUE_CHAIN_CARBON, BLUE_CHAIN_CARBON_ABI, provider)

      const price = await contract.getListingPrice(tokenId)
      return ethers.formatEther(price)
    } catch (error) {
      console.error("[v0] Error fetching listing price:", error)
      return "0"
    }
  }

  static async isTokenRetired(tokenId: string): Promise<boolean> {
    try {
      const provider = this.getProvider()
      const contract = new ethers.Contract(CONTRACTS.BLUE_CHAIN_CARBON, BLUE_CHAIN_CARBON_ABI, provider)

      const retired = await contract.isRetired(tokenId)
      return retired
    } catch (error) {
      console.error("[v0] Error checking if token is retired:", error)
      return false
    }
  }

  static async getSellerRating(sellerAddress: string): Promise<{ totalRating: number; ratingCount: number }> {
    try {
      const provider = this.getProvider()
      const contract = new ethers.Contract(CONTRACTS.BLUE_CHAIN_CARBON, BLUE_CHAIN_CARBON_ABI, provider)

      const [totalRating, ratingCount] = await contract.getSellerRating(sellerAddress)
      return {
        totalRating: Number(totalRating),
        ratingCount: Number(ratingCount),
      }
    } catch (error) {
      console.error("[v0] Error fetching seller rating:", error)
      return { totalRating: 0, ratingCount: 0 }
    }
  }

  static async isVerifier(address: string): Promise<boolean> {
    try {
      const provider = this.getProvider()
      const contract = new ethers.Contract(CONTRACTS.BLUE_CHAIN_CARBON, BLUE_CHAIN_CARBON_ABI, provider)

      const verifier = await contract.isVerifier(address)
      return verifier
    } catch (error) {
      console.error("[v0] Error checking verifier status:", error)
      return false
    }
  }

  static async connectWallet(): Promise<string> {
    if (typeof window !== "undefined" && window.ethereum) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum)

        try {
          await provider.send("wallet_switchEthereumChain", [{ chainId: HEX_CHAIN_ID }])
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            await provider.send("wallet_addEthereumChain", [NETWORK_CONFIG])
          }
        }

        await provider.send("eth_requestAccounts", [])
        const signer = await provider.getSigner()
        const address = await signer.getAddress()
        console.log("[v0] Wallet connected to Polygon Amoy:", address)
        return address
      } catch (error) {
        console.error("[v0] Error connecting wallet:", error)
        throw error
      }
    }
    throw new Error("MetaMask not found")
  }

  static async getConnectedAddress(): Promise<string | null> {
    if (typeof window !== "undefined" && window.ethereum) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum)
        const accounts = await provider.listAccounts()
        return accounts.length > 0 ? accounts[0].address : null
      } catch (error) {
        console.error("[v0] Error getting connected address:", error)
        return null
      }
    }
    return null
  }
}

export class MetadataService {
  static async uploadProjectData(projectData: any): Promise<string> {
    try {
      console.log("[v0] Uploading metadata to Blob storage:", projectData)

      const blob = await put(`carbon-credits/metadata-${Date.now()}.json`, JSON.stringify(projectData), {
        access: "public",
        contentType: "application/json",
      })

      console.log("[v0] Metadata upload successful:", blob.url)
      return blob.url
    } catch (error) {
      console.error("[v0] Error uploading metadata:", error)
      throw error
    }
  }

  static async getProjectData(metadataURI: string): Promise<any> {
    try {
      console.log("[v0] Fetching metadata from:", metadataURI)

      const response = await fetch(metadataURI)
      if (!response.ok) {
        throw new Error("Failed to fetch metadata")
      }

      const data = await response.json()
      console.log("[v0] Metadata fetch successful")
      return data
    } catch (error) {
      console.error("[v0] Error fetching metadata:", error)
      return null
    }
  }
}

// Utility functions
export const formatAddress = (address: string): string => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export const formatHash = (hash: string): string => {
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`
}

export const generateProjectId = (): string => {
  const year = new Date().getFullYear()
  const randomNum = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0")
  return `PROJ-${year}-${randomNum}`
}

export const generateTokenId = (projectId: string): string => {
  const num = projectId.split("-")[2]
  return `CCT-${num}`
}
