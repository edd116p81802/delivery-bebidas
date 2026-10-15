import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutos

// Analisa uma imagem e retorna o que está nela
async function analyzeImage(imageUrl: string): Promise<{ detectedName: string; detectedBrand: string; confidence: string }> {
  try {
    const response = await fetch('https://routellm.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ABACUSAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analise esta imagem de produto e me diga EXATAMENTE o que você vê. Responda APENAS em JSON:\n{"detectedName": "nome completo do produto visível na embalagem", "detectedBrand": "marca principal visível", "confidence": "alta/media/baixa"}\n\nSe não conseguir ler claramente, coloque confidence como "baixa".`
              },
              {
                type: 'image_url',
                image_url: { url: imageUrl }
              }
            ]
          }
        ],
        max_tokens: 200,
        temperature: 0.1
      })
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Extrair JSON da resposta
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return { detectedName: 'Não identificado', detectedBrand: 'Não identificado', confidence: 'baixa' };
  } catch (error) {
    console.error('Erro ao analisar imagem:', error);
    return { detectedName: 'Erro', detectedBrand: 'Erro', confidence: 'baixa' };
  }
}

// Verifica se nomes são compatíveis
function areNamesCompatible(productName: string, detectedName: string, detectedBrand: string): boolean {
  const normalize = (s: string) => s.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
  
  const pName = normalize(productName);
  const dName = normalize(detectedName);
  const dBrand = normalize(detectedBrand);
  
  // Verificar se a marca detectada está no nome do produto
  if (dBrand && dBrand !== 'naoidentificado' && pName.includes(dBrand)) {
    return true;
  }
  
  // Verificar palavras-chave em comum
  const pWords = pName.split(/\s+/).filter(w => w.length > 3);
  const dWords = [...dName.split(/\s+/), ...dBrand.split(/\s+/)].filter(w => w.length > 3);
  
  const matches = pWords.filter(pw => dWords.some(dw => dw.includes(pw) || pw.includes(dw)));
  return matches.length >= 1;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');
  const categorySlug = searchParams.get('category');
  
  try {
    // Buscar produtos
    const where: Record<string, unknown> = { hidden: false };
    if (categorySlug) {
      where.category = { slug: categorySlug };
    }
    
    const products = await prisma.product.findMany({
      where,
      include: { category: true },
      orderBy: { name: 'asc' },
      skip: offset,
      take: limit
    });
    
    const total = await prisma.product.count({ where });
    
    const results: Array<{
      id: string;
      name: string;
      imageUrl: string;
      category: string;
      detectedName: string;
      detectedBrand: string;
      confidence: string;
      match: boolean;
      problem: string | null;
    }> = [];
    
    // Analisar cada produto
    for (const product of products) {
      const analysis = await analyzeImage(product.imageUrl);
      const isMatch = areNamesCompatible(product.name, analysis.detectedName, analysis.detectedBrand);
      
      let problem: string | null = null;
      if (!isMatch && analysis.confidence !== 'baixa') {
        problem = `Produto: "${product.name}" | Imagem mostra: "${analysis.detectedBrand} ${analysis.detectedName}"`;
      }
      
      results.push({
        id: product.id,
        name: product.name,
        imageUrl: product.imageUrl,
        category: product.category?.name || 'Sem categoria',
        detectedName: analysis.detectedName,
        detectedBrand: analysis.detectedBrand,
        confidence: analysis.confidence,
        match: isMatch,
        problem
      });
    }
    
    // Filtrar apenas problemas
    const problems = results.filter(r => !r.match && r.confidence !== 'baixa');
    
    return NextResponse.json({
      total,
      analyzed: results.length,
      problems: problems.length,
      offset,
      limit,
      results: problems // Retorna apenas os problemáticos
    });
  } catch (error) {
    console.error('Erro na auditoria:', error);
    return NextResponse.json({ error: 'Erro ao processar auditoria' }, { status: 500 });
  }
}
