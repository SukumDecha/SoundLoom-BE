import { Music } from 'src/modules/musics/entities/music.entity'

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
      playing: boolean
    }
    room: {
      password: string
      allowAnyoneControl: boolean
    }
  }
}
