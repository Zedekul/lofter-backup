import React from "react"
import { render } from "react-dom"
import { BrowserRouter as Router, Link, Route, Switch } from "react-router-dom"

import "./css.tsx"
import { Archive } from "./components/Archive"
import { Home } from "./components/Home"

const Index: React.FC = () => {
  return <div>
    <Link to="/">主页</Link>
    <Link to="/archive">归档</Link>
    <Switch>
      <Route exact path="/">
        <Home/>
      </Route>
      <Route path="/archive">
        <Archive/>
      </Route>
    </Switch>
  </div>
}

window.tauri.setTitle("Lofter 备份工具")

render(<Router>
  <Index/>
</Router>, document.body)
