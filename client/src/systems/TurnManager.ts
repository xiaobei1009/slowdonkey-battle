import { UnitData } from '@shared/types'
import { TEAM } from '../config'

export class TurnManager {
  currentTeam: number = TEAM.PLAYER
  turnNumber: number = 1
  private units: { unit: UnitData; acted: boolean }[] = []

  setUnits(units: UnitData[]): void {
    this.units = units.map(u => ({ unit: u, acted: false }))
  }

  getCurrentTeam(): number {
    return this.currentTeam
  }

  getActedUnits(): UnitData[] {
    return this.units.filter(u => u.acted && u.unit.team === this.currentTeam).map(u => u.unit)
  }

  getPendingUnits(): UnitData[] {
    return this.units.filter(u => !u.acted && u.unit.team === this.currentTeam && u.unit.hp > 0).map(u => u.unit)
  }

  markActed(unitId: string): void {
    const u = this.units.find(u => u.unit.id === unitId)
    if (u) u.acted = true
  }

  isTeamDone(): boolean {
    return this.getPendingUnits().length === 0
  }

  allUnitsActed(): boolean {
    return this.units.filter(u => u.unit.hp > 0).every(u => u.acted)
  }

  endTurn(): void {
    this.units.forEach(u => {
      if (u.unit.team === this.currentTeam && u.unit.hp > 0) {
        u.acted = false
      }
    })
    this.currentTeam = this.currentTeam === TEAM.PLAYER ? TEAM.ENEMY : TEAM.PLAYER
    if (this.currentTeam === TEAM.PLAYER) {
      this.turnNumber++
    }
  }

  getLivingUnitsByTeam(team: number): UnitData[] {
    return this.units.filter(u => u.unit.team === team && u.unit.hp > 0).map(u => u.unit)
  }

  getAliveUnits(): UnitData[] {
    return this.units.filter(u => u.unit.hp > 0).map(u => u.unit)
  }
}
