export async function getGoCardlessToken() {
  const secretId = process.env.GOCARDLESS_SECRET_ID;
  const secretKey = process.env.GOCARDLESS_SECRET_KEY;

  if (!secretId || !secretKey) {
    throw new Error("Missing GoCardless API keys in environment variables.");
  }

  const response = await fetch("https://bankaccountdata.gocardless.com/api/v2/token/new/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      secret_id: secretId,
      secret_key: secretKey,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error("Token Error:", errorData);
    throw new Error("Failed to authenticate with GoCardless");
  }

  const data = await response.json();
  return data.access; // This is our golden ticket (valid for 24 hours)
}