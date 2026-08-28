import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { SportType } from '@prisma/client';

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export class CreateCourtDto {
  @ApiProperty({ example: 'Badminton Court A' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: SportType })
  @IsEnum(SportType)
  sportType: SportType;

  @ApiProperty({ example: '800', description: 'Price per hour in LKR' })
  @IsNumberString()
  pricePerHour: string;

  @ApiProperty({ example: '06:00', description: 'Opening time (HH:mm 24hr)' })
  @IsString()
  @Matches(TIME_REGEX, { message: 'openingTime must be HH:mm format (e.g. 06:00)' })
  openingTime: string;

  @ApiProperty({ example: '22:00', description: 'Closing time (HH:mm 24hr)' })
  @IsString()
  @Matches(TIME_REGEX, { message: 'closingTime must be HH:mm format (e.g. 22:00)' })
  closingTime: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  imageUrl?: string;
}
