import React, { useState } from "react"
import XLSX, { ColInfo } from "xlsx"

import "./Saved.css"
import { contextData, useGlobalState } from "../utils/context"
import { invoke } from "../utils/tauri"
import { BlogEntry, PostEntry } from "../utils/models"
import { escapeSpecials, showPostType, showTime } from "../utils/utils"
import { getPostUrl } from "../utils/backup"

const exportPosts = () => {
  const { blogs, posts } = contextData.data
  if (posts === undefined || blogs === undefined) {
    return {}
  }
  const sorted: PostEntry[] = Object.values(posts)
  sorted.sort((a, b) => a.id - b.id)
  const postsData = [[
    "编号",
    "文章 ID",
    "博客 ID",
    "博客名",
    "类型",
    "标题",
    "发表时间",
    "标签",
    "协议",
    "评论数",
    "热度",
    "上次访问时间",
    "原地址",
    "备份次数",
    "备份时间"
  ], ...sorted.map((post, i) => [
    i + 1,
    post.id,
    post.blogID,
    blogs[post.blogID].username,
    showPostType(post.type),
    escapeSpecials(post.title, false),
    new Date(post.timeCreated),
    post.tags.join(", "),
    post.license === undefined ? undefined : post.license.toUpperCase(),
    post.numComments,
    post.hot,
    new Date(post.timeUpdated),
    getPostUrl(post, blogs[post.blogID]),
    post.timesSaved.length,
    post.timesSaved.map((x) => showTime(new Date(x), true)).join(", ")
  ])]
  const worksheet = XLSX.utils.aoa_to_sheet(postsData)
  const cols = worksheet["!cols"] = [] as ColInfo[]
  cols[0] = { wch: 6 }
  cols[1] = { hidden: true }
  cols[2] = { hidden: true }
  cols[3] = { wch: 20 }
  cols[4] = { wch: 6 }
  cols[5] = { wch: 50 }
  cols[6] = { wch: 12 }
  cols[7] = { wch: 50 }
  cols[8] = { wch: 10 }
  cols[9] = { wch: 8 }
  cols[10] = { wch: 8 }
  cols[11] = { hidden: true }
  cols[12] = { wch: 10 }
  cols[13] = { wch: 10 }
  cols[14] = { wch: 10 }
  return worksheet
}

const exportBlogs = () => {
  const { posts: postsDict, blogs } = contextData.data
  const posts: PostEntry[] = postsDict === undefined ? [] : Object.values(postsDict)
  if (blogs === undefined) {
    return {}
  }
  const sorted: BlogEntry[] = Object.values(blogs)
  sorted.sort((a, b) => a.id - b.id)
  const blogsData = [[
    "编号",
    "博客 ID",
    "博客名",
    "标题",
    "上次访问时间",
    "内容数量",
    "地址",
  ], ...sorted.map((blog, i) => [
    i + 1,
    blog.id,
    blog.username,
    escapeSpecials(blog.title, false),
    new Date(blog.timeUpdated),
    posts.filter((post) => post.blogID === blog.id).length,
    `https://${ blog.username }.lofter.com`
  ])]
  const worksheet = XLSX.utils.aoa_to_sheet(blogsData)
  const cols = worksheet["!cols"] = [] as ColInfo[]
  cols[0] = { wch: 6 }
  cols[1] = { hidden: true }
  cols[2] = { wch: 20 }
  cols[3] = { wch: 50 }
  cols[4] = { wch: 12 }
  cols[5] = { wch: 8 }
  cols[6] = { wch: 10 }
  return worksheet
}

const exportToXlsx = async () => {
  const workbook = XLSX.utils.book_new()
  const postsWorksheet = exportPosts()
  const blogsWorksheet = exportBlogs()
  XLSX.utils.book_append_sheet(workbook, postsWorksheet, "内容列表")
  XLSX.utils.book_append_sheet(workbook, blogsWorksheet, "博客列表")
  const exported = XLSX.write(workbook, {
    type: "base64", bookType: "xlsx", compression: true
  })
  return exported
}

export const Saved: React.FC = () => {
  const [isWorking, setIsWorking] = useGlobalState("isWorking")
  const [filename, setFilename] = useState("")
  const [error, setError] = useState<string>("")
  const [dataPath] = useGlobalState("dataPath")
  const exportToExcel = async () => {
    if (isWorking) {
      return
    }
    setIsWorking(true)
    try {
      let filename = await window.tauri.saveDialog({
        filter: "xlsx", defaultPath: dataPath
      })
      if (!filename.toLowerCase().endsWith(".xlsx")) {
        filename += ".xlsx"
      }
      const content = await exportToXlsx()
      await invoke("saveBase64", {
        filename,
        content
      })
      setFilename(filename)
      console.log(`Exported to ${ filename }`)
    } catch (e) {
      setFilename("")
      let message = e.toString()
      if (message.indexOf("user cancelled") >= 0) {
        message = ""
      }
      setError(message)
      console.error(e)
    }
    setIsWorking(false)
  }
  return <div className="page-saved">
    <div className="page-saved-inner">
      <h2>已备份数据</h2>
      <button disabled={ isWorking } className="button saved-button" onClick={ exportToExcel }>
        导出到 Excel
      </button>
      <div className={ `saved-message${ error === "" ? "" : " saved-message-error" }` }>{
        error === "" ? filename === "" ?
          "请使用 Excel 来管理备份的数据。" : <span>成功导出到：<a href="#" onClick={ (e) => {
            e.preventDefault()
            window.tauri.open(filename)
          } }>{ filename }</a></span> :
          error
      }</div>
      <div className="saved-folder">打开数据目录：<a href="#" onClick={ (e) => {
        e.preventDefault()
        window.tauri.open(dataPath)
      } }> { dataPath }</a></div>
    </div>
  </div>
}
