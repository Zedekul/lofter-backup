import React from "react"
import { Link } from "react-router-dom"

export const Home: React.FC = () => {
  return <div className="page-home">
    <Link to="/archive">Link</Link>
  </div>
}
