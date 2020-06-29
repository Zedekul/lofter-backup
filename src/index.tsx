import React, { useEffect } from "react"
import { render } from "react-dom"
import { HashRouter as Router, Link, Route, Switch, useLocation } from "react-router-dom"

import "milligram"

import { Main } from "./components/Main"
import { Home } from "./components/Home"
import { Saved } from "./components/Saved"
import { contextData, useGlobalState } from "./utils/context"
import { Config, loadConfig } from "./utils/config"

import "./index.css"
import { loadData } from "./utils/utils"

let loading: Promise<Config | undefined> | null = null

const Index: React.FC = () => {
  const [initialized, setInitialized] = useGlobalState("initialized")
  const [, setDataPath] = useGlobalState("dataPath")
  useEffect(() => {
    if (!initialized && loading === null) {
      loading = loadConfig()
      loading.then(async (config) => {
        if (config !== undefined) {
          setDataPath(config.dataPath)
          if (config.dataPath !== "") {
            contextData.data = await loadData(config.dataPath)
          }
        }
        setInitialized(true)
        loading = null
      })
    }
  })

  const atHome = useLocation().pathname === "/"

  return <div className="app">
    { atHome ? undefined : <div className="app-header">
      <Link to="/">首页</Link>
      <Link to="/main">开始备份</Link>
      <Link to="/saved">本地数据</Link>
    </div> }
    <div className="app-content">
      <Switch>
        <Route exact path="/">
          <Home/>
        </Route>
        <Route path="/main">
          <Main/>
        </Route>
        <Route path="/saved">
          <Saved/>
        </Route>
      </Switch>
    </div>
    <div className="app-footer">
      <a rel="noreferrer" href="https://github.com/Zedekul/lofter-backup" target="_blank">lofter-backup</a>
      <span> | Copyright (c) 2020: Zedekul (</span>
      <a href="mailto:zedekul@pm.me" target="_blank">zedekul@pm.me</a>)
    </div>
  </div>
}

window.tauri.setTitle("Lofter 备份工具")

render(<Router>
  <Index/>
</Router>, document.body)
