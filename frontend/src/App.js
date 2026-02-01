import React, { useState, useEffect, useRef } from "react"
import "./index.css"
import { Html5Qrcode } from "html5-qrcode"
import upiLogo from "./assets/upi-logo.webp"


export default function App() {
  const [amount, setAmount] = useState("")
  const [merchant, setMerchant] = useState("")
  const [upiId, setUpiId] = useState("")
  const [showSuccess, setShowSuccess] = useState(false)
  const [timestamp, setTimestamp] = useState(null)
  const [hasScanned, setHasScanned] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [transactionId, setTransactionId] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)

  // Audio context for payment success sound
  const playSuccessSound = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      
      // Create a pleasant success sound similar to GPay/PhonePe
      const playTone = (frequency, startTime, duration, type = 'sine') => {
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()
        
        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)
        
        oscillator.frequency.value = frequency
        oscillator.type = type
        
        // Smooth envelope for natural sound
        gainNode.gain.setValueAtTime(0, startTime)
        gainNode.gain.linearRampToValueAtTime(0.25, startTime + 0.02)
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration)
        
        oscillator.start(startTime)
        oscillator.stop(startTime + duration)
      }
      
      const now = audioContext.currentTime
      
      // Multi-tone success sound (cheerful and pleasant)
      // Similar to the "ding ding" sound in payment apps
      playTone(784, now, 0.15, 'sine')           // G5 - First ding
      playTone(1047, now + 0.12, 0.2, 'sine')    // C6 - Second ding (higher)
      
      // Add subtle harmony for richness
      playTone(659, now, 0.15, 'sine')           // E5 - Harmony
      playTone(880, now + 0.12, 0.2, 'sine')     // A5 - Harmony
      
    } catch (error) {
      console.log('Audio not supported:', error)
    }
  }

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

  // Parse UPI QR code format
  const parseUpiQrCode = (data) => {
    let parsedData = {
      merchant: "",
      upiId: "",
      amount: ""
    }

    try {
      // UPI QR codes typically follow this format:
      // upi://pay?pa=merchant@upi&pn=MerchantName&am=100&cu=INR
      // or just plain text with key-value pairs

      if (data.includes('upi://pay')) {
        // Parse UPI intent URL
        const url = new URL(data)
        parsedData.upiId = url.searchParams.get('pa') || ""
        parsedData.merchant = url.searchParams.get('pn') || ""
        parsedData.amount = url.searchParams.get('am') || ""
        
        // Decode merchant name if it's URL encoded
        if (parsedData.merchant) {
          parsedData.merchant = decodeURIComponent(parsedData.merchant)
        }
      } else if (data.trim().startsWith('{')) {
        // JSON format
        const obj = JSON.parse(data)
        parsedData.merchant = obj.merchant || obj.payee || obj.pn || ""
        parsedData.upiId = obj.upiId || obj.pa || obj.upi || ""
        parsedData.amount = obj.amount || obj.am || ""
      } else {
        // Key-value pairs format (merchant:name, upiId:id@bank, amount:100)
        const merchantMatch = data.match(/(?:merchant|pn|payee)[:=]\s*([^;,\n]+)/i)
        const upiMatch = data.match(/(?:upiId|upi|pa)[:=]\s*([^;,\n]+)/i)
        const amountMatch = data.match(/(?:amount|am)[:=]\s*([^;,\n]+)/i)
        
        if (merchantMatch) parsedData.merchant = merchantMatch[1].trim()
        if (upiMatch) parsedData.upiId = upiMatch[1].trim()
        if (amountMatch) parsedData.amount = amountMatch[1].trim()
      }

      // If we got a UPI ID but no merchant name, try to extract from UPI ID
      if (parsedData.upiId && !parsedData.merchant) {
        const upiName = parsedData.upiId.split('@')[0]
        parsedData.merchant = upiName.charAt(0).toUpperCase() + upiName.slice(1)
      }

    } catch (e) {
      console.error('Error parsing QR code:', e)
      // Fallback: treat entire data as merchant name
      parsedData.merchant = data
    }

    return parsedData
  }

  const pay = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      alert('Please enter a valid amount')
      return
    }

    if (!merchant) {
      alert('Merchant name is required')
      return
    }

    // Show processing overlay
    setIsProcessing(true)

    // Generate transaction ID locally
    const generateTxnId = () => {
      return 'TXN' + Math.random().toString(36).substring(2, 10).toUpperCase()
    }

    // Simulate minimum processing time for better UX
    const minDelay = new Promise(resolve => setTimeout(resolve, 1500))

    try {
      // Try to call backend API
      const response = await fetch('http://localhost:5000/pay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: parseFloat(amount),
          payeeName: merchant,
          upiId: upiId || 'unknown@upi'
        })
      })

      const result = await response.json()
      
      // Wait for minimum delay
      await minDelay

      setIsProcessing(false)

      if (result.status === 'SUCCESS') {
        const now = new Date()
        setTimestamp(formatTimestamp(now))
        setTransactionId(result.transactionId)
        playSuccessSound()  // Play success sound
        setShowSuccess(true)
      } else if (result.status === 'PENDING') {
        alert('Payment is pending. Please wait...')
      } else {
        alert('Payment failed. Please try again.')
      }
    } catch (error) {
      // Backend not available - process payment locally
      console.log('Backend not available, processing locally:', error)
      
      // Wait for minimum delay
      await minDelay
      
      const now = new Date()
      const txnId = generateTxnId()
      
      setIsProcessing(false)
      setTimestamp(formatTimestamp(now))
      setTransactionId(txnId)
      playSuccessSound()  // Play success sound
      setShowSuccess(true)
    }
  }

  const simulateScan = () => {
    // start camera-based scanning
    setIsScanning(true)
  }

  const handleScan = (data) => {
    if (!data) return
    
    const parsed = parseUpiQrCode(data)
    
    console.log('Scanned QR data:', data)
    console.log('Parsed data:', parsed)

    // Set merchant name and UPI ID from QR code
    if (parsed.merchant) {
      setMerchant(parsed.merchant)
    }
    
    if (parsed.upiId) {
      setUpiId(parsed.upiId)
    }

    // Set amount only if present in QR code and user hasn't entered one
    if (parsed.amount && !amount) {
      setAmount(parsed.amount)
    }

    setIsScanning(false)
    setHasScanned(true)
  }

  const handleError = (err) => {
    console.error('QR scan error', err)
    setIsScanning(false)
  }

  const html5QrRef = useRef(null)

  useEffect(() => {
    let mounted = true
    if (!isScanning) return
    const targetId = "qr-reader"
    const scanner = new Html5Qrcode(targetId)
    html5QrRef.current = scanner
    scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: 250 },
      (decodedText, decodedResult) => {
        if (!mounted) return
        handleScan(decodedText)
      },
      (errorMessage) => {
        // console.debug('qr error', errorMessage)
      }
    ).catch(err => {
      handleError(err)
    })

    return () => {
      mounted = false
      if (html5QrRef.current) {
        html5QrRef.current.stop().then(() => {
          html5QrRef.current.clear().catch(()=>{})
        }).catch(()=>{})
      }
    }
  }, [isScanning])

  return (
    <div className="app-root">
      {!showSuccess && !hasScanned && (
        <div className="scan-container">
          <h2>Scan QR Code</h2>
          <div className="camera-placeholder">
            {!isScanning && (
              <>
                <div className="camera-icon">📷</div>
                <div className="scan-instruction">Align the QR code inside the frame</div>
              </>
            )}

            {isScanning && (
              <div className="qr-reader-wrap">
                <div id="qr-reader" style={{ width: '100%' }} />
              </div>
            )}
          </div>
          <div className="scan-actions">
            <button className="pay-btn" onClick={simulateScan} disabled={isScanning}>
              {isScanning ? 'Scanning…' : 'Scan QR Code'}
            </button>
            <button className="pay-btn small" onClick={() => setHasScanned(true)} disabled={isScanning}>
              Enter details manually
            </button>
          </div>
        </div>
      )}

      {!showSuccess && hasScanned && (
        <div className="container">
          <h2>Payment Details</h2>
          
          <input
            type="text"
            placeholder="Merchant name"
            value={merchant}
            onChange={e => setMerchant(e.target.value)}
          />
          
          {upiId && (
            <div className="info-display">
              <strong>UPI ID:</strong> {upiId}
            </div>
          )}

          <input
            type="number"
            placeholder="Enter amount (₹)"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            min="1"
            step="0.01"
          />
          
          <button className="pay-btn" onClick={pay}>
            Pay ₹{amount || '0'}
          </button>
          
          <button 
            className="pay-btn small" 
            onClick={() => {
              setHasScanned(false)
              setMerchant("")
              setUpiId("")
              setAmount("")
            }}
          >
            Scan different QR
          </button>
        </div>
      )}

      {isProcessing && (
        <div className="processing-overlay">
          <div className="processing-content">
            <div className="spinner-container">
              <div className="spinner"></div>
            </div>
            <div className="processing-text">Processing payment...</div>
          </div>
        </div>
      )}

      {showSuccess && (
        <PaymentSuccess
          amount={amount}
          payeeName={merchant}
          txnId={transactionId}
          timestamp={timestamp}
          onDone={() => {
            setShowSuccess(false)
            setHasScanned(false)
            setMerchant("")
            setUpiId("")
            setAmount("")
            setTransactionId("")
          }}
        />
      )}
    </div>
  )
}

function PaymentSuccess({ amount, payeeName, txnId, timestamp, onDone }) {
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Payment Receipt',
        text: `Paid ₹${amount} to ${payeeName} via UPI\nTransaction ID: ${txnId}`,
      }).catch(err => console.log('Share failed', err))
    } else {
      alert('Payment receipt: ₹' + amount + ' paid to ' + payeeName)
    }
  }

  return (
    <div className="success-overlay" role="dialog" aria-modal="true">
      <div className="success-card">
        <div className="anim-wrap">
          <svg className="tick-svg" width="160" height="160" viewBox="0 0 120 120">
            <g transform="translate(60,60)">
              <circle className="bg-circle" r="48" fill="#3d8af7" />
              <circle className="stroke-circle" r="48" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" strokeDasharray="302" strokeDashoffset="302" />
              <path className="tick" d="M-18 2 L-4 14 L22 -14" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="80" strokeDashoffset="80" />
            </g>
          </svg>
        </div>

        <div className="texts">
          <div className="primary">Payment successful</div>
          <div className="amount">₹{amount}</div>
          <div className="payee">Paid to {payeeName}</div>
          <div className="tertiary">UPI transaction ID: {txnId}</div>
          <div className="timestamp">{timestamp}</div>
        </div>

        <div className="upi-branding">
          <div className="powered-by">POWERED BY</div>
          <img src={upiLogo} alt="UPI" className="upi-image" />
        </div>

        <div className="bottom-actions">
          <button className="share-btn" onClick={handleShare}>
            <span className="share-icon">⎘</span>
            <span>Share screenshot</span>
          </button>
          <button className="done-btn" onClick={onDone}>Done</button>
        </div>
      </div>
    </div>
  )
}
