use serde_json::{json, Value};

use surf::{post, get};

use crate::utils::{Result, RequestExt, map_err, get_html};
use crate::utils;
use std::path::{Path, PathBuf};
use std::fs;
use std::fs::File;
use std::io::Write;
use std::borrow::Borrow;

pub async fn get_blog_info(username: String) -> Result<Value> {
  let base_url = format!("https://{}.lofter.com", username);
  let home_html = get_html(base_url.as_str()).await?;
  let blog_id = utils::get_match(r"blogId=(\d+)", home_html.as_str())
    .expect("No blog ID").parse::<i64>()?;
  let title = utils::get_match(r"<title>(.*)</title>", home_html.as_str()).expect("No title");
  Ok(json!({
    "username": username,
    "id": blog_id,
    "title": title
  }))
}

pub async fn get_post_list(username: String, blog_id: i64) -> Result<Value> {
  let base_url = format!("https://{}.lofter.com", username);
  let url = format!("{}/dwr/call/plaincall/ArchiveBean.getArchivePostByTime.dwr", base_url.as_str());
  let data = format!("callCount=1
scriptSessionId=${{scriptSessionId}}187
httpSessionId=
c0-scriptName=ArchiveBean
c0-methodName=getArchivePostByTime
c0-id=0
c0-param0=boolean:false
c0-param1=number:{}
c0-param2=number:{}
c0-param3=number:10000
c0-param4=boolean:false
batchId=461032", blog_id, utils::get_current_time());
  let req = post(url)
    .body_bytes(data.as_bytes())
    .set_headers(Some(format!("{}/view", base_url.as_str())));
  let mut res = req.await.map_err(map_err)?;
  let content = res.body_string().await.map_err(map_err)?;
  Ok(json!(content))
}

pub async fn get_post(
  username: String, blog_id: i64, post_id: i64,
) -> Result<Value> {
  let base_url = format!("https://{}.lofter.com", username);
  let post_url = format!(
    "{}/post/{:x}_{:x}",
    base_url.as_str(),
    blog_id,
    post_id
  );
  let raw_html = get_html(post_url.as_str()).await?;

  Ok(json!(raw_html))
}

pub async fn download_file(
  source: String, filename: String,
  referer: String,
) -> Result<Value> {
  let bytes = get(source)
    .set_header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) \
        AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.97 Safari/537.36")
    .set_header("Referer", referer)
    .await.map_err(map_err)?
    .body_bytes()
    .await.map_err(map_err)?;

  let mut f = File::create(filename.as_str())?;
  f.write_all(bytes.as_slice())?;
  f.sync_all()?;
  Ok(json!(filename))
}

pub async fn test() -> Result<Value> {
  let source = "https://imglf6.nosdn0.126.net/img/V3poaXNQbGhtcENqUHYxM3FOYnlKcWtFUzMwSW9iQ1lyUHdWU290VEtXTlFZRGJEM0kxU2pRPT0.jpg?imageView&thumbnail=1680x0&quality=96&stripmeta=0&type=jpg";
  let filename = "../build/a.jpg";
  let mut response = get(source)
    .set_header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.97 Safari/537.36")
    .set_header("Accept", "image/webp,image/apng,image/*,*/*;q=0.8")
    .set_header("Acccept-language", "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7,ja-JP;q=0.6,ja;q=0.5,zh-TW;q=0.4,und;q=0.3,pt;q=0.2")
    .set_header("Connection", "keep-alive")
    .set_header("Sec-Fetch-Site", "cross-site")
    .set_header("Sec-Fetch-Mode", "no-cors")
    .set_header("Sec-Fetch-Dest", "image")
    .set_header("Referer", "https://radiowavekabe.lofter.com/post/179549_1c9a44a02")
    .await.map_err(map_err)?;

  dbg!(&response);

  let bytes = response.body_bytes()
    .await.map_err(map_err)?;

  let mut f = File::create(filename)?;
  f.write_all(bytes.as_slice())?;
  f.sync_all()?;

  Ok(json!(true))
}
