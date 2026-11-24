/** One seeded shuffle, saved as content: stable across clients, sessions and renders. */
export const CHARACTER_VOICES: Readonly<Record<string, { pool: "male" | "female"; clipId: string; file: string }>> = {
  "cast-daniel": { pool: "male", clipId: "male-5", file: "/audio/voices/male-5.mp3" },
  "cast-jim-young": { pool: "male", clipId: "male-6", file: "/audio/voices/male-6.mp3" },
  "cast-tim": { pool: "male", clipId: "male-4", file: "/audio/voices/male-4.mp3" },
  "cast-tony": { pool: "male", clipId: "male-2", file: "/audio/voices/male-2.mp3" },
  "cast-jacob-ramirez": { pool: "male", clipId: "male-1", file: "/audio/voices/male-1.mp3" },
  "cast-zach": { pool: "male", clipId: "male-5", file: "/audio/voices/male-5.mp3" },
  "cast-jorge": { pool: "male", clipId: "male-6", file: "/audio/voices/male-6.mp3" },
  "cast-richard-wang": { pool: "male", clipId: "male-4", file: "/audio/voices/male-4.mp3" },
  "cast-steve": { pool: "male", clipId: "male-2", file: "/audio/voices/male-2.mp3" },
  "cast-walter": { pool: "male", clipId: "male-1", file: "/audio/voices/male-1.mp3" },
  "cast-courtney": { pool: "male", clipId: "male-5", file: "/audio/voices/male-5.mp3" },
  "cast-samantha": { pool: "female", clipId: "female-4", file: "/audio/voices/female-4.mp3" },
  "cast-esther-morgan": { pool: "female", clipId: "female-3", file: "/audio/voices/female-3.mp3" },
  "cast-michelle": { pool: "female", clipId: "female-5", file: "/audio/voices/female-5.mp3" },
  "cast-jessica-adlock": { pool: "female", clipId: "female-2", file: "/audio/voices/female-2.mp3" },
  "cast-maria": { pool: "female", clipId: "female-6", file: "/audio/voices/female-6.mp3" },
};
