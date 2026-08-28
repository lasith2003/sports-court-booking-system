import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNumberString,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { SportType } from '@prisma/client';

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export class UpdateCourtDto {
  @ApiPropertyOptional({ example: 'Badminton Court B' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ enum: SportType })
  @IsEnum(SportType)
  @IsOptional()
  sportType?: SportType;

  @ApiPropertyOptional({ example: '1000' })
  @IsNumberString()
  @IsOptional()
  pricePerHour?: string;

  @ApiPropertyOptional({ example: '07:00' })
  @IsString()
  @Matches(TIME_REGEX, { message: 'openingTime must be HH:mm format' })
  @IsOptional()
  openingTime?: string;

  @ApiPropertyOptional({ example: '23:00' })
  @IsString()
  @Matches(TIME_REGEX, { message: 'closingTime must be HH:mm format' })
  @IsOptional()
  closingTime?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  imageUrl?: string;
}
