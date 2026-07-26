import { authOptions } from "../lib/auth";

async function testRoles() {
  const provider = authOptions.providers[0] as any;
  const authorize = provider.options.authorize;

  const usersToTest = [
    { login_id: "MAG-0001", password: "password123" },
    { login_id: "MGR-0001", password: "password123" },
    { login_id: "ADM-0001", password: "password123" },
  ];

  for (const creds of usersToTest) {
    console.log(`Testing authorize for ${creds.login_id}...`);
    try {
      const user = await authorize(creds);
      if (user) {
        console.log(`✅ Success! Retrieved user:`, { id: user.id, role: user.role, login_id: creds.login_id });
      } else {
        console.log(`❌ Failed: Returned null for ${creds.login_id}`);
      }
    } catch (e) {
      console.error(`❌ Error during authorize for ${creds.login_id}:`, e);
    }
  }
}

testRoles();
