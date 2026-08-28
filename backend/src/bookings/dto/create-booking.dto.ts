import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsString, Matches } from 'class-validator';

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export class CreateBookingDto {
  @ApiProperty({ example: 'clx1a2b3c0000abcd1234efgh', description: 'Court ID to book' })
  @IsString()
  @IsNotEmpty()
  courtId: string;

  @ApiProperty({ example: '2026-09-15', description: 'Booking date (YYYY-MM-DD)' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: '14:00', description: 'Slot start time (HH:mm)' })
  @IsString()
  @Matches(TIME_REGEX, { message: 'startTime must be HH:mm format (e.g. 14:00)' })
  startTime: string;

  @ApiProperty({ example: '15:00', description: 'Slot end time (HH:mm)' })
  @IsString()
  @Matches(TIME_REGEX, { message: 'endTime must be HH:mm format (e.g. 15:00)' })
  endTime: string;
}
