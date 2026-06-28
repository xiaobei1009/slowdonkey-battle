import { UnitData, Position, BattleAction } from '@shared/types'
import { MapManager } from './MapManager'
import { BattleSystem } from './BattleSystem'

export class AISystem {
  private mapManager: MapManager
  private battleSystem: BattleSystem

  constructor(mapManager: MapManager, battleSystem: BattleSystem) {
    this.mapManager = mapManager
    this.battleSystem = battleSystem
  }

  decideActions(
    units: { unit: UnitData; pos: Position }[],
    enemies: { unit: UnitData; pos: Position }[],
    allUnits: { unit: UnitData; pos: Position }[]
  ): BattleAction[] {
    const actions: BattleAction[] = []
    const occupied = allUnits.map(u => u.pos)

    for (const { unit, pos } of units) {
      let nearestEnemy: { unit: UnitData; pos: Position } | null = null
      let minDist = Infinity

      for (const enemy of enemies) {
        const dist = this.mapManager.getDistance(pos, enemy.pos)
        if (dist < minDist) {
          minDist = dist
          nearestEnemy = enemy
        }
      }

      if (!nearestEnemy) {
        actions.push({ type: 'wait', unitId: unit.id })
        continue
      }

      const attackable = this.battleSystem.getAttackableTargets(pos, unit.attackRange, enemies)

      if (attackable.length > 0) {
        const target = attackable[Math.floor(Math.random() * attackable.length)]
        actions.push({ type: 'attack', unitId: unit.id, targetUnitId: target.unit.id })
        continue
      }

      const reachable = this.mapManager.getReachableTiles(pos, unit.moveRange, occupied)
      let bestPos = pos
      let bestDist = minDist

      for (const tile of reachable) {
        const dist = this.mapManager.getDistance(tile, nearestEnemy.pos)
        if (dist < bestDist) {
          bestDist = dist
          bestPos = tile
        }
      }

      if (bestPos.col !== pos.col || bestPos.row !== pos.row) {
        actions.push({ type: 'move', unitId: unit.id, target: bestPos })

        const newAttackable = this.battleSystem.getAttackableTargets(bestPos, unit.attackRange, enemies)
        if (newAttackable.length > 0) {
          const target = newAttackable[Math.floor(Math.random() * newAttackable.length)]
          actions.push({ type: 'attack', unitId: unit.id, targetUnitId: target.unit.id })
        } else {
          actions.push({ type: 'wait', unitId: unit.id })
        }
      } else {
        actions.push({ type: 'wait', unitId: unit.id })
      }
    }

    return actions
  }
}
