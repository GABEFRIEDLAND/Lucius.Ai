require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/oauth/google', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send('No code provided');

  console.log('Client ID:', process.env.CLIENT_ID);
  console.log('Client Secret:', process.env.CLIENT_SECRET);
  console.log('Redirect URI:', process.env.REDIRECT_URI);

  try {
    const response = await axios.post('https://oauth2.googleapis.com/token', null, {
      params: {
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        redirect_uri: process.env.REDIRECT_URI,
        grant_type: 'authorization_code',
        code: code,
      },
    });

    const tokens = response.data;
    console.log('Access Token:', tokens.access_token);

    // ✅ NEW: Get user's email from Google
    const userInfo = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    const email = userInfo.data.email;
    console.log('User Email:', email);

    // ✅ NEW: Send token + email to n8n
    await axios.post('https://gabefriedland.app.n8n.cloud/webhook/google-auth', {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      email: email,
    });

    res.send('OAuth flow complete. Token sent to n8n.');
  } catch (err) {
    console.error('Token error:', err.response?.data || err.message, err.response?.status);
    res.status(500).send('Failed to get token');
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
