import { db } from "./db";
import bcrypt from "bcryptjs";

/**
 * Checks if a proposed plaintext password has been used before by this user.
 * 
 * @param userId - The user's ID
 * @param newPlaintextPassword - The proposed new password
 * @param currentHash - The current password hash (optional, but highly recommended so it doesn't need to be fetched again if already known)
 * @returns true if the password has been used before (reuse detected), false if it is a new password
 */
export async function checkPasswordReuse(userId: string, newPlaintextPassword: string, currentHash?: string): Promise<boolean> {
  // Fetch historical hashes
  const history = await db.query(
    "SELECT password_hash FROM password_history WHERE user_id = $1",
    [userId]
  );
  
  const hashes = history.rows.map(r => r.password_hash as string);
  
  // Include current hash if provided and not already in the list
  if (currentHash && !hashes.includes(currentHash)) {
    hashes.push(currentHash);
  }

  // Compare against all hashes
  // Note: For large histories, we could run these in parallel with Promise.all,
  // but keeping it sequential or small batches is safer for event loop blocking 
  // since bcrypt is CPU intensive. With a typical user history (e.g. < 20 passwords),
  // this is acceptable.
  for (const hash of hashes) {
    if (await bcrypt.compare(newPlaintextPassword, hash)) {
      return true; // Password has been used before
    }
  }

  return false; // Password is new
}
