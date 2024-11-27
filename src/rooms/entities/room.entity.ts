import { Music } from 'src/musics/entities/music.entity'

export class Room {
  id?: string
  host: string // Session ID

  currentListeners: number
  currentMusic: Music
  queues: Music[]

  settings: {
    music: {
      loop: boolean
      shuffle: boolean
      volume: number
    }
    room: {
      password: string
      allowAnyoneControl: boolean
    }
  }
}
