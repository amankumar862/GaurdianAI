document.getElementById("checkBtn").addEventListener("click", async () => {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

  const url = tab.url

  try {
    const response = await fetch(CONFIG.API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url })
    })

    const data = await response.json()

    document.getElementById("result").innerText =
      `Risk: ${data.risk_score} | ${data.status}`

  } catch (err) {
    document.getElementById("result").innerText =
      "Backend not running"
  }
})