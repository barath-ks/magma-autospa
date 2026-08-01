const http = require('http');

async function loginAndFetch() {
  // Login as manager
  const loginRes = await fetch("http://localhost:3000/api/auth/callback/credentials", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      login_id: "mgr_dwntwn", // Manager of Downtown
      password: "password123"
    })
  });
  
  const cookie = loginRes.headers.get("set-cookie");
  if (!cookie) {
    console.error("Login failed");
    return;
  }
  
  // Hit admin endpoint
  const adminRes = await fetch("http://localhost:3000/api/admin/customers", {
    headers: {
      "Cookie": cookie
    }
  });
  
  console.log("Admin Endpoint Response Status:", adminRes.status);
  const data = await adminRes.json();
  console.log("Admin Endpoint Data:", data);
}

loginAndFetch();
