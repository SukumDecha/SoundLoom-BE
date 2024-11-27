import { PartialType } from '@nestjs/mapped-types'
import { Room } from '../entities/room.entity'

export class UpdateRoomDto {
  roomId: string
  settings: Partial<Room['settings']>
}
