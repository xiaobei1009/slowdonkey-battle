import { GAME_CONFIG } from '../config'
import { BattleState, SaveData } from '@shared/types'

type MessageHandler = (data: any) => void

export class WebSocketClient {
  private ws: WebSocket | null = null
  private handlers = new Map<string, MessageHandler[]>()
  private url: string

  constructor(url: string = GAME_CONFIG.WS_URL) {
    this.url = url
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url)
      this.ws.onopen = () => resolve()
      this.ws.onerror = (e) => reject(e)
      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          const handlers = this.handlers.get(msg.type) || []
          handlers.forEach(h => h(msg.data))
        } catch (e) {
          console.error('WS parse error:', e)
        }
      }
      this.ws.onclose = () => {
        console.log('WS disconnected')
      }
    })
  }

  on(type: string, handler: MessageHandler): void {
    if (!this.handlers.has(type)) this.handlers.set(type, [])
    this.handlers.get(type)!.push(handler)
  }

  send(type: string, data: any): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
    this.ws.send(JSON.stringify({ type, data }))
  }

  saveBattle(state: BattleState): void {
    this.send('save_battle', { battle: state, timestamp: Date.now() } as SaveData)
  }

  close(): void {
    this.ws?.close()
  }
}
