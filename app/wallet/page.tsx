"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TrendingUp, ExternalLink, Coins, DollarSign, Clock, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { Navigation } from "@/components/navigation"
import { createClient } from "@/lib/supabase/client"

interface Transaction {
  id: string
  amount_tons: number
  total_amount: number
  price_per_ton: number
  transaction_hash: string
  status: string
  created_at: string
  credit_id: string
  project_id?: string
}

interface Project {
  id: string
  title: string
  project_type: string
}

export default function WalletPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [projects, setProjects] = useState<Record<string, Project>>({})
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: userRes } = await supabase.auth.getUser()
        if (!userRes?.user) {
          setTransactions([])
          setLoading(false)
          console.log("[v0] Not signed in; transactions are protected by RLS.")
          return
        }

        // Fetch transactions
        const { data: txData, error: txError } = await supabase
          .from("transactions")
          .select("*")
          .order("created_at", { ascending: false })

        if (txError) {
          console.error("[v0] Error fetching transactions:", txError)
        } else {
          setTransactions(txData || [])

          // Collect project IDs from either project_id (preferred) or legacy credit_id if used
          const projectIds = [
            ...new Set(
              (txData || []).map((tx) => tx.project_id || tx.credit_id).filter((v): v is string => Boolean(v)),
            ),
          ]

          if (projectIds.length > 0) {
            const { data: projectData, error: projectError } = await supabase
              .from("projects")
              .select("id, title, project_type")
              .in("id", projectIds)

            if (!projectError && projectData) {
              const projectMap = projectData.reduce(
                (acc, project) => {
                  acc[project.id] = project
                  return acc
                },
                {} as Record<string, Project>,
              )
              setProjects(projectMap)
            }
          }
        }
      } catch (error) {
        console.error("[v0] Error:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const portfolioStats = {
    totalValue: transactions.reduce((sum, tx) => sum + (tx.total_amount || 0), 0),
    totalTokens: transactions.reduce((sum, tx) => sum + (tx.amount_tons || 0), 0),
    transactionCount: transactions.length,
  }

  const formatAddress = (address: string) => {
    if (!address) return "N/A"
    return `${address.slice(0, 10)}...${address.slice(-8)}`
  }

  const getTransactionIcon = (status: string) => {
    if (status === "pending") return <Clock className="h-4 w-4 text-amber-500" />
    return <CheckCircle2 className="h-4 w-4 text-secondary" />
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation showAuthButtons={true} />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading wallet...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation showAuthButtons={true} />

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Carbon Credit Wallet</h1>
            <p className="text-muted-foreground">
              Manage your carbon credit tokens and track your environmental impact
            </p>
          </div>

          {/* Wallet Overview */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Portfolio Value</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-foreground">
                    ${portfolioStats.totalValue.toLocaleString()}
                  </span>
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Total spent on credits</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Credits</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-secondary">{portfolioStats.totalTokens}</span>
                  <Coins className="h-5 w-5 text-secondary" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">tCO₂e tokens purchased</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-foreground">{portfolioStats.transactionCount}</span>
                  <TrendingUp className="h-5 w-5 text-secondary" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Total purchases</p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <Tabs defaultValue="transactions" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="transactions">Transaction History</TabsTrigger>
              <TabsTrigger value="analytics">Portfolio Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="transactions" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Transaction History</CardTitle>
                      <CardDescription>All your carbon credit token transactions</CardDescription>
                    </div>
                    <Button asChild>
                      <Link href="/marketplace/buy-credits">
                        <Coins className="h-4 w-4 mr-2" />
                        Buy More Credits
                      </Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {transactions.length === 0 ? (
                    <div className="text-center py-12">
                      <Coins className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No transactions yet</h3>
                      <p className="text-muted-foreground mb-6">
                        Start purchasing carbon credits to see your transaction history
                      </p>
                      <Button asChild>
                        <Link href="/marketplace/buy-credits">Buy Carbon Credits</Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {transactions.map((tx) => {
                        const project = projects[tx.project_id || tx.credit_id]
                        return (
                          <div
                            key={tx.id}
                            className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                                {getTransactionIcon(tx.status)}
                              </div>
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-medium text-foreground">
                                    Purchase {tx.amount_tons} tCO₂e Credits
                                  </h4>
                                  <Badge
                                    variant={tx.status === "completed" ? "default" : "outline"}
                                    className={
                                      tx.status === "completed"
                                        ? "bg-secondary/10 text-secondary border-secondary/20"
                                        : "border-amber-200 text-amber-700"
                                    }
                                  >
                                    {tx.status}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {project
                                    ? `${project.title} - ${project.project_type.replace(/_/g, " ")}`
                                    : "Carbon Credit Purchase"}
                                </p>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                                  <span>{new Date(tx.created_at).toLocaleDateString()}</span>
                                  <span className="font-mono">{formatAddress(tx.transaction_hash)}</span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-foreground">+{tx.amount_tons} CCT</p>
                              <p className="text-sm text-muted-foreground">${tx.total_amount.toLocaleString()}</p>
                              <Button variant="ghost" size="sm" className="mt-1" asChild>
                                <a
                                  href={`https://amoy.polygonscan.com/tx/${tx.transaction_hash}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <ExternalLink className="h-3 w-3 mr-1" />
                                  View
                                </a>
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Portfolio Performance</CardTitle>
                    <CardDescription>Your carbon credit investment summary</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Total Investment</span>
                        <span className="font-medium">${portfolioStats.totalValue.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Total Credits</span>
                        <span className="font-medium text-secondary">{portfolioStats.totalTokens} tCO₂e</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Average Price</span>
                        <span className="font-medium">
                          $
                          {portfolioStats.totalTokens > 0
                            ? (portfolioStats.totalValue / portfolioStats.totalTokens).toFixed(2)
                            : "0"}
                          /credit
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Total Transactions</span>
                        <span className="font-medium">{portfolioStats.transactionCount}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Environmental Impact</CardTitle>
                    <CardDescription>Your contribution to carbon offset and sustainability</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Total CO₂ Offset</span>
                        <span className="font-medium text-secondary">{portfolioStats.totalTokens} tCO₂e</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Equivalent Cars Off Road</span>
                        <span className="font-medium">{Math.round(portfolioStats.totalTokens * 0.217)} cars/year</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Trees Supported</span>
                        <span className="font-medium">{Math.round(portfolioStats.totalTokens * 13.2)} trees</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Projects Supported</span>
                        <span className="font-medium">{Object.keys(projects).length} projects</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
