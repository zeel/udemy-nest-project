/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { ComputerController } from './computer.controller';
import { CpuService } from '../cpu/cpu.service';
import { DiskService } from '../disk/disk.service';

describe('ComputerController', () => {
  let controller: ComputerController;
  let cpuService: CpuService;
  let diskService: DiskService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ComputerController],
      providers: [
        {
          provide: CpuService,
          useValue: {
            compute: jest.fn(function (this: void, a: number, b: number) {
              return 3;
            }),
          },
        },
        {
          provide: DiskService,
          useValue: {
            getData: jest.fn(function (this: void) {
              return 'Data read from disk!';
            }),
          },
        },
      ],
    }).compile();

    controller = module.get<ComputerController>(ComputerController);
    cpuService = module.get<CpuService>(CpuService);
    diskService = module.get<DiskService>(DiskService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('run', () => {
    it('returns the combined results of the cpu and disk services', () => {
      expect(controller.run()).toEqual([3, 'Data read from disk!']);
    });

    it('computes 1 + 2 using the cpu service', () => {
      controller.run();

      expect(cpuService.compute).toHaveBeenCalledTimes(1);
      expect(cpuService.compute).toHaveBeenCalledWith(1, 2);
    });

    it('reads data from the disk service', () => {
      controller.run();

      expect(diskService.getData).toHaveBeenCalledTimes(1);
    });
  });
});
