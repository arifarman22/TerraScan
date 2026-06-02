import {
  ArrayMaxSize,
  IsArray,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateApiKeyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  /** Optional list of permission scopes. An empty array means full org access. */
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(50)
  @IsOptional()
  scopes?: string[];

  /** ISO-8601 timestamp at which the key stops working. */
  @IsISO8601()
  @IsOptional()
  expiresAt?: string;
}
