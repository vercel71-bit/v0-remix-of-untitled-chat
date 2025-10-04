import { type NextRequest, NextResponse } from "next/server"
import { BlockchainService } from "@/lib/blockchain"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tokenId } = body

    if (!tokenId) {
      return NextResponse.json({ error: "Missing tokenId" }, { status: 400 })
    }

    const transactionHash = await BlockchainService.buyCredit(tokenId)

    return NextResponse.json({
      success: true,
      data: {
        tokenId,
        transactionHash,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("Error buying credit:", error)
    return NextResponse.json(
      { error: "Failed to buy credit", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
