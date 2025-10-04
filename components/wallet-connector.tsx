"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ethers } from "ethers"
import { toast } from "sonner"

interface WalletConnectorProps {
  isLoggedIn: boolean
  onWalletConnected?: (address: string, provider: ethers.BrowserProvider) => void
}

export function WalletConnector({ isLoggedIn, onWalletConnected }: WalletConnectorProps) {
  const [walletAddress, setWalletAddress] = useState<string>("")
  const [isConnecting, setIsConnecting] = useState(false)
  const [hasMetaMask, setHasMetaMask] = useState(false)

  useEffect(() => {
    console.log("[v0] Checking for MetaMask...")
    const checkMetaMask = () => {
      if (typeof window !== "undefined" && window.ethereum) {
        console.log("[v0] MetaMask detected:", window.ethereum.isMetaMask)
        setHasMetaMask(true)
      } else {
        console.log("[v0] MetaMask not found")
        setHasMetaMask(false)
      }
    }

    // Check immediately
    checkMetaMask()

    // Also check after a short delay (MetaMask might load after page)
    const timer = setTimeout(checkMetaMask, 1000)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    const checkConnection = async () => {
      if (typeof window !== "undefined" && window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: "eth_accounts" })
          console.log("[v0] Existing accounts:", accounts)
          if (accounts.length > 0) {
            const address = accounts[0]
            setWalletAddress(address)

            // Create provider and notify parent
            if (onWalletConnected) {
              const provider = new ethers.BrowserProvider(window.ethereum)
              onWalletConnected(address, provider)
            }
          }
        } catch (error) {
          console.error("[v0] Error checking wallet connection:", error)
        }
      }
    }

    if (hasMetaMask) {
      checkConnection()
    }
  }, [hasMetaMask, onWalletConnected])

  useEffect(() => {
    if (typeof window !== "undefined" && window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        console.log("[v0] Accounts changed:", accounts)
        if (accounts.length === 0) {
          setWalletAddress("")
          toast.info("Wallet disconnected")
        } else {
          const address = accounts[0]
          setWalletAddress(address)

          // Create provider and notify parent
          if (onWalletConnected) {
            const provider = new ethers.BrowserProvider(window.ethereum)
            onWalletConnected(address, provider)
          }
          toast.success(`Connected to ${address.slice(0, 6)}...${address.slice(-4)}`)
        }
      }

      const handleChainChanged = () => {
        console.log("[v0] Chain changed, reloading...")
        window.location.reload()
      }

      window.ethereum.on("accountsChanged", handleAccountsChanged)
      window.ethereum.on("chainChanged", handleChainChanged)

      return () => {
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged)
        window.ethereum.removeListener("chainChanged", handleChainChanged)
      }
    }
  }, [onWalletConnected])

  const connectWallet = async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      toast.error("MetaMask is not installed. Please install MetaMask to continue.")
      window.open("https://metamask.io/download/", "_blank")
      return
    }

    setIsConnecting(true)
    try {
      console.log("[v0] Requesting accounts...")
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" })
      console.log("[v0] Accounts received:", accounts)

      if (accounts.length > 0) {
        const address = accounts[0]
        setWalletAddress(address)

        // Create provider
        const provider = new ethers.BrowserProvider(window.ethereum)

        // Check network
        const network = await provider.getNetwork()
        console.log("[v0] Connected to network:", network.chainId)

        // Check if on Polygon Amoy (chain ID 80002)
        if (network.chainId !== 80002n) {
          toast.error("Please switch to Polygon Amoy Testnet")
          try {
            await window.ethereum.request({
              method: "wallet_switchEthereumChain",
              params: [{ chainId: "0x13882" }], // 80002 in hex
            })
          } catch (switchError: any) {
            // This error code indicates that the chain has not been added to MetaMask
            if (switchError.code === 4902) {
              try {
                await window.ethereum.request({
                  method: "wallet_addEthereumChain",
                  params: [
                    {
                      chainId: "0x13882",
                      chainName: "Polygon Amoy Testnet",
                      nativeCurrency: {
                        name: "MATIC",
                        symbol: "MATIC",
                        decimals: 18,
                      },
                      rpcUrls: ["https://rpc-amoy.polygon.technology/"],
                      blockExplorerUrls: ["https://amoy.polygonscan.com/"],
                    },
                  ],
                })
              } catch (addError) {
                console.error("[v0] Error adding network:", addError)
                toast.error("Failed to add Polygon Amoy network")
              }
            }
          }
        }

        // Notify parent component
        if (onWalletConnected) {
          onWalletConnected(address, provider)
        }

        toast.success(`Connected to ${address.slice(0, 6)}...${address.slice(-4)}`)
      }
    } catch (error: any) {
      console.error("[v0] Error connecting wallet:", error)
      if (error.code === 4001) {
        toast.error("Connection request rejected")
      } else {
        toast.error("Failed to connect wallet")
      }
    } finally {
      setIsConnecting(false)
    }
  }

  if (!isLoggedIn) {
    return null
  }

  return (
    <div className="mb-6">
      {!hasMetaMask ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800 mb-2">
            MetaMask is not detected. Please install MetaMask to connect your wallet.
          </p>
          <Button onClick={() => window.open("https://metamask.io/download/", "_blank")} variant="outline">
            Install MetaMask
          </Button>
        </div>
      ) : walletAddress ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-800 font-medium">Wallet Connected</p>
              <p className="text-xs text-green-600 mt-1">
                {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </p>
            </div>
            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
          </div>
        </div>
      ) : (
        <Button onClick={connectWallet} disabled={isConnecting} size="lg">
          {isConnecting ? "Connecting..." : "Connect MetaMask"}
        </Button>
      )}
    </div>
  )
}
