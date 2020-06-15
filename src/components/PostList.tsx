import React from "react"
import { PostEntry } from "../utils/models"

import { Post } from "./Post"


export const PostList: React.FC<{
  posts: PostEntry[], dataPath: string
}> = ({posts, dataPath}) => {
  const displayPosts = posts === undefined ? [] : posts.filter(() => true)
  return <div className="post-list">
    { displayPosts.map((post) => <Post post={ post }/>) }
  </div>
}
