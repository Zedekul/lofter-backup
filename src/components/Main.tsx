import React, { createRef, useEffect, useState } from "react"
import { Prompt } from "react-router-dom"

import { LoggerLevel, logToElement } from "../utils/logger"

import "./Main.css"
import { escapeSpecials, showTime } from "../utils/utils"
import { contextData, useGlobalState } from "../utils/context"
import { Backup } from "./Backup"


export const BackupNames = {
  "blog": "按博客"
}
export type BackupType = keyof typeof BackupNames

const consoleRef = createRef<HTMLDivElement>()

export const Main: React.FC = () => {
  const [logInitialized, setLogInitialized] = useState(false)
  const [dataPath] = useGlobalState("dataPath")

  useEffect(() => {
    contextData.log = (message: string, level: LoggerLevel = "info", updateLast = false) => {
      if (consoleRef.current === null) {
        return
      }
      logToElement(consoleRef.current, message, level, updateLast)
    }
    if (consoleRef.current !== null) {
      consoleRef.current.innerHTML = contextData.previousLogs
      if (contextData.previousLogs !== "") {
        contextData.log("-------------------", null)
      }
    }
    setLogInitialized(true)
  }, [])

  const onSaveLogs = async () => {
    const log = contextData.log
    if (consoleRef.current === null || dataPath === undefined) {
      return
    }
    const filename = `${ dataPath }/logs-${ showTime(new Date(), true) }.txt`
    try {
      await window.tauri.writeFile({
        file: filename,
        contents: `${ escapeSpecials(consoleRef.current.innerText, false) }\n`
      })
      log(`日志已保存到 <a href="#" onclick="(function(e){e.preventDefault();window.tauri.open('${ filename }')})(event)">${ filename }</a>`)
    } catch (e) {
      log(`日志保存失败。错误信息：<br>${ e.toString() }`, "error")
    }
  }

  return <div className="page-main container">
    <div className="row">
      <div className="column column-40">
        { logInitialized ? <Backup/> : undefined }
      </div>
      <div className="column column-60 console-container">
        <div className="logging-console" ref={ consoleRef }/>
        <div className="console-buttons">
          <button className="button button-outline" onClick={ () => {
            if (consoleRef.current !== null) {
              contextData.previousLogs = ""
              consoleRef.current.innerHTML = ""
            }
          } }>清空日志
          </button>
          <button className="button button-outline" onClick={ onSaveLogs }>保存日志</button>
        </div>
      </div>
    </div>
    <Prompt message={ () => {
      if (consoleRef.current !== null) {
        contextData.previousLogs = consoleRef.current.innerHTML
      }
      return true
    } }/>
  </div>
}
