import { parse } from "node-html-parser"
import React, { useState } from "react"

import { invoke } from "../tauri"
import { BlogEntry, PostEntry } from "../utils/models"
import { cache } from "../utils/utils"
import { PostList } from "./PostList"


export const blogDirectory = (blog: BlogEntry, dataPath: string) => `${ dataPath }/${ blog.id }-${ blog.username }`

export const imagesDirectory = (blog: BlogEntry, dataPath: string) => `${ blogDirectory(blog, dataPath) }/images`
export const dataFileName = (blog: BlogEntry, dataPath: string) => `${ blogDirectory(blog, dataPath) }/data.json`

export const saveBlog = async (blog: BlogEntry, dataPath: string) => {
  await window.tauri.createDir(imagesDirectory(blog, dataPath), {recursive: true})
  await window.tauri.writeFile({
    file: dataFileName(blog, dataPath),
    contents: JSON.stringify(blog)
  })
  console.info(`Saved post list for ${ blog.id }-${ blog.username } to disk...`)
}

export const loadBlog = async (
  blog: BlogEntry, dataPath: string, force = false
): Promise<BlogEntry> => {
  if (!force) {
    try {
      const data = await window.tauri.readTextFile(dataFileName(blog, dataPath))
      console.info(`Loaded post list for ${ blog.id }-${ blog.username } from disk...`)
      blog = JSON.parse(data)
      cache.blogs[blog.id] = blog
      return blog
    } catch (e) {
      console.info(`Fetching post list for ${ blog.id }-${ blog.username }...`)
    }
  }
  let rawResult = (await invoke<string>("getPostList", {username: blog.username, blog_id: blog.id}))
    .replace("dwr.engine._remoteHandleCallback(", "return [")
  rawResult = rawResult.slice(0, rawResult.lastIndexOf(";") - 1) + "]"
  // eslint-disable-next-line no-new-func
  const result = Function(rawResult)()[2] as Array<any>
  blog.posts = result.map((x) => {
    return {
      id: x.id,
      blogID: blog.id,
      title: x.values.noticeLinkTitle,
      type: x.type,
      timeCreated: x.time,
      tags: [],
      timeUpdated: new Date().valueOf(),
      backedUp: false
    }
  })
  cache.blogs[blog.id] = blog
  return blog
}

const onGetPostList = async (
  username: string,
  dataPath: string,
  force: boolean,
  setMessage: (message: string) => void,
  setPosts: (posts: Array<any>) => void
) => {
  setMessage("获取归档内容……")
  let blog = await invoke<BlogEntry>("getBlogInfo", {username})
  blog = await loadBlog(blog, dataPath, force)
  await saveBlog(blog, dataPath)
  setMessage(`共 ${ blog.posts!.length } 个内容。`)
  setPosts(blog.posts!)
}

const onSelectDataFolder = async (
  dataPath: string | null,
  setDataPath: (x: string) => void
) => {
  const value = await window.tauri.openDialog({
    defaultPath: dataPath === null ? undefined : dataPath,
    directory: true
  })
  setDataPath(typeof value === "string" ? value : value[0])
}

const onBackUpPost = async (
  post: PostEntry, dataPath: string, force: boolean,
  setMessage: (message: string) => void,
) => {
  const blog = cache.blogs[post.blogID]
  const filename = `${ dataPath }/${ blog.id }-${ blog.username }/${ post.id }-${ post.title }.html`
  if (!force) {
    try {
      if (post.backedUp) {
        return
      }
      await window.tauri.readTextFile(filename)
      return
    } catch (e) {
      console.info("No local cache")
    }
  }
  console.info(`Fetching post for ${ post.id }-${ post.title }...`)
  setMessage(`正在备份 ${ post.title }……`)
  const rawHTML = await invoke<string>("getPost", {
    username: blog.username,
    blog_id: blog.id,
    post_id: post.id
  })
  const dom = parse(rawHTML);
  (window as any).dom = dom
  const content = dom.querySelector(".m-postdtl")
  if (content === null) {
    return
  }
  let toSave = content.innerHTML
  const images = dom.querySelectorAll(".pic")
    .map((x) => x.querySelector("img"))
  let i = 0
  const referer = `https://${ blog.username }.lofter.com/post/${ blog.id.toString(16) }_${ post.id.toString(16) }`
  for (const image of images) {
    i += 1
    setMessage(`正在备份 ${ post.title }……下载图片 (${ i }/${ images.length })`)
    const source = image.getAttribute("src")
    if (source === null) {
      continue
    }
    const m = source.match(/img\/(.+?)\?/)
    if (m === null) {
      continue
    }
    const imageFile = m[1]
    await invoke("downloadFile", {
      source, filename: `${ imagesDirectory(blog, dataPath) }/${ imageFile }`,
      referer
    })
    toSave = toSave.split(source).join(`./images/${ imageFile }`)
  }
  const m2 = rawHTML.match(/creativecommons.org\/licenses\/(.+?)\//)
  post.license = m2 === null ? undefined : m2[1]
  post.tags = dom.querySelectorAll(".tag").map((x) => x.text)
  post.backedUp = true
  await window.tauri.writeFile({
    file: filename,
    contents: toSave
  })
  await saveBlog(blog, dataPath)
}

export const Archive: React.FC = () => {
  const [username, setUsername] = useState("")
  const [posts, setPosts] = useState<Array<any>>([])
  const [message, setMessage] = useState("")
  const [dataPath, setDataPath] = useState<string | null>(null)
  return <div className="page-archive">
    <button onClick={ () => invoke("test") }>Test</button>
    <div className="page-actions">
      <div className="archive-data-folder">{ dataPath === null ? "" : dataPath }</div>
      <button onClick={ () => onSelectDataFolder(dataPath, setDataPath) }>选择数据目录</button>
    </div>
    <div className="page-message">{ message }</div>
    { dataPath === null ? [] : <div className="page-actions">
      <input type="text"
             value={ username }
             onChange={ (e) => setUsername(e.currentTarget.value) }
             placeholder={ "用户名" }
      />
      <button onClick={ () => onGetPostList(username, dataPath, false, setMessage, setPosts) }>列出归档</button>
      <button onClick={ () => onBackUpPost(posts[0], dataPath, true, setMessage) }>开始备份</button>
    </div> }
    { dataPath === null ? [] : <PostList posts={ posts } dataPath={ dataPath }/> }
  </div>
}
