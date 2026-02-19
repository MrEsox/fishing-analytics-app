export function calculateAzimuth(lat1, lon1, lat2, lon2) {

  const toRad = (deg) => deg * Math.PI / 180;
  const toDeg = (rad) => rad * 180 / Math.PI;

  const dLon = toRad(lon2 - lon1);

  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);

  let brng = toDeg(Math.atan2(y, x));

  return (brng + 360) % 360;
}

export function calculateWindIncidence(windDirection, azimuth) {

  let diff = Math.abs(windDirection - azimuth);

  if (diff > 180) diff = 360 - diff;

  const score = 1 - (diff / 180);

  return Number(score.toFixed(3));
}
