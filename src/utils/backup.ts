import { BlogEntry, PostEntry, PostType } from "./models"
import { contextData } from "./context"
import { escapeSpecials, saveData, showPostType } from "./utils"
import { invoke } from "./tauri"
import { parse as parseHTML, HTMLElement } from "node-html-parser"

export interface BackupOptions {
  allowFailure: boolean
  skipRepeated: boolean
  dataPath: string
}

const getBlogDirectory = (blog: BlogEntry, dataPath: string) => `${ dataPath }/${ blog.id }-${ blog.username }`

const getPostUrl = (post: PostEntry, blog: BlogEntry) => `https://${
  blog.username }.lofter.com/post/${ blog.id.toString(16) }_${ post.id.toString(16) }`

export const handleMedia = async (
  mediaType: "image" | "video", media: HTMLElement,
  blog: BlogEntry, referer: string, toSave: string,
  options: BackupOptions
): Promise<string> => {
  const source = media.getAttribute("src")
  if (source === null) {
    return toSave
  }
  const pathNames = new URL(source).pathname.split("/")
  const filename = pathNames[pathNames.length - 1]
  try {
    await invoke("downloadFile", {
      source, filename: `${ getBlogDirectory(blog, options.dataPath) }/${ mediaType }s/${ filename }`,
      referer
    })
    toSave = toSave.split(source).join(`./${ mediaType }s/${ filename }`)
  } catch (e) {
    if (!options.allowFailure) {
      throw (e)
    }
  }
  return toSave
}

export const backupCommonPost = async (post: PostEntry, blog: BlogEntry, infoString: string, options: BackupOptions) => {
  const log = contextData.log
  const dataPath = options.dataPath
  if (post.timesSaved.length > 0 && options.skipRepeated) {
    log(`${ infoString } 已备份，跳过。`, "success", true)
    return
  }
  const rawHTML = await invoke<string>("getPost", {
    username: blog.username,
    blog_id: blog.id,
    post_id: post.id
  })
  const dom = parseHTML(rawHTML)
  const content = dom.querySelector(".g-bd")
  if (content === null) {
    throw new Error("未知错误。")
  }
  const titleDom = dom.querySelector("title")
  const title = titleDom === null ? `${ post.title } - ${ blog.title }` : titleDom.text
  await window.tauri.createDir(`${ getBlogDirectory(blog, dataPath) }/images`, { recursive: true })
  await window.tauri.createDir(`${ getBlogDirectory(blog, dataPath) }/videos`, { recursive: true })
  let toSave = content.innerHTML
  const picDoms = dom.querySelectorAll(".pic")
  const referer = getPostUrl(post, blog)
  const images = picDoms
    .map((x) => x.querySelector("img"))
    .filter((x) => x !== null)
  let i = 0
  for (const image of images) {
    i += 1
    log(`${ infoString } 备份中……下载图片（${ i }/${ images.length }）`, "info", true)
    toSave = await handleMedia("image", image, blog, referer, toSave, options)
  }
  const videos = picDoms
    .map((x) => x.querySelector("video"))
    .filter((x) => x !== null)
  i = 0
  for (const video of videos) {
    i += 1
    log(`${ infoString } 备份中……下载视频${ i }/${ videos.length }）`, "info", true)
    toSave = await handleMedia("video", video, blog, referer, toSave, options)
  }
  const m2 = rawHTML.match(/creativecommons.org\/licenses\/(.+?)\//)
  post.license = m2 === null ? undefined : m2[1]
  post.tags = dom.querySelectorAll(".tag").map((x) => x.text)

  const filename = `${ dataPath }/${ blog.id }-${ blog.username }/${ post.id }-${ escapeSpecials(post.title) }${
    post.timesSaved.length === 1 ? "" : `-${ post.timesSaved.length }`
  }.html`
  await window.tauri.writeFile({
    file: filename,
    contents: `<html>
<head>
<meta charset="utf-8">
<title>${ title }</title>
</head>
<body>${ toSave }</body>
</html>`
  })

  post.timesSaved.push(+new Date())
  await saveData({ posts: contextData.data.posts }, dataPath)
  log(`${ infoString } 完成备份。`, "success", true)
}

export const backupPosts = async (posts: PostEntry[], options: {
  skipRepeated?: boolean,
  allowFailure?: boolean,
  dataPath: string
}): Promise<boolean> => {
  const backupOptions = {
    allowFailure: options.allowFailure === undefined ? true : options.allowFailure,
    skipRepeated: options.skipRepeated === undefined ? true : options.skipRepeated,
    dataPath: options.dataPath
  }
  const { data, log } = contextData
  if (data === undefined || data.blogs === undefined) {
    log("没有数据信息", "error")
    return false
  }
  const n = posts.length
  let succeeded = 0
  let i = 0
  let failed = false
  for (const post of posts) {
    i += 1
    const blog = data.blogs[post.blogID]
    if (blog === undefined) {
      log(`(${ i }/${ n }) ${ post.title } 没有博客信息，跳过。`, "warning")
      continue
    }
    const infoString = `(${ i }/${ n }) <a rel="noreferrer" href="${ getPostUrl(post, blog)
    }" target="_blank">${ post.title }</a>`
    switch (post.type) {
      case PostType.Text:
      case PostType.Image:
      case PostType.Video:
        log(`${ infoString } 开始备份……`)
        try {
          await backupCommonPost(post, blog, infoString, backupOptions)
        } catch (e) {
          log(`${ infoString } 备份失败。错误信息：<br>${ e.toString() }`, "warning", true)
          if (!options.allowFailure) {
            failed = true
            break
          }
          continue
        }
        succeeded += 1
        break
      case PostType.Music:
      case PostType.LongText:
        log(`${ infoString } 暂时不支持备份的类型（${ showPostType(post.type) }），跳过`, "warning")
        continue
    }
  }
  log(`备份${ failed ? "失败" : "完成" }！共备份了 ${ n } 中的 ${ succeeded } 篇内容。`)
  return !failed
}
