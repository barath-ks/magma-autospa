fetch("http://localhost:3000/api/admin/users/reset-password", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: "{}"
}).then(async r => {
  console.log("Status:", r.status);
  console.log("Body:", await r.text());
}).catch(console.error);
