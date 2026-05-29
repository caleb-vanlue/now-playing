// USERNAME_MAP format: "OriginalName:DisplayName,OtherName:OtherDisplay"
const raw = process.env.USERNAME_MAP || "";

const usernameMap: Map<string, string> = new Map();

if (raw) {
  raw.split(",").forEach((pair) => {
    const colonIdx = pair.indexOf(":");
    if (colonIdx > 0) {
      const key = pair.slice(0, colonIdx).trim();
      const val = pair.slice(colonIdx + 1).trim();
      if (key && val) usernameMap.set(key, val);
    }
  });
}

export function applyUsernameMap(name: string): string {
  return usernameMap.get(name) ?? name;
}
