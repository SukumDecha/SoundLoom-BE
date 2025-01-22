import { Module, Global } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { CacheModule } from '@nestjs/cache-manager'
import { redisStore } from 'cache-manager-redis-store'

@Global()
@Module({
  imports: [
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath:
        process.env.NODE_ENV === 'production' ? '.env' : '.env.development',
    }),
    CacheModule.registerAsync<any>({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const host = configService.get('REDIS_HOST')
        const port = configService.get('REDIS_PORT')

        const storeConfig = {
          url: `redis://${host}:${port}`,
        }

        const store = await redisStore(storeConfig)
        return { store: () => store }
      },
    }),
  ],
  exports: [HttpModule, CacheModule],
})
export class SharedModule {}
