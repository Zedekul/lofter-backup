#![cfg_attr(
all(not(debug_assertions), target_os = "windows"),
windows_subsystem = "windows"
)]

mod async_handler;
mod cmd;
mod actions;
mod utils;

use async_handler::AppBuilderExt;
use std::fs;

fn main() {
  let app_dir = tauri_api::path::app_dir()
    .expect("There is no app directory.");
  fs::create_dir_all(app_dir.as_path())
    .expect(&format!("Cannot create the config directory: {:?}", app_dir));
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
        SaveBase64 { filename, content } => {
          actions::save_base64(filename, content).await?
        }
      })
    })
    .build()
    .run();
}
