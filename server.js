const express = require('express');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static('public'));

// ===== AUTH ROUTES =====

// Login route
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email dan password wajib diisi' });
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(401).json({ error: error.message });
    }

    // Simpan session di cookie
    res.cookie('session', data.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24 jam
    });

    res.json({
      success: true,
      message: 'Login berhasil',
      user: data.user.email,
    });
  } catch (err) {
    res.status(500).json({ error: 'Terjadi kesalahan: ' + err.message });
  }
});

// Register route
app.post('/api/register', async (req, res) => {
  const { email, password, confirmPassword, fullName } = req.body;

  if (!email || !password || !confirmPassword || !fullName) {
    return res.status(400).json({ error: 'Semua field wajib diisi' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Password tidak sama' });
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      success: true,
      message: 'Registrasi berhasil. Silakan cek email untuk verifikasi.',
    });
  } catch (err) {
    res.status(500).json({ error: 'Terjadi kesalahan: ' + err.message });
  }
});

// Reset password - step 1: kirim OTP
app.post('/api/reset-password', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email wajib diisi' });
  }

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      success: true,
      message: 'OTP telah dikirim ke email Anda',
    });
  } catch (err) {
    res.status(500).json({ error: 'Terjadi kesalahan: ' + err.message });
  }
});

// Reset password - step 2: verifikasi OTP dan update password
app.post('/api/verify-otp-reset', async (req, res) => {
  const { email, otp, newPassword, confirmPassword } = req.body;

  if (!email || !otp || !newPassword || !confirmPassword) {
    return res.status(400).json({ error: 'Semua field wajib diisi' });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ error: 'Password tidak sama' });
  }

  try {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'recovery',
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Update password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      return res.status(400).json({ error: updateError.message });
    }

    res.json({
      success: true,
      message: 'Password berhasil direset. Silakan login dengan password baru.',
    });
  } catch (err) {
    res.status(500).json({ error: 'Terjadi kesalahan: ' + err.message });
  }
});

// Logout
app.post('/api/logout', (req, res) => {
  res.clearCookie('session');
  res.json({ success: true, message: 'Logout berhasil' });
});

// ===== CRUD ROUTES (Mahasiswa) =====

// Middleware untuk verifikasi auth
const authMiddleware = (req, res, next) => {
  const token = req.cookies.session;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  req.token = token;
  next();
};

// GET all mahasiswa
app.get('/api/mahasiswa', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('Gelar1')
      .select('*')
      .order('id', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST insert mahasiswa
app.post('/api/mahasiswa', authMiddleware, async (req, res) => {
  const { NAMA, NIM, KELAS, NILAI, BIDANG, GENDER } = req.body;

  try {
    const { data, error } = await supabase.from('Gelar1').insert([
      {
        NAMA,
        NIM: parseInt(NIM),
        KELAS,
        NILAI: parseFloat(NILAI),
        BIDANG,
        GENDER,
      },
    ]);

    if (error) throw error;
    res.json({ success: true, message: 'Data berhasil ditambahkan', data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update mahasiswa
app.put('/api/mahasiswa/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { NAMA, NIM, KELAS, NILAI, BIDANG, GENDER } = req.body;

  try {
    const { data, error } = await supabase
      .from('Gelar1')
      .update({
        NAMA,
        NIM: parseInt(NIM),
        KELAS,
        NILAI: parseFloat(NILAI),
        BIDANG,
        GENDER,
      })
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true, message: 'Data berhasil diperbarui', data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE mahasiswa
app.delete('/api/mahasiswa/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    const { error } = await supabase.from('Gelar1').delete().eq('id', id);

    if (error) throw error;
    res.json({ success: true, message: 'Data berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve HTML files
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/reset-password', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'resetpassword.html'));
});

app.get('/dashboard', (req, res) => {
  const token = req.cookies.session;
  if (!token) {
    return res.redirect('/');
  }
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});
