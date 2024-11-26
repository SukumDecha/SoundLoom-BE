import { SharedModule } from './shared/shared.module';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MusicsModule } from './musics/musics.module';
import { RoomsModule } from './rooms/rooms.module';

@Module({
  imports: [MusicsModule, RoomsModule, SharedModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
