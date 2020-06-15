import React, { useState } from "react"

import { PostEntry } from "../utils/models"
import { showPostType, showTime } from "../utils/utils"


export const Post: React.FC<{ post: PostEntry }> = ({post}) => {
  const [closed, toggle] = useState(true)
  return <div className={ `post-item${ post.backedUp ? " post-item-done" : "" }` }
              onClick={ () => toggle(x => !x) }>
    <div className="post-id">{ post.id }</div>
    <div className="post-time">{ showTime(new Date(post.timeCreated)) }</div>
    <div className="post-title">{ post.title }</div>
    <div className="post-type">{ showPostType(post.type) }</div>
    { closed ? [] : <div/> }
  </div>
}
