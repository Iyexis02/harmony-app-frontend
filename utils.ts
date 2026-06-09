import { User } from "next-auth";
import { AdapterUser } from "next-auth/adapters";
import { UserDto } from "./types";

const mapToUserDto = (user: User | AdapterUser): UserDto => {
    return {
        name: user?.name ?? null,
        email: user?.email ?? null,
        spotifyId: user?.id ?? null,
        imageUrl: user?.image ?? null
    }
}

export {
    mapToUserDto
}