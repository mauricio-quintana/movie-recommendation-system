import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches } from 'class-validator';

// Mirrors the Better Auth username plugin defaults so invalid input fails with a clean 400.
export class CredentialsDto {
  @ApiProperty({
    example: 'movie_fan',
    minLength: 3,
    maxLength: 30,
    pattern: '^[a-zA-Z0-9_.]+$',
  })
  @IsString()
  @Length(3, 30)
  @Matches(/^[a-zA-Z0-9_.]+$/, {
    message: 'username may only contain letters, numbers, underscores and dots',
  })
  username: string;

  @ApiProperty({
    example: 'correct-horse-battery',
    minLength: 8,
    maxLength: 128,
  })
  @IsString()
  @Length(8, 128)
  password: string;
}
