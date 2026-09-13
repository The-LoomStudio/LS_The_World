/**
 * Small Web Audio adapter for The World ambient tracks.
 * The caller owns the AudioContext and supplies resolved asset URLs.
 */
export function createAmbientAudioController(audioContext) {
  let active = null
  return {
    async set(track) {
      if (!track) {
        await stop(active)
        active = null
        return { action: 'stop' }
      }
      if (active?.id === track.id && active.url === track.url) return { action: 'noop', id: track.id }
      await stop(active)
      const element = new Audio(track.url)
      element.loop = true
      element.preload = 'auto'
      const source = audioContext.createMediaElementSource(element)
      const gain = audioContext.createGain()
      gain.gain.value = Math.max(0, Math.min(1, track.volume ?? 1))
      source.connect(gain).connect(audioContext.destination)
      await element.play()
      active = { id: track.id, url: track.url, element, source, gain }
      return { action: 'start', id: track.id }
    },
    async stop() {
      await stop(active)
      active = null
      return { action: 'stop' }
    },
    current() {
      return active ? { id: active.id, url: active.url } : null
    },
  }
}

async function stop(track) {
  if (!track) return
  track.element.pause()
  track.element.currentTime = 0
  track.source.disconnect()
  track.gain.disconnect()
}
