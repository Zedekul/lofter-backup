import { BlogEntry, PostEntry, PostType } from "./models"
import { contextData } from "./context"
import { escapeSpecials, saveData, showPostType, tryMatch } from "./utils"
import { invoke } from "./tauri"
import { parse as parseHTML } from "node-html-parser"

export interface BackupOptions {
  allowFailure: boolean
  skipRepeated: boolean
  skipImages: boolean
  skipVideos: boolean
  dataPath: string
}

const getBlogDirectory = (blog: BlogEntry, dataPath: string) => `${ dataPath }/${ blog.id }-${ blog.username }`

export const getPostUrl = (post: PostEntry, blog: BlogEntry) => `https://${
  blog.username }.lofter.com/post/${ blog.id.toString(16) }_${ post.id.toString(16) }`

export const handleMedia = async (
  mediaType: "image" | "video", source: string,
  blog: BlogEntry, referer: string, toSave: string,
  options: BackupOptions
): Promise<string> => {
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

export class JobCancellation extends Error {
  public isJobCancellation = true

  constructor() {
    super("Job cancelled.")
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

const checkCancelJob = () => {
  if (contextData.isCancelling) {
    throw new JobCancellation()
  }
}

export const backupCommonPost = async (post: PostEntry, blog: BlogEntry, infoString: string, options: BackupOptions) => {
  const log = contextData.log
  const dataPath = options.dataPath
  checkCancelJob()
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
  let content = dom.querySelector(".g-bd")
  if (content === null) {
    content = dom.querySelector(".main")
  }
  if (content === null) {
    throw new Error("未知错误。")
  }
  const titleDom = dom.querySelector("title")
  const title = titleDom === null ? `${ post.title } - ${ blog.title }` : titleDom.text
  await window.tauri.createDir(`${ getBlogDirectory(blog, dataPath) }/images`, { recursive: true })
  await window.tauri.createDir(`${ getBlogDirectory(blog, dataPath) }/videos`, { recursive: true })
  let toSave = content.innerHTML
  const referer = getPostUrl(post, blog)
  const images = new Set(content
    .querySelectorAll("img")
    .map((x) => x.getAttribute("src"))
    .filter((x) => x !== undefined)) as Set<string>
  if (!options.skipImages) {
    let i = 0
    for (const image of images) {
      checkCancelJob()
      i += 1
      log(`${ infoString } 备份中……下载图片（${ i }/${ images.size }）`, "info", true)
      toSave = await handleMedia("image", image, blog, referer, toSave, options)
    }
  }
  const videos = new Set(content
    .querySelectorAll("video")
    .map((x) => x.getAttribute("src"))
    .filter((x) => x !== undefined)) as Set<string>
  if (!options.skipVideos) {
    let i = 0
    for (const video of videos) {
      checkCancelJob()
      i += 1
      log(`${ infoString } 备份中……下载视频${ i }/${ videos.size }）`, "info", true)
      toSave = await handleMedia("video", video, blog, referer, toSave, options)
    }
  }
  checkCancelJob()

  const filename = `${ dataPath }/${ blog.id }-${ blog.username }/${ post.id }-${ escapeSpecials(post.title) }${
    post.timesSaved.length === 1 ? "" : `-${ post.timesSaved.length }`
  }.html`
  await window.tauri.writeFile({
    file: filename,
    contents: `<html lang="zh">
<head>
<meta charset="utf-8">
<title>${ title }</title>
</head>
<body>${ toSave }</body>
</html>`
  })

  post.license = tryMatch(/creativecommons.org\/licenses\/(.+?)\//, rawHTML)
  post.tags = dom.querySelectorAll(".tag").map((x) => x.text)
  const numComments = tryMatch(/评论\((\d+?)\)/, rawHTML)
  post.numComments = numComments === undefined ? undefined : parseInt(numComments)
  const hot = tryMatch(/热度\((\d+?)\)/, rawHTML)
  post.hot = hot === undefined ? undefined : parseInt(hot)

  post.timesSaved.push(+new Date())
  await saveData({ posts: contextData.data.posts }, dataPath)
  let skipped = options.skipImages && images.size > 0 ? `${ images.size } 张图片` : ""
  skipped += options.skipVideos && videos.size > 0 ? `${
    skipped.length > 0 ? "和 " : ""
  }${ videos.size } 个视频` : ""
  log(`${ infoString } 完成备份。${
    skipped.length > 0 ? `跳过了 ${ skipped }。` : ""
  }`, "success", true)
}

export const backupPosts = async (posts: PostEntry[], options: BackupOptions) => {
  const { data, log } = contextData
  if (data === undefined || data.blogs === undefined) {
    log("没有数据信息", "error")
    return
  }
  const n = posts.length
  let succeeded = 0
  let i = 0
  let err: Error | null = null
  let shouldStop = false
  for (const post of posts) {
    if (shouldStop) {
      break
    }
    shouldStop = false
    checkCancelJob()
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
          await backupCommonPost(post, blog, infoString, options)
        } catch (e) {
          if (e.isJobCancellation) {
            err = e
            shouldStop = true
            continue
          }
          (window as any).error = e
          log(`${ infoString } 备份失败。错误信息：<br>${ e.toString() }`, options.allowFailure ? "warning" : "error", true)
          if (!options.allowFailure) {
            err = e
            shouldStop = true
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
  log(`备份${ err === null ? "完成" : "失败" }！共备份了 ${ n } 中的 ${ succeeded } 篇内容。`)
  if (err !== null) {
    throw err
  }
}
