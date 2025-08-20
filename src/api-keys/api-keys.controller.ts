import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { UpdateApiKeyDto } from './dto/update-api-key.dto';
import { MockAdminGuard } from '../auth/mock-admin.guard';

@Controller('api/keys')
@UseGuards(MockAdminGuard)
export class ApiKeysController {
  constructor(private readonly service: ApiKeysService) {}

  @Post()
  async create(@Body() dto: CreateApiKeyDto) {
    return this.service.create(dto);
  }

  @Get()
  async list(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const lim = limit ? parseInt(limit, 10) : 20;
    const off = offset ? parseInt(offset, 10) : 0;
    return this.service.list(lim, off);
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.service.get(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateApiKeyDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.service.remove(id);
    return { status: 'ok' };
  }

  @Post(':id/activate')
  async activate(@Param('id') id: string) {
    return this.service.activate(id);
  }
}
