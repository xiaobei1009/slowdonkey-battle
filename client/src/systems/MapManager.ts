import Phaser from 'phaser'
import { GAME_CONFIG, TERRAIN, TERRAIN_COLORS } from '../config'
import { TileData, Position } from '@shared/types'

export class MapManager {
  private scene: Phaser.Scene
  private tileSprites: Phaser.GameObjects.Graphics
  tiles: TileData[][] = []

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.tileSprites = scene.add.graphics()
  }

  generateFixedMap(): void {
    this.tiles = []
    for (let row = 0; row < GAME_CONFIG.MAP_ROWS; row++) {
      const rowTiles: TileData[] = []
      for (let col = 0; col < GAME_CONFIG.MAP_COLS; col++) {
        let terrain: number = TERRAIN.PLAIN
        if (row < 2 && col > 5 && col < 14) terrain = TERRAIN.WATER
        if (row > 11 && col > 5 && col < 14) terrain = TERRAIN.WATER
        if (col >= 9 && col <= 10 && row >= 4 && row <= 6) terrain = TERRAIN.HIGH
        if (col >= 9 && col <= 10 && row >= 8 && row <= 10) terrain = TERRAIN.HIGH
        if ((col === 4 || col === 15) && row >= 5 && row <= 9) terrain = TERRAIN.WALL
        if (row === 7 && col >= 4 && col <= 7) terrain = TERRAIN.WALL
        rowTiles.push({ terrain, position: { col, row } })
      }
      this.tiles.push(rowTiles)
    }
  }

  render(): void {
    const g = this.tileSprites
    g.clear()
    for (let row = 0; row < GAME_CONFIG.MAP_ROWS; row++) {
      for (let col = 0; col < GAME_CONFIG.MAP_COLS; col++) {
        const tile = this.tiles[row][col]
        const x = col * GAME_CONFIG.TILE_SIZE
        const y = row * GAME_CONFIG.TILE_SIZE
        const color = TERRAIN_COLORS[tile.terrain].fill

        g.fillStyle(color, 1)
        g.fillRect(x, y, GAME_CONFIG.TILE_SIZE, GAME_CONFIG.TILE_SIZE)

        g.lineStyle(1, 0x000000, 0.2)
        g.strokeRect(x, y, GAME_CONFIG.TILE_SIZE, GAME_CONFIG.TILE_SIZE)
      }
    }
  }

  tileToPixel(pos: Position): { x: number; y: number } {
    return {
      x: pos.col * GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SIZE / 2,
      y: pos.row * GAME_CONFIG.TILE_SIZE + GAME_CONFIG.TILE_SIZE / 2,
    }
  }

  pixelToTile(x: number, y: number): Position {
    return {
      col: Math.floor(x / GAME_CONFIG.TILE_SIZE),
      row: Math.floor(y / GAME_CONFIG.TILE_SIZE),
    }
  }

  isWalkable(pos: Position): boolean {
    if (pos.row < 0 || pos.row >= GAME_CONFIG.MAP_ROWS || pos.col < 0 || pos.col >= GAME_CONFIG.MAP_COLS) return false
    const tile = this.tiles[pos.row][pos.col]
    return tile.terrain !== TERRAIN.WATER && tile.terrain !== TERRAIN.WALL
  }

  isWithinBounds(pos: Position): boolean {
    return pos.row >= 0 && pos.row < GAME_CONFIG.MAP_ROWS && pos.col >= 0 && pos.col < GAME_CONFIG.MAP_COLS
  }

  getTile(pos: Position): TileData | null {
    if (!this.isWithinBounds(pos)) return null
    return this.tiles[pos.row][pos.col]
  }

  getDistance(a: Position, b: Position): number {
    return Math.abs(a.col - b.col) + Math.abs(a.row - b.row)
  }

  findPath(start: Position, end: Position, occupied: Position[]): Position[] {
    const openSet: { pos: Position; f: number; g: number; parent: Position | null }[] = []
    const closedSet = new Set<string>()

    const key = (p: Position) => `${p.col},${p.row}`
    const occupiedSet = new Set(occupied.filter(p => p.col !== start.col || p.row !== start.row).map(key))

    openSet.push({ pos: start, f: 0, g: 0, parent: null })

    while (openSet.length > 0) {
      openSet.sort((a, b) => a.f - b.f)
      const current = openSet.shift()!

      if (current.pos.col === end.col && current.pos.row === end.row) {
        const path: Position[] = []
        let node: typeof current | null = current
        while (node) {
          path.unshift(node.pos)
          node = openSet.find(n => n.pos === node!.pos) || null
          const parent = node?.parent
          node = openSet.find(n => n.pos.col === parent?.col && n.pos.row === parent?.row) || null
        }
        return path
      }

      closedSet.add(key(current.pos))

      const neighbors = [
        { col: current.pos.col + 1, row: current.pos.row },
        { col: current.pos.col - 1, row: current.pos.row },
        { col: current.pos.col, row: current.pos.row + 1 },
        { col: current.pos.col, row: current.pos.row - 1 },
      ]

      for (const n of neighbors) {
        if (!this.isWalkable(n) || closedSet.has(key(n)) || occupiedSet.has(key(n))) continue

        const g = current.g + 1
        const h = Math.abs(n.col - end.col) + Math.abs(n.row - end.row)
        const f = g + h

        const existing = openSet.find(o => o.pos.col === n.col && o.pos.row === n.row)
        if (existing) {
          if (g < existing.g) {
            existing.g = g
            existing.f = f
            existing.parent = current.pos
          }
        } else {
          openSet.push({ pos: n, f, g, parent: current.pos })
        }
      }
    }

    return []
  }

  getReachableTiles(pos: Position, range: number, occupied: Position[]): Position[] {
    const result: Position[] = []
    const occupiedSet = new Set(occupied.map(p => `${p.col},${p.row}`))

    for (let dr = -range; dr <= range; dr++) {
      for (let dc = -range; dc <= range; dc++) {
        const dist = Math.abs(dr) + Math.abs(dc)
        if (dist > range || dist === 0) continue
        const p: Position = { col: pos.col + dc, row: pos.row + dr }
        if (this.isWalkable(p) && !occupiedSet.has(`${p.col},${p.row}`)) {
          result.push(p)
        }
      }
    }

    return result
  }
}
