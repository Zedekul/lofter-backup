import { ByBlog } from "./ByBlog"
import React, { useState } from "react"
import { BackupNames, BackupType } from "./Main"
import { contextData, useGlobalState } from "../utils/context"
import { PostEntry } from "../utils/models"
import { showPostType } from "../utils/utils"
import { backupPosts } from "../utils/backup"

export const Backup: React.FC = () => {
  const [dataPath] = useGlobalState("dataPath")
  const [isWorking, setIsWorking] = useGlobalState("isWorking")
  const [backupType, setBackupType] = useState<BackupType>("blog")
  const [posts, setPostsInner] = useState<PostEntry[] | null>(null)
  const [skipRepeated, setSkipRepeated] = useState(true)
  const [allowFailure, setAllowFailure] = useState(true)

  const log = contextData.log

  const setPosts = (posts: PostEntry[] | null, logging = true) => {
    setPostsInner(posts)
    if (posts === null || !logging) {
      return
    }
    if (posts.length === 0) {
      log(`没有获取到内容。`, "warning")
      return
    }
    const unsavedCount = posts.filter((x) => x.timesSaved.length === 0).length
    const postTypes = new Array(6).fill(0)
    const unsavedPostTypes = new Array(6).fill(0)
    for (const post of posts) {
      postTypes[post.type - 1] += 1
      if (post.timesSaved.length === 0) {
        unsavedPostTypes[post.type - 1] += 1
      }
    }
    log(`共获取到 ${ posts.length } (${ unsavedCount }) 篇内容（括号内为未备份数量）：<br>${
      Array.from(postTypes.keys()).filter((i) => postTypes[i] !== 0)
        .map((i) => `${ postTypes[i] } (${ unsavedPostTypes[i] }) ${ showPostType(i + 1) }`)
        .join("<br>")
    }`)
    log(`单击左下方的按钮开始备份。`)
  }

  const onStart = async () => {
    if (isWorking || posts === null) {
      return
    }
    setIsWorking(true)
    if (await backupPosts(posts, { skipRepeated, allowFailure, dataPath })) {
      log(`详情可在<a href="#/saved">【已保存的数据】</a>页面查看。`)
    }
    setIsWorking(false)
  }

  if (backupType === null) {
    setBackupType("blog")
  }
  return <>
    <div className="input-group">
      <label htmlFor="input-type">备份类型</label>
      <select id="input-type" value={ backupType }
              onChange={ (e) => setBackupType(e.currentTarget.value as BackupType) }>
        { Object.keys(BackupNames).map((key, i) => <option key={ i }
                                                           value={ key }>{ BackupNames[key as BackupType] }</option>) }
      </select></div>
    { (() => {
      switch (backupType) {
        case "blog":
          return <ByBlog setPosts={ setPosts }/>
      }
    })() }
    { posts !== null && posts.length > 0 ? <>
      <div className="input-group">
        <input type="checkbox" id="skipRepeated" checked={ skipRepeated }
               disabled={ isWorking }
               onChange={ (e) => setSkipRepeated(e.currentTarget.checked) }/>
        <label className="label-inline" htmlFor="skipRepeated">跳过已备份文章</label>
      </div>
      <div className="input-group">
        <input type="checkbox" id="allowFailure" checked={ allowFailure }
               disabled={ isWorking }
               onChange={ (e) => setAllowFailure(e.currentTarget.checked) }/>
        <label className="label-inline" htmlFor="allowFailure">忽略错误。</label>
      </div>
      <div className="input-group">
        <button className="button" disabled={ isWorking } onClick={ onStart }>开始备份</button>
      </div>
    </> : undefined }
  </>
}
