const clientId = "1000.7JIHLK8GCAYJ1JZPPNAWDYTMAED5CF";
const clientSecret = "cadd1ea081437bed2982c5e83327c84e54bccc2546";
const code = "1000.0f7af7ec3741ff6e0ce198a2e27cb61b.6adac8194bb81414fff495a609e0fc98"; 

async function getToken() {
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "authorization_code",
    code: code,
  });

  const response = await fetch("https://accounts.zoho.com/oauth/v2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  const data = await response.json();
  console.log("\n--- ZOHO TOKEN RESPONSE ---");
  console.log(data);
}

getToken();

