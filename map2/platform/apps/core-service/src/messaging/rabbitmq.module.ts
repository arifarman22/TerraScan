import { Global, Module } from '@nestjs/common';
import { RabbitMQService } from './rabbitmq.service';

/** Global so every feature module can publish domain events. */
@Global()
@Module({
  providers: [RabbitMQService],
  exports: [RabbitMQService],
})
export class RabbitMQModule {}
