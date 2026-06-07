// api/corrections.js — POST /api/corrections  GET /api/corrections
// Enregistre une correction citoyenne dans Airtable + envoie email admin

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const {
    AIRTABLE_TOKEN, AIRTABLE_BASE_ID,
    AIRTABLE_TABLE_CORRECTIONS = 'Corrections',
    RESEND_API_KEY, ADMIN_EMAIL, FROM_EMAIL = 'dae@noreply.fr'
  } = process.env;

  // ── GET : liste des corrections en attente ──────────────────────────────
  if (req.method === 'GET') {
    if (!AIRTABLE_TOKEN || !AIRTABLE_BASE_ID) {
      return res.status(200).json({ data: [] });
    }
    try {
      const filter = encodeURIComponent(`{statut_validation}="en_attente"`);
      const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_CORRECTIONS)}?filterByFormula=${filter}&sort[0][field]=date&sort[0][direction]=desc`;
      const r = await fetch(url, { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } });
      if (!r.ok) throw new Error(`Airtable ${r.status}`);
      const json = await r.json();
      const data = json.records.map(rec => ({ id: rec.id, ...rec.fields }));
      return res.status(200).json({ data });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── POST : soumettre une correction ─────────────────────────────────────
  if (req.method === 'POST') {
    const body = req.body || {};
    const { daeId, daeNom, addrOld, addrNew, latNew, lngNew, horaires, newStatus, comment, auteur, type } = body;

    if (!daeNom || !addrNew) {
      return res.status(400).json({ error: 'Champs nom et adresse requis' });
    }

    const record = {
      fields: {
        dae_id:            String(daeId || ''),
        dae_nom:           daeNom,
        adresse_actuelle:  addrOld || '',
        adresse_corrigee:  addrNew,
        latitude:          parseFloat(latNew) || 0,
        longitude:         parseFloat(lngNew) || 0,
        horaires:          horaires || '',
        statut_acces:      newStatus || '',
        commentaire:       comment || '',
        auteur:            auteur || 'Anonyme',
        date:              new Date().toISOString().split('T')[0],
        type:              type || 'correction',
        statut_validation: 'en_attente',
      }
    };

    let airtableId = null;

    // 1. Enregistrer dans Airtable
    if (AIRTABLE_TOKEN && AIRTABLE_BASE_ID) {
      try {
        const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_CORRECTIONS)}`;
        const r = await fetch(url, {
          method: 'POST',
          headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(record)
        });
        if (r.ok) {
          const json = await r.json();
          airtableId = json.id;
        }
      } catch (err) {
        console.error('Airtable POST error:', err.message);
      }
    }

    // 2. Envoyer email de notification via Resend
    if (RESEND_API_KEY && ADMIN_EMAIL) {
      try {
        const typeLabel = type === 'nouveau_dae' ? '🆕 Nouveau DAE signalé' : '✏️ Correction d\'adresse';
        const html = `
<!DOCTYPE html><html lang="fr"><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1a1917">
<div style="background:#e63946;padding:16px 24px;border-radius:12px 12px 0 0">
  <h1 style="color:white;margin:0;font-size:20px">💓 DAE Grand Tarbes</h1>
  <p style="color:rgba(255,255,255,.8);margin:4px 0 0;font-size:13px">${typeLabel}</p>
</div>
<div style="background:#f5f4f0;padding:20px 24px;border-radius:0 0 12px 12px">
  <table style="width:100%;border-collapse:collapse;background:white;border-radius:8px;overflow:hidden">
    <tr style="background:#fff0f1"><td style="padding:10px 14px;font-size:12px;color:#7a7870;width:140px">DAE concerné</td><td style="padding:10px 14px;font-weight:600">${daeNom}</td></tr>
    ${addrOld ? `<tr><td style="padding:10px 14px;font-size:12px;color:#7a7870;border-top:1px solid #e8e6e0">Adresse actuelle</td><td style="padding:10px 14px;color:#e63946;border-top:1px solid #e8e6e0">${addrOld}</td></tr>` : ''}
    <tr style="background:#edfaf3"><td style="padding:10px 14px;font-size:12px;color:#7a7870;border-top:1px solid #e8e6e0">Nouvelle adresse</td><td style="padding:10px 14px;font-weight:600;color:#2d9e5f;border-top:1px solid #e8e6e0">${addrNew}</td></tr>
    ${latNew ? `<tr><td style="padding:10px 14px;font-size:12px;color:#7a7870;border-top:1px solid #e8e6e0">Coordonnées GPS</td><td style="padding:10px 14px;font-family:monospace;font-size:13px;border-top:1px solid #e8e6e0">${Number(latNew).toFixed(6)}, ${Number(lngNew).toFixed(6)}</td></tr>` : ''}
    ${horaires ? `<tr><td style="padding:10px 14px;font-size:12px;color:#7a7870;border-top:1px solid #e8e6e0">Horaires</td><td style="padding:10px 14px;border-top:1px solid #e8e6e0">${horaires}</td></tr>` : ''}
    ${comment ? `<tr><td style="padding:10px 14px;font-size:12px;color:#7a7870;border-top:1px solid #e8e6e0">Commentaire</td><td style="padding:10px 14px;border-top:1px solid #e8e6e0">${comment}</td></tr>` : ''}
    <tr><td style="padding:10px 14px;font-size:12px;color:#7a7870;border-top:1px solid #e8e6e0">Contributeur</td><td style="padding:10px 14px;border-top:1px solid #e8e6e0">${auteur || 'Anonyme'}</td></tr>
    <tr><td style="padding:10px 14px;font-size:12px;color:#7a7870;border-top:1px solid #e8e6e0">Date</td><td style="padding:10px 14px;border-top:1px solid #e8e6e0">${new Date().toLocaleDateString('fr-FR', {day:'2-digit',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'})}</td></tr>
  </table>
  <div style="margin-top:16px;text-align:center">
    <a href="${process.env.VERCEL_URL ? 'https://'+process.env.VERCEL_URL : ''}/admin/" 
       style="background:#1565c0;color:white;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;display:inline-block">
      👉 Valider dans l'interface admin
    </a>
  </div>
  <p style="font-size:11px;color:#b0aea8;margin-top:16px;text-align:center">DAE Grand Tarbes · Carte collaborative citoyenne · ${airtableId ? 'ID: '+airtableId : ''}</p>
</div>
</body></html>`;

        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: [ADMIN_EMAIL],
            subject: `${typeLabel} — ${daeNom}`,
            html
          })
        });
      } catch (err) {
        console.error('Resend error:', err.message);
      }
    }

    return res.status(200).json({ success: true, id: airtableId });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
