import prisma from "../config/prisma.ts";

export async function getUserById(userId: string) {
    return prisma.user.findUnique({
        where: { id: userId },
    });
}

export async function getPublicUserById(userId: string) {
    return prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            name: true,
            bio: true,
            image: true,
        },
    });
}