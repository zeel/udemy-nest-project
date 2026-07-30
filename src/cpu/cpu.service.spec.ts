import { Test, TestingModule } from '@nestjs/testing';
import { CpuService } from './cpu.service';
import { PowerService } from '../power/power.service';

describe('CpuService', () => {
  let service: CpuService;
  let powerService: PowerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CpuService,
        {
          provide: PowerService,
          useValue: {
            supplyPower: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CpuService>(CpuService);
    powerService = module.get<PowerService>(PowerService);

    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('compute', () => {
    it('returns the sum of its two arguments', () => {
      expect(service.compute(1, 2)).toBe(3);
      expect(service.compute(-5, 5)).toBe(0);
      expect(service.compute(0, 0)).toBe(0);
    });

    it('draws 10 watts of power from the power service', () => {
      service.compute(1, 2);

      expect(powerService.supplyPower).toHaveBeenCalledTimes(1);
      expect(powerService.supplyPower).toHaveBeenCalledWith(10);
    });
  });
});
