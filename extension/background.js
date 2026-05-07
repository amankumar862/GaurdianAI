importScripts(
  "config.js",
  "api.js",
  "overlay.js",
  "scanner.js"
)

console.log("🚀 AI Scanner Running")

let lastUrl = ""

chrome.tabs.onUpdated.addListener(async (
  tabId,
  changeInfo,
  tab
) => {

  if (!tab.url) return

  if (
    tab.url.startsWith("chrome://") ||
    tab.url.startsWith("edge://") ||
    tab.url.startsWith("about:")
  ) {
    return
  }

  if (tab.url === lastUrl) return

  lastUrl = tab.url

  setTimeout(() => {
    lastUrl = ""
  }, 2000)

  console.log("Scanning:", tab.url)

  await scanPage(tabId, tab.url)

})