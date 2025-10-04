import type { Transaction } from "@/types/transaction"

const STORAGE_KEY = "carbon_credit_transactions"

export const getTransactions = (): Transaction[] => {
  if (typeof window === "undefined") return []

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.error("Error reading transactions:", error)
    return []
  }
}

export const saveTransaction = (transaction: Transaction): void => {
  if (typeof window === "undefined") return

  try {
    const transactions = getTransactions()
    transactions.unshift(transaction) // Add to beginning
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions))
  } catch (error) {
    console.error("Error saving transaction:", error)
  }
}

export const generateTransactionHash = (): string => {
  const chars = "0123456789abcdef"
  let hash = "0x"
  for (let i = 0; i < 64; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)]
  }
  return hash
}
