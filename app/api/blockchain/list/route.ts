import { type NextRequest, NextResponse } from "next/server"
import { BlockchainService } from "@/lib/blockchain"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tokenId, priceInMatic } = body

    if (!tokenId || !priceInMatic) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const transactionHash = await BlockchainService.listCredit(tokenId, priceInMatic)

    return NextResponse.json({
      success: true,
      data: {
        tokenId,
        priceInMatic,
        transactionHash,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("Error listing credit:", error)
    return NextResponse.json(
      { error: "Failed to list credit", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
