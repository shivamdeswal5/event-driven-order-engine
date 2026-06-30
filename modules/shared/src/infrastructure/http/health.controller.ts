import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { EntityManager } from '@mikro-orm/postgresql';
import { RabbitmqConnectionService } from '../message-bus/rabbitmq/config/rabbitmq-connection.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly em: EntityManager,
    private readonly rabbitmqConnection: RabbitmqConnectionService,
  ) {}

  @Get()
  async check(@Res({ passthrough: true }) res: Response) {
    let dbHealthy = false;
    let rabbitmqHealthy = false;

    try {
      // Check database connection by running a simple select query
      await this.em.getConnection().execute('SELECT 1');
      dbHealthy = true;
    } catch (error) {
      console.error('Health Check - Database error:', error);
    }

    try {
      // Check RabbitMQ status
      const channel = this.rabbitmqConnection.getChannel() as unknown;
      if (channel) {
        rabbitmqHealthy = true;
      } else {
        // Since HTTP app is not persistent client, open/close a brief connection to verify broker is reachable
        const tempConn = (await this.rabbitmqConnection.createConnection()) as {
          close: () => Promise<void>;
        };
        await tempConn.close();
        rabbitmqHealthy = true;
      }
    } catch (error) {
      console.error('Health Check - RabbitMQ error:', error);
    }

    const overallHealthy = dbHealthy && rabbitmqHealthy;
    res.status(overallHealthy ? 200 : 503);

    return {
      status: overallHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      details: {
        database: {
          status: dbHealthy ? 'up' : 'down',
        },
        rabbitmq: {
          status: rabbitmqHealthy ? 'up' : 'down',
        },
      },
    };
  }
}
