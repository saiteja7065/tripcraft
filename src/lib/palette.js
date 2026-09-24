// Every destination gets its own sunset. The name is hashed to pick one of a
// few hand-picked gradients - picked by hand because fully random hues landed
// on muddy greens that didn't look like travel at all. Same name, same card.

const PALETTES = [
  ['#ff5a4e', '#ffa62b'], // coral to amber
  ['#e0457b', '#ff8a3d'], // magenta to orange
  ['#7b4dff', '#ff5fa2'], // violet to pink
  ['#2f44c9', '#17b3a6'], // dusk blue to lagoon
  ['#f0506e', '#ffb07a'], // rose to peach
  ['#8a3dc9', '#ff6a5c'], // plum to coral
  ['#1b6fd1', '#35c9d9'], // ocean
  ['#d9381e', '#f5a524'], // desert
]

function hash(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function destinationPalette(name = '') {
  const [from, to] = PALETTES[hash(name.trim().toLowerCase() || 'trip') % PALETTES.length]
  return { from, to }
}
