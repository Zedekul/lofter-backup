use async_std::task::spawn;
use futures_channel::mpsc;
use futures_util::stream::StreamExt;
use serde::Deserialize;
use serde_json::Value;
use tauri::AppBuilder;
use tauri::{Handle, Result};

fn map_err<E: std::error::Error>(e: E) -> String {
  e.to_string()
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CallbackCmd<T> {
  #[serde(flatten)]
  cmd: T,
  callback: String,
  error: String,
}

struct Command<T>(T, Handle<()>);

pub trait AppBuilderExt {
  fn async_handler<C, F, Fut>(self, invoke_handler: F) -> Self
    where
      C: serde::de::DeserializeOwned + Send + 'static,
      F: FnMut(C) -> Fut + Send + 'static,
      Fut: std::future::Future<Output=Result<Value>> + Send;
  fn async_handler_concurrent<C, F, Fut>(self, limit: impl Into<Option<usize>>, invoke_handler: F) -> Self
    where
      C: serde::de::DeserializeOwned + Send + 'static,
      F: FnMut(C) -> Fut + Send + 'static,
      Fut: std::future::Future<Output=Result<Value>> + Send;
}

fn json_string(value: Value) -> String {
  serde_json::to_string(&value).expect("Failed to encode json")
}

fn execute_callback(handle: Handle<()>, result: Result<Value>, callback: String, error: String) {
  handle
    .dispatch(|webview| {
      Ok(tauri::execute_promise_sync(
        webview,
        || result.map(json_string),
        callback,
        error,
      ))
    })
    .expect("Failed to dispatch");
}

impl AppBuilderExt for AppBuilder {
  fn async_handler<C, F, Fut>(self, invoke_handler: F) -> Self
    where
      C: serde::de::DeserializeOwned + Send + 'static,
      F: FnMut(C) -> Fut + Send + 'static,
      Fut: std::future::Future<Output=Result<Value>> + Send,
  {
    self.async_handler_concurrent(1, invoke_handler)
  }
  fn async_handler_concurrent<C, F, Fut>(self, limit: impl Into<Option<usize>>, mut invoke_handler: F) -> Self
    where
      C: serde::de::DeserializeOwned + Send + 'static,
      F: FnMut(C) -> Fut + Send + 'static,
      Fut: std::future::Future<Output=Result<Value>> + Send
  {
    let limit = limit.into();
    let (mut tx, rx) = mpsc::channel::<Command<CallbackCmd<C>>>(1);

    spawn(async move {
      rx.for_each_concurrent(limit, move |command| {
        let Command(
          CallbackCmd {
            cmd,
            callback,
            error,
          },
          handle,
        ) = command;
        let fut = invoke_handler(cmd);
        async {
          execute_callback(handle, fut.await, callback, error);
        }
      }).await
    });
    self.invoke_handler(move |webview, arg| {
      let handle = webview.handle();
      let command: CallbackCmd<C> = serde_json::from_str(arg).map_err(map_err)?;
      if let Err(e) = tx.try_send(Command(command, handle.clone())) {
        let command = e.into_inner();
        execute_callback(handle, Err(anyhow::anyhow!("Failed to execute command")), command.0.callback, command.0.error);
      }
      Ok(())
    })
  }
}
