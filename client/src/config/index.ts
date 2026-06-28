export const GAME_CONFIG = {
  SCREEN_WIDTH: 480,
  SCREEN_HEIGHT: 760,
  TILE_SIZE: 30,
  MAP_COLS: 16,
  MAP_ROWS: 16,
  FPS: 24,
  ANIMATION_SPEED: 1000 / 24,
  TEAM_SIZE: 3,
  WS_URL: `ws://${location.host}/ws`,
  API_URL: '/api',
} as const

export const TERRAIN = {
  PLAIN: 0,
  HIGH: 1,
  WATER: 2,
  WALL: 3,
} as const

export const TERRAIN_COLORS: Record<number, { fill: number; label: string }> = {
  [TERRAIN.PLAIN]: { fill: 0x4a7c59, label: '平地' },
  [TERRAIN.HIGH]: { fill: 0x8b7355, label: '高地' },
  [TERRAIN.WATER]: { fill: 0x2d6da8, label: '水域' },
  [TERRAIN.WALL]: { fill: 0x555555, label: '障碍物' },
}

export const TEAM = {
  PLAYER: 0,
  ENEMY: 1,
} as const
