import Phaser from 'phaser'
import { Position } from '@shared/types'
import { GAME_CONFIG, TEAM } from '../config'
import { MapManager } from './MapManager'
import { UnitSprite } from '../entities/UnitSprite'

export type SelectionPhase = 'idle' | 'select_unit' | 'select_move' | 'select_target'

export class SelectionManager {
  private scene: Phaser.Scene
  private mapManager: MapManager
  private moveHighlights: Phaser.GameObjects.Polygon[] = []
  private attackHighlights: Phaser.GameObjects.Polygon[] = []
  private cursor: Phaser.GameObjects.Polygon
  cursorPos: Position = { col: 0, row: 0 }
  phase: SelectionPhase = 'idle'
  selectedUnit: UnitSprite | null = null
  reachableTiles: Position[] = []
  attackableTiles: Position[] = []

  constructor(scene: Phaser.Scene, mapManager: MapManager) {
    this.scene = scene
    this.mapManager = mapManager
    this.cursor = scene.add.polygon(0, 0, [
      0, -GAME_CONFIG.ISO_TILE_H / 2,
      GAME_CONFIG.ISO_TILE_W / 2, 0,
      0, GAME_CONFIG.ISO_TILE_H / 2,
      -GAME_CONFIG.ISO_TILE_W / 2, 0,
    ], 0xffffff, 0.15)
    this.cursor.setStrokeStyle(1, 0xffffff, 0.8)
    this.updateCursorPosition({ col: 0, row: 0 })
  }

  updateCursorPosition(pos: Position): void {
    this.cursorPos = pos
    const pixelPos = this.mapManager.tileToPixel(pos)
    this.cursor.setPosition(pixelPos.x, pixelPos.y)
  }

  clearHighlights(): void {
    this.moveHighlights.forEach(h => h.destroy())
    this.moveHighlights = []
    this.attackHighlights.forEach(h => h.destroy())
    this.attackHighlights = []
  }

  showMoveRange(tiles: Position[]): void {
    this.clearHighlights()
    this.reachableTiles = tiles
    const halfW = GAME_CONFIG.ISO_TILE_W / 2
    const halfH = GAME_CONFIG.ISO_TILE_H / 2
    for (const tile of tiles) {
      const pixelPos = this.mapManager.tileToPixel(tile)
      const p = this.scene.add.polygon(pixelPos.x, pixelPos.y, [0, -halfH, halfW, 0, 0, halfH, -halfW, 0], 0x4488ff, 0.25)
      p.setStrokeStyle(1, 0x4488ff, 0.5)
      this.moveHighlights.push(p)
    }
  }

  clearAttackRange(): void {
    this.attackHighlights.forEach(h => h.destroy())
    this.attackHighlights = []
    this.attackableTiles = []
  }

  showAttackRange(tiles: Position[]): void {
    this.attackableTiles = tiles
    const halfW = GAME_CONFIG.ISO_TILE_W / 2
    const halfH = GAME_CONFIG.ISO_TILE_H / 2
    for (const tile of tiles) {
      const pixelPos = this.mapManager.tileToPixel(tile)
      const p = this.scene.add.polygon(pixelPos.x, pixelPos.y, [0, -halfH, halfW, 0, 0, halfH, -halfW, 0], 0xff4444, 0.25)
      p.setStrokeStyle(1, 0xff4444, 0.5)
      this.attackHighlights.push(p)
    }
  }

  onUnitClicked(unitSprite: UnitSprite, occupied: Position[]): void {
    if (this.phase === 'idle' && unitSprite.unit.team === TEAM.PLAYER) {
      this.selectedUnit = unitSprite
      unitSprite.setSelected(true)
      const reachable = this.mapManager.getReachableTiles(unitSprite.pos, unitSprite.unit.moveRange, occupied)
      this.showMoveRange(reachable)
      this.phase = 'select_move'
    }
  }

  resetSelection(): void {
    this.clearHighlights()
    if (this.selectedUnit) {
      this.selectedUnit.setSelected(false)
      this.selectedUnit = null
    }
    this.phase = 'idle'
    this.reachableTiles = []
    this.attackableTiles = []
  }

  setCursorVisible(visible: boolean): void {
    this.cursor.setVisible(visible)
  }
}
