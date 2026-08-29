import app from './app.js';

const HOST = process.env.HOST || '0.0.0.0';
const PORT = process.env.PORT || 3001;

app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT} (Supabase connected)`);
});
