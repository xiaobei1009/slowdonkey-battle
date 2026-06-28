import Phaser from 'phaser'
import { UnitData, Position, BattleAction } from '@shared/types'
import { GAME_CONFIG, TEAM } from '../config'
import { MapManager } from '../systems/MapManager'
import { TurnManager } from '../systems/TurnManager'
import { BattleSystem } from '../systems/BattleSystem'
import { SelectionManager } from '../systems/SelectionManager'
import { AISystem } from '../systems/AISystem'
import { UnitSprite } from '../entities/UnitSprite'

function createPlayerUnits(): UnitData[] {
  return [
    { id: 'p1', name: '勇者', team: TEAM.PLAYER, level: 1, hp: 24, maxHp: 24, attack: 10, defense: 6, matk: 2, mdef: 4, speed: 5, moveRange: 4, attackRange: 1, critRate: 10, dodgeRate: 5, hitRate: 90 },
    { id: 'p2', name: '法师', team: TEAM.PLAYER, level: 1, hp: 14, maxHp: 14, attack: 3, defense: 2, matk: 12, mdef: 5, speed: 4, moveRange: 3, attackRange: 2, critRate: 5, dodgeRate: 10, hitRate: 85 },
    { id: 'p3', name: '弓箭手', team: TEAM.PLAYER, level: 1, hp: 18, maxHp: 18, attack: 7, defense: 3, matk: 1, mdef: 2, speed: 6, moveRange: 4, attackRange: 3, critRate: 15, dodgeRate: 8, hitRate: 85 },
  ]
}

function createEnemyUnits(): UnitData[] {
  return [
    { id: 'e1', name: '哥布林', team: TEAM.ENEMY, level: 1, hp: 12, maxHp: 12, attack: 6, defense: 2, matk: 1, mdef: 1, speed: 4, moveRange: 3, attackRange: 1, critRate: 5, dodgeRate: 8, hitRate: 80 },
    { id: 'e2', name: '兽人', team: TEAM.ENEMY, level: 1, hp: 28, maxHp: 28, attack: 9, defense: 7, matk: 1, mdef: 3, speed: 3, moveRange: 3, attackRange: 1, critRate: 8, dodgeRate: 3, hitRate: 85 },
    { id: 'e3', name: '暗法师', team: TEAM.ENEMY, level: 1, hp: 15, maxHp: 15, attack: 4, defense: 3, matk: 10, mdef: 4, speed: 4, moveRange: 3, attackRange: 2, critRate: 8, dodgeRate: 6, hitRate: 80 },
  ]
}

const playerStartPositions: Position[] = [
  { col: 1, row: 4 },
  { col: 2, row: 7 },
  { col: 1, row: 10 },
]

const enemyStartPositions: Position[] = [
  { col: 18, row: 4 },
  { col: 17, row: 7 },
  { col: 18, row: 10 },
]

export class BattleScene extends Phaser.Scene {
  private mapManager!: MapManager
  private battleSystem!: BattleSystem
  private turnManager!: TurnManager
  private selectionManager!: SelectionManager
  private aiSystem!: AISystem

  private playerSprites: UnitSprite[] = []
  private enemySprites: UnitSprite[] = []
  private allSprites: UnitSprite[] = []
  private playerUnits: UnitData[] = []
  private enemyUnits: UnitData[] = []

  private turnText!: Phaser.GameObjects.Text
  private infoText!: Phaser.GameObjects.Text
  private isExecuting = false
  private occupiedPositions: Position[] = []

  constructor() {
    super({ key: 'BattleScene' })
  }

  create(): void {
    this.mapManager = new MapManager(this)
    this.mapManager.generateFixedMap()
    this.mapManager.render()

    this.battleSystem = new BattleSystem()
    this.turnManager = new TurnManager()
    this.selectionManager = new SelectionManager(this, this.mapManager)
    this.aiSystem = new AISystem(this.mapManager, this.battleSystem)

    this.playerUnits = createPlayerUnits()
    this.enemyUnits = createEnemyUnits()
    this.turnManager.setUnits([...this.playerUnits, ...this.enemyUnits])

    this.playerSprites = this.playerUnits.map((u, i) =>
      new UnitSprite(this, u, playerStartPositions[i], this.mapManager)
    )
    this.enemySprites = this.enemyUnits.map((u, i) =>
      new UnitSprite(this, u, enemyStartPositions[i], this.mapManager)
    )
    this.allSprites = [...this.playerSprites, ...this.enemySprites]
    this.updateOccupied()

    this.turnText = this.add.text(400, 8, '', {
      fontSize: '14px', color: '#ffd700', fontFamily: 'monospace',
    }).setOrigin(0.5, 0).setDepth(10)

    this.infoText = this.add.text(400, 580, '', {
      fontSize: '12px', color: '#aaaaaa', fontFamily: 'monospace',
    }).setOrigin(0.5, 1).setDepth(10)

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => this.onPointerDown(pointer))
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => this.onPointerMove(pointer))

    this.startPlayerTurn()
  }

  private startPlayerTurn(): void {
    this.turnText.setText(`回合 ${this.turnManager.turnNumber} — 玩家行动`)
    this.infoText.setText('点击己方单位选择')
    this.selectionManager.setCursorVisible(true)
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    const pos = this.mapManager.pixelToTile(pointer.x, pointer.y)
    if (this.mapManager.isWithinBounds(pos)) {
      this.selectionManager.updateCursorPosition(pos)
    }
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.isExecuting) return
    if (this.turnManager.getCurrentTeam() !== TEAM.PLAYER) return

    const pos = this.mapManager.pixelToTile(pointer.x, pointer.y)
    if (!this.mapManager.isWithinBounds(pos)) return

    const clicked = this.allSprites.find(s => s.pos.col === pos.col && s.pos.row === pos.row && s.unit.hp > 0)

    if (pointer.rightButtonDown()) {
      this.handleRightClick()
      return
    }

    switch (this.selectionManager.phase) {
      case 'idle':
        if (clicked && clicked.unit.team === TEAM.PLAYER) {
          this.selectionManager.onUnitClicked(clicked, this.occupiedPositions)
          this.infoText.setText('选择移动目标位置')
        }
        break
      case 'select_move':
        if (this.selectionManager.onTileClicked(pos, this.allSprites)) {
          this.showAttackRange()
        }
        break
      case 'select_target':
        if (clicked && clicked.unit.team === TEAM.ENEMY) {
          this.tryAttack(clicked)
        }
        break
    }
  }

  private handleRightClick(): void {
    if (this.selectionManager.phase === 'select_move') {
      this.selectionManager.resetSelection()
      this.infoText.setText('点击己方单位选择')
    } else if (this.selectionManager.phase === 'select_target') {
      this.executeWait(this.selectionManager.selectedUnit!)
    }
  }

  private showAttackRange(): void {
    const selected = this.selectionManager.selectedUnit!
    const pos = selected.pos
    const enemies = this.enemySprites.filter(e => e.unit.hp > 0)
    const attackable = this.battleSystem.getAttackableTargets(
      pos, selected.unit.attackRange,
      enemies.map(e => ({ unit: e.unit, pos: e.pos }))
    )

    this.enemySprites.forEach(e => e.highlightAsTarget(false))

    if (attackable.length > 0) {
      this.selectionManager.showAttackRange(attackable.map(a => a.pos))
      enemies.forEach(e => {
        if (attackable.some(a => a.unit.id === e.unit.id)) {
          e.highlightAsTarget(true)
        }
      })
      this.infoText.setText('选择攻击目标 | 右键跳过')
    } else {
      this.infoText.setText('无攻击目标，自动待命')
      this.executeWait(selected)
    }
  }

  private tryAttack(targetSprite: UnitSprite): void {
    const attacker = this.selectionManager.selectedUnit!
    const isTargetable = this.selectionManager.attackableTiles.some(
      t => t.col === targetSprite.pos.col && t.row === targetSprite.pos.row
    )
    if (!isTargetable) return

    this.executeAttack(attacker, targetSprite)
  }

  private async executeAttack(attacker: UnitSprite, defender: UnitSprite): Promise<void> {
    this.isExecuting = true
    this.selectionManager.setCursorVisible(false)

    const isMagic = attacker.unit.matk > attacker.unit.attack
    const result = this.battleSystem.calculateDamage(attacker.unit, defender.unit, isMagic)

    let log = `${attacker.unit.name} → ${defender.unit.name}: `
    if (!result.hit) {
      log += '未命中!'
    } else if (result.dodged) {
      log += '被闪避!'
    } else {
      defender.unit.hp = Math.max(0, defender.unit.hp - result.damage)
      if (result.critical) log += `暴击! ${result.damage} 伤害`
      else log += `${result.damage} 伤害`
    }
    this.infoText.setText(log)

    if (result.hit) {
      defender.flashDamage()
    }
    await this.delay(300)

    defender.updateHp()
    if (this.battleSystem.isUnitDead(defender.unit)) {
      defender.playDeathAnimation(() => {})
      await this.delay(400)
    }

    this.turnManager.markActed(attacker.unit.id)
    this.enemySprites.forEach(e => e.highlightAsTarget(false))
    this.selectionManager.resetSelection()
    this.isExecuting = false

    if (this.checkWinCondition()) return
    this.updateOccupied()

    if (this.turnManager.isTeamDone()) {
      this.startAITurn()
    } else {
      this.selectionManager.setCursorVisible(true)
      this.infoText.setText('点击己方单位选择')
    }
  }

  private async executeWait(unitSprite: UnitSprite): Promise<void> {
    this.isExecuting = true
    this.turnManager.markActed(unitSprite.unit.id)
    this.enemySprites.forEach(e => e.highlightAsTarget(false))
    this.selectionManager.resetSelection()
    this.infoText.setText(`${unitSprite.unit.name} 待命`)
    await this.delay(200)
    this.isExecuting = false

    if (this.turnManager.isTeamDone()) {
      this.startAITurn()
    } else {
      this.infoText.setText('点击己方单位选择')
    }
  }

  private async startAITurn(): Promise<void> {
    this.turnManager.endTurn()
    this.turnText.setText(`回合 ${this.turnManager.turnNumber} — 敌方行动`)
    this.infoText.setText('敌方行动中...')
    this.selectionManager.setCursorVisible(false)

    await this.delay(500)

    const aiUnits = this.enemySprites
      .filter(s => s.unit.hp > 0)
      .map(s => ({ unit: s.unit, pos: s.pos }))
    const playerTargets = this.playerSprites
      .filter(s => s.unit.hp > 0)
      .map(s => ({ unit: s.unit, pos: s.pos }))
    const allForAI = this.allSprites
      .filter(s => s.unit.hp > 0)
      .map(s => ({ unit: s.unit, pos: s.pos }))

    const actions = this.aiSystem.decideActions(aiUnits, playerTargets, allForAI)

    for (const action of actions) {
      if (this.checkWinCondition()) return
      await this.executeAIAction(action)
      await this.delay(300)
    }

    this.turnManager.endTurn()
    this.checkWinCondition()
    this.startPlayerTurn()
  }

  private async executeAIAction(action: BattleAction): Promise<void> {
    const unitSprite = this.enemySprites.find(s => s.unit.id === action.unitId)
    if (!unitSprite || unitSprite.unit.hp <= 0) return

    if (action.type === 'move' && action.target) {
      unitSprite.setPosition(action.target, this.mapManager)
      this.infoText.setText(`${unitSprite.unit.name} 移动`)
      await this.delay(250)
    }

    if (action.type === 'attack' && action.targetUnitId) {
      const target = this.playerSprites.find(s => s.unit.id === action.targetUnitId)
      if (target && target.unit.hp > 0) {
        const isMagic = unitSprite.unit.matk > unitSprite.unit.attack
        const result = this.battleSystem.calculateDamage(unitSprite.unit, target.unit, isMagic)

        let log = `敌方 ${unitSprite.unit.name} → ${target.unit.name}: `
        if (!result.hit) {
          log += '未命中!'
        } else if (result.dodged) {
          log += '被闪避!'
        } else {
          target.unit.hp = Math.max(0, target.unit.hp - result.damage)
          if (result.critical) log += `暴击! ${result.damage} 伤害`
          else log += `${result.damage} 伤害`
        }
        this.infoText.setText(log)

        if (result.hit) {
          target.flashDamage()
        }
        await this.delay(300)

        target.updateHp()
        if (this.battleSystem.isUnitDead(target.unit)) {
          target.playDeathAnimation(() => {})
          await this.delay(400)
        }
      }
    }
  }

  private checkWinCondition(): boolean {
    const aliveEnemies = this.enemySprites.filter(s => s.unit.hp > 0)
    const alivePlayers = this.playerSprites.filter(s => s.unit.hp > 0)

    if (aliveEnemies.length === 0) {
      this.isExecuting = true
      this.turnText.setText('🎉 胜利!')
      this.infoText.setText('所有敌人被击败!')
      return true
    }

    if (alivePlayers.length === 0) {
      this.isExecuting = true
      this.turnText.setText('💀 败北...')
      this.infoText.setText('我方全灭...')
      return true
    }

    return false
  }

  private updateOccupied(): void {
    this.occupiedPositions = this.allSprites
      .filter(s => s.unit.hp > 0)
      .map(s => ({ ...s.pos }))
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => this.time.delayedCall(ms, resolve))
  }
}
