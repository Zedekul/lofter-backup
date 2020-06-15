import { BlogEntry, PostType } from "./models"

export const cache: {
  blogs: { [key: number]: BlogEntry }
} = {
  blogs: {}
}

export const showTime = (time: Date) => `${
  time.getFullYear() }-${ time.getMonth() + 1 }-${ time.getDate() } ${
  time.getHours() }:${ time.getMinutes() }:${ time.getSeconds()
}`

export const showPostType = (type: PostType) => type === 1 ?
  "文字" : type === 2 ?
    "图片" : type === 3 ?
      "音乐" : type === 4 ?
        "视频" : type === 6 ? "长文章" : "未知"

