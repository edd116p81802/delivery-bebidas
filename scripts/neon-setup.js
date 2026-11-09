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
  console.log('Querying existing gateways...');
  const existing = await sql('SELECT id, name, "isActive", "apiUrl" FROM "Gateway"');
  console.log('Gateways in DB:', JSON.stringify(existing, null, 2));

  console.log('Deactivating all gateways...');
  await sql('UPDATE "Gateway" SET "isActive" = false');

  const ironpay = existing.rows?.find(r => r.name.toLowerCase().includes('iron'));
  if (ironpay) {
    console.log('Updating existing IronPay gateway:', ironpay.id);
    const updateRes = await sql(`
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
    `, [
      'IronPay',
      'y3mvnis5fa', // product_hash
      'SU78sWfRQ4FjuWvtLkq9P38w2uwDfHB4KKWBoBfdytTqagEct9wnBhkCrF0M',
      'https://api.ironpayapp.com.br/api/public/v1',
      '/transactions',
      'Bebida',
      'none',
      '',
      'centavos',
      'pix.pix_url',
      'pix.pix_qr_code',
      'hash',
      'efvbs', // offer_hash
      ironpay.id
    ]);
    console.log('Updated:', updateRes);
  } else {
    console.log('Creating new IronPay gateway...');
    const id = 'cm' + Math.random().toString(36).substring(2, 12);
    const insertRes = await sql(`
      INSERT INTO "Gateway" (
        "id", "name", "publicKey", "privateKey", "apiUrl", "endpoint",
        "productName", "isActive", "authHeaderName", "authHeaderPrefix",
        "valueFormat", "responseQrCodePath", "responsePixCodePath",
        "responseTransactionId", "payloadTemplate", "createdAt", "updatedAt"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, true, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW()
      )
      RETURNING *
    `, [
      id,
      'IronPay',
      'y3mvnis5fa',
      'SU78sWfRQ4FjuWvtLkq9P38w2uwDfHB4KKWBoBfdytTqagEct9wnBhkCrF0M',
      'https://api.ironpayapp.com.br/api/public/v1',
      '/transactions',
      'Bebida',
      'none',
      '',
      'centavos',
      'pix.pix_url',
      'pix.pix_qr_code',
      'hash',
      'efvbs'
    ]);
    console.log('Created:', insertRes);
  }

  const finalGateways = await sql('SELECT id, name, "isActive", "apiUrl", "publicKey", "payloadTemplate" FROM "Gateway" WHERE "isActive" = true');
  console.log('Active gateway is now:', JSON.stringify(finalGateways, null, 2));
}

main().catch(console.error);
