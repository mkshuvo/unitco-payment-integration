import { Controller, Get } from '@nestjs/common';
import { UnitService } from './unit.service';

@Controller('integration/unit')
export class IntegrationController {
  constructor(private readonly unit: UnitService) {}

  @Get('status')
  async status() {
    return this.unit.checkStatus();
  }
}
