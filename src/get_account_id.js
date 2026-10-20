const refreshToken = "1000.1944576dd06a509f5e003fe040f03720.69f6ef2e5ba726cb4fd0f7971a44acf3";
const clientId = "1000.7JIHLK8GCAYJ1JZPPNAWDYTMAED5CF";
const clientSecret = "cadd1ea081437bed2982c5e83327c84e54bccc2546";

async function getAccountId() {
  // 1. Get Access Token
  const tokenParams = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
  });

  const tokenRes = await fetch("https://accounts.zoho.com/oauth/v2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: tokenParams.toString(),
  });
  const tokenData = await tokenRes.json();

  if (!tokenData.access_token) {
    console.error("Access Token error:", tokenData);
    return;
  }

  // 2. Fetch Account Details
  const accountRes = await fetch("https://mail.zoho.com/api/v1/accounts", {
    headers: {
      Authorization: `Zoho-oauthtoken ${tokenData.access_token}`,
    },
  });

  const accountData = await accountRes.json();
  console.log("\n--- ZOHO ACCOUNT DETAILS ---");
  if (accountData.data && accountData.data.length > 0) {
    console.log("YOUR ZOHO_ACCOUNT_ID:", accountData.data[0].accountId);
  } else {
    console.log(JSON.stringify(accountData, null, 2));
  }
}

getAccountId();


