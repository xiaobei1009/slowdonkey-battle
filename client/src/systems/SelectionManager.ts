import Phaser from 'phaser'
import { Position } from '@shared/types'
import { GAME_CONFIG, TEAM } from '../config'
import { MapManager } from './MapManager'
import { UnitSprite } from '../entities/UnitSprite'

export type SelectionPhase = 'idle' | 'select_unit' | 'select_move' | 'select_target'

export class SelectionManager {
  private scene: Phaser.Scene
  private mapManager: MapManager
  private moveHighlights: Phaser.GameObjects.Rectangle[] = []
  private attackHighlights: Phaser.GameObjects.Rectangle[] = []
  private cursor: Phaser.GameObjects.Rectangle
  cursorPos: Position = { col: 0, row: 0 }
  phase: SelectionPhase = 'idle'
  selectedUnit: UnitSprite | null = null
  reachableTiles: Position[] = []
  attackableTiles: Position[] = []

  constructor(scene: Phaser.Scene, mapManager: MapManager) {
    this.scene = scene
    this.mapManager = mapManager
    this.cursor = scene.add.rectangle(0, 0, GAME_CONFIG.TILE_SIZE, GAME_CONFIG.TILE_SIZE, 0xffffff, 0.2)
    this.cursor.setStrokeStyle(2, 0xffffff, 0.8)
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
    for (const tile of tiles) {
      const pixelPos = this.mapManager.tileToPixel(tile)
      const rect = this.scene.add.rectangle(pixelPos.x, pixelPos.y, GAME_CONFIG.TILE_SIZE, GAME_CONFIG.TILE_SIZE, 0x4488ff, 0.25)
      rect.setStrokeStyle(1, 0x4488ff, 0.5)
      this.moveHighlights.push(rect)
    }
  }

  showAttackRange(tiles: Position[]): void {
    this.attackableTiles = tiles
    for (const tile of tiles) {
      const pixelPos = this.mapManager.tileToPixel(tile)
      const rect = this.scene.add.rectangle(pixelPos.x, pixelPos.y, GAME_CONFIG.TILE_SIZE, GAME_CONFIG.TILE_SIZE, 0xff4444, 0.25)
      rect.setStrokeStyle(1, 0xff4444, 0.5)
      this.attackHighlights.push(rect)
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

  onTileClicked(pos: Position, unitSprites: UnitSprite[]): boolean {
    if (this.phase === 'select_move') {
      const isReachable = this.reachableTiles.some(t => t.col === pos.col && t.row === pos.row)
      if (!isReachable) return false

      const unitAtTile = unitSprites.find(u => u.pos.col === pos.col && u.pos.row === pos.row && u.unit.team === TEAM.PLAYER && u !== this.selectedUnit)
      if (unitAtTile) return false

      this.selectedUnit!.setPosition(pos, this.mapManager)
      this.clearHighlights()
      this.phase = 'select_target'
      return true
    }
    return false
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
