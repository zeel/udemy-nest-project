import { Transform } from 'class-transformer';
import {
  IsLatitude,
  IsLongitude,
  IsNumber,
  IsString,
  Max,
  Min,
} from 'class-validator';

// Query params always arrive as strings, so each numeric field is coerced
// before validation. This relies on the global ValidationPipe running with
// `transform: true`, otherwise the handler receives the raw strings.
export class GetEstimateDto {
  @IsString()
  make!: string;

  @IsString()
  model!: string;

  @Transform(({ value }) => parseInt(value as string))
  @IsNumber()
  @Min(1930)
  @Max(2050)
  year!: number;

  @Transform(({ value }) => parseInt(value as string))
  @IsNumber()
  @Min(0)
  @Max(1000000)
  mileage!: number;

  @Transform(({ value }) => parseFloat(value as string))
  @IsLongitude()
  lng!: number;

  @Transform(({ value }) => parseFloat(value as string))
  @IsLatitude()
  lat!: number;
}
