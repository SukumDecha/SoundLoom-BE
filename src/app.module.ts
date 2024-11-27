import { SharedModule } from './shared/shared.module'
import { Module } from '@nestjs/common'
import { MusicsModule } from './musics/musics.module'
import { RoomsModule } from './rooms/rooms.module'

@Module({
  imports: [MusicsModule, RoomsModule, SharedModule],
})
export class AppModule {}
