"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "react-toastify"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Leaf, LogOut, User, Settings, Wallet } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

interface NavigationProps {
  userRole?: "ngo" | "admin" | "investor"
  showAuthButtons?: boolean
}

export function Navigation({ userRole, showAuthButtons = false }: NavigationProps) {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [walletAddress, setWalletAddress] = useState<string>("")
  const [isConnecting, setIsConnecting] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function getUser() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        setUser(user)

        if (user) {
          const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).single()
          setProfile(profileData)
        }
      } catch (error) {
        console.error("Error fetching user:", error)
      } finally {
        setLoading(false)
      }
    }

    getUser()
  }, [supabase])

  useEffect(() => {
    const checkWalletConnection = async () => {
      if (typeof window === "undefined" || !user) return

      // Simple one-time check after a short delay to allow MetaMask to inject
      await new Promise((resolve) => setTimeout(resolve, 1000))

      if (window.ethereum?.isMetaMask) {
        try {
          const accounts = await window.ethereum.request({ method: "eth_accounts" })
          if (accounts.length > 0) {
            setWalletAddress(accounts[0])
          }
        } catch (error) {
          console.error("Error checking wallet connection:", error)
        }
      }
    }

    checkWalletConnection()
  }, [user])

  const connectMetaMask = async () => {
    console.log("[v0] Connect MetaMask clicked")
    console.log("[v0] window.ethereum exists:", !!window.ethereum)
    console.log("[v0] window.ethereum.isMetaMask:", window.ethereum?.isMetaMask)

    if (typeof window === "undefined" || !window.ethereum || !window.ethereum.isMetaMask) {
      console.log("[v0] MetaMask not detected")
      alert(
        "MetaMask is not installed or not detected! Please install MetaMask extension, refresh the page, and try again.",
      )
      return
    }

    setIsConnecting(true)
    try {
      console.log("[v0] Requesting accounts...")
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" })
      console.log("[v0] Accounts received:", accounts)
      if (accounts.length > 0) {
        setWalletAddress(accounts[0])
        console.log("[v0] Wallet connected:", accounts[0])
      }
    } catch (error: any) {
      console.error("[v0] Error connecting wallet:", error)
      if (error.code === 4001 || error.message?.includes("User rejected")) {
        console.log("[v0] User cancelled MetaMask connection")
        // Don't show an error for user cancellation - this is normal behavior
      } else {
        // Only show error alert for actual connection problems
        alert("Failed to connect MetaMask. Please try again.")
      }
    } finally {
      setIsConnecting(false)
    }
  }

  const handleSignOut = async () => {
    try {
      if (window.ethereum) {
        try {
          await window.ethereum.request({
            method: "wallet_revokePermissions",
            params: [
              {
                eth_accounts: {},
              },
            ],
          })
        } catch (error) {
          console.log("[v0] Wallet revoke permissions not supported or failed:", error)
        }
      }

      const { error } = await supabase.auth.signOut()
      if (error) throw error

      toast.success("Signed out successfully")
      router.push("/")
    } catch (error) {
      console.error("[v0] Error signing out:", error)
      toast.error("Failed to sign out")
    }
  }

  const getDashboardLink = () => {
    if (!profile?.role) return "/"

    switch (profile.role) {
      case "admin":
        return "/admin/dashboard"
      case "investor":
        return "/marketplace"
      case "ngo":
      default:
        return "/ngo/dashboard"
    }
  }

  const getRoleBadge = () => {
    if (!profile?.role) return null

    switch (profile.role) {
      case "admin":
        return <Badge className="bg-primary/10 text-primary border-primary/20">Admin Portal</Badge>
      case "investor":
        return <Badge className="bg-accent/10 text-accent-foreground border-accent/20">Investor</Badge>
      case "ngo":
      default:
        return <Badge variant="secondary">NGO Portal</Badge>
    }
  }

  return (
    <nav className="border-b border-border/60 bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link
            href={user ? getDashboardLink() : "/"}
            className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
          >
            <Leaf className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold text-foreground">CarbonChain</span>
          </Link>

          <div className="flex items-center space-x-4">
            {profile?.role && getRoleBadge()}

            {user && !loading && (
              <div className="flex items-center space-x-3">
                {walletAddress ? (
                  <div className="text-green-600 font-medium text-sm">
                    Connected: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                  </div>
                ) : (
                  <Button onClick={connectMetaMask} disabled={isConnecting} variant="outline" size="sm">
                    <Wallet className="h-4 w-4 mr-2" />
                    {isConnecting ? "Connecting..." : "Connect MetaMask"}
                  </Button>
                )}
              </div>
            )}

            {user && !loading ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="bg-transparent">
                    <User className="h-4 w-4 mr-2" />
                    {profile?.full_name || user.email}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem asChild>
                    <Link href={getDashboardLink()}>
                      <Settings className="h-4 w-4 mr-2" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : showAuthButtons && !loading ? (
              <div className="flex items-center space-x-3">
                <Button variant="outline" asChild>
                  <Link href="/login">Sign In</Link>
                </Button>
                <Button asChild>
                  <Link href="/register">Get Started</Link>
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </nav>
  )
}
