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
  try {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    triggerDownload(url, filename)
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
  } catch (err) {
    console.error('Failed to download text:', err)
  }
}

export async function downloadNodeAsPng(node: HTMLElement, filename = 'miascii.png') {
  try {
    const computed = getComputedStyle(node)
    const bg = computed.backgroundColor && computed.backgroundColor !== 'rgba(0, 0, 0, 0)'
      ? computed.backgroundColor
      : (getComputedStyle(document.body).backgroundColor || '#0a0a0a')

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
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
    }, 'image/png')
  } catch (err) {
    console.error('Failed to download PNG:', err)
  }
}

function triggerDownload(url: string, filename: string) {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  // Clean up element after dispatching click
  setTimeout(() => {
    if (a.parentNode) a.parentNode.removeChild(a)
  }, 100)
}
