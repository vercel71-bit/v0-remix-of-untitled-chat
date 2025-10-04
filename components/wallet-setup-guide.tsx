"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Wallet, CreditCard, ExternalLink } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface WalletSetupGuideProps {
  onComplete?: () => void
}

export function WalletSetupGuide({ onComplete }: WalletSetupGuideProps) {
  const [currentStep, setCurrentStep] = useState(1)

  const steps = [
    {
      number: 1,
      title: "Install MetaMask Wallet",
      description: "MetaMask is a digital wallet that lets you buy and store carbon credits securely",
      action: "Install MetaMask",
      link: "https://metamask.io/download/",
      completed: typeof window !== "undefined" && window.ethereum !== undefined,
    },
    {
      number: 2,
      title: "Get Test MATIC Tokens",
      description: "You need MATIC tokens to pay for transactions. Get free test tokens for the Polygon testnet",
      action: "Get Free Test Tokens",
      link: "https://faucet.polygon.technology/",
      completed: false,
    },
    {
      number: 3,
      title: "Connect Your Wallet",
      description: "Connect your MetaMask wallet to our platform to start buying carbon credits",
      action: "Connect Wallet",
      completed: false,
    },
  ]

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Wallet className="h-6 w-6 text-primary" />
          <CardTitle>Get Started with Carbon Credits</CardTitle>
        </div>
        <CardDescription>Follow these simple steps to start purchasing carbon credits</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription>
            <strong>New to blockchain?</strong> Don't worry! We'll guide you through each step. It takes about 5
            minutes.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          {steps.map((step) => (
            <div
              key={step.number}
              className={`rounded-lg border p-4 transition-all ${
                currentStep === step.number ? "border-primary bg-primary/5" : "border-border"
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    step.completed
                      ? "bg-green-500 text-white"
                      : currentStep === step.number
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {step.completed ? <CheckCircle2 className="h-5 w-5" /> : step.number}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{step.title}</h3>
                    {step.completed && <Badge variant="secondary">Completed</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                  {!step.completed && currentStep === step.number && (
                    <div className="pt-2">
                      {step.link ? (
                        <Button asChild size="sm" className="gap-2">
                          <a href={step.link} target="_blank" rel="noopener noreferrer">
                            {step.action}
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      ) : (
                        <Button size="sm" onClick={onComplete}>
                          {step.action}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-lg bg-accent p-4 space-y-2">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <h4 className="font-semibold">How Payment Works</h4>
          </div>
          <ul className="text-sm text-muted-foreground space-y-1 ml-7">
            <li>• You pay with MATIC tokens (Polygon's cryptocurrency)</li>
            <li>• Each transaction costs a small gas fee (usually less than $0.01)</li>
            <li>• Your carbon credits are stored securely on the blockchain</li>
            <li>• You can view, sell, or retire your credits anytime</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
