import { Module, Global } from '@nestjs/common';
import { ElasticsearchModule } from '@nestjs/elasticsearch';
import { ConfigService } from '@nestjs/config';

@Global()
@Module({
    imports: [
        ElasticsearchModule.registerAsync({
            inject: [ConfigService],
            useFactory: async (configService: ConfigService) => ({
                node: configService.get<string>('elasticsearch.node'),
            }),
        }),
    ],
    exports: [ElasticsearchModule],
})
export class SharedElasticsearchModule { }
