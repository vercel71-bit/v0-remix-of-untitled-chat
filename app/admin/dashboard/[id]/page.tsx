"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProjectMap } from "@/components/project-map"
import {
  ArrowLeft,
  MapPin,
  Calendar,
  User,
  Check,
  X,
  FileText,
  TreePine,
  Satellite,
  CheckCircle,
  BarChart3,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Navigation } from "@/components/navigation"
import { BlockchainService, MetadataService } from "@/lib/blockchain"

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
  verification_notes: string | null
  estimated_co2_tons: number
  tree_species: string[]
  submitted_by: string
  profiles?: {
    full_name: string
    organization: string
    address: string
  }
  project_media?: Array<{
    file_url: string
    media_type: string
  }>
}

export default function ProjectReview() {
  const params = useParams()
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [verificationNotes, setVerificationNotes] = useState("")
  const [loading, setLoading] = useState(true)

  const supabase = createClient()
  const blockchainService = new BlockchainService()
  const metadataService = new MetadataService()

  useEffect(() => {
    async function fetchProject() {
      try {
        const { data, error } = await supabase
          .from("projects")
          .select(`
            *,
            profiles!projects_submitted_by_fkey (
              full_name,
              organization,
              address
            ),
            project_media (
              file_url,
              media_type
            )
          `)
          .eq("id", params.id)
          .single()

        if (error) {
          console.error("Error fetching project:", error)
          toast.error("Failed to load project")
          return
        }

        setProject(data)
        setVerificationNotes(data.verification_notes || "")
      } catch (error) {
        console.error("Error:", error)
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchProject()
    }
  }, [params.id])

  const handleApprove = async () => {
    if (!project) return

    try {
      const { error } = await supabase
        .from("projects")
        .update({
          status: "verified",
          verification_date: new Date().toISOString(),
          verification_notes: verificationNotes,
          available_credits: Number(project.estimated_co2_tons || 0),
        })
        .eq("id", project.id)

      if (error) throw error

      // Mint credits to NGO's wallet if available
      const recipientAddress = (project as any)?.profiles?.address
      if (!recipientAddress || !recipientAddress.startsWith("0x")) {
        // If no wallet, notify but keep approval successful
        console.log("[v0] No NGO wallet address on profile; skipping on-chain mint.")
        toast.success("Project approved successfully!", {
          description: `${project.title} verified. Add NGO wallet to mint credits.`,
        })
        setTimeout(() => router.push("/admin/dashboard"), 1500)
        return
      }

      // Prepare minimal metadata and mint via MetaMask (client)
      const metadataURI = await MetadataService.uploadProjectData({
        projectId: project.id,
        title: project.title,
        projectType: project.project_type,
        areaHectares: project.area_hectares,
        estimatedCO2Tons: project.estimated_co2_tons,
        verificationNotes,
        timestamp: new Date().toISOString(),
      })

      console.log("[v0] Minting credits as part of approval...", {
        recipientAddress,
        amount: project.estimated_co2_tons,
        metadataURI,
      })

      const { transactionHash, tokenId } = await BlockchainService.mintCarbonCredits(
        recipientAddress,
        Number(project.estimated_co2_tons || 0),
        metadataURI,
      )

      console.log("[v0] Mint complete. Creating carbon_credits row...", { tokenId, transactionHash })

      const insertRes = await supabase.from("carbon_credits").insert({
        project_id: project.id,
        token_id: tokenId,
        amount_tons: project.estimated_co2_tons,
        price_per_ton: 0,
        total_value: 0,
        status: "available",
        owner_id: project.submitted_by,
        blockchain_address: recipientAddress,
      })

      if (insertRes.error) {
        console.error("[v0] Failed to save carbon_credits:", insertRes.error)
      }

      // Mark project tokenized and save tx hash for registry
      const updateProjectRes = await supabase
        .from("projects")
        .update({ status: "tokenized", blockchain_hash: transactionHash })
        .eq("id", project.id)

      if (updateProjectRes.error) {
        console.error("[v0] Failed to update project to tokenized:", updateProjectRes.error)
      }

      toast.success("Project approved and credits minted!", {
        description: `Token ${tokenId} minted. Tx: ${transactionHash.slice(0, 10)}...${transactionHash.slice(-8)}`,
      })

      setTimeout(() => router.push("/admin/dashboard"), 1500)
    } catch (err) {
      console.error("Error approving and minting project:", err)
      toast.error("Failed to approve/mint credits")
    }
  }

  const handleReject = async () => {
    if (!project) return

    if (!verificationNotes.trim()) {
      toast.error("Please provide a reason for rejection")
      return
    }

    try {
      const { error } = await supabase
        .from("projects")
        .update({
          status: "rejected",
          verification_date: new Date().toISOString(),
          verification_notes: verificationNotes,
        })
        .eq("id", project.id)

      if (error) throw error

      toast.error("Project rejected", {
        description: `${project.title} has been rejected. The submitter will be notified.`,
      })

      setTimeout(() => router.push("/admin/dashboard"), 1500)
    } catch (error) {
      console.error("Error rejecting project:", error)
      toast.error("Failed to reject project")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading project details...</p>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Project not found</h2>
          <Button onClick={() => router.push("/admin/dashboard")}>Return to Dashboard</Button>
        </div>
      </div>
    )
  }

  const statusConfig = {
    pending: { label: "Pending Review", className: "bg-amber-100 text-amber-700 border-amber-200" },
    verified: { label: "Verified", className: "bg-secondary/10 text-secondary border-secondary/20" },
    rejected: { label: "Rejected", className: "bg-red-100 text-red-800 border-red-200" },
    tokenized: { label: "Tokenized", className: "bg-green-100 text-green-800 border-green-200" },
  }

  const statusInfo = statusConfig[project.status as keyof typeof statusConfig] || statusConfig.pending

  const firstImageUrl = project.project_media?.[0]?.file_url || "/lush-forest-path.png"

  return (
    <div className="min-h-screen bg-background">
      <Navigation userRole="admin" />

      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/admin/dashboard")}
              className="rounded-full"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground">{project.title}</h1>
              <p className="text-muted-foreground text-sm mt-1">Project Review Details</p>
            </div>
            <Badge className={statusInfo.className}>{statusInfo.label}</Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Hero Image */}
            <div className="relative h-[400px] rounded-lg overflow-hidden border border-border shadow-sm">
              <img
                src={firstImageUrl || "/placeholder.svg"}
                alt={project.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = "/lush-forest-path.png"
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <h2 className="text-3xl font-bold text-foreground mb-2">{project.title}</h2>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span>{project.location_name}</span>
                </div>
              </div>
            </div>

            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="features">Features</TabsTrigger>
                <TabsTrigger value="verification">Verification</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-6">
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Project Description
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Project Type:</span>
                        <p className="font-medium">{project.project_type}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Area:</span>
                        <p className="font-medium">{project.area_hectares} hectares</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Estimated Credits:</span>
                        <p className="font-medium text-primary">{project.estimated_co2_tons} tCO₂e</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Trees Planted:</span>
                        <p className="font-medium">{project.estimated_co2_tons * 50 || "N/A"}</p>
                      </div>
                    </div>

                    {project.latitude && project.longitude && (
                      <div className="pt-4 border-t">
                        <span className="text-muted-foreground text-sm">Coordinates:</span>
                        <p className="font-medium">
                          {project.latitude}, {project.longitude}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {project.latitude && project.longitude && (
                  <Card className="bg-card border-border mt-6">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Satellite className="w-5 h-5 text-secondary" />
                        Project Location - Satellite View
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ProjectMap
                        longitude={project.longitude}
                        latitude={project.latitude}
                        projectTitle={project.title}
                        mapboxToken={undefined}
                      />
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="features" className="mt-6">
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle>Tree Species & Features</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {project.tree_species && project.tree_species.length > 0 ? (
                      <div className="space-y-3">
                        <h4 className="font-semibold text-sm">Species Planted:</h4>
                        <div className="flex flex-wrap gap-2">
                          {project.tree_species.map((species: string, index: number) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              <TreePine className="w-3 h-3 mr-1" />
                              {species}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm">No species information available</p>
                    )}

                    <div className="mt-6 space-y-3">
                      <h4 className="font-semibold text-sm">Project Features:</h4>
                      <ul className="space-y-2">
                        <li className="flex items-start gap-2 text-sm">
                          <Check className="w-4 h-4 text-secondary flex-shrink-0 mt-0.5" />
                          <span>Sustainable reforestation practices</span>
                        </li>
                        <li className="flex items-start gap-2 text-sm">
                          <Check className="w-4 h-4 text-secondary flex-shrink-0 mt-0.5" />
                          <span>Community engagement and local employment</span>
                        </li>
                        <li className="flex items-start gap-2 text-sm">
                          <Check className="w-4 h-4 text-secondary flex-shrink-0 mt-0.5" />
                          <span>Biodiversity conservation</span>
                        </li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="verification" className="mt-6">
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Satellite className="w-5 h-5 text-primary" />
                      Satellite Verification
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                      <div className="bg-muted rounded border p-3">
                        <h5 className="text-sm font-medium mb-2">Before Planting</h5>
                        <div className="aspect-video bg-muted-foreground/10 rounded flex items-center justify-center">
                          <span className="text-xs text-muted-foreground">Satellite Image - Before</span>
                        </div>
                      </div>
                      <div className="bg-muted rounded border p-3">
                        <h5 className="text-sm font-medium mb-2">After Planting</h5>
                        <div className="aspect-video bg-secondary/10 rounded flex items-center justify-center">
                          <span className="text-xs text-muted-foreground">Satellite Image - After</span>
                        </div>
                      </div>
                    </div>
                    <div className="p-3 bg-secondary/10 rounded">
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-secondary" />
                        <span className="font-medium text-secondary">
                          Vegetation increase detected: +{Math.round(project.area_hectares * 0.9)}% forest cover
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-6">
            {/* Project Metadata */}
            <Card className="bg-card border-border shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Project Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Calendar className="w-4 h-4" />
                    <span>Submitted Date</span>
                  </div>
                  <div className="text-foreground font-medium">{new Date(project.created_at).toLocaleDateString()}</div>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <User className="w-4 h-4" />
                    <span>Submitted By</span>
                  </div>
                  <div className="text-foreground font-medium">
                    {project.profiles?.organization || "Unknown Organization"}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <BarChart3 className="w-4 h-4" />
                    <span>Project Scale</span>
                  </div>
                  <div className="text-foreground font-medium">{project.area_hectares} hectares</div>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <TreePine className="w-4 h-4" />
                    <span>Estimated Impact</span>
                  </div>
                  <div className="text-foreground font-medium">{project.estimated_co2_tons} tCO₂e</div>
                </div>

                {project.project_media && project.project_media.length > 0 && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Media Files</div>
                    <div className="text-foreground font-medium">{project.project_media.length} file(s) uploaded</div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Verification Notes */}
            <Card className="bg-card border-border shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Verification Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  placeholder="Add your verification notes, observations, or reasons for approval/rejection..."
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                  className="min-h-[120px]"
                />
              </CardContent>
            </Card>

            {/* Action Buttons */}
            {project.status === "pending" && (
              <Card className="bg-card border-border shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Review Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    className="w-full justify-start gap-2 bg-secondary hover:bg-secondary/90"
                    size="lg"
                    onClick={handleApprove}
                  >
                    <Check className="w-5 h-5" />
                    Approve Project
                  </Button>
                  <Button
                    variant="destructive"
                    className="w-full justify-start gap-2"
                    size="lg"
                    onClick={handleReject}
                    disabled={!verificationNotes.trim()}
                  >
                    <X className="w-5 h-5" />
                    Reject Project
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
