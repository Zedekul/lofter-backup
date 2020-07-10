import React from "react"
import { useHistory } from "react-router-dom"

import { contextData, useGlobalState } from "../utils/context"
import { saveConfig } from "../utils/config"

import "./Home.css"
import { loadData } from "../utils/utils"

export const Home: React.FC = () => {
  const [initialized] = useGlobalState("initialized")
  const [dataPath, setDataPath] = useGlobalState("dataPath")
  const history = useHistory()

  const canStart = initialized && dataPath !== ""

  const navClick = (link: string) => () => {
    if (canStart) {
      history.push(link)
    }
  }
  const chooseDataPath = async () => {
    if (!initialized) {
      return
    }
    try {
      const tmp = await window.tauri.openDialog({
        defaultPath: dataPath,
        directory: true
      })
      const newDataPath = typeof tmp === "string" ? tmp : tmp[0]
      await saveConfig({ dataPath: newDataPath })
      contextData.data = await loadData(newDataPath)
      setDataPath(newDataPath)
    } catch (e) {
      console.warn(e)
      setDataPath("")
    }
  }

  return <div className="page-home">
    <div className="page-home-inner">
      <h1>Lofter 备份工具</h1>
      <div className="home-buttons">
        <button className="button home-button" disabled={ !canStart } onClick={ navClick("/main") }>开始备份</button>
        <button className="button home-button" disabled={ !canStart } onClick={ navClick("/saved") }>本地数据</button>
      </div>
      <div className="home-data-path" onClick={ chooseDataPath }>
        { initialized ?
          dataPath === "" ?
            "请先单击这里设置数据目录。"
            : `备份到：${ dataPath }`
          : "初始化中…" }
      </div>
    </div>
  </div>
}
