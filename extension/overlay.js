function showWarning(tabId, result) {

  if (
    result.status === "Dangerous" ||
    result.status === "Suspicious"
  ) {

    chrome.notifications.create({
      type: "basic",
      iconUrl: "icon.png",
      title: `AI Threat Detector: ${result.status}`,
      message: `Risk Score: ${result.risk_score}\n${result.reasons[0] || ""}`,
      priority: 2
    })
  }

  chrome.scripting.executeScript({
    target: { tabId },
    func: (result) => {

      const existing =
        document.getElementById("ai-phishing-warning")

      if (existing) existing.remove()

      const div = document.createElement("div")

      div.id = "ai-phishing-warning"

      div.style.position = "fixed"
      div.style.top = "20px"
      div.style.right = "20px"
      div.style.width = "320px"
      div.style.zIndex = "999999"

      div.style.background =
        result.status === "Dangerous"
          ? "#7f1d1d"
          : result.status === "Suspicious"
          ? "#78350f"
          : "#064e3b"

      div.style.color = "white"
      div.style.padding = "18px"
      div.style.borderRadius = "16px"
      div.style.boxShadow = "0 0 25px rgba(0,0,0,0.5)"
      div.style.fontFamily = "Arial"

      div.innerHTML = `
        <h2 style="margin:0 0 10px 0;">
          AI Threat Scan
        </h2>

        <p><strong>Status:</strong> ${result.status}</p>

        <p><strong>Risk Score:</strong> ${result.risk_score}</p>

        <p style="margin-top:10px;">
          ${result.reasons.slice(0, 3).join("<br>")}
        </p>
      `

      document.body.appendChild(div)

      setTimeout(() => {
        div.remove()
      }, 8000)

    },
    args: [result]

  }).catch(() => {
    console.log("Could not inject overlay")
  })
}