// @ts-ignore
import globalCss from 'bundle-text:./global.css'

insertStyle(globalCss)

export function insertStyle(css: string) {
  const head = document.head
  const style = document.createElement('style')
  head.appendChild(style)
  style.type = 'text/css'
  style.appendChild(document.createTextNode(css))
  return () => {
    head.removeChild(style)
  }
}
