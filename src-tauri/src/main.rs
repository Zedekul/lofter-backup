#![cfg_attr(
all(not(debug_assertions), target_os = "windows"),
windows_subsystem = "windows"
)]

mod async_handler;
mod cmd;
mod actions;
mod utils;

use async_handler::AppBuilderExt;

fn main() {
  tauri::AppBuilder::new()
    .async_handler(|cmd: cmd::Cmd| async {
      use cmd::Cmd::*;
      Ok(match cmd {
        GetBlogInfo { username } => {
          actions::get_blog_info(username).await?
        }
        GetPostList { username, blog_id } => {
          actions::get_post_list(username, blog_id).await?
        }
        GetPost { username, blog_id, post_id } => {
          actions::get_post(username, blog_id, post_id).await?
        }
        DownloadFile { source, filename, referer } => {
          actions::download_file(source, filename, referer).await?
        }
        Test {} => {
          actions::test().await?
        }
      })
    })
    .build()
    .run();
}
