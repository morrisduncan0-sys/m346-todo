const express = require('express');
const { Pool } = require('pg');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// PostgreSQL Verbindung via Umgebungsvariable (Zusatz-Element 2)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Tabelle erstellen falls sie nicht existiert
async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS todos (
      id SERIAL PRIMARY KEY,
      text TEXT NOT NULL,
      done BOOLEAN DEFAULT false
    )
  `);
}

// HTML-Seite mit allen Todos
app.get('/', async (req, res) => {
  const result = await pool.query('SELECT * FROM todos ORDER BY id');
  const todos = result.rows;

  const listItems = todos.map(t => `
    <li style="margin: 8px 0; ${t.done ? 'text-decoration:line-through; color:#888;' : ''}">
      <form method="POST" action="/toggle/${t.id}" style="display:inline">
        <button type="submit" style="margin-right:8px">${t.done ? '↩' : '✓'}</button>
      </form>
      ${t.text}
      <form method="POST" action="/delete/${t.id}" style="display:inline">
        <button type="submit" style="margin-left:8px; color:red">✗</button>
      </form>
    </li>
  `).join('');

  res.send(`
    <!DOCTYPE html>
    <html lang="de">
    <head>
      <meta charset="UTF-8"/>
      <title>M346 To-Do App</title>
      <style>
        body { font-family: sans-serif; max-width: 600px; margin: 60px auto; padding: 0 20px; background: white; }
        h1 { color: #333; }
        .card { background: white; border-radius: 10px; padding: 24px; box-shadow: 0 2px 8px black; }
        input[type=text] { width: 70%; padding: 8px; border: 1px solid #ccc; border-radius: 6px; }
        button { padding: 8px 14px; border: none; border-radius: 6px; cursor: pointer; background: cyan; color: white; }
        ul { list-style: none; padding: 0; margin-top: 20px; }
        .badge { background: cyan; color: white; font-size: 12px; padding: 2px 10px; border-radius: 999px; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>To-Do App <span class="badge">M346 LB3</span></h1>
        <form method="POST" action="/add">
          <input type="text" name="text" placeholder="Neue Aufgabe z.B Liliana Date vorbereiten" required/>
          <button type="submit">Hinzufügen</button>
        </form>
        <ul>${listItems || '<li style="color:#aaa">Noch keine Todos.</li>'}</ul>
      </div>
    </body>
    </html>
  `);
});

// Todo hinzufügen
app.post('/add', async (req, res) => {
  await pool.query('INSERT INTO todos (text) VALUES ($1)', [req.body.text]);
  res.redirect('/');
});

// Todo als erledigt markieren
app.post('/toggle/:id', async (req, res) => {
  await pool.query('UPDATE todos SET done = NOT done WHERE id = $1', [req.params.id]);
  res.redirect('/');
});

// Todo löschen
app.post('/delete/:id', async (req, res) => {
  await pool.query('DELETE FROM todos WHERE id = $1', [req.params.id]);
  res.redirect('/');
});

// Health-Check Endpoint (Zusatz-Element 3)
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({ status: 'ok', db: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'error', db: 'disconnected' });
  }
});

init().then(() => {
  app.listen(3000, () => {
    console.log('App läuft auf Port 3000');
  });
});
