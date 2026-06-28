import Phaser from 'phaser'
import { GAME_CONFIG, TERRAIN, TERRAIN_COLORS } from '../config'
import { TileData, Position } from '@shared/types'

export class MapManager {
  private scene: Phaser.Scene
  private tileSprites: Phaser.GameObjects.Graphics
  tiles: TileData[][] = []
  private halfW = GAME_CONFIG.ISO_TILE_W / 2
  private halfH = GAME_CONFIG.ISO_TILE_H / 2

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

  private isoToScreen(col: number, row: number): { x: number; y: number } {
    return {
      x: (col - row) * this.halfW + GAME_CONFIG.MAP_OFFSET_X,
      y: (col + row) * this.halfH + GAME_CONFIG.MAP_OFFSET_Y,
    }
  }

  private drawDiamond(g: Phaser.GameObjects.Graphics, cx: number, cy: number, fill: number, shade: number): void {
    const t = { x: cx, y: cy - this.halfH }
    const r = { x: cx + this.halfW, y: cy }
    const b = { x: cx, y: cy + this.halfH }
    const l = { x: cx - this.halfW, y: cy }

    g.fillStyle(fill, 1)
    g.fillPoints([new Phaser.Math.Vector2(t.x, t.y), new Phaser.Math.Vector2(r.x, r.y), new Phaser.Math.Vector2(b.x, b.y), new Phaser.Math.Vector2(l.x, l.y)], true)

    g.lineStyle(1, 0x000000, 0.3)
    g.strokePoints([new Phaser.Math.Vector2(t.x, t.y), new Phaser.Math.Vector2(r.x, r.y), new Phaser.Math.Vector2(b.x, b.y), new Phaser.Math.Vector2(l.x, l.y)], true)

    g.fillStyle(shade, 0.5)
    g.fillPoints([new Phaser.Math.Vector2(r.x, r.y), new Phaser.Math.Vector2(b.x, b.y), new Phaser.Math.Vector2(cx, cy)], true)

    g.fillStyle(fill, 0.3)
    g.fillPoints([new Phaser.Math.Vector2(l.x, l.y), new Phaser.Math.Vector2(t.x, t.y), new Phaser.Math.Vector2(cx, cy)], true)
  }

  render(): void {
    const g = this.tileSprites
    g.clear()
    const depthOrder: { col: number; row: number }[] = []
    for (let row = 0; row < GAME_CONFIG.MAP_ROWS; row++) {
      for (let col = 0; col < GAME_CONFIG.MAP_COLS; col++) {
        depthOrder.push({ col, row })
      }
    }
    depthOrder.sort((a, b) => (a.col + a.row) - (b.col + b.row))

    for (const p of depthOrder) {
      const tile = this.tiles[p.row][p.col]
      const pos = this.isoToScreen(p.col, p.row)
      const info = TERRAIN_COLORS[tile.terrain]
      this.drawDiamond(g, pos.x, pos.y, info.fill, info.shade)
    }
  }

  tileToPixel(pos: Position): { x: number; y: number } {
    return this.isoToScreen(pos.col, pos.row)
  }

  pixelToTile(x: number, y: number): Position {
    const relX = x - GAME_CONFIG.MAP_OFFSET_X
    const relY = y - GAME_CONFIG.MAP_OFFSET_Y
    const col = (relX / this.halfW + relY / this.halfH) / 2
    const row = (relY / this.halfH - relX / this.halfW) / 2
    return { col: Math.round(col), row: Math.round(row) }
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
