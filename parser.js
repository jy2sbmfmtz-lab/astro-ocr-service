const DEG_REGEX = /([A-Za-z]+)\s+(\d{1,2})[°º]\s*(\d{1,2})?/g;

export function parsePlacementsFromText(text) {
  const placements = [];
  let match;

  while ((match = DEG_REGEX.exec(text)) !== null) {
    const body = match[1];
    const deg = Number(match[2]);
    const min = Number(match[3] || 0);

    placements.push({
      body,
      degree: deg + min / 60
    });
  }

  return placements;
}
