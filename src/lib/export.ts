import html2canvas from 'html2canvas'

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export function downloadText(text: string, filename = 'miascii.txt') {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  triggerDownload(url, filename)
  URL.revokeObjectURL(url)
}

export async function downloadNodeAsPng(node: HTMLElement, filename = 'miascii.png') {
  const bg = getComputedStyle(document.body).backgroundColor
  const canvas = await html2canvas(node, {
    backgroundColor: bg,
    scale: 2,
    logging: false,
    useCORS: true,
  })
  canvas.toBlob((blob) => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    triggerDownload(url, filename)
    URL.revokeObjectURL(url)
  }, 'image/png')
}

function triggerDownload(url: string, filename: string) {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}
