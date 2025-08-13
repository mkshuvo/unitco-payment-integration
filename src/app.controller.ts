import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // Simple healthcheck endpoint for container health probes
  @Get('health')
  health(): { status: string } {
    return { status: 'ok' };
  }
}
