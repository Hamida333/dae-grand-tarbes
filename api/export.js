// api/export.js — GET /api/export?format=pdf|csv|json
// Exporte les données DAE dans différents formats

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { format = 'json', password } = req.query;
  const { AIRTABLE_TOKEN, AIRTABLE_BASE_ID, AIRTABLE_TABLE_DAE = 'DAE', ADMIN_PASSWORD } = process.env;

  // Récupérer les données
  let data = [];
  if (AIRTABLE_TOKEN && AIRTABLE_BASE_ID) {
    try {
      const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_DAE)}?maxRecords=500&sort[0][field]=nom`;
      const r = await fetch(url, { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } });
      if (r.ok) {
        const json = await r.json();
        data = json.records.map(rec => ({ id: rec.id, ...rec.fields }));
      }
    } catch (e) { /* fallback local */ }
  }

  const date = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

  // ── JSON ──────────────────────────────────────────────────────────────
  if (format === 'json') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="dae-grand-tarbes-${new Date().toISOString().split('T')[0]}.json"`);
    return res.status(200).json({ exported: date, count: data.length, data });
  }

  // ── CSV ───────────────────────────────────────────────────────────────
  if (format === 'csv') {
    const headers = ['nom','adresse','latitude','longitude','statut','horaires','marque','emplacement','verification'];
    const rows = data.map(d => headers.map(h => `"${(d[h] || '').toString().replace(/"/g, '""')}"`).join(';'));
    const csv = [headers.join(';'), ...rows].join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="dae-grand-tarbes-${new Date().toISOString().split('T')[0]}.csv"`);
    return res.status(200).send('\uFEFF' + csv); // BOM pour Excel
  }

  // ── HTML imprimable (→ PDF via navigateur) ───────────────────────────
  if (format === 'pdf') {
    const statLabels = { g: '24h/24', r: 'Horaires limités', o: 'Statut inconnu' };
    const statColors = { g: '#2d9e5f', r: '#e63946', o: '#e07c24' };

    const rows = data.map((d, i) => `
      <tr style="${i % 2 === 0 ? 'background:#f9f9f9' : 'background:white'}">
        <td style="padding:8px 10px;font-weight:600;font-size:12px">${d.emoji || '📍'} ${d.nom || ''}</td>
        <td style="padding:8px 10px;font-size:11px;color:#555">${d.adresse || d.addr || ''}</td>
        <td style="padding:8px 10px;font-size:11px;text-align:center">
          <span style="background:${statColors[d.statut||d.s]||'#999'};color:white;border-radius:4px;padding:2px 8px;font-size:10px;font-weight:600">
            ${statLabels[d.statut||d.s] || 'Inconnu'}
          </span>
        </td>
        <td style="padding:8px 10px;font-size:11px;color:#555">${d.horaires || d.h || '—'}</td>
        <td style="padding:8px 10px;font-size:11px;color:#555">${d.emplacement || d.loc || '—'}</td>
        <td style="padding:8px 10px;font-size:11px;color:#888">${d.verification || d.v || '—'}</td>
      </tr>`).join('');

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>DAE Grand Tarbes — Annuaire ${date}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Outfit', Arial, sans-serif; color: #1a1917; background: white; }
  @media print {
    .no-print { display: none !important; }
    body { font-size: 11px; }
    table { page-break-inside: auto; }
    tr { page-break-inside: avoid; }
  }
  .header { background: #1a1917; color: white; padding: 24px 32px; display: flex; align-items: center; gap: 16px; }
  .logo { width: 48px; height: 48px; background: #e63946; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0; }
  .header h1 { font-size: 22px; font-weight: 700; }
  .header p { font-size: 12px; color: rgba(255,255,255,.6); margin-top: 3px; }
  .stats-bar { display: flex; gap: 24px; padding: 16px 32px; background: #f5f4f0; border-bottom: 1px solid #e8e6e0; }
  .stat { display: flex; align-items: center; gap: 8px; }
  .dot { width: 10px; height: 10px; border-radius: 50%; }
  .stat-label { font-size: 12px; color: #7a7870; }
  .stat-n { font-size: 14px; font-weight: 700; font-family: monospace; }
  .content { padding: 24px 32px; }
  .section-title { font-size: 13px; font-weight: 600; color: #7a7870; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 12px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  thead th { background: #1a1917; color: white; padding: 10px 10px; text-align: left; font-size: 11px; font-weight: 600; letter-spacing: .3px; }
  tbody tr:hover { background: #fff8f8 !important; }
  .footer { margin-top: 24px; padding: 16px 32px; border-top: 1px solid #e8e6e0; display: flex; justify-content: space-between; align-items: center; }
  .footer p { font-size: 11px; color: #b0aea8; }
  .btn-print { background: #e63946; color: white; border: none; border-radius: 8px; padding: 10px 20px; font-family: 'Outfit', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; }
  .qr-note { background: #fff0f1; border-radius: 8px; padding: 12px 16px; margin-top: 16px; font-size: 12px; color: #7a7870; border-left: 3px solid #e63946; }
  .qr-note strong { color: #1a1917; }
</style>
</head>
<body>
<div class="header">
  <div class="logo">💓</div>
  <div>
    <h1>DAE Grand Tarbes — Annuaire des défibrillateurs</h1>
    <p>Carte collaborative citoyenne · Agglo Tarbes-Lourdes-Pyrénées · Édition du ${date}</p>
  </div>
</div>
<div class="stats-bar">
  <div class="stat"><div class="dot" style="background:#2d9e5f"></div><span class="stat-label">Accessible 24h/24</span><span class="stat-n">${data.filter(d=>(d.statut||d.s)==='g').length}</span></div>
  <div class="stat"><div class="dot" style="background:#e63946"></div><span class="stat-label">Horaires limités</span><span class="stat-n">${data.filter(d=>(d.statut||d.s)==='r').length}</span></div>
  <div class="stat"><div class="dot" style="background:#e07c24"></div><span class="stat-label">Statut inconnu</span><span class="stat-n">${data.filter(d=>(d.statut||d.s)==='o').length}</span></div>
  <div class="stat" style="margin-left:auto"><span class="stat-label">Total DAE référencés</span><span class="stat-n">${data.length}</span></div>
</div>
<div class="content">
  <div class="no-print" style="display:flex;gap:10px;margin-bottom:16px;align-items:center">
    <button class="btn-print" onclick="window.print()">🖨️ Imprimer / Enregistrer en PDF</button>
    <span style="font-size:12px;color:#7a7870">Utilisez Ctrl+P → Enregistrer en PDF pour obtenir un fichier PDF</span>
  </div>
  <div class="section-title">Liste complète des défibrillateurs — Grand Tarbes / Lourdes</div>
  <table>
    <thead>
      <tr>
        <th>Nom du lieu</th>
        <th>Adresse</th>
        <th style="text-align:center">Accès</th>
        <th>Horaires</th>
        <th>Emplacement</th>
        <th>Vérification</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="qr-note">
    <strong>💡 En cas d'urgence cardiaque :</strong> Appelez le <strong>15 (SAMU)</strong> ou le <strong>18 (Pompiers)</strong> immédiatement.
    Commencez le massage cardiaque sans interruption (30 compressions / 2 insufflations).
    Envoyez quelqu'un chercher le DAE le plus proche. Le DAE vous guidera vocalement.
  </div>
</div>
<div class="footer">
  <p>Document généré le ${date} · dae-grand-tarbes.vercel.app · Données sous licence ODbL (OpenStreetMap)</p>
  <p class="no-print" style="font-size:11px;color:#b0aea8">Ce document peut être imprimé et affiché dans les lieux publics</p>
</div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  }

  return res.status(400).json({ error: 'Format non supporté. Utilisez: json, csv, pdf' });
}
