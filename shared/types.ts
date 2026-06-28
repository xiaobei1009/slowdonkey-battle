export interface UnitData {
  id: string
  name: string
  team: number
  level: number
  hp: number
  maxHp: number
  attack: number
  defense: number
  matk: number
  mdef: number
  speed: number
  moveRange: number
  attackRange: number
  critRate: number
  dodgeRate: number
  hitRate: number
}

export interface Position {
  col: number
  row: number
}

export interface TileData {
  terrain: number
  position: Position
}

export interface MapData {
  cols: number
  rows: number
  tiles: TileData[][]
  units: { unit: UnitData; position: Position }[]
}

export interface BattleAction {
  type: 'move' | 'attack' | 'wait'
  unitId: string
  target?: Position
  targetUnitId?: string
}

export interface BattleState {
  map: MapData
  turn: number
  currentTeam: number
  actions: BattleAction[]
  isFinished: boolean
  winner?: number
}

export interface SaveData {
  battle: BattleState
  timestamp: number
}
