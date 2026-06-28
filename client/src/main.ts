import Phaser from 'phaser'
import { GAME_CONFIG } from './config'
import { BattleScene } from './scenes/BattleScene'

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.WEBGL,
  width: GAME_CONFIG.SCREEN_WIDTH,
  height: GAME_CONFIG.SCREEN_HEIGHT,
  pixelArt: true,
  backgroundColor: '#1a1a2e',
  scene: [BattleScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
}

new Phaser.Game(config)
