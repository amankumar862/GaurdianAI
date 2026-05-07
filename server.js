import express from "express"
import dotenv from "dotenv"

dotenv.config()

const app = express()

app.use(express.json())

app.post("/api/scan", async (req, res) => {

  const data = req.body

  // TEMP TEST RESPONSE

  res.json({
    status: "Safe",
    risk_score: 12,
    reasons: [
      "No phishing indicators detected"
    ]
  })

})

app.listen(3001, () => {
  console.log("Server running on 3001")
})