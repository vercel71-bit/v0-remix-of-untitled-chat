"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { ArrowLeft, Leaf, MapPin, Info, Wallet } from "lucide-react"
import Link from "next/link"
import { Navigation } from "@/components/navigation"
import { createClient } from "@/lib/supabase/client"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { BlockchainService } from "@/lib/blockchain"
import { ethers } from "ethers"

interface Project {
  id: string
  title: string
  project_type: string
  area_hectares: number
  location_name: string
  estimated_co2_tons: number
  available_credits?: number
}

function BuyCreditsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectIdFromUrl = searchParams.get("projectId")

  const [selectedProjectId, setSelectedProjectId] = useState<string>(projectIdFromUrl || "")
  const [credits, setCredits] = useState<string>("")
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState(false)
  const [walletAddress, setWalletAddress] = useState<string>("")
  const [walletBalance, setWalletBalance] = useState<string>("0")

  const pricePerCreditMatic = 0.001
  const supabase = createClient()

  useEffect(() => {
    async function fetchProjects() {
      try {
        console.log("[v0] Fetching verified projects from database...")
        const { data: projectsData, error } = await supabase
          .from("projects")
          .select(
            "id, title, project_type, area_hectares, location_name, estimated_co2_tons, available_credits, status",
          )
          .in("status", ["verified", "tokenized"])
          .order("verification_date", { ascending: false })

        if (error) {
          console.error("[v0] Error fetching projects:", error)
          toast.error("Failed to load projects")
          return
        }

        console.log("[v0] Fetched projects count:", projectsData?.length || 0)
        setProjects(projectsData || [])
      } catch (error) {
        console.error("[v0] Error:", error)
        toast.error("Failed to load projects")
      } finally {
        setLoading(false)
      }
    }

    fetchProjects()
  }, [])

  useEffect(() => {
    if (projectIdFromUrl) {
      setSelectedProjectId(projectIdFromUrl)
    }
  }, [projectIdFromUrl])

  useEffect(() => {
    async function checkWallet() {
      try {
        const address = await BlockchainService.getConnectedAddress()
        if (address) {
          setWalletAddress(address)
          // Get MATIC balance
          if (window.ethereum) {
            const provider = new ethers.BrowserProvider(window.ethereum)
            const balance = await provider.getBalance(address)
            setWalletBalance(ethers.formatEther(balance))
          }
        }
      } catch (error) {
        console.error("[v0] Error checking wallet:", error)
      }
    }
    checkWallet()
  }, [])

  const selectedProject = projects.find((p) => p.id === selectedProjectId)
  const creditsNumber = Number.parseInt(credits) || 0
  const totalPriceMatic = creditsNumber * pricePerCreditMatic
  const totalPriceUsd = totalPriceMatic * 0.5 // Rough MATIC to USD conversion for display

  const handlePurchase = async () => {
    if (!selectedProjectId) {
      toast.error("Please select a project")
      return
    }

    if (!credits || creditsNumber <= 0) {
      toast.error("Please enter a valid number of credits")
      return
    }

    if (selectedProject && creditsNumber > (selectedProject.available_credits ?? selectedProject.estimated_co2_tons)) {
      toast.error("Not enough credits available for this project")
      return
    }

    if (!walletAddress) {
      toast.error("Please connect your MetaMask wallet first")
      try {
        const address = await BlockchainService.connectWallet()
        setWalletAddress(address)
        toast.success("Wallet connected! Please try purchasing again.")
        return
      } catch (error) {
        toast.error("Failed to connect wallet. Please install MetaMask.")
        return
      }
    }

    const balanceNum = Number.parseFloat(walletBalance)
    if (balanceNum < totalPriceMatic) {
      toast.error(
        `Insufficient MATIC balance. You need ${totalPriceMatic} MATIC but only have ${balanceNum.toFixed(4)} MATIC`,
      )
      return
    }

    setPurchasing(true)

    try {
      console.log("[v0] Starting blockchain purchase...")

      // For demo, we'll simulate this step and just create a listing
      // In production, credits would be pre-minted by verifier

      toast.info("Preparing transaction... Please confirm in MetaMask")

      // In real production, you'd first mint credits, then list them, then buy
      // Since you're the verifier, you can mint credits first through admin panel

      const mockTokenId = Math.floor(Math.random() * 1000000).toString()

      const signer = await BlockchainService["getSigner"]()
      const tx = await signer.sendTransaction({
        to: "0x087573bec726A13d77F521318b3FD7dE3c830988", // Fee recipient
        value: ethers.parseEther(totalPriceMatic.toString()),
      })

      toast.info("Transaction submitted! Waiting for confirmation...")
      const receipt = await tx.wait()

      console.log("[v0] Transaction confirmed:", receipt.hash)

      // Get the authenticated user's UUID for buyer_id (required by RLS and FK)
      const { data: userRes, error: userErr } = await supabase.auth.getUser()
      const userId = userRes?.user?.id
      if (userErr || !userId) {
        console.error("[v0] Unable to read authenticated user:", userErr)
        toast.error("Please sign in to record your purchase.")
        setPurchasing(false)
        return
      }

      // NOTE: In production, carbon_credits should be pre-minted by an admin/verifier.
      // Since this flow is a demo and credits may not exist yet, we store the associated project reference.
      // A later reconciliation can link a minted carbon_credit row to this transaction.

      const { error: dbError } = await supabase.from("transactions").insert({
        amount_tons: creditsNumber,
        total_amount: totalPriceUsd,
        price_per_ton: totalPriceUsd / creditsNumber,
        transaction_hash: receipt.hash,
        status: "completed",
        buyer_id: userId, // UUID from Supabase auth
        seller_id: null, // keep null unless you have a seller profile UUID
        credit_id: null, // allow null via migration; link later if/when a credit is minted
        project_id: selectedProjectId, // store the project we purchased from for display
      })

      if (dbError) {
        console.error("[v0] Error saving to database:", dbError)
        toast.error("Recorded payment, but failed to save receipt. Please check your Wallet page later.")
      }

      // Update wallet balance
      if (window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum)
        const balance = await provider.getBalance(walletAddress)
        setWalletBalance(ethers.formatEther(balance))
      }

      // Decrement inventory via RPC so RLS-safe and atomic
      const { error: invErr } = await supabase.rpc("decrement_available_credits", {
        p_project_id: selectedProjectId,
        p_amount: creditsNumber,
      })
      if (invErr) {
        console.error("[v0] Failed to decrement available_credits:", invErr)
      } else {
        // Refresh local state so UI reflects the new availability without reload
        setProjects((prev) =>
          prev.map((p) =>
            p.id === selectedProjectId
              ? {
                  ...p,
                  available_credits: Math.max((p.available_credits ?? p.estimated_co2_tons) - creditsNumber, 0),
                }
              : p,
          ),
        )
      }

      toast.success(`Successfully purchased ${creditsNumber} carbon credits!`, {
        description: `Transaction: ${receipt.hash.slice(0, 10)}...${receipt.hash.slice(-8)}`,
      })

      setTimeout(() => {
        router.push("/wallet")
      }, 2000)
    } catch (error: any) {
      console.error("[v0] Purchase error:", error)

      if (error.code === 4001) {
        toast.error("Transaction rejected by user")
      } else if (error.code === "INSUFFICIENT_FUNDS") {
        toast.error("Insufficient MATIC for transaction + gas fees")
      } else {
        toast.error("Transaction failed: " + (error.message || "Unknown error"))
      }
    } finally {
      setPurchasing(false)
    }
  }

  const handleConnectWallet = async () => {
    try {
      const address = await BlockchainService.connectWallet()
      setWalletAddress(address)

      // Get balance
      if (window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum)
        const balance = await provider.getBalance(address)
        setWalletBalance(ethers.formatEther(balance))
      }

      toast.success("Wallet connected successfully!")
    } catch (error) {
      console.error("[v0] Error connecting wallet:", error)
      toast.error("Failed to connect wallet. Please install MetaMask.")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading projects...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation showAuthButtons={true} />

      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/marketplace">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <Leaf className="h-8 w-8 text-primary" />
                <h1 className="text-2xl font-bold text-foreground">Purchase Carbon Credits</h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {walletAddress ? (
                <div className="flex items-center gap-2 px-4 py-2 bg-accent rounded-lg">
                  <Wallet className="h-4 w-4 text-primary" />
                  <div className="text-sm">
                    <div className="font-mono text-xs text-muted-foreground">
                      {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                    </div>
                    <div className="font-semibold">{Number.parseFloat(walletBalance).toFixed(4)} MATIC</div>
                  </div>
                </div>
              ) : (
                <Button onClick={handleConnectWallet} variant="outline">
                  Connect Wallet
                </Button>
              )}
              <Link href="/wallet">
                <Button variant="outline">View History</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {!walletAddress && (
          <Alert className="mb-6">
            <Wallet className="h-4 w-4" />
            <AlertDescription>
              Please connect your MetaMask wallet to purchase carbon credits. Make sure you're on Polygon Amoy Testnet.
            </AlertDescription>
          </Alert>
        )}

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Buy Carbon Credits</CardTitle>
            <CardDescription>Select a project and specify the number of credits you want to purchase</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="project">Select Project</Label>
                <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                  <SelectTrigger id="project">
                    <SelectValue placeholder="Choose a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedProject && (
                  <p className="text-sm text-muted-foreground">
                    {(selectedProject.available_credits ?? selectedProject.estimated_co2_tons).toLocaleString()} credits
                    available
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="credits">Number of Credits</Label>
                <Input
                  id="credits"
                  type="number"
                  min="1"
                  placeholder="Enter amount"
                  value={credits}
                  onChange={(e) => setCredits(e.target.value)}
                />
              </div>
            </div>

            {creditsNumber > 0 && selectedProject && (
              <>
                <div className="rounded-lg border bg-accent p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Price</p>
                      <p className="text-3xl font-bold text-primary">{totalPriceMatic.toFixed(4)} MATIC</p>
                      <p className="text-sm text-muted-foreground">≈ ${totalPriceUsd.toFixed(2)} USD</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Price per Credit</p>
                      <p className="text-xl font-semibold">{pricePerCreditMatic} MATIC</p>
                    </div>
                  </div>
                </div>

                <Alert>
                  <AlertDescription className="text-sm">
                    <strong>Payment Method:</strong> You'll pay with MATIC tokens through MetaMask. The transaction will
                    be recorded on the Polygon Amoy blockchain. Gas fees will be added automatically.
                  </AlertDescription>
                </Alert>
              </>
            )}

            {selectedProject && (
              <Card className="bg-accent/50">
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">{selectedProject.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {selectedProject.project_type.replace(/_/g, " ")} project covering{" "}
                          {selectedProject.area_hectares} hectares
                        </p>
                      </div>
                      <Badge>
                        {selectedProject.project_type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{selectedProject.location_name}</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm bg-background/50 rounded-md p-3">
                      <Info className="h-4 w-4 text-primary mt-0.5" />
                      <span className="text-muted-foreground">
                        {(selectedProject.available_credits ?? selectedProject.estimated_co2_tons).toLocaleString()}{" "}
                        credits available at {pricePerCreditMatic} MATIC per credit
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Button
              onClick={handlePurchase}
              className="w-full"
              size="lg"
              disabled={!selectedProjectId || !credits || creditsNumber <= 0 || purchasing || !walletAddress}
            >
              {purchasing ? "Processing Transaction..." : walletAddress ? "Complete Purchase" : "Connect Wallet First"}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

export default function BuyCreditsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      }
    >
      <BuyCreditsContent />
    </Suspense>
  )
}
