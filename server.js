require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// 🔹 Step 1: Send user to Google login
app.get('/auth/google', (req, res) => {
  const redirectUri = 'https://accounts.google.com/o/oauth2/v2/auth';
  const params = new URLSearchParams({
    client_id: process.env.CLIENT_ID,
    redirect_uri: process.env.REDIRECT_URI,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
    access_type: 'offline',
    prompt: 'consent'
  });

  res.redirect(`${redirectUri}?${params.toString()}`);
});

// 🔹 Step 2: Handle redirect from Google
app.get('/oauth/google', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send('No code provided');

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

    // ✅ Get user's email
    const userInfo = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    const email = userInfo.data.email;
    console.log('User Email:', email);

    // ✅ Send token + email to n8n
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
