export function generateCompliantPassword(length = 16) {
  const lowers = "abcdefghijklmnopqrstuvwxyz";
  const uppers = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const digits = "0123456789";
  const specials = "!@#$%^&*()-_=+[]{};:,.?/";
  const all = lowers + uppers + digits + specials;

  const pick = (chars) => chars[Math.floor(Math.random() * chars.length)];

  const required = [pick(lowers), pick(uppers), pick(digits), pick(specials)];
  const remainingLength = Math.max(length - required.length, 0);
  const remaining = Array.from({ length: remainingLength }, () => pick(all));

  // Shuffle
  const passwordArray = [...required, ...remaining];
  for (let i = passwordArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [passwordArray[i], passwordArray[j]] = [passwordArray[j], passwordArray[i]];
  }
  return passwordArray.join("");
}
