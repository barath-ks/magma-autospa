import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getBranchVariants } from "@/lib/branch-utils";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any).role;
  const allowedRoles = ["manager", "admin", "branch", "staff"];
  if (!allowedRoles.includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const queryBranch = searchParams.get("branch_id") || searchParams.get("branch");
  const sessionBranch = (session.user as any).branch_id;
  const effectiveBranch = queryBranch || sessionBranch;

  try {
    // If admin and no branch is requested, return all active offers
    if (role === "admin" && !effectiveBranch) {
      const res = await db.query(`SELECT * FROM offers WHERE is_active = TRUE ORDER BY points_required ASC`, []);
      return NextResponse.json({ offers: res.rows });
    }

    // If an effective branch is identified, normalize across ID, Name, Code, and Slug
    if (effectiveBranch) {
      const variants = await getBranchVariants(effectiveBranch);
      const placeholders = variants.map((_, idx) => `$${idx + 1}`).join(", ");

      const res = await db.query(
        `SELECT * FROM offers 
              WHERE is_active = TRUE 
                AND (branch_id IS NULL OR branch_id = '' OR branch_id IN (${placeholders}))
              ORDER BY points_required ASC`,
        variants
      );

      return NextResponse.json({ offers: res.rows });
    }

    // Fallback: global offers only
    const res = await db.query(
      `SELECT * FROM offers 
            WHERE is_active = TRUE 
              AND (branch_id IS NULL OR branch_id = '') 
            ORDER BY points_required ASC`,
      []
    );

    return NextResponse.json({ offers: res.rows });
  } catch (error) {
    console.error("[GET /api/manager/offers] Database error:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
