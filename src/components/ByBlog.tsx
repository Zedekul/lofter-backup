import React, { useEffect, useState } from "react"
import { BlogEntry, PostEntry } from "../utils/models"
import { invoke } from "../utils/tauri"
import { contextData, useGlobalState } from "../utils/context"
import { saveData } from "../utils/utils"

const isValid = (username: string) => /^[A-Za-z0-9_-]+$/.test(username)

export const ByBlog: React.FC<{
  setPosts: (posts: PostEntry[] | null, logging?: boolean) => void
}> = ({ setPosts }) => {
  const [dataPath] = useGlobalState("dataPath")
  const [isWorking, setIsWorking] = useGlobalState("isWorking")
  const [username, setUsername] = useState("")
  const [preparedUsername, setPreparedUsername] = useState<string | null>(null)
  const [localPosts, setLocalPosts] = useState<PostEntry[] | null>(null)
  const log = contextData.log

  const getBlogInfo = async () => {
    if (isWorking) {
      return
    }
    setIsWorking(true)
    const data = contextData.data
    log("正在获取博客信息……")
    let blog: BlogEntry
    try {
      blog = await invoke<BlogEntry>("getBlogInfo", { username })
      blog.timeUpdated = +new Date()
      if (data.blogs === undefined) {
        data.blogs = {}
      }
      data.blogs[blog.id] = blog
      if (dataPath !== "") {
        await saveData({ blogs: data.blogs }, dataPath)
      }
    } catch (e) {
      log(`无法获取博客信息。错误信息：<br>${ e.toString() }`, "error")
      setIsWorking(false)
      return
    }
    log(`准备备份 ${ blog.title } (${ blog.username }.lofter.com)……`)
    log("正在获取文章列表……")
    let posts: PostEntry[] = []
    try {
      let rawPostListResult = (await invoke<string>("getPostList", {
        username, blog_id: blog.id
      })).replace("dwr.engine._remoteHandleCallback(", "return [")
      rawPostListResult = `${ rawPostListResult.slice(0, rawPostListResult.lastIndexOf(";") - 1) }]`
      // eslint-disable-next-line no-new-func
      const rawPostList = Function(rawPostListResult)()[2] as any[]
      posts = rawPostList.map((x) => ({
        id: x.id,
        blogID: blog.id,
        title: x.values.noticeLinkTitle === null ? "无标题" : x.values.noticeLinkTitle,
        type: x.type,
        timeCreated: x.time,
        tags: [],
        timeUpdated: new Date().valueOf(),
        timesSaved: []
      }))
      if (data.posts === undefined) {
        data.posts = {}
      }
      for (const post of posts) {
        if (post.id in data.posts) {
          post.timesSaved = data.posts[post.id].timesSaved
        }
        data.posts[post.id] = post
      }
      if (dataPath !== "") {
        await saveData({ posts: data.posts }, dataPath)
      }
    } catch (e) {
      log(`无法获取文章列表。错误信息：<br>${ e.toString() }`, "error")
      setIsWorking(false)
      return
    }
    posts.sort((a, b) => a.timeCreated - b.timeCreated)

    setLocalPosts(posts)
    setPreparedUsername(username.toLowerCase())
    setPosts(posts, true)
    setIsWorking(false)
  }

  useEffect(() => {
    if (username.toLowerCase() === preparedUsername && localPosts !== null) {
      setPosts(localPosts, false)
    } else {
      setPosts(null)
    }
  }, [username, preparedUsername, localPosts, setPosts])

  useEffect(() => contextData.log("按博客备份：输入博客名 - 获取内容列表 - 备份"), [])

  return <>
    <div className="input-group">
      <label htmlFor="username">博客地址</label>
      <div className="input-username">
        <input id="username" type="text"
               disabled={ isWorking }
               value={ username }
               onChange={ (e) => isWorking || setUsername(e.currentTarget.value) }
               onKeyPress={ (e) => isWorking || !isValid(username) || e.key !== "Enter" || getBlogInfo() }
        />
        <span>.lofter.com</span>
      </div>
    </div>
    <div className="input-group">
      <button className="button"
              disabled={ isWorking || !isValid(username) }
              onClick={ getBlogInfo }>
        获取内容列表
      </button>
    </div>
  </>
}
