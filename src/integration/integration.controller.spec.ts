import { IntegrationController } from './integration.controller';
import { UnitService } from './unit.service';
import { HttpException } from '@nestjs/common';

describe('IntegrationController', () => {
  let controller: IntegrationController;
  let unitService: jest.Mocked<Partial<UnitService>>;
  let usersRepo: any;

  beforeEach(() => {
    unitService = {
      checkStatus: jest.fn(),
      createApplicationForm: jest.fn(),
    } as any;
    usersRepo = { findOne: jest.fn(), save: jest.fn() };
    controller = new IntegrationController(
      unitService as UnitService,
      usersRepo,
    );
  });

  it('status() delegates to UnitService.checkStatus', async () => {
    const mock = {
      status: 'UP',
      checkedAt: '2020-01-01T00:00:00Z',
      responseTimeMs: 10,
      target: 't',
    } as any;
    (unitService.checkStatus as jest.Mock).mockResolvedValue(mock);

    const res = await controller.status();
    expect(res).toBe(mock);
    expect(unitService.checkStatus).toHaveBeenCalledTimes(1);
  });

  it('createApplicationForm() returns id and token on success', async () => {
    const body = { tags: { a: '1' }, whiteLabelThemeId: 'theme_1' };
    const mock = {
      id: 'af_123',
      token: 'tok_abc',
      expiration: '2099-01-01T00:00:00Z',
    };
    (unitService.createApplicationForm as jest.Mock).mockResolvedValue(mock);

    const res = await controller.createApplicationForm(body);
    expect(res).toEqual(mock);
    expect(unitService.createApplicationForm).toHaveBeenCalledWith({
      tags: body.tags,
      whiteLabelThemeId: body.whiteLabelThemeId,
    });
  });

  it('createApplicationForm() throws HttpException on service error', async () => {
    (unitService.createApplicationForm as jest.Mock).mockRejectedValue(
      new Error('boom'),
    );

    await expect(controller.createApplicationForm({})).rejects.toBeInstanceOf(
      HttpException,
    );
  });
});
