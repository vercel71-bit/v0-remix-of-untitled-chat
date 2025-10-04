"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, ShoppingCart, Leaf } from "lucide-react"
import { Navigation } from "@/components/navigation"
import { WalletConnector } from "@/components/wallet-connector"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import type { ethers } from "ethers"
import Link from "next/link"

interface Project {
  id: string
  title: string
  project_type: string
  area_hectares: number
  location_name: string
  latitude: number
  longitude: number
  status: string
  created_at: string
  verification_date: string | null
  estimated_co2_tons: number
  available_credits?: number
  tree_species: string[]
  submitted_by: string
  profiles?: {
    full_name: string
    organization: string
  }
  project_media?: Array<{
    file_url: string
    file_name: string
    media_type: string
  }>
}

export default function Marketplace() {
  const [loading, setLoading] = useState(true)
  const [walletAddress, setWalletAddress] = useState<string>("")
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(true)
  const [projects, setProjects] = useState<Project[]>([])

  const supabase = createClient()

  useEffect(() => {
    async function fetchApprovedProjects() {
      try {
        const { data: projectsData, error } = await supabase
          .from("projects")
          .select(`
            *,
            profiles!projects_submitted_by_fkey (
              full_name,
              organization
            ),
            project_media (
              file_url,
              file_name,
              media_type
            )
          `)
          .in("status", ["verified", "tokenized"])
          .order("verification_date", { ascending: false })

        if (error) {
          console.error("Error fetching projects:", error)
          toast.error("Failed to load marketplace projects")
          return
        }

        setProjects(projectsData || [])
      } catch (error) {
        console.error("Error:", error)
        toast.error("Failed to load marketplace projects")
      } finally {
        setLoading(false)
      }
    }

    fetchApprovedProjects()
  }, [])

  const handleWalletConnected = (address: string, walletProvider: ethers.BrowserProvider) => {
    setWalletAddress(address)
    setProvider(walletProvider)
  }

  const marketplaceListings = projects.map((project) => ({
    id: project.id,
    name: project.title,
    type: project.project_type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
    location: project.location_name,
    description: `${project.project_type.replace(/_/g, " ")} project covering ${project.area_hectares} hectares in ${project.location_name}. This verified carbon credit project contributes to environmental sustainability.`,
    availableCredits: project.available_credits ?? project.estimated_co2_tons,
    pricePerCredit: 0.001,
    priceUnit: "MATIC",
    mediaUrls: project.project_media?.map((media) => media.file_url) || [],
  }))

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading marketplace...</p>
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
            <div className="flex items-center gap-2">
              <Leaf className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">Carbon Credit Marketplace</h1>
            </div>
            <div className="flex gap-3">
              <Link href="/wallet">
                <Button variant="outline">Transaction History</Button>
              </Link>
              <Link href="/marketplace/buy-credits">
                <Button className="gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Purchase Credits
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {isLoggedIn && (
        <div className="container mx-auto px-4 py-6">
          <WalletConnector isLoggedIn={isLoggedIn} onWalletConnected={handleWalletConnected} />
        </div>
      )}

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">Available Projects</h2>
          <p className="text-muted-foreground">
            Browse verified carbon offset projects and make a positive impact on the environment
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {marketplaceListings.map((project) => (
            <Card key={project.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <Badge variant="secondary" className="mb-2">
                    {project.type}
                  </Badge>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary">
                      {project.pricePerCredit} {project.priceUnit}
                    </div>
                    <div className="text-xs text-muted-foreground">per credit</div>
                  </div>
                </div>
                <CardTitle className="text-xl">{project.name}</CardTitle>
                <CardDescription>{project.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{project.location}</span>
                </div>
                <div className="mt-4 text-sm">
                  <span className="font-semibold text-foreground">{project.availableCredits.toLocaleString()}</span>
                  <span className="text-muted-foreground"> credits available</span>
                </div>
                {project.mediaUrls.length > 0 && (
                  <div className="mt-4">
                    {project.mediaUrls.map((url, index) => (
                      <img
                        key={index}
                        src={url || "/placeholder.svg"}
                        alt={`Media ${index}`}
                        className="w-full h-auto rounded"
                      />
                    ))}
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Link href={`/marketplace/buy-credits?projectId=${project.id}`} className="w-full">
                  <Button className="w-full">Buy Credits</Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>

        {marketplaceListings.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <Leaf className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No verified projects available</h3>
              <p className="text-muted-foreground">
                No projects have been approved by administrators yet. Check back soon!
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
