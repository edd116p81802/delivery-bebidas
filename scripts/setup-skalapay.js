const connectionString = 'postgresql://neondb_owner:npg_02AXHNZvdJgI@ep-still-truth-b5bea3va-pooler.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require';

async function sql(query, params = []) {
  const res = await fetch('https://ep-still-truth-b5bea3va-pooler.c-7.us-east-2.aws.neon.tech/sql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Neon-Connection-String': connectionString,
    },
    body: JSON.stringify({ query, params }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Neon SQL error (${res.status}): ${text}`);
  }
  return await res.json();
}

async function main() {
  console.log('1. Querying current gateways in DB...');
  const current = await sql('SELECT id, name, "isActive", "apiUrl" FROM "Gateway"');
  console.log('Current gateways:', current.rows);

  console.log('2. Deactivating all existing gateways...');
  await sql('UPDATE "Gateway" SET "isActive" = false');

  const skala = current.rows?.find(r => 
    r.name.toLowerCase().includes('skala') || r.name.toLowerCase().includes('skale')
  );

  const skalaData = [
    'SkalaPay',
    'xlux97_5yygfqtcmdgewm4kwz3w1nhr', // Client ID (publicKey)
    'OFSBQxVoOp53PRQgVJ5Su4lxJI1qcKIOkrGv9cpn7bpNiCQ6r1K2wozUrzKsUmNX', // Client Secret (privateKey)
    'https://skalapay.net/api',
    '/cash-in',
    'produto x10', // Requested product name!
    'X-Client-Id',
    '',
    'reais',
    'transaction.qr_code_base64',
    'transaction.qr_code',
    'transaction.id',
    '{}'
  ];

  if (skala) {
    console.log('Updating existing SkalaPay gateway:', skala.id);
    const updated = await sql(`
      UPDATE "Gateway" SET
        "name" = $1,
        "publicKey" = $2,
        "privateKey" = $3,
        "apiUrl" = $4,
        "endpoint" = $5,
        "productName" = $6,
        "isActive" = true,
        "authHeaderName" = $7,
        "authHeaderPrefix" = $8,
        "valueFormat" = $9,
        "responseQrCodePath" = $10,
        "responsePixCodePath" = $11,
        "responseTransactionId" = $12,
        "payloadTemplate" = $13,
        "updatedAt" = NOW()
      WHERE "id" = $14
      RETURNING *
    `, [...skalaData, skala.id]);
    console.log('Updated:', updated.rows[0]?.name);
  } else {
    console.log('Creating new SkalaPay gateway row...');
    const id = 'gw_skalapay_01';
    const inserted = await sql(`
      INSERT INTO "Gateway" (
        "id", "name", "publicKey", "privateKey", "apiUrl", "endpoint",
        "productName", "isActive", "authHeaderName", "authHeaderPrefix",
        "valueFormat", "responseQrCodePath", "responsePixCodePath",
        "responseTransactionId", "payloadTemplate", "createdAt", "updatedAt"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, true, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW()
      )
      RETURNING *
    `, [id, ...skalaData]);
    console.log('Inserted:', inserted.rows[0]?.name);
  }

  const active = await sql('SELECT id, name, "isActive", "apiUrl", "productName" FROM "Gateway" WHERE "isActive" = true');
  console.log('ACTIVE GATEWAY IS NOW:', active.rows[0]);
}

main().catch(console.error);
