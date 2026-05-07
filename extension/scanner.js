async function scanPage(tabId, url) {

  try {

    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {

        const pageText = document.body
          ? document.body.innerText.slice(0, 5000)
          : ""

        const forms = document.forms.length

        const passwordFields =
          document.querySelectorAll(
            'input[type="password"]'
          ).length

        const buttons = Array.from(
          document.querySelectorAll(
            "button, input[type='submit']"
          )
        ).map(btn =>
          btn.innerText || btn.value || ""
        )

        return {
          page_text: pageText,
          forms,
          password_fields: passwordFields,
          buttons
        }
      }
    })

    const pageData = results[0].result

    const result = await analyzeThreat({
      url,
      ...pageData
    })

    console.log("Scan Result:", result)

    showWarning(tabId, result)

  } catch (err) {

    console.log("Scanner error:", err)

  }
}