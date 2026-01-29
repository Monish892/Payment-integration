const express = require("express")
const cors = require("cors")
const { v4: uuidv4 } = require("uuid")

const app = express()
app.use(cors())
app.use(express.json())

const transactions = {}

// Mock database of merchants for validation
const merchants = {
  "demo@upi": { name: "Demo Merchant", verified: true },
  "shop@paytm": { name: "ABC Shop", verified: true },
  "store@phonepe": { name: "XYZ Store", verified: true },
  "merchant@gpay": { name: "Sample Merchant", verified: true }
}

app.post("/generate-qr", (req, res) => {
  const { merchantName, upiId, amount } = req.body
  
  // Generate UPI intent URL (standard format)
  const qrData = `upi://pay?pa=${upiId || 'demo@upi'}&pn=${encodeURIComponent(merchantName || 'Demo Merchant')}${amount ? `&am=${amount}` : ''}&cu=INR`
  
  res.json({
    status: "SUCCESS",
    qrData: qrData,
    details: {
      payeeName: merchantName || "Demo Merchant",
      upiId: upiId || "demo@upi",
      amount: amount || null
    }
  })
})

app.post("/scan-qr", (req, res) => {
  const { upiId } = req.body
  
  // Look up merchant info
  const merchant = merchants[upiId]
  
  if (merchant) {
    res.json({
      status: "SUCCESS",
      payeeName: merchant.name,
      upiId: upiId,
      verified: merchant.verified
    })
  } else {
    // Unknown merchant - return basic info
    res.json({
      status: "SUCCESS",
      payeeName: upiId.split('@')[0],
      upiId: upiId,
      verified: false
    })
  }
})

app.post("/validate-upi", (req, res) => {
  const { upiId } = req.body
  
  if (!upiId || !upiId.includes('@')) {
    return res.json({
      status: "INVALID",
      message: "Invalid UPI ID format"
    })
  }
  
  const merchant = merchants[upiId]
  
  if (merchant) {
    res.json({
      status: "VALID",
      payeeName: merchant.name,
      verified: merchant.verified
    })
  } else {
    res.json({
      status: "VALID",
      payeeName: upiId.split('@')[0],
      verified: false,
      message: "UPI ID exists but merchant not verified"
    })
  }
})

app.post("/pay", (req, res) => {
  const { amount, payeeName, upiId } = req.body
  
  if (!amount || amount <= 0) {
    return res.status(400).json({
      status: "FAILED",
      message: "Invalid amount"
    })
  }
  
  if (!payeeName) {
    return res.status(400).json({
      status: "FAILED",
      message: "Payee name is required"
    })
  }
  
  const transactionId = `TXN${uuidv4().substring(0, 8).toUpperCase()}`
  
  // Simulate success/failure (90% success rate)
  const statuses = ["SUCCESS", "SUCCESS", "SUCCESS", "SUCCESS", "SUCCESS", 
                    "SUCCESS", "SUCCESS", "SUCCESS", "SUCCESS", "FAILED"]
  const status = statuses[Math.floor(Math.random() * statuses.length)]
  
  const txn = {
    transactionId,
    amount,
    payeeName,
    upiId: upiId || 'unknown@upi',
    status,
    timestamp: new Date().toISOString()
  }
  
  transactions[transactionId] = txn
  
  // Simulate network delay
  setTimeout(() => {
    if (status === "SUCCESS") {
      res.json({
        status: "SUCCESS",
        message: "Payment successful",
        ...txn
      })
    } else {
      res.json({
        status: "FAILED",
        message: "Payment failed. Please try again.",
        transactionId
      })
    }
  }, 1500)
})

app.get("/transaction/:id", (req, res) => {
  const txn = transactions[req.params.id]
  if (!txn) {
    return res.status(404).json({ 
      status: "FAILED", 
      message: "Transaction not found" 
    })
  }
  res.json(txn)
})

app.get("/transactions", (req, res) => {
  res.json({
    status: "SUCCESS",
    transactions: Object.values(transactions)
  })
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`)
  console.log(`Available endpoints:`)
  console.log(`  POST /generate-qr - Generate QR code data`)
  console.log(`  POST /scan-qr - Get merchant info from UPI ID`)
  console.log(`  POST /validate-upi - Validate UPI ID`)
  console.log(`  POST /pay - Process payment`)
  console.log(`  GET /transaction/:id - Get transaction details`)
  console.log(`  GET /transactions - Get all transactions`)
})
