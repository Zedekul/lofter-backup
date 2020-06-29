import { BaseDirectory } from "./tauri"

export interface Config {
  dataPath: string
}

export const saveConfig = async (config: Config) => {
  console.info("Saving config data.")
  await window.tauri.writeFile({
    file: "config.json",
    contents: JSON.stringify(config)
  }, {
    dir: BaseDirectory.App
  })
}

export const loadConfig = async () => {
  try {
    console.info("Loading config data.")
    const raw = await window.tauri.readTextFile("config.json", {
      dir: BaseDirectory.App
    })
    return JSON.parse(raw) as Config
  } catch (e) {
    console.warn("No config data.")
    return undefined
  }
}
