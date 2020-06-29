import { showTime } from "./utils"

export type LoggerLevel = "info" | "warning" | "error" | "success" | null

export type Logger = (message: string, level?: LoggerLevel, updateLast?: boolean) => void

export const logToElement = (
  consoleElement: HTMLElement,
  message: string,
  level: LoggerLevel = "info",
  updateLast = false
) => {
  const time = new Date()
  const entry = document.createElement("div")
  const showSuccess = level === "success"
  if (level === "success") {
    level = "info"
  }
  entry.className = `message message-${ level }${ showSuccess ? " message-success" : "" }`
  const content = level === null ? message : `[${ showTime(time) }] ${ level.toUpperCase() } ${ message }`
  entry.innerHTML = content
  switch (level) {
    case "info":
      console.info(content)
      break
    case "warning":
      console.warn(content)
      break
    case "error":
      console.error(content)
      break
  }
  if (updateLast && consoleElement.lastElementChild !== null) {
    consoleElement.lastElementChild.classList.add("hidden-object")
  }
  consoleElement.appendChild(entry)
  consoleElement.scrollTop = consoleElement.scrollHeight
}
