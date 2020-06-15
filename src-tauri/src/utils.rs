use std::time::{SystemTime, UNIX_EPOCH};

use surf::{Request, get};
use surf::middleware::HttpClient;
use regex::Regex;
use std::fs::File;
use std::io::Write;
use std::path::PathBuf;
use std::convert::TryInto;

pub type Result<T, E = anyhow::Error> = core::result::Result<T, E>;

pub fn map_err<E: ToString>(e: E) -> anyhow::Error { anyhow::anyhow!(e.to_string()) }

pub trait RequestExt {
  fn set_headers(self, referer: Option<impl AsRef<str>>) -> Self;
}

impl<C: HttpClient> RequestExt for Request<C> {
  fn set_headers(self, referer: Option<impl AsRef<str>>) -> Self {
    if let Some(x) = referer {
      self.set_header("Referer", x)
    } else {
      self
    }.set_header("Connection", "keep-alive")
      .set_header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) \
        AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.97 Safari/537.36")
      .set_header("Content-Type", "text/plain")
      .set_header("Accept", "*/*")
      .set_header("Sec-Fetch-Site", "same-origin")
      .set_header("Sec-Fetch-Mode", "cors")
      .set_header("Sec-Fetch-Dest", "empty")
      .set_header("Accept-Language", "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7,\
          ja-JP;q=0.6,ja;q=0.5,zh-TW;q=0.4,und;q=0.3,pt;q=0.2")
  }
}

pub fn get_current_time() -> u64 {
  SystemTime::now()
    .duration_since(UNIX_EPOCH)
    .expect("System time error")
    .as_millis().try_into().unwrap()
}

pub async fn get_html(url: &str) -> Result<String> {
  Ok(
    get(url)
      .set_headers(Some(url))
      .await.map_err(map_err)?
      .body_string()
      .await.map_err(map_err)?)
}

pub fn get_match(re: &str, string: &str) -> Option<String> {
  if let Some(captures) = &Regex::new(re).unwrap()
    .captures(string) {
    Some(captures[1].to_string())
  } else {
    None
  }
}

pub fn write_file(filename: PathBuf, content: &str) -> Result<()> {
  let mut f = File::create(filename)?;
  f.write_all(content.as_bytes())?;
  f.sync_all()?;
  Ok(())
}
