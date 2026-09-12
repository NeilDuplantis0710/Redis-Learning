import express from 'express'
import Redis from 'ioredis'
import { randomInt } from 'node:crypto'

const app = express()
app.use(express.json())

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6381')

// Function asks for Phone number and gives an otp key
function otpKey(phone) {
  return `otp:${phone}`
}

// OTP Generation and posting
app.post('/otp', async (req, res) => {
  const { phone } = req.body

  if (!phone) {
    return res.status(400).json({ message: 'Phone number is required' })
  }

  const otp = randomInt(100000, 1000000).toString()
  await redis.set(otpKey(phone), otp, 'EX', 30)

  res.json({ message: 'OTP sent', otp })
})

// OTP Verification
app.post('/otp/verify', async (req, res) => {
  const { phone, otp } = req.body

  if (!otp) {
    return res.status(400).json({ message: 'OTP not required or expired' })
  }

  const savedOtp = await redis.get(otpKey(phone))

  if (!savedOtp) {
    return res.status(400).json({ message: 'OTP expired or not found' })
  }

  if (savedOtp !== otp) {
    return res.status(400).json({ message: 'Invalid OTP' })
  }

  await redis.del(otpKey(phone))
  res.json({ message: 'OTP Verified Successfully' })
})

app.get('/otp/:phone/ttl', async (req, res) => {
  const ttl = await redis.ttl(otpKey(req.params.phone))
  res.json({ ttl })
  // Once the OTP is expired the ttl becomes -2
})

app.listen(3000, () => {
  console.log('Server is running on port http://localhost:3000')
})