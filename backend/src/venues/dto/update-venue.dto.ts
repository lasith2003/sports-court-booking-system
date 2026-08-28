import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateVenueDto {
  @ApiPropertyOptional({ example: 'Colombo Sports Hub' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: '55, Duplication Road, Colombo 05' })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ example: 'Kandy' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ example: 'Updated description' })
  @IsString()
  @IsOptional()
  description?: string;
}
