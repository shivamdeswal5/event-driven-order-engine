import { Injectable } from '@nestjs/common';

@Injectable()
export class AppHandler {
  public handle(): string {
    return 'Event-Driven Order Engine is running.';
  }
}
