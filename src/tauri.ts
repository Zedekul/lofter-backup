declare global {
  interface Window {
    tauri: {
      invoke(args: {
        cmd: string
        [key: string]: any
      }): void

      transformCallback(callback: Function, once?: boolean): Function

      promisified<T>(args: object): Promise<T>

      setTitle(title: string): void

      openDialog(options?: {
        filter?: string, defaultPath?: string, multiple?: boolean, directory?: boolean
      }): Promise<string | string[]>

      createDir(dir: string, options?: { recursive: boolean }): Promise<void>

      writeFile(file: {
        file: string,
        contents: string
      }, options?: {
        dir?: string
      }): Promise<void>

      readTextFile(filePath: string): Promise<string>
    }
  }
}

export function invoke<T = void>(cmd: string, args: { [key: string]: any } = {}): Promise<T> {
  args.cmd = cmd
  return window.tauri.promisified<T>(args)
}
