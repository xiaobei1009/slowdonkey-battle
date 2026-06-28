export const GAME_CONFIG = {
  SCREEN_WIDTH: 480,
  SCREEN_HEIGHT: 760,
  TILE_SIZE: 30,
  MAP_COLS: 16,
  MAP_ROWS: 16,
  ISO_TILE_W: 30,
  ISO_TILE_H: 15,
  MAP_OFFSET_X: 240,
  MAP_OFFSET_Y: 60,
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

export const TERRAIN_COLORS: Record<number, { fill: number; shade: number; label: string }> = {
  [TERRAIN.PLAIN]: { fill: 0x6b8f5e, shade: 0x55734a, label: '平地' },
  [TERRAIN.HIGH]: { fill: 0x9c8a6e, shade: 0x7d6e58, label: '高地' },
  [TERRAIN.WATER]: { fill: 0x3a6a90, shade: 0x2e5573, label: '水域' },
  [TERRAIN.WALL]: { fill: 0x5a5a5a, shade: 0x484848, label: '障碍物' },
}

export const TEAM = {
  PLAYER: 0,
  ENEMY: 1,
} as const
