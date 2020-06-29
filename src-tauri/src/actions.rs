use serde_json::{json, Value};

use futures_util::StreamExt;

use reqwest;

use crate::utils::{Result, get_html};
use crate::utils;

use async_std::fs::File;
use async_std::prelude::*;

pub async fn get_blog_info(username: String) -> Result<Value> {
  let base_url = format!("https://{}.lofter.com", username);
  let home_html = get_html(base_url.as_str()).await?;
  let blog_id_str = utils::get_match(r"blogId=(\d+)", home_html.as_str());
  if blog_id_str == None {
    return Err(anyhow::anyhow!("No blog ID."));
  }
  let blog_id = blog_id_str.unwrap().parse::<i64>()?;
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
  let client = reqwest::Client::new();
  let req = client.post(url.as_str())
    .body(data)
    .header("Referer", format!("{}/view", base_url.as_str()))
    .header("Connection", "keep-alive")
    .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.97 Safari/537.36")
    .header("Content-Type", "text/plain")
    .header("Accept", "*/*")
    .header("Sec-Fetch-Site", "same-origin")
    .header("Sec-Fetch-Mode", "cors")
    .header("Sec-Fetch-Dest", "empty")
    .header("Accept-Language", "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7,\
          ja-JP;q=0.6,ja;q=0.5,zh-TW;q=0.4,und;q=0.3,pt;q=0.2");
  let res = req.send().await?;
  let content = res.text().await?;
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
  let client = reqwest::Client::new();
  let req = client.get(source.as_str())
    .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.97 Safari/537.36")
    .header("Accept", "image/webp,image/apng,image/*,*/*;q=0.8")
    .header("Acccept-language", "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7,ja-JP;q=0.6,ja;q=0.5,zh-TW;q=0.4,und;q=0.3,pt;q=0.2")
    .header("Connection", "keep-alive")
    .header("Sec-Fetch-Site", "cross-site")
    .header("Sec-Fetch-Mode", "no-cors")
    .header("Sec-Fetch-Dest", "image")
    .header("Referer", referer);
  let res = req.send()
    .await?;

  let mut stream = res.bytes_stream();

  let mut f = File::create(filename.as_str()).await?;
  while let Some(item) = stream.next().await {
    f.write_all(&item?).await?;
  }

  Ok(json!(filename))
}

pub async fn save_base64(filename: String, content: String) -> Result<Value> {
  let mut file = File::create(filename).await?;
  let content = base64::decode(content)?;
  file.write_all(&content).await?;
  Ok(json!(content.len()))
}
