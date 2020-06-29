import React from "react"
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
  const [isWorking] = useGlobalState("isWorking")

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

  const atHome = useLocation().pathname === "/"
  const autoDisable = (e: React.MouseEvent) => {
    if (isWorking) {
      e.preventDefault()
    }
  }

  return <div className="app">
    { atHome ? undefined : <div className="app-header">
      <Link to="/" onClick={ autoDisable }>首页</Link>
      <Link to="/main" onClick={ autoDisable }>开始备份</Link>
      <Link to="/saved" onClick={ autoDisable }>本地数据</Link>
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
      <a href="https://github.com/Zedekul/lofter-backup" target="_blank" rel="noreferrer">lofter-backup</a>
      <span> v1.0 | Copyright (c) 2020: Zedekul (</span>
      <a href="mailto:zedekul@pm.me" target="_blank" rel="noreferrer">zedekul@pm.me</a>)
    </div>
  </div>
}

render(<Router>
  <Index/>
</Router>, document.body)
