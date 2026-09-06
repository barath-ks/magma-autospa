import { authOptions } from "../lib/auth";

async function verifyPortalBoundaries() {
  console.log("================================================================");
  console.log("VERIFYING DEDICATED MULTI-PORTAL LOGIN & STRICT ROLE BOUNDARIES");
  console.log("================================================================");

  const provider = authOptions.providers[0] as any;
  const authorize = provider.options.authorize;

  let allPassed = true;

  const testAuth = async (
    label: string,
    creds: { login_id: string; password: string; portal?: string },
    expectedOutcome: "SUCCESS" | "REJECT",
    expectedRole?: string
  ) => {
    try {
      const result = await authorize(creds);
      if (expectedOutcome === "SUCCESS") {
        if (result && (!expectedRole || result.role === expectedRole)) {
          console.log(`  ✅ [PASS] ${label}: Authenticated successfully as '${result.role}'.`);
          return true;
        } else {
          console.error(`  ❌ [FAIL] ${label}: Expected role '${expectedRole}', but got:`, result);
          allPassed = false;
          return false;
        }
      } else {
        console.error(`  ❌ [FAIL] ${label}: Expected REJECTION, but authentication succeeded:`, result);
        allPassed = false;
        return false;
      }
    } catch (err: any) {
      if (expectedOutcome === "REJECT") {
        console.log(`  ✅ [PASS] ${label}: Correctly blocked with boundary guard: "${err?.message || err}"`);
        return true;
      } else {
        console.error(`  ❌ [FAIL] ${label}: Expected SUCCESS, but threw error:`, err?.message || err);
        allPassed = false;
        return false;
      }
    }
  };

  // -------------------------------------------------------------
  // GROUP 1: BRANCH FLOOR PORTAL (portal: 'branch')
  // -------------------------------------------------------------
  console.log("\n[1] Testing Branch Floor Portal Boundary ('/branch/login')...");
  await testAuth(
    "Authorized Branch email login",
    { login_id: "main@magma-autospa.com", password: "Magma@123", portal: "branch" },
    "SUCCESS",
    "branch"
  );
  await testAuth(
    "Authorized Branch code login",
    { login_id: "MAG-BRANCH-01", password: "Magma@123", portal: "branch" },
    "SUCCESS",
    "branch"
  );
  await testAuth(
    "Cross-portal block: Admin credentials on Branch portal",
    { login_id: "TEST_ADMIN", password: "Magma@123", portal: "branch" },
    "REJECT"
  );
  await testAuth(
    "Cross-portal block: Manager credentials on Branch portal",
    { login_id: "test_manager", password: "Magma@123", portal: "branch" },
    "REJECT"
  );

  // -------------------------------------------------------------
  // GROUP 2: EXECUTIVE ADMIN PORTAL (portal: 'admin')
  // -------------------------------------------------------------
  console.log("\n[2] Testing Executive Admin Portal Boundary ('/admin/login')...");
  await testAuth(
    "Authorized Admin login (TEST_ADMIN)",
    { login_id: "TEST_ADMIN", password: "Magma@123", portal: "admin" },
    "SUCCESS",
    "admin"
  );
  await testAuth(
    "Cross-portal block: Manager credentials on Admin portal",
    { login_id: "test_manager", password: "Magma@123", portal: "admin" },
    "REJECT"
  );
  await testAuth(
    "Cross-portal block: Branch profile on Admin portal",
    { login_id: "main@magma-autospa.com", password: "Magma@123", portal: "admin" },
    "REJECT"
  );

  // -------------------------------------------------------------
  // GROUP 3: MANAGER OPERATIONS PORTAL (portal: 'manager')
  // -------------------------------------------------------------
  console.log("\n[3] Testing Manager Operations Portal Boundary ('/manager/login')...");
  await testAuth(
    "Authorized Manager login",
    { login_id: "test_manager", password: "Magma@123", portal: "manager" },
    "SUCCESS",
    "manager"
  );
  await testAuth(
    "Cross-portal block: Branch profile on Manager portal",
    { login_id: "main@magma-autospa.com", password: "Magma@123", portal: "manager" },
    "REJECT"
  );

  // -------------------------------------------------------------
  // GROUP 4: UNIFIED GATEWAY (portal: undefined)
  // -------------------------------------------------------------
  console.log("\n[4] Testing Unified Gateway Resolution ('/login')...");
  await testAuth(
    "Branch resolution at gateway",
    { login_id: "main@magma-autospa.com", password: "Magma@123" },
    "SUCCESS",
    "branch"
  );
  await testAuth(
    "Manager resolution at gateway",
    { login_id: "test_manager", password: "Magma@123" },
    "SUCCESS",
    "manager"
  );
  await testAuth(
    "Admin resolution at gateway",
    { login_id: "TEST_ADMIN", password: "Magma@123" },
    "SUCCESS",
    "admin"
  );
  await testAuth(
    "Retired staff rejection",
    { login_id: "MAG-0001", password: "password123" },
    "REJECT"
  );

  console.log("\n================================================================");
  if (allPassed) {
    console.log("🎉 ALL MULTI-PORTAL ROLE BOUNDARY VERIFICATIONS PASSED!");
  } else {
    console.error("⚠️ SOME BOUNDARY VERIFICATIONS FAILED.");
    process.exit(1);
  }
  console.log("================================================================");
}

verifyPortalBoundaries()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Verification suite encountered an error:", err);
    process.exit(1);
  });
