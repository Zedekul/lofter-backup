import { createGlobalState } from "react-hooks-global-state"

import { SaveData } from "./models"
import { Logger } from "./logger"

export const contextData: {
  data: SaveData,
  log: Logger,
  previousLogs: string
  isCancelling: boolean
} = {
  data: {},
  log: (message: string, level = null, updateLast = false) => {
  },
  previousLogs: "",
  isCancelling: false
}

export const { useGlobalState } = createGlobalState({
  dataPath: "",
  initialized: false,
  isWorking: false,
  isCancelling: false
})
