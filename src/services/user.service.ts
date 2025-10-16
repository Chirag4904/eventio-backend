import prisma from "../config/prisma.ts";

export async function getUserById(userId: string) {
    return prisma.user.findUnique({
        where: { id: userId },
    });
}