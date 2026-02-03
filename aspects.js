const ASPECTS = [
  { name: "Congiunzione", angle: 0, orb: 8 },
  { name: "Opposizione", angle: 180, orb: 8 },
  { name: "Trigono", angle: 120, orb: 6 },
  { name: "Quadratura", angle: 90, orb: 6 },
  { name: "Sestile", angle: 60, orb: 4 },
  { name: "Semisestile", angle: 30, orb: 2 },
  { name: "Sesquiquadrato", angle: 135, orb: 2 },
  { name: "Quincunce", angle: 150, orb: 2 }
];

export function computeAspects(placements) {
  const aspects = [];

  for (let i = 0; i < placements.length; i++) {
    for (let j = i + 1; j < placements.length; j++) {
      const p1 = placements[i];
      const p2 = placements[j];
      const diff = Math.abs(p1.degree - p2.degree);

      for (const a of ASPECTS) {
        if (Math.abs(diff - a.angle) <= a.orb) {
          aspects.push({
            between: [p1.body, p2.body],
            type: a.name,
            exact_diff: diff.toFixed(2)
          });
        }
      }
    }
  }

  return aspects;
}
