import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateVenueDto {
  @ApiProperty({ example: 'Colombo Sports Complex' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '42, Galle Road, Colombo 03' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ example: 'Colombo' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiPropertyOptional({ example: 'Premium indoor sports facility with 6 courts' })
  @IsString()
  @IsOptional()
  description?: string;
}
