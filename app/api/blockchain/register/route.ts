import { type NextRequest, NextResponse } from "next/server"
import { MetadataService, generateProjectId } from "@/lib/blockchain"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { projectData, ngoAddress } = body

    // Validate required fields
    if (!projectData || !ngoAddress) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Generate project ID
    const projectId = generateProjectId()

    const metadataURI = await MetadataService.uploadProjectData({
      ...projectData,
      projectId,
      submissionDate: new Date().toISOString(),
    })

    // The actual blockchain registration will happen when a verifier approves and mints credits

    // Return success response
    return NextResponse.json({
      success: true,
      data: {
        projectId,
        metadataURI,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("Error registering project:", error)
    return NextResponse.json(
      { error: "Failed to register project", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
