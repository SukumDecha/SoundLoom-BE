import { Room } from '../entities/room.entity'

export class UpdateRoomDto {
  roomId: string
  updatedRoom: Partial<Room>
}
