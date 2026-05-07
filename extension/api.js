async function analyzeThreat(data) {

  const response = await fetch(CONFIG.API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  })

  return await response.json()
}