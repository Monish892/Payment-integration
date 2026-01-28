
import React, { useState } from "react"
import "./index.css"
import QrReader from 'react-qr-reader'

export default function App() {
  const [amount, setAmount] = useState("250")
  const [merchant, setMerchant] = useState("Demo Merchant")
  const [showSuccess, setShowSuccess] = useState(false)
  const [timestamp, setTimestamp] = useState(null)
  const [hasScanned, setHasScanned] = useState(false)
  const [isScanning, setIsScanning] = useState(false)

  function formatTimestamp(d) {
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
    const day = d.getDate()
    const mon = months[d.getMonth()]
    const year = d.getFullYear()
    let hours = d.getHours()
    const minutes = d.getMinutes().toString().padStart(2,'0')
    const ampm = hours >= 12 ? 'PM' : 'AM'
    hours = hours % 12
    hours = hours ? hours : 12
    return `${day} ${mon} ${year} • ${hours}:${minutes} ${ampm}`
  }

  const pay = async () => {
    const now = new Date()
    setTimestamp(formatTimestamp(now))
    setShowSuccess(true)
  }

  const simulateScan = () => {
    // start camera-based scanning (show QrReader)
    setIsScanning(true)
  }

  const handleScan = (data) => {
    if (!data) return
    // parse possible payloads: JSON or key:value pairs
    let scannedMerchant = merchant
    let scannedAmount = amount
    try {
      if (data.trim().startsWith('{')) {
        const obj = JSON.parse(data)
        scannedMerchant = obj.merchant || obj.payee || scannedMerchant
        scannedAmount = obj.amount || scannedAmount
      } else {
        const m = data.match(/merchant[:=]\s*([^;,\n]+)/i)
        const a = data.match(/amount[:=]\s*([^;,\n]+)/i)
        if (m) scannedMerchant = m[1].trim()
        if (a) scannedAmount = a[1].trim()
      }
    } catch (e) {
      // fallback: treat full data as merchant name
      scannedMerchant = data
    }

    setMerchant(scannedMerchant)
    setAmount(scannedAmount)
    setIsScanning(false)
    setHasScanned(true)
  }

  const handleError = (err) => {
    console.error('QR scan error', err)
    setIsScanning(false)
  }

  return (
    <div className="app-root">
      {!showSuccess && !hasScanned && (
        <div className="scan-container">
          <h2>Scan QR</h2>
          <div className="camera-placeholder">
            {!isScanning && (
              <>
                <div className="camera-icon">📷</div>
                <div className="scan-instruction">Align the QR code inside the frame</div>
              </>
            )}

            {isScanning && (
              <div className="qr-reader-wrap">
                <QrReader
                  delay={300}
                  onError={handleError}
                  onScan={handleScan}
                  style={{ width: '100%' }}
                  facingMode="environment"
                />
              </div>
            )}
          </div>
          <div className="scan-actions">
            <button className="pay-btn" onClick={simulateScan} disabled={isScanning}>{isScanning ? 'Scanning…' : 'Scan'}</button>
            <button className="pay-btn small" onClick={() => setHasScanned(true)} disabled={isScanning}>Enter details manually</button>
          </div>
        </div>
      )}

      {!showSuccess && hasScanned && (
        <div className="container">
          <h2>Demo UPI Pay</h2>
          <input
            placeholder="Enter amount"
            value={amount}
            onChange={e => setAmount(e.target.value)}
          />
          <input
            placeholder="Merchant name (e.g. Demo Merchant)"
            value={merchant}
            onChange={e => setMerchant(e.target.value)}
          />
          <button className="pay-btn" onClick={pay}>Pay</button>
        </div>
      )}

      {showSuccess && (
        <PaymentSuccess
          amount={amount}
          payeeName={merchant}
          txnId="TXN7F8A92KX"
          timestamp={timestamp}
          onDone={() => {
            setShowSuccess(false)
            setHasScanned(false)
            window.location.href = '/'
          }}
        />
      )}
    </div>
  )
}

function PaymentSuccess({ amount, payeeName, txnId, timestamp, onDone }) {
  return (
    <div className="success-overlay" role="dialog" aria-modal="true">
      <div className="success-card">
        <div className="anim-wrap">
          <svg className="tick-svg" width="160" height="160" viewBox="0 0 120 120">
            <g transform="translate(60,60)">
              <circle className="bg-circle" r="48" fill="#1DB954" />
              <circle className="stroke-circle" r="48" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" strokeDasharray="302" strokeDashoffset="302" />
              <path className="tick" d="M-18 2 L-4 14 L22 -14" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="80" strokeDashoffset="80" />
            </g>
          </svg>
        </div>

        <div className="texts">
          <div className="primary">Payment successful</div>
          <div className="amount">₹{amount}</div>
          <div className="payee">paid to {payeeName}</div>
          <div className="tertiary">UPI transaction ID: {txnId}</div>
          <div className="timestamp">{timestamp}</div>
        </div>

        <button className="done-btn" onClick={onDone}>Done</button>
      </div>
    </div>
  )
}
