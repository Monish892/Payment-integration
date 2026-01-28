
const express = require("express")
const cors = require("cors")
const { v4: uuidv4 } = require("uuid")

const app = express()
app.use(cors())
app.use(express.json())

const transactions = {}

app.post("/generate-qr", (req, res) => {
  res.json({
    status: "SUCCESS",
    qrData: {
      payeeName: "Demo Merchant",
      upiId: "demo@upi",
      intentUrl: "http://localhost:3000/pay/demo@upi"
    }
  })
})

app.post("/scan-qr", (req, res) => {
  const { upiId } = req.body
  res.json({
    status: "SUCCESS",
    payeeName: "Demo Merchant",
    upiId
  })
})

app.post("/pay", (req, res) => {
  const { amount, payeeName, upiId } = req.body
  const transactionId = uuidv4()
  const statuses = ["SUCCESS", "FAILED", "PENDING"]
  const status = statuses[Math.floor(Math.random() * statuses.length)]

  const txn = {
    transactionId,
    amount,
    payeeName,
    upiId,
    status,
    timestamp: new Date().toISOString()
  }

  transactions[transactionId] = txn

  setTimeout(() => {
    res.json({
      status,
      message: "Demo UPI transaction simulated",
      ...txn
    })
  }, 2000)
})

app.get("/transaction/:id", (req, res) => {
  const txn = transactions[req.params.id]
  if (!txn) return res.status(404).json({ status: "FAILED", message: "Not found" })
  res.json(txn)
})

app.listen(5000, () => console.log("Backend running on port 5000"))
