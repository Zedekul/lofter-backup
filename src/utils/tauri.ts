declare global {
  interface Window {
    tauri: {
      invoke(args: {
        cmd: string
        [key: string]: any
      }): void

      transformCallback(callback: Function, once?: boolean): Function

      promisified<T>(args: object): Promise<T>

      open(url: string): void

      setTitle(title: string): void

      openDialog(options?: {
        filter?: string, defaultPath?: string, multiple?: boolean, directory?: boolean
      }): Promise<string | string[]>

      saveDialog(options?: {
        filter?: string, defaultPath?: string
      }): Promise<string>

      createDir(dir: string, options?: { recursive: boolean }): Promise<void>

      writeFile(file: {
        file: string,
        contents: string
      }, options?: {
        dir?: BaseDirectory
      }): Promise<void>

      readTextFile(filePath: string, options?: { dir?: BaseDirectory }): Promise<string>
    }
  }
}

export function invoke<T = void>(cmd: string, args: { [key: string]: any } = {}): Promise<T> {
  args.cmd = cmd
  return window.tauri.promisified<T>(args)
}

export enum BaseDirectory {
  Audio = 1,
  Cache = 2,
  Config = 3,
  Data = 4,
  LocalData = 5,
  Desktop = 6,
  Document = 7,
  Download = 8,
  Executable = 9,
  Font = 10,
  Home = 11,
  Picture = 12,
  Public = 13,
  Runtime = 14,
  Template = 15,
  Video = 16,
  Resource = 17,
  App = 18
}
