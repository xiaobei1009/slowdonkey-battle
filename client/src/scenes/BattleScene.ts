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
  { col: 23, row: 4 },
  { col: 22, row: 7 },
  { col: 23, row: 10 },
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

  private selectedTarget: UnitSprite | null = null
  private preMovePos: Position | null = null
  private intendedMovePos: Position | null = null
  private btnConfirm!: Phaser.GameObjects.Container
  private btnCancel!: Phaser.GameObjects.Container
  private btnSkipMove!: Phaser.GameObjects.Container
  private btnDeselect!: Phaser.GameObjects.Container
  private btnConfirmText!: Phaser.GameObjects.Text
  private btnCancelText!: Phaser.GameObjects.Text
  private targetHighlight: Phaser.GameObjects.Rectangle | null = null
  private movePreviewHighlight: Phaser.GameObjects.Rectangle | null = null
  private unitInfoText!: Phaser.GameObjects.Text
  private logEl!: HTMLDivElement

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
      fontSize: '16px', color: '#ffd700', fontFamily: 'monospace',
    }).setOrigin(0.5, 0).setDepth(10)

    this.infoText = this.add.text(400, 580, '', {
      fontSize: '12px', color: '#aaaaaa', fontFamily: 'monospace',
    }).setOrigin(0.5, 1).setDepth(10)

    this.unitInfoText = this.add.text(400, 490, '', {
      fontSize: '14px', color: '#ffffff', fontFamily: 'monospace',
      lineSpacing: 6, align: 'center',
    }).setOrigin(0.5, 0).setDepth(10)

    this.btnConfirm = this.createButton(310, 565, 100, 28, '确认移动', 0x44aa44, () => this.onBtnConfirm())
    this.btnCancel = this.createButton(430, 565, 100, 28, '取消移动', 0x666666, () => this.onBtnCancel())
    this.btnSkipMove = this.createButton(190, 565, 100, 28, '不移动', 0x4488cc, () => this.onBtnSkipMove())
    this.btnDeselect = this.createButton(70, 565, 100, 28, '取消选择', 0x666666, () => this.onBtnDeselect())
    this.btnConfirm.setVisible(false)
    this.btnCancel.setVisible(false)
    this.btnSkipMove.setVisible(false)
    this.btnDeselect.setVisible(false)
    this.btnConfirmText = this.btnConfirm.getAt(1) as Phaser.GameObjects.Text
    this.btnCancelText = this.btnCancel.getAt(1) as Phaser.GameObjects.Text

    this.logEl = document.createElement('div')
    this.logEl.style.cssText = 'position:fixed;bottom:0;right:0;width:420px;max-height:200px;overflow-y:auto;background:rgba(0,0,0,0.85);color:#0f0;font:11px monospace;padding:4px 6px;z-index:9999;white-space:pre-wrap'
    document.body.appendChild(this.logEl)
    this.log('游戏启动')

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => this.onPointerDown(pointer))
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => this.onPointerMove(pointer))

    this.startPlayerTurn()
  }

  private startPlayerTurn(): void {
    this.log(`=== 玩家回合 ${this.turnManager.turnNumber} ===`)
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
    this.log(`pointerDown phase=${this.selectionManager.phase} isExec=${this.isExecuting} (${pointer.x},${pointer.y})`)
    if (this.isExecuting) {
      this.log('→ blocked by isExecuting')
      return
    }
    if (this.turnManager.getCurrentTeam() !== TEAM.PLAYER) {
      this.log('→ not player turn')
      return
    }

    const pos = this.mapManager.pixelToTile(pointer.x, pointer.y)
    if (!this.mapManager.isWithinBounds(pos)) {
      this.log('→ out of bounds')
      return
    }

    const clicked = this.allSprites.find(s => s.pos.col === pos.col && s.pos.row === pos.row && s.unit.hp > 0)
    this.log(`clicked tile=(${pos.col},${pos.row}) unit=${clicked?.unit.id ?? 'none'}`)

    if (pointer.rightButtonDown()) {
      this.log('→ right click')
      this.handleRightClick()
      return
    }

    switch (this.selectionManager.phase) {
      case 'idle':
        if (clicked && clicked.unit.team === TEAM.PLAYER) {
          this.log('idle: select player unit')
          this.selectionManager.onUnitClicked(clicked, this.occupiedPositions)
          this.showAttackRangeTiles(clicked.pos, clicked.unit.attackRange)
          this.showSkipMoveButton()
          this.updateUnitInfo(clicked)
          this.infoText.setText('选择移动或按「不移动」跳过')
        } else if (clicked?.unit.team === TEAM.ENEMY) {
          this.log('idle: show enemy info')
          this.updateUnitInfo(clicked)
        } else {
          this.log('idle: nothing actionable')
        }
        break
      case 'select_move': {
        const sel = this.selectionManager.selectedUnit!
        if (!sel) { this.log('select_move: no selectedUnit!'); break }
        const isReachable = this.selectionManager.reachableTiles.some(t => t.col === pos.col && t.row === pos.row)

        if (clicked?.unit.id === sel.unit.id) {
          this.log('select_move: click self → deselect')
          this.cancelMovePreview()
          this.enemySprites.forEach(e => e.highlightAsTarget(false))
          this.hideSkipMoveButton()
          this.selectionManager.resetSelection()
          this.updateUnitInfo(null)
          this.infoText.setText('点击己方单位选择')
        } else if (isReachable && !this.allSprites.some(s => s.pos.col === pos.col && s.pos.row === pos.row && s.unit.hp > 0 && s !== sel)) {
          this.log('select_move: reachable tile → show preview')
          this.intendedMovePos = { ...pos }
          this.showMovePreview(pos)
          this.selectionManager.clearHighlights()
          this.showAttackRangeTiles(pos, sel.unit.attackRange)
          this.showMoveButtons()
          this.hideSkipMoveButton()
          this.infoText.setText('确认移动位置')
        } else if (clicked?.unit.team === TEAM.ENEMY) {
          this.log('select_move: show enemy info')
          this.updateUnitInfo(clicked)
        } else {
          this.log('select_move: unhandled click')
        }
        break
      }
      case 'select_target': {
        this.log(`select_target: clicked=${clicked?.unit.id ?? 'none'}, team=${clicked?.unit.team ?? 'none'}`)
        if (clicked && clicked.unit.team === TEAM.ENEMY) {
          if (this.isTargetable(clicked)) {
            this.log('select_target: targetable enemy → select as target')
            this.selectedTarget = clicked
            this.highlightTarget(clicked)
            this.updateUnitInfo(clicked)
          } else {
            this.log('select_target: enemy not targetable, show info')
            this.updateUnitInfo(clicked)
          }
        } else if (clicked && clicked.unit.team === TEAM.PLAYER && clicked.unit.hp > 0) {
          this.log('select_target: click friendly → switch unit')
          const oldUnit = this.selectionManager.selectedUnit
          this.hideActionButtons()
          this.enemySprites.forEach(e => e.highlightAsTarget(false))
          if (oldUnit && this.preMovePos) {
            oldUnit.setPosition(this.preMovePos, this.mapManager)
            this.preMovePos = null
          }
          this.selectionManager.resetSelection()
          this.selectionManager.onUnitClicked(clicked, this.occupiedPositions)
          this.showAttackRangeTiles(clicked.pos, clicked.unit.attackRange)
          this.updateUnitInfo(clicked)
          this.infoText.setText('选择移动或按「不移动」跳过')
        } else {
          this.log('select_target: nothing actionable')
        }
        break
      }
    }
  }

  private handleRightClick(): void {
    if (this.intendedMovePos || this.preMovePos) {
      this.onBtnCancel()
    } else if (this.selectionManager.phase === 'select_move') {
      this.enemySprites.forEach(e => e.highlightAsTarget(false))
      this.hideSkipMoveButton()
      this.selectionManager.resetSelection()
      this.updateUnitInfo(null)
      this.infoText.setText('点击己方单位选择')
    }
  }

  private getAttackRangeTiles(pos: Position, range: number): Position[] {
    const tiles: Position[] = []
    for (let dr = -range; dr <= range; dr++) {
      for (let dc = -range; dc <= range; dc++) {
        if (Math.abs(dr) + Math.abs(dc) > range) continue
        const p: Position = { col: pos.col + dc, row: pos.row + dr }
        if (this.mapManager.isWithinBounds(p)) tiles.push(p)
      }
    }
    return tiles
  }

  private showAttackRangeTiles(pos: Position, range: number): void {
    const enemies = this.enemySprites.filter(e => e.unit.hp > 0)
    const attackRange = this.getAttackRangeTiles(pos, range)
    const attackable = this.battleSystem.getAttackableTargets(
      pos, range,
      enemies.map(e => ({ unit: e.unit, pos: e.pos }))
    )
    this.selectionManager.showAttackRange(attackRange)
    this.enemySprites.forEach(e => e.highlightAsTarget(false))
    enemies.forEach(e => {
      if (attackable.some(a => a.unit.id === e.unit.id)) {
        e.highlightAsTarget(true)
      }
    })
  }

  private showAttackRange(): void {
    const selected = this.selectionManager.selectedUnit!
    if (!selected) { this.log('showAttackRange: no selectedUnit'); return }
    this.log(`showAttackRange: ${selected.unit.id} at (${selected.pos.col},${selected.pos.row})`)
    this.showAttackRangeTiles(selected.pos, selected.unit.attackRange)

    const enemies = this.enemySprites.filter(e => e.unit.hp > 0)
    const attackable = this.battleSystem.getAttackableTargets(
      selected.pos, selected.unit.attackRange,
      enemies.map(e => ({ unit: e.unit, pos: e.pos }))
    )
    this.log(`showAttackRange: ${attackable.length} targetable enemies`)
    if (attackable.length > 0) {
      this.infoText.setText('点击敌方选择目标，然后按「攻击」确认')
      this.showAttackButtons()
    } else {
      this.infoText.setText('无攻击目标，自动待命')
      this.log('showAttackRange: no targets → executeWait')
      this.executeWait(selected)
    }
  }

  private isTargetable(sprite: UnitSprite): boolean {
    return this.selectionManager.attackableTiles.some(
      t => t.col === sprite.pos.col && t.row === sprite.pos.row
    )
  }

  private async executeAttack(attacker: UnitSprite, defender: UnitSprite): Promise<void> {
    this.log(`executeAttack START ${attacker.unit.id}→${defender.unit.id}`)
    this.isExecuting = true
    this.hideActionButtons()
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
    this.updateUnitInfo(null)
    this.isExecuting = false
    this.log(`executeAttack END isExec=${this.isExecuting} phase=${this.selectionManager.phase}`)

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
    this.log(`executeWait START ${unitSprite.unit.id}`)
    this.isExecuting = true
    this.hideActionButtons()
    this.turnManager.markActed(unitSprite.unit.id)
    this.enemySprites.forEach(e => e.highlightAsTarget(false))
    this.selectionManager.resetSelection()
    this.updateUnitInfo(null)
    this.infoText.setText(`${unitSprite.unit.name} 待命`)
    await this.delay(200)
    this.isExecuting = false
    this.log(`executeWait END isExec=${this.isExecuting} phase=${this.selectionManager.phase}`)

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

  private createButton(x: number, y: number, w: number, h: number, label: string, color: number, onClick: () => void): Phaser.GameObjects.Container {
    const bg = this.add.rectangle(x, y, w, h, color, 0.9).setStrokeStyle(1, 0xffffff, 0.5)
    const text = this.add.text(x, y, label, {
      fontSize: '14px', color: '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0.5)
    bg.setInteractive({ useHandCursor: true })
    bg.on('pointerdown', onClick)
    const c = this.add.container(0, 0, [bg, text])
    c.setDepth(20)
    return c
  }

  private showMovePreview(pos: Position): void {
    if (this.movePreviewHighlight) this.movePreviewHighlight.destroy()
    const pixelPos = this.mapManager.tileToPixel(pos)
    this.movePreviewHighlight = this.add.rectangle(
      pixelPos.x, pixelPos.y,
      GAME_CONFIG.TILE_SIZE, GAME_CONFIG.TILE_SIZE,
      0xffff00, 0.3
    ).setStrokeStyle(2, 0xffff00, 0.8).setDepth(5)
  }

  private cancelMovePreview(): void {
    this.intendedMovePos = null
    if (this.movePreviewHighlight) {
      this.movePreviewHighlight.destroy()
      this.movePreviewHighlight = null
    }
  }

  private onBtnConfirm(): void {
    this.log('onBtnConfirm')
    if (this.intendedMovePos) {
      const unit = this.selectionManager.selectedUnit
      if (!unit) { this.log('confirm: no selectedUnit'); return }
      const dest = { ...this.intendedMovePos }
      this.log(`confirm: move ${unit.unit.id} from (${unit.pos.col},${unit.pos.row}) to (${dest.col},${dest.row})`)
      this.preMovePos = { ...unit.pos }
      this.cancelMovePreview()
      this.hideActionButtons()
      unit.setPosition(dest, this.mapManager)
      this.selectionManager.clearHighlights()
      this.selectionManager.phase = 'select_target'
      this.log(`confirm: phase→select_target, calling showAttackRange`)
      this.showAttackRange()
    } else if (this.selectedTarget) {
      this.log(`confirm: attack ${this.selectionManager.selectedUnit?.unit.id} → ${this.selectedTarget.unit.id}`)
      this.preMovePos = null
      this.hideActionButtons()
      this.executeAttack(this.selectionManager.selectedUnit!, this.selectedTarget)
      this.selectedTarget = null
    } else {
      this.log('confirm: nothing to confirm')
    }
  }

  private onBtnDeselect(): void {
    this.log('onBtnDeselect')
    this.cancelMovePreview()
    this.enemySprites.forEach(e => e.highlightAsTarget(false))
    this.hideActionButtons()
    this.selectionManager.resetSelection()
    this.updateUnitInfo(null)
    this.infoText.setText('点击己方单位选择')
  }

  private onBtnSkipMove(): void {
    this.log('onBtnSkipMove')
    const unit = this.selectionManager.selectedUnit
    if (!unit) { this.log('skipMove: no selectedUnit'); return }
    this.preMovePos = { ...unit.pos }
    this.cancelMovePreview()
    this.selectionManager.clearHighlights()
    this.hideActionButtons()
    this.selectionManager.phase = 'select_target'
    this.showAttackRange()
  }

  private onBtnCancel(): void {
    this.log('onBtnCancel')
    if (this.intendedMovePos) {
      this.log('cancel: intendedMovePos → revert to move selection')
      this.cancelMovePreview()
      this.hideActionButtons()
      const unit = this.selectionManager.selectedUnit
      if (unit) {
        this.selectionManager.showMoveRange(
          this.mapManager.getReachableTiles(unit.pos, unit.unit.moveRange, this.occupiedPositions)
        )
        this.showAttackRangeTiles(unit.pos, unit.unit.attackRange)
      }
      this.showSkipMoveButton()
      this.infoText.setText('选择移动或按「不移动」跳过')
    } else if (this.preMovePos) {
      this.log('cancel: preMovePos → return to preMovePos')
      const unit = this.selectionManager.selectedUnit
      if (!unit || !this.preMovePos) { this.log('cancel: no unit or preMovePos'); return }
      this.selectedTarget = null
      this.hideActionButtons()
      this.enemySprites.forEach(e => e.highlightAsTarget(false))
      unit.setPosition(this.preMovePos, this.mapManager)
      this.preMovePos = null
      this.selectionManager.phase = 'select_move'
      const reachable = this.mapManager.getReachableTiles(unit.pos, unit.unit.moveRange, this.occupiedPositions)
      this.selectionManager.showMoveRange(reachable)
      this.showAttackRangeTiles(unit.pos, unit.unit.attackRange)
      this.showSkipMoveButton()
      this.infoText.setText('选择移动或按「不移动」跳过')
    } else {
      this.log('cancel: nothing to cancel')
    }
  }

  private showMoveButtons(): void {
    this.btnConfirmText.setText('确认移动')
    this.btnCancelText.setText('取消移动')
    this.btnConfirm.setVisible(true)
    this.btnCancel.setVisible(true)
    this.btnConfirm.setDepth(20)
    this.btnCancel.setDepth(20)
  }

  private showAttackButtons(): void {
    this.btnConfirmText.setText('攻击')
    this.btnCancelText.setText('取消')
    this.btnConfirm.setVisible(true)
    this.btnCancel.setVisible(true)
    this.btnConfirm.setDepth(20)
    this.btnCancel.setDepth(20)
  }

  private showSkipMoveButton(): void {
    this.btnSkipMove.setVisible(true)
    this.btnSkipMove.setDepth(20)
    this.btnDeselect.setVisible(true)
    this.btnDeselect.setDepth(20)
  }

  private hideSkipMoveButton(): void {
    this.btnSkipMove.setVisible(false)
    this.btnDeselect.setVisible(false)
  }

  private hideActionButtons(): void {
    this.btnConfirm.setVisible(false)
    this.btnCancel.setVisible(false)
    this.btnSkipMove.setVisible(false)
    this.btnDeselect.setVisible(false)
    if (this.targetHighlight) {
      this.targetHighlight.destroy()
      this.targetHighlight = null
    }
  }

  private highlightTarget(sprite: UnitSprite): void {
    if (this.targetHighlight) this.targetHighlight.destroy()
    const pixelPos = this.mapManager.tileToPixel(sprite.pos)
    this.targetHighlight = this.add.rectangle(
      pixelPos.x, pixelPos.y,
      GAME_CONFIG.TILE_SIZE, GAME_CONFIG.TILE_SIZE,
      0xffff00, 0.35
    ).setStrokeStyle(2, 0xffff00, 0.9).setDepth(5)
  }

  private log(msg: string): void {
    const el = this.logEl
    const line = document.createElement('div')
    line.textContent = msg
    el.appendChild(line)
    el.scrollTop = el.scrollHeight
    if (el.children.length > 40) el.removeChild(el.firstChild!)
  }

  private updateUnitInfo(sprite: UnitSprite | null): void {
    if (!sprite) { this.unitInfoText.setText(''); return }
    const u = sprite.unit
    const atk = u.matk > u.attack ? u.matk : u.attack
    const def = u.matk > u.attack ? u.mdef : u.defense
    const atkLabel = u.matk > u.attack ? '魔攻' : '攻击'
    const defLabel = u.matk > u.attack ? '魔防' : '防御'
    this.unitInfoText.setText(
      `${u.name} Lv.${u.level}  HP ${u.hp}/${u.maxHp}\n` +
      `${atkLabel} ${atk}  ${defLabel} ${def}  速度 ${u.speed}  射程 ${u.attackRange}  移动 ${u.moveRange}\n` +
      `命中 ${u.hitRate}%  闪避 ${u.dodgeRate}%  暴击 ${u.critRate}%`
    )
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => this.time.delayedCall(ms, resolve))
  }
}
