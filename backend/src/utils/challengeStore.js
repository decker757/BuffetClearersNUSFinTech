// Temporary in-memory storage for challenges (use Redis in production)
const challenges = new Map();

export function storeChallenge(address, challenge) {
  challenges.set(address, {
    challenge,
    expires: Date.now() + 300000, // 5 minutes
  });
}

export function getChallenge(address) {
  return challenges.get(address);
}

export function deleteChallenge(address) {
  challenges.delete(address);
}

// Clean up expired challenges periodically
setInterval(() => {
  const now = Date.now();
  for (const [address, data] of challenges.entries()) {
    if (data.expires < now) {
      challenges.delete(address);
    }
  }
}, 60000); // Every minute
