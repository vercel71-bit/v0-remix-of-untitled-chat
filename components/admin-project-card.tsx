import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Calendar, TreePine, BarChart3 } from "lucide-react"
import Link from "next/link"

interface AdminProjectCardProps {
  id: string
  title: string
  location: string
  status: "pending" | "verified" | "rejected"
  submittedDate: string
  image: string
  description: string
  projectType: string
  areaHectares: number
  estimatedCo2: number
  organization?: string
}

const statusConfig = {
  pending: { label: "Pending Review", className: "bg-amber-100 text-amber-700 border-amber-200" },
  verified: { label: "Verified", className: "bg-secondary/10 text-secondary border-secondary/20" },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-800 border-red-200" },
}

export function AdminProjectCard({
  id,
  title,
  location,
  status,
  submittedDate,
  image,
  description,
  projectType,
  areaHectares,
  estimatedCo2,
  organization,
}: AdminProjectCardProps) {
  const statusInfo = statusConfig[status]

  return (
    <Link href={`/admin/dashboard/${id}`}>
      <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1 bg-card border-border/50 group cursor-pointer">
        <div className="aspect-video relative overflow-hidden bg-muted">
          <img
            src={image || "/placeholder.svg?height=300&width=400&query=reforestation project"}
            alt={title}
            className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.src = "/forest-plantation.jpg"
            }}
          />
          <Badge className={`absolute top-4 right-4 ${statusInfo.className}`}>{statusInfo.label}</Badge>
        </div>
        <CardContent className="p-6">
          <h3 className="text-xl font-semibold mb-2 text-card-foreground group-hover:text-primary transition-colors line-clamp-1">
            {title}
          </h3>
          <p className="text-muted-foreground text-sm mb-4 line-clamp-2">{description}</p>

          <div className="space-y-2">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                <span className="line-clamp-1">{location}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>{new Date(submittedDate).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <TreePine className="w-4 h-4" />
                <span>{projectType}</span>
              </div>
              <div className="flex items-center gap-1">
                <BarChart3 className="w-4 h-4" />
                <span>{areaHectares} ha</span>
              </div>
            </div>

            {organization && (
              <p className="text-xs text-muted-foreground pt-2 border-t border-border">By {organization}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
