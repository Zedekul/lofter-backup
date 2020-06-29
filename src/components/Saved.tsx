import React, { useState } from "react"
import XLSX from "xlsx"

import "./Saved.css"
import { contextData, useGlobalState } from "../utils/context"

const exportToXlsx = async () => {
  const { blogs, posts } = contextData.data
  const workbook = XLSX.utils.book_new()
  const postsWorksheet = XLSX.utils.json_to_sheet(Array.from(Object.values(posts === undefined ? {} : posts)))
  const blogsWorksheet = XLSX.utils.json_to_sheet(Array.from(Object.values(blogs === undefined ? {} : blogs)))
  XLSX.utils.book_append_sheet(workbook, postsWorksheet, "Posts")
  XLSX.utils.book_append_sheet(workbook, blogsWorksheet, "Blogs")
  const exported = XLSX.writeFile(workbook, "Lofter 备份.xlsx", {
    type: "base64", bookType: "xlsx", compression: true
  });
  (window as any).exported = exported
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
      await exportToXlsx()
      setFilename(filename)
      console.log(`Exported to ${ filename }`)
    } catch (e) {
      setFilename("")
      setError(e.toString())
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
          "请使用 Excel 来管理备份的数据。" : `成功导出到 ${ filename }。` :
          error
      }</div>
    </div>
  </div>
}
