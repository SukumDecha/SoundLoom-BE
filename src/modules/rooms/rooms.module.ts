import { Module } from '@nestjs/common'
import { RoomsService } from './rooms.service'
import { RoomGateway } from './rooms.gateway'

@Module({
  providers: [RoomGateway, RoomsService],
})
export class RoomsModule {}
