export type MovieNightUserName = "Britton" | "Nabi" | "Alex";

export type MovieNightUser = {
  name: MovieNightUserName;
  admin: boolean; // Only Britton is admin
};

export const AUTH_LOCALSTORAGE_KEY = "movieNight:user";

export const USER_PASSWORDS: Record<MovieNightUserName, string> = {
  Britton: "3399",
  Nabi: "3388",
  Alex: "3388",
};

export const USER_ADMIN_FLAGS: Record<MovieNightUserName, boolean> = {
  Britton: true,
  Nabi: false,
  Alex: false,
};

