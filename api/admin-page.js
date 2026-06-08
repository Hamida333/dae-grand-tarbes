// api/admin-page.js — sert la page admin en HTML
import { readFileSync } from 'fs';
import { join } from 'path';

export default function handler(req, res) {
  try {
    const html = readFileSync(join(process.cwd(), 'admin', 'index.html'), 'utf8');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  } catch (e) {
    // Fallback inline si fichier non trouvé
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(`<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>DAE Admin</title>
<meta http-equiv="refresh" content="0;url=/admin.html">
</head>
<body>Redirection...</body>
</html>`);
  }
}
