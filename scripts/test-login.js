const testLogin = async (loginId, password, expectedRedirect) => {
  console.log(`Testing login for ${loginId}...`);
  
  // 1. Get CSRF token
  const csrfRes = await fetch("http://localhost:3000/api/auth/csrf");
  const csrfData = await csrfRes.json();
  const csrfToken = csrfData.csrfToken;
  const cookies = csrfRes.headers.get("set-cookie");

  // 2. Perform Login
  const loginBody = new URLSearchParams({
    csrfToken,
    login_id: loginId,
    password,
    redirect: "false",
  });

  const loginRes = await fetch("http://localhost:3000/api/auth/callback/credentials", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Cookie": cookies,
    },
    body: loginBody,
  });

  const loginData = await loginRes.json();
  if (loginData.error) {
    console.error(`❌ Failed to login ${loginId}: ${loginData.error}`);
    return false;
  }
  
  console.log(`✅ Login successful for ${loginId}. Checking dashboard access...`);
  
  // 3. Get session cookie
  const authCookies = loginRes.headers.get("set-cookie");
  
  // 4. Test accessing dashboard
  const dashRes = await fetch(`http://localhost:3000${expectedRedirect}`, {
    headers: {
      "Cookie": authCookies,
    },
    redirect: "manual" // don't automatically follow redirect
  });

  if (dashRes.status === 200) {
    console.log(`✅ Successfully reached ${expectedRedirect} dashboard!`);
  } else if (dashRes.status === 307 || dashRes.status === 302) {
    const location = dashRes.headers.get("location");
    console.error(`❌ Dashboard access rejected for ${loginId}. Redirected to ${location}`);
    return false;
  } else {
    console.error(`❌ Dashboard access failed for ${loginId}. Status: ${dashRes.status}`);
    return false;
  }

  console.log("---------------------------------------");
  return true;
};

const runTests = async () => {
  let allPassed = true;
  
  // Wait a few seconds for the server to be fully ready if needed
  await new Promise(r => setTimeout(r, 2000));

  allPassed &= await testLogin("MAG-0001", "password123", "/staff");
  allPassed &= await testLogin("MGR-0001", "password123", "/manager");
  allPassed &= await testLogin("ADM-0001", "password123", "/admin");

  if (allPassed) {
    console.log("🎉 ALL TESTS PASSED!");
  } else {
    console.log("⚠️ SOME TESTS FAILED.");
  }
};

runTests();
