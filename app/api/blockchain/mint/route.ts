import { type NextRequest, NextResponse } from "next/server"
import { BlockchainService, MetadataService } from "@/lib/blockchain"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { projectId, recipientAddress, creditsAmount, verificationData } = body

    // Validate required fields
    if (!projectId || !recipientAddress || !creditsAmount || !verificationData) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const metadataURI = await MetadataService.uploadProjectData({
      projectId,
      verificationData,
      timestamp: new Date().toISOString(),
    })

    const { transactionHash, tokenId } = await BlockchainService.mintCarbonCredits(
      recipientAddress,
      creditsAmount,
      metadataURI,
    )

    // Return success response
    return NextResponse.json({
      success: true,
      data: {
        tokenId,
        transactionHash,
        metadataURI,
        creditsAmount,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("Error minting carbon credits:", error)
    return NextResponse.json(
      { error: "Failed to mint carbon credits", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
