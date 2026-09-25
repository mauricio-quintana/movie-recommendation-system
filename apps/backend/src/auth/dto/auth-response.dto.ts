import { ApiProperty } from '@nestjs/swagger';

export class AuthUserDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ example: 'movie_fan' })
  username: string;
}

export class AuthResultDto {
  @ApiProperty({ type: AuthUserDto })
  user: AuthUserDto;
}

export class SessionDto {
  @ApiProperty()
  authenticated: boolean;

  @ApiProperty({ type: AuthUserDto, nullable: true })
  user: AuthUserDto | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  expiresAt: Date | null;
}
