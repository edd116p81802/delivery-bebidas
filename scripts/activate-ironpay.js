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
  console.log('1. Setting IronPay to ACTIVE and SkalaPay to INACTIVE...');
  await sql('UPDATE "Gateway" SET "isActive" = false');
  
  // Activate IronPay
  await sql('UPDATE "Gateway" SET "isActive" = true WHERE name ILIKE \'%iron%\'');

  // Verify
  const gateways = await sql('SELECT id, name, "isActive", "apiUrl" FROM "Gateway" ORDER BY "isActive" DESC');
  console.log('Gateways in DB now:');
  console.log(gateways.rows);
}

main().catch(console.error);
