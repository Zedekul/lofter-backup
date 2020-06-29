use std::time::{SystemTime, UNIX_EPOCH};

use reqwest;
use regex::Regex;
use std::convert::TryInto;

pub type Result<T, E = anyhow::Error> = core::result::Result<T, E>;

pub fn get_current_time() -> u64 {
  SystemTime::now()
    .duration_since(UNIX_EPOCH)
    .expect("System time error")
    .as_millis().try_into().unwrap()
}


pub async fn get_html(url: &str) -> Result<String> {
  let client = reqwest::Client::new();
  let req = client.get(url)
    .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.97 Safari/537.36")
    .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8")
    .header("Acccept-language", "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7,ja-JP;q=0.6,ja;q=0.5,zh-TW;q=0.4,und;q=0.3,pt;q=0.2")
    .header("Connection", "keep-alive")
    .header("Sec-Fetch-Site", "cross-site")
    .header("Sec-Fetch-Mode", "no-cors")
    .header("Sec-Fetch-Dest", "image");
  let res = req.send()
    .await?;
  Ok(res.text().await?)
}

pub fn get_match(re: &str, string: &str) -> Option<String> {
  if let Some(captures) = &Regex::new(re).unwrap()
    .captures(string) {
    Some(captures[1].to_string())
  } else {
    None
  }
}
