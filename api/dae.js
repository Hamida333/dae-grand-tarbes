// api/dae.js — GET /api/dae
// Récupère tous les DAE depuis Airtable (ou données locales si non configuré)

const FALLBACK_DATA = [
  {id:"1",  nom:"Mairie de Tarbes",              addr:"Place de Verdun, 65000 Tarbes",               lat:43.2327, lng:0.0781,  s:"g", em:"🏛️", h:"Lun-Ven 8h30-17h30",           m:"Philips HeartStart",  loc:"Accueil RDC",        v:"Vérifié mars 2025"},
  {id:"2",  nom:"Centre Hospitalier de Tarbes",  addr:"Place Mallaret, 65000 Tarbes",                lat:43.2290, lng:0.0758,  s:"g", em:"🏥", h:"24h/24 — Urgences",            m:"Zoll AED Plus",       loc:"Entrée urgences",    v:"Vérifié fév. 2025"},
  {id:"3",  nom:"Piscine municipale Pommès",     addr:"Rue de la Piscine, 65000 Tarbes",             lat:43.2361, lng:0.0821,  s:"r", em:"🏊", h:"Mar-Dim 7h-21h",               m:"Defibtech",           loc:"Caisse entrée",      v:"Vérifié jan. 2025"},
  {id:"4",  nom:"Gare SNCF de Tarbes",           addr:"Av. du Maréchal Joffre, 65000 Tarbes",        lat:43.2271, lng:0.0714,  s:"g", em:"🚂", h:"5h30-23h30 tous jours",        m:"Cardiac Science",     loc:"Hall principal",     v:"Vérifié déc. 2024"},
  {id:"5",  nom:"Stade Maurice Trélut",          addr:"Rue M. Berthelot, 65000 Tarbes",              lat:43.2410, lng:0.0750,  s:"r", em:"⚽", h:"Selon matchs/entraînements",  m:"Schiller",            loc:"Entrée tribunes",    v:"Vérifié oct. 2024"},
  {id:"6",  nom:"Géant Casino Tarbes",           addr:"Route de Pau, 65000 Tarbes",                  lat:43.2190, lng:0.0850,  s:"g", em:"🛒", h:"Lun-Sam 8h-21h",              m:"Inconnu",             loc:"Service clients",    v:"Non vérifié"},
  {id:"7",  nom:"Mairie d'Aureilhan",            addr:"Pl. Gén. de Gaulle, 65800 Aureilhan",         lat:43.2450, lng:0.0820,  s:"r", em:"🏛️", h:"Lun-Ven 8h30-12h/14h-17h",   m:"Philips FRx",         loc:"Accueil mairie",     v:"Vérifié nov. 2024"},
  {id:"8",  nom:"Mairie d'Ibos",                 addr:"Place de la Mairie, 65420 Ibos",              lat:43.2162, lng:0.0625,  s:"r", em:"🏛️", h:"Lun-Ven 9h-12h/14h-17h",     m:"Nihon Kohden",        loc:"Rez-de-chaussée",   v:"Vérifié jan. 2025"},
  {id:"9",  nom:"Sanctuaire Notre-Dame Lourdes", addr:"Av. Mgr Théas, 65100 Lourdes",               lat:43.0935, lng:-0.0453, s:"g", em:"⛪", h:"Ouvert tous les jours",        m:"Zoll AED 3",          loc:"Poste de secours",   v:"Vérifié fév. 2025"},
  {id:"10", nom:"Halles de Lourdes",             addr:"Rue de la Grotte, 65100 Lourdes",             lat:43.0972, lng:-0.0461, s:"r", em:"🛒", h:"Lun-Sam 9h-19h30",            m:"Cardiac Science",     loc:"Galerie centrale",   v:"Vérifié mars 2025"},
  {id:"11", nom:"Gare de Lourdes",               addr:"Place de la Gare, 65100 Lourdes",             lat:43.0985, lng:-0.0506, s:"g", em:"🚂", h:"6h-22h",                      m:"Philips HeartStart",  loc:"Hall voyageurs",     v:"Vérifié jan. 2025"},
  {id:"12", nom:"Piscine de Séméac",             addr:"Rue du Stade, 65600 Séméac",                  lat:43.2498, lng:0.0782,  s:"o", em:"🏊", h:"Statut inconnu",               m:"Inconnu",             loc:"Inconnu",            v:"Non vérifié"},
  {id:"13", nom:"Lycée Théophile Gautier",       addr:"Rue Massey, 65000 Tarbes",                    lat:43.2344, lng:0.0799,  s:"r", em:"🏫", h:"Lun-Ven période scolaire",     m:"Schiller FRED",       loc:"Infirmerie 1er",     v:"Vérifié oct. 2024"},
  {id:"14", nom:"Clinique Les Cèdres",           addr:"Chemin Long, 65000 Tarbes",                   lat:43.2255, lng:0.0921,  s:"r", em:"🏥", h:"Accès limité nuit",            m:"Zoll",                loc:"Accueil principal",  v:"Vérifié déc. 2024"},
  {id:"15", nom:"Office de Tourisme Tarbes",     addr:"3 cours Gambetta, 65000 Tarbes",              lat:43.2340, lng:0.0770,  s:"r", em:"📍", h:"Lun-Sam 9h-12h30/14h-18h",   m:"Philips",             loc:"Entrée",             v:"Vérifié fév. 2025"},
  {id:"16", nom:"Mairie de Séméac",              addr:"Av. du Stade, 65600 Séméac",                  lat:43.2521, lng:0.0710,  s:"r", em:"🏛️", h:"Lun-Ven 8h30-12h/14h-17h",   m:"Cardiac Science",     loc:"Accueil",            v:"Vérifié mars 2025"},
  {id:"17", nom:"Gymnase de Tarbes Ouest",       addr:"Rue Pierre Loti, 65000 Tarbes",               lat:43.2380, lng:0.0680,  s:"r", em:"🏋️", h:"Lun-Sam 8h-21h",             m:"Schiller FRED PA-1",  loc:"Vestiaires entrée",  v:"Vérifié jan. 2025"},
  {id:"18", nom:"Clinique Ambroise Paré",        addr:"Rue de Laubadère, 65000 Tarbes",              lat:43.2310, lng:0.0840,  s:"g", em:"🏥", h:"24h/24",                      m:"Zoll AED Plus",       loc:"Entrée principale",  v:"Vérifié mars 2025"},
];

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { AIRTABLE_TOKEN, AIRTABLE_BASE_ID, AIRTABLE_TABLE_DAE = 'DAE' } = process.env;

  // Sans Airtable → données locales
  if (!AIRTABLE_TOKEN || !AIRTABLE_BASE_ID) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    return res.status(200).json({ source: 'local', data: FALLBACK_DATA });
  }

  try {
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_DAE)}?maxRecords=500&sort[0][field]=nom&sort[0][direction]=asc`;
    const r = await fetch(url, { headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` } });
    if (!r.ok) throw new Error(`Airtable ${r.status}`);
    const json = await r.json();
    const data = json.records.map(rec => ({
      id:   rec.id,
      nom:  rec.fields.nom || '',
      addr: rec.fields.adresse || '',
      lat:  parseFloat(rec.fields.latitude) || 0,
      lng:  parseFloat(rec.fields.longitude) || 0,
      s:    rec.fields.statut || 'o',
      em:   rec.fields.emoji || '📍',
      h:    rec.fields.horaires || 'Inconnu',
      m:    rec.fields.marque || 'Inconnu',
      loc:  rec.fields.emplacement || '',
      v:    rec.fields.verification || 'Non vérifié',
    }));
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    return res.status(200).json({ source: 'airtable', data });
  } catch (err) {
    console.error('Airtable DAE error:', err.message);
    // Fallback gracieux
    return res.status(200).json({ source: 'local_fallback', data: FALLBACK_DATA });
  }
}
