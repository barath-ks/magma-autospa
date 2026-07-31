export function validatePasswordStrength(password: string): { valid: boolean; error?: string } {
  if (password.length < 8) {
    return { valid: false, error: "Password must be at least 8 characters and include a letter, a number, and a special character" };
  }
  
  if (!/[a-zA-Z]/.test(password)) {
    return { valid: false, error: "Password must be at least 8 characters and include a letter, a number, and a special character" };
  }
  
  if (!/\d/.test(password)) {
    return { valid: false, error: "Password must be at least 8 characters and include a letter, a number, and a special character" };
  }
  
  if (!/[^a-zA-Z0-9]/.test(password)) {
    return { valid: false, error: "Password must be at least 8 characters and include a letter, a number, and a special character" };
  }

  return { valid: true };
}
