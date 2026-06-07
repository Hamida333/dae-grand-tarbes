// api/admin.js — POST /api/admin
// Valide ou rejette une correction (interface admin)
// Protégé par mot de passe ADMIN_PASSWORD

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    ADMIN_PASSWORD, AIRTABLE_TOKEN, AIRTABLE_BASE_ID,
    AIRTABLE_TABLE_DAE = 'DAE',
    AIRTABLE_TABLE_CORRECTIONS = 'Corrections',
    RESEND_API_KEY, ADMIN_EMAIL, FROM_EMAIL = 'dae@noreply.fr'
  } = process.env;

  const body = req.body || {};
  const { action, password, correctionId, daeAirtableId, fields } = body;

  // Auth simple par mot de passe
  if (!ADMIN_PASSWORD || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Mot de passe incorrect' });
  }

  if (!AIRTABLE_TOKEN || !AIRTABLE_BASE_ID) {
    return res.status(503).json({ error: 'Airtable non configuré' });
  }

  // ── Valider une correction ──────────────────────────────────────────────
  if (action === 'validate') {
    try {
      // 1. Mettre à jour le DAE dans la table DAE
      if (daeAirtableId && fields) {
        const updateFields = {};
        if (fields.adresse_corrigee) updateFields.adresse = fields.adresse_corrigee;
        if (fields.latitude) updateFields.latitude = parseFloat(fields.latitude);
        if (fields.longitude) updateFields.longitude = parseFloat(fields.longitude);
        if (fields.horaires) updateFields.horaires = fields.horaires;
        if (fields.statut_acces) updateFields.statut = fields.statut_acces;
        updateFields.verification = `Vérifié ${new Date().toLocaleDateString('fr-FR', {month:'short', year:'numeric'})}`;

        const daeUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_DAE)}/${daeAirtableId}`;
        await fetch(daeUrl, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields: updateFields })
        });
      }

      // 2. Marquer la correction comme validée
      const corrUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_CORRECTIONS)}/${correctionId}`;
      await fetch(corrUrl, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: { statut_validation: 'validé', date_validation: new Date().toISOString().split('T')[0] } })
      });

      return res.status(200).json({ success: true, action: 'validated' });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── Rejeter une correction ──────────────────────────────────────────────
  if (action === 'reject') {
    try {
      const corrUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_CORRECTIONS)}/${correctionId}`;
      await fetch(corrUrl, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: { statut_validation: 'rejeté', date_validation: new Date().toISOString().split('T')[0] } })
      });
      return res.status(200).json({ success: true, action: 'rejected' });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── Import OpenAED ──────────────────────────────────────────────────────
  if (action === 'import_openaed') {
    try {
      // Bounding box Grand Tarbes + Lourdes
      const bbox = '42.9,-0.2,43.4,0.3';
      const overpassUrl = `https://overpass-api.de/api/interpreter?data=[out:json];node[emergency=defibrillator](${bbox});out;`;
      const r = await fetch(overpassUrl, { headers: { 'User-Agent': 'DAE-Grand-Tarbes/1.0' } });
      if (!r.ok) throw new Error(`Overpass ${r.status}`);
      const json = await r.json();
      const nodes = json.elements || [];

      let imported = 0;
      for (const node of nodes.slice(0, 50)) { // limite 50 par import
        const tags = node.tags || {};
        const fields = {
          nom: tags.name || tags['name:fr'] || `DAE OpenStreetMap #${node.id}`,
          adresse: [tags['addr:housenumber'], tags['addr:street'], tags['addr:city']].filter(Boolean).join(', ') || 'Adresse OSM',
          latitude: node.lat,
          longitude: node.lon,
          statut: tags.indoor === 'yes' ? 'r' : 'g',
          horaires: tags.opening_hours || 'Voir sur place',
          marque: tags.defibrillator || tags.brand || 'Inconnu',
          emplacement: tags.description || tags.location || '',
          verification: `Import OSM ${new Date().toLocaleDateString('fr-FR', {month:'short', year:'numeric'})}`,
          emoji: '📍',
          source: 'openstreetmap',
          osm_id: String(node.id),
        };
        const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_DAE)}`;
        await fetch(url, {
          method: 'POST',
          headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ fields })
        });
        imported++;
        await new Promise(r => setTimeout(r, 250)); // rate limit Airtable
      }

      return res.status(200).json({ success: true, imported, total: nodes.length });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(400).json({ error: 'Action inconnue' });
}
