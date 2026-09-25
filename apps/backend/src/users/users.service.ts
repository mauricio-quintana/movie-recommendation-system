import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma/client.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaClient) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, createdAt: true },
    });

    if (!user?.username) {
      throw new UnauthorizedException('Authentication required');
    }

    return { id: user.id, username: user.username, createdAt: user.createdAt };
  }
}
