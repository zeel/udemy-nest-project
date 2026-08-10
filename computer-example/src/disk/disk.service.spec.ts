import { Test, TestingModule } from '@nestjs/testing';
import { DiskService } from './disk.service';
import { PowerService } from '../power/power.service';

describe('DiskService', () => {
  let service: DiskService;
  let powerService: PowerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiskService,
        {
          provide: PowerService,
          useValue: {
            supplyPower: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<DiskService>(DiskService);
    powerService = module.get<PowerService>(PowerService);

    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getData', () => {
    it('returns the data read from disk', () => {
      expect(service.getData()).toBe('Data read from disk!');
    });

    it('draws 20 watts of power from the power service', () => {
      service.getData();

      expect(powerService.supplyPower).toHaveBeenCalledTimes(1);
      expect(powerService.supplyPower).toHaveBeenCalledWith(20);
    });
  });
});
