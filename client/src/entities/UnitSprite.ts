import Phaser from 'phaser'
import { UnitData, Position } from '@shared/types'
import { GAME_CONFIG, TEAM } from '../config'
import { MapManager } from '../systems/MapManager'

export class UnitSprite {
  scene: Phaser.Scene
  unit: UnitData
  pos: Position
  container: Phaser.GameObjects.Container
  sprite: Phaser.GameObjects.Rectangle
  hpBar: Phaser.GameObjects.Rectangle
  hpBarBg: Phaser.GameObjects.Rectangle
  nameText: Phaser.GameObjects.Text
  selectedIndicator: Phaser.GameObjects.Polygon

  constructor(scene: Phaser.Scene, unit: UnitData, pos: Position, mapManager: MapManager) {
    this.scene = scene
    this.unit = unit
    this.pos = pos

    const pixelPos = mapManager.tileToPixel(pos)
    const halfH = GAME_CONFIG.ISO_TILE_H / 2
    const size = Math.min(GAME_CONFIG.ISO_TILE_W - 4, GAME_CONFIG.TILE_SIZE - 4)
    const color = unit.team === TEAM.PLAYER ? 0x3a7bd5 : 0xb83030

    this.selectedIndicator = scene.add.polygon(pixelPos.x, pixelPos.y, [
      0, -GAME_CONFIG.ISO_TILE_H / 2 - 2,
      GAME_CONFIG.ISO_TILE_W / 2 + 2, 0,
      0, GAME_CONFIG.ISO_TILE_H / 2 + 2,
      -GAME_CONFIG.ISO_TILE_W / 2 - 2, 0,
    ], 0xffff00, 0.35)
    this.selectedIndicator.setVisible(false)

    this.sprite = scene.add.rectangle(pixelPos.x, pixelPos.y, size, size, color)
    this.sprite.setStrokeStyle(2, 0x000000, 1)

    const barWidth = GAME_CONFIG.ISO_TILE_W + 4
    const barHeight = 4
    const barY = pixelPos.y - halfH - 6

    this.hpBarBg = scene.add.rectangle(pixelPos.x, barY, barWidth, barHeight, 0x333333)
    this.hpBar = scene.add.rectangle(pixelPos.x - barWidth / 2 * (1 - unit.hp / unit.maxHp), barY, barWidth * (unit.hp / unit.maxHp), barHeight, 0x44ff44)

    this.nameText = scene.add.text(pixelPos.x, pixelPos.y + halfH + 6, unit.name, {
      fontSize: '10px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5)

    this.container = scene.add.container(0, 0, [
      this.selectedIndicator,
      this.sprite,
      this.nameText,
      this.hpBarBg,
      this.hpBar,
    ])
  }

  setPosition(pos: Position, mapManager: MapManager): void {
    this.pos = pos
    const pixelPos = mapManager.tileToPixel(pos)
    const halfH = GAME_CONFIG.ISO_TILE_H / 2

    this.sprite.setPosition(pixelPos.x, pixelPos.y)
    this.selectedIndicator.setPosition(pixelPos.x, pixelPos.y)

    const barWidth = GAME_CONFIG.ISO_TILE_W + 4
    const barHeight = 4
    const barY = pixelPos.y - halfH - 6
    this.hpBarBg.setPosition(pixelPos.x, barY)
    this.hpBar.setPosition(pixelPos.x - barWidth / 2 * (1 - this.unit.hp / this.unit.maxHp), barY)
    this.hpBar.setSize(barWidth * (this.unit.hp / this.unit.maxHp), barHeight)

    this.nameText.setPosition(pixelPos.x, pixelPos.y + halfH + 6)
  }

  updateHp(): void {
    const barWidth = GAME_CONFIG.ISO_TILE_W + 4
    const barHeight = 4
    this.hpBar.setSize(barWidth * (this.unit.hp / this.unit.maxHp), barHeight)

    if (this.unit.hp / this.unit.maxHp > 0.5) {
      this.hpBar.setFillStyle(0x44ff44)
    } else if (this.unit.hp / this.unit.maxHp > 0.25) {
      this.hpBar.setFillStyle(0xffaa00)
    } else {
      this.hpBar.setFillStyle(0xff4444)
    }
  }

  setSelected(selected: boolean): void {
    this.selectedIndicator.setVisible(selected)
  }

  flashDamage(): void {
    this.scene.tweens.add({
      targets: this.sprite,
      fillColor: { from: 0xffffff, to: this.unit.team === TEAM.PLAYER ? 0x3a7bd5 : 0xb83030 },
      duration: 150,
    })
  }

  playDeathAnimation(callback: () => void): void {
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      scaleX: 0.5,
      scaleY: 0.5,
      duration: 300,
      onComplete: () => callback(),
    })
  }

  highlightAsTarget(visible: boolean): void {
    this.sprite.setStrokeStyle(2, visible ? 0xff3333 : 0x000000, 1)
  }
}
