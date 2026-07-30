import { Injectable } from '@nestjs/common';
import { PowerService } from '../power/power.service';

@Injectable()
export class DiskService {
  constructor(private powerService: PowerService) {}

  getData(): string {
    console.log(`Drawing 20 watts of power from the power supply!`);
    this.powerService.supplyPower(20);
    return 'Data read from disk!';
  }
}
