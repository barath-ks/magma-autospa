import { db } from "@/lib/db";

/**
 * Resolves all known equivalent identifiers for a branch (ID, Name, Code, Slug).
 * This ensures that whether a branch is referenced by:
 * - "branch-1"
 * - "Main Branch"
 * - "BRANCH-01"
 * - "main-branch"
 * they all resolve to the same normalized set of branch identifiers.
 */
export async function getBranchVariants(branchIdentifier?: string | null): Promise<string[]> {
  if (!branchIdentifier || !branchIdentifier.trim()) {
    return [];
  }

  const raw = branchIdentifier.trim();
  const slug = raw.toLowerCase().replace(/\s+/g, "-");

  try {
    const res = await db.query(
      `SELECT id, name, code, branch_code FROM branches 
            WHERE LOWER(id) = LOWER($1) 
               OR LOWER(name) = LOWER($2) 
               OR LOWER(code) = LOWER($3) 
               OR LOWER(branch_code) = LOWER($4) 
               OR REPLACE(LOWER(name), ' ', '-') = LOWER($5)
               OR REPLACE(LOWER(id), ' ', '-') = LOWER($6)
            LIMIT 1`,
      [raw, raw, raw, raw, slug, slug]
    );

    const set = new Set<string>();
    set.add(raw);
    set.add(slug);

    if (res.rows.length > 0) {
      const b = res.rows[0] as { id: string; name: string; code?: string | null; branch_code?: string | null };
      if (b.id) set.add(b.id);
      if (b.name) {
        set.add(b.name);
        set.add(b.name.toLowerCase().replace(/\s+/g, "-"));
      }
      if (b.code) set.add(b.code);
      if (b.branch_code) set.add(b.branch_code);
    }

    return Array.from(set);
  } catch (error) {
    console.error("[getBranchVariants] Error fetching branch variants:", error);
    return [raw, slug];
  }
}

/**
 * Checks if two branch identifiers represent the same branch or a permissible global scope.
 * 
 * - If entityBranch is null/empty, it represents GLOBAL scope (matches all branches).
 * - If targetBranch is null/empty (e.g. system admin), it has no branch restrictions (matches all).
 * - Otherwise checks if they are exact match or share branch variants (e.g. "Main Branch" vs "branch-1").
 */
export async function isBranchMatch(
  entityBranch: string | null | undefined, 
  targetBranch: string | null | undefined
): Promise<boolean> {
  // Global entity scope matches any branch
  if (!entityBranch || !entityBranch.trim()) {
    return true;
  }

  // Unrestricted target (e.g. admin) matches any entity
  if (!targetBranch || !targetBranch.trim()) {
    return true;
  }

  const entityClean = entityBranch.trim().toLowerCase();
  const targetClean = targetBranch.trim().toLowerCase();

  // Direct case-insensitive match
  if (entityClean === targetClean) {
    return true;
  }

  // Match via slugs (e.g. "main branch" vs "main-branch")
  const entitySlug = entityClean.replace(/\s+/g, "-");
  const targetSlug = targetClean.replace(/\s+/g, "-");
  if (entitySlug === targetSlug) {
    return true;
  }

  // Query database variants for both
  const [entityVariants, targetVariants] = await Promise.all([
    getBranchVariants(entityBranch),
    getBranchVariants(targetBranch)
  ]);

  const targetSet = new Set(targetVariants.map(v => v.toLowerCase()));
  for (const variant of entityVariants) {
    if (targetSet.has(variant.toLowerCase())) {
      return true;
    }
  }

  return false;
}

/**
 * Resolves any branch representation (name, code, slug) to its canonical branch ID.
 * If not found or null, returns the original input or null.
 */
export async function resolveCanonicalBranchId(branchIdentifier?: string | null): Promise<string | null> {
  if (!branchIdentifier || !branchIdentifier.trim()) {
    return null;
  }

  const raw = branchIdentifier.trim();

  try {
    const slug = raw.toLowerCase().replace(/\s+/g, "-");
    const res = await db.query(
      `SELECT id FROM branches 
            WHERE LOWER(id) = LOWER($1) 
               OR LOWER(name) = LOWER($2) 
               OR LOWER(code) = LOWER($3) 
               OR LOWER(branch_code) = LOWER($4) 
               OR REPLACE(LOWER(name), ' ', '-') = LOWER($5)
               OR REPLACE(LOWER(id), ' ', '-') = LOWER($6)
            LIMIT 1`,
      [raw, raw, raw, raw, slug, slug]
    );

    if (res.rows.length > 0) {
      return res.rows[0].id as string;
    }
    return raw;
  } catch (error) {
    console.error("[resolveCanonicalBranchId] Error resolving branch ID:", error);
    return raw;
  }
}
