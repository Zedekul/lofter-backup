import { IDDict } from "./utils"

export enum PostType {
  Text = 1,
  Image = 2,
  Music = 3,
  Video = 4,
  LongText = 6
}

export interface PostEntry {
  id: number
  blogID: number
  title: string
  type: PostType
  timeCreated: number
  license?: string
  tags: string[]
  numComments?: number
  hot?: number
  timeUpdated: number
  timesSaved: number[]
}

export interface BlogEntry {
  id: number
  username: string
  title: string
  timeUpdated: number
}

export interface SaveData {
  blogs?: IDDict<BlogEntry>
  posts?: IDDict<PostEntry>
}
