const token = process.env.VERCEL_TOKEN || '';
const teamId = process.env.VERCEL_TEAM_ID || 'team_xVRxtkWJmiAtFNx5aTW0lMKC';
const projectId = process.env.VERCEL_PROJECT_ID || 'prj_OsyvSAlBElOCYlmUmVsfXKFZq0qe';

const candidates = [
  'bebidasexpress-bar.vercel.app',
  'bebidasexpress-pronto.vercel.app',
  'bebidasexpress-rapidao.vercel.app',
  'bebidasexpress-noite.vercel.app',
  'bebidasexpress-bebidas.vercel.app',
  'bebidasexpress-hoje.vercel.app',
  'bebidasexpress-zap.vercel.app',
  'bebidasexpress-gelinho.vercel.app',
  'bebidasexpress-premium.vercel.app',
  'bebidasexpress-delivery24h.vercel.app',
  'bebidasexpress-store.vercel.app',
  'bebidasexpress-shop.vercel.app',
  'bebidasexpress-direct.vercel.app',
  'bebidasexpress-speed.vercel.app',
];

async function addDomain(name) {
  const res = await fetch(`https://api.vercel.com/v9/projects/${projectId}/domains?teamId=${teamId}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name }),
  });

  const data = await res.json();
  if (res.ok) {
    return { success: true, name: data.name, verified: data.verified };
  } else {
    return { success: false, name, error: data.error?.message || JSON.stringify(data) };
  }
}

async function main() {
  const added = [];
  for (const name of candidates) {
    if (added.length >= 10) break;
    console.log(`Adding domain: ${name}...`);
    const result = await addDomain(name);
    if (result.success) {
      console.log(`✅ Success: ${result.name}`);
      added.push(result.name);
    } else {
      console.log(`❌ Failed (${name}): ${result.error}`);
    }
    // Small delay to prevent rate limits
    await new Promise((r) => setTimeout(r, 600));
  }

  console.log('\n--- Finished ---');
  console.log(`Successfully added ${added.length} domains:`);
  console.log(JSON.stringify(added, null, 2));
}

main().catch(console.error);
