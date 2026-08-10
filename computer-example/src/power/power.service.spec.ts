import { Test, TestingModule } from '@nestjs/testing';
import { PowerService } from './power.service';

describe('PowerService', () => {
  let service: PowerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PowerService],
    }).compile();

    service = module.get<PowerService>(PowerService);

    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('supplyPower', () => {
    it('logs the amount of power supplied', () => {
      service.supplyPower(50);

      expect(console.log).toHaveBeenCalledWith('Power supplied: 50 watts!');
    });

    it('logs whatever wattage it is given', () => {
      service.supplyPower(10);
      service.supplyPower(20);

      expect(console.log).toHaveBeenNthCalledWith(1, 'Power supplied: 10 watts!');
      expect(console.log).toHaveBeenNthCalledWith(2, 'Power supplied: 20 watts!');
    });
  });
});
