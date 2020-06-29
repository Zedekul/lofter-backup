use serde::Deserialize;

#[derive(Deserialize)]
#[serde(tag = "cmd", rename_all = "camelCase")]
pub enum Cmd {
  // your custom commands
  // multiple arguments are allowed
  // note that rename_all = "camelCase": you need to use "myCustomCommand" on JS
  GetBlogInfo {
    username: String,
  },
  GetPostList {
    username: String,
    blog_id: i64,
  },
  GetPost {
    username: String,
    blog_id: i64,
    post_id: i64,
  },
  DownloadFile {
    source: String,
    filename: String,
    referer: String,
  },
  SaveBase64 {
    content: String,
    filename: String,
  },
}
