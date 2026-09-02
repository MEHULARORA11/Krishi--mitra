const axios = require('axios');

let cachedToken = null;
let tokenExpiry = null;

const getAccessToken = async () => {
  // Return cached token if it's still valid (leaving a 1-minute buffer)
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry - 60000) {
    return cachedToken;
  }

  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: process.env.COPERNICUS_CLIENT_ID,
    client_secret: process.env.COPERNICUS_CLIENT_SECRET
  });

  const response = await axios.post(
    'https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token',
    params.toString(),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );

  cachedToken = response.data.access_token;
  // Convert expires_in (seconds) to absolute millisecond timestamp
  tokenExpiry = Date.now() + (response.data.expires_in * 1000); 

  return cachedToken;
};

module.exports = { getAccessToken };
