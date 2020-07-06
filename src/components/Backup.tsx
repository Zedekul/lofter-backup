import { ByBlog } from "./ByBlog"
import React, { ChangeEvent, useState } from "react"
import { BackupNames, BackupType } from "./Main"
import { contextData, useGlobalState } from "../utils/context"
import { PostEntry } from "../utils/models"
import { showPostType } from "../utils/utils"
import { backupPosts } from "../utils/backup"

export const Backup: React.FC = () => {
  const [dataPath] = useGlobalState("dataPath")
  const [isWorking, setIsWorking] = useGlobalState("isWorking")
  const [isCancelling, setIsCancelling] = useGlobalState("isCancelling")
  const [backupType, setBackupType] = useState<BackupType>("blog")
  const [posts, setPostsInner] = useState<PostEntry[] | null>(null)
  const [backupOptions, setBackupOptions] = useState({
    skipRepeated: true,
    allowFailure: true,
    skipImages: false,
    skipVideos: false
  })

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
    const options = Object.assign({ dataPath }, backupOptions)
    try {
      await backupPosts(posts, options)
      log(`详情可在<a href="#/saved">【已保存的数据】</a>页面查看。`)
    } catch (e) {
      if (e.isJobCancellation) {
        log(`已中止备份。`)
      }
      setIsCancelling(false)
      contextData.isCancelling = false
    }
    setIsWorking(false)
  }

  const onCancel = async () => {
    if (isWorking) {
      setIsCancelling(true)
      contextData.isCancelling = true
    }
  }

  if (backupType === null) {
    setBackupType("blog")
  }

  const changeOptions = (key: keyof typeof backupOptions) =>
    (e: ChangeEvent<HTMLInputElement>) => setBackupOptions(Object.assign(backupOptions, {
      [key]: e.currentTarget.checked
    }))

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
        <input type="checkbox" id="skipRepeated" checked={ backupOptions.skipRepeated }
               disabled={ isWorking }
               onChange={ changeOptions("skipRepeated") }/>
        <label className="label-inline" htmlFor="skipRepeated">跳过已备份文章</label>
      </div>
      <div className="input-group">
        <input type="checkbox" id="allowFailure" checked={ backupOptions.allowFailure }
               disabled={ isWorking }
               onChange={ changeOptions("allowFailure") }/>
        <label className="label-inline" htmlFor="allowFailure">忽略错误。</label>
      </div>
      <div className="input-group">
        <input type="checkbox" id="skipImages" checked={ backupOptions.skipImages }
               disabled={ isWorking }
               onChange={ changeOptions("skipImages") }/>
        <label className="label-inline" htmlFor="skipImages">不备份图片</label>
      </div>
      <div className="input-group">
        <input type="checkbox" id="skipVideos" checked={ backupOptions.skipVideos }
               disabled={ isWorking }
               onChange={ changeOptions("skipVideos") }/>
        <label className="label-inline" htmlFor="skipVideos">不备份视频</label>
      </div>
      <div className="input-group">
        <button className="button" disabled={ isCancelling } onClick={ isWorking ? onCancel : onStart }>{
          isWorking ? "停止备份" : "开始备份"
        }</button>
      </div>
    </> : undefined }
  </>
}
