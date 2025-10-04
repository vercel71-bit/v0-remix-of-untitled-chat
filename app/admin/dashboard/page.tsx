"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Clock, CheckCircle, TrendingUp, Users } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Navigation } from "@/components/navigation"
import { AdminProjectCard } from "@/components/admin-project-card"

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
  available_credits: number
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

export default function AdminDashboard() {
  const [projects, setProjects] = useState<Project[]>([])
  const [filterStatus, setFilterStatus] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    async function fetchProjects() {
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
          .order("created_at", { ascending: false })

        if (error) {
          console.error("Error fetching projects:", error)
          return
        }

        setProjects(projectsData || [])
      } catch (error) {
        console.error("Error:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchProjects()
  }, [])

  const filteredProjects = projects.filter((project) => {
    const matchesStatus = filterStatus === "all" || project.status === filterStatus
    const matchesSearch =
      searchQuery === "" ||
      project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.location_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.profiles?.organization?.toLowerCase().includes(searchQuery.toLowerCase())

    return matchesStatus && matchesSearch
  })

  const pendingCount = projects.filter((s) => s.status === "pending").length
  const verifiedCount = projects.filter((s) => s.status === "verified").length
  const rejectedCount = projects.filter((s) => s.status === "rejected").length
  const tokenizedCount = projects.filter((s) => s.status === "tokenized").length
  const totalCredits = projects
    .filter((s) => s.status === "verified" || s.status === "tokenized")
    .reduce((sum, s) => {
      const available = s.available_credits
      const estimated = s.estimated_co2_tons || 0
      const value = (available ?? estimated) || 0
      return sum + Number(value)
    }, 0)

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation userRole="admin" />

      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Project Review Dashboard</h1>
              <p className="text-muted-foreground text-sm mt-1">Review and manage project submissions</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search projects..."
                  className="pl-10 w-64 bg-background"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="tokenized">Tokenized</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-card rounded-lg border border-border shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-3xl font-bold text-amber-600">{pendingCount}</div>
                <Clock className="w-8 h-8 text-amber-500" />
              </div>
              <div className="text-sm text-muted-foreground">Pending Review</div>
            </CardContent>
          </Card>

          <Card className="bg-card rounded-lg border border-border shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-3xl font-bold text-secondary">{verifiedCount}</div>
                <CheckCircle className="w-8 h-8 text-secondary" />
              </div>
              <div className="text-sm text-muted-foreground">Verified Projects</div>
            </CardContent>
          </Card>

          <Card className="bg-card rounded-lg border border-border shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-3xl font-bold text-primary">{totalCredits}</div>
                <TrendingUp className="w-8 h-8 text-primary" />
              </div>
              <div className="text-sm text-muted-foreground">Total Credits</div>
            </CardContent>
          </Card>

          <Card className="bg-card rounded-lg border border-border shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-3xl font-bold text-foreground">
                  {new Set(projects.map((p) => p.submitted_by)).size}
                </div>
                <Users className="w-8 h-8 text-primary" />
              </div>
              <div className="text-sm text-muted-foreground">Active NGOs</div>
            </CardContent>
          </Card>

          <Card className="bg-card rounded-lg border border-border shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="text-3xl font-bold text-green-600">{tokenizedCount}</div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <div className="text-sm text-muted-foreground">Tokenized Projects</div>
            </CardContent>
          </Card>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-6 text-foreground">
            All Projects {searchQuery && `(${filteredProjects.length} results)`}
          </h2>

          {filteredProjects.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No projects found matching your criteria</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((project) => (
                <AdminProjectCard
                  key={project.id}
                  id={project.id}
                  title={project.title}
                  location={project.location_name}
                  status={project.status as "pending" | "verified" | "tokenized" | "rejected"}
                  submittedDate={project.created_at}
                  image={project.project_media?.[0]?.file_url || ""}
                  description={`${project.project_type} project covering ${project.area_hectares} hectares with estimated ${project.estimated_co2_tons} tCO₂e credits`}
                  projectType={project.project_type}
                  areaHectares={project.area_hectares}
                  estimatedCo2={project.estimated_co2_tons}
                  availableCredits={project.available_credits}
                  organization={project.profiles?.organization}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
