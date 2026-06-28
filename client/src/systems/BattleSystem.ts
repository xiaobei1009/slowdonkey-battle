import { UnitData, Position } from '@shared/types'

export interface DamageResult {
  hit: boolean
  critical: boolean
  dodged: boolean
  damage: number
}

export class BattleSystem {
  calculateDamage(attacker: UnitData, defender: UnitData, isMagic: boolean): DamageResult {
    const hitRoll = Math.random() * 100
    if (hitRoll > attacker.hitRate) {
      return { hit: false, critical: false, dodged: false, damage: 0 }
    }

    const dodgeRoll = Math.random() * 100
    if (dodgeRoll < defender.dodgeRate) {
      return { hit: true, critical: false, dodged: true, damage: 0 }
    }

    const critRoll = Math.random() * 100
    const isCritical = critRoll < attacker.critRate

    let baseDamage: number
    if (isMagic) {
      baseDamage = Math.max(1, attacker.matk - defender.mdef)
    } else {
      baseDamage = Math.max(1, attacker.attack - defender.defense)
    }

    const variance = Math.floor(Math.random() * 4)
    let finalDamage = baseDamage + variance

    if (isCritical) {
      finalDamage = Math.floor(finalDamage * 1.5)
    }

    return { hit: true, critical: isCritical, dodged: false, damage: finalDamage }
  }

  getAttackableTargets(attackerPos: Position, attackRange: number, defenders: { unit: UnitData; pos: Position }[]): { unit: UnitData; pos: Position }[] {
    return defenders.filter(d => {
      const dist = Math.abs(d.pos.col - attackerPos.col) + Math.abs(d.pos.row - attackerPos.row)
      return dist <= attackRange
    })
  }

  isUnitDead(unit: UnitData): boolean {
    return unit.hp <= 0
  }
}
