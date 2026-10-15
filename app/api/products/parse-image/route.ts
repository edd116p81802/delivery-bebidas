import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Base de conhecimento de marcas com teor alcoólico
const BRAND_KNOWLEDGE: { [key: string]: { alcoholContent?: string; category?: string } } = {
  // Cervejas
  'heineken': { alcoholContent: '5%', category: 'Cervejas' },
  'budweiser': { alcoholContent: '5%', category: 'Cervejas' },
  'corona': { alcoholContent: '4,5%', category: 'Cervejas' },
  'stella artois': { alcoholContent: '5%', category: 'Cervejas' },
  'amstel': { alcoholContent: '4,5%', category: 'Cervejas' },
  'spaten': { alcoholContent: '5,2%', category: 'Cervejas' },
  'brahma': { alcoholContent: '4,5%', category: 'Cervejas' },
  'skol': { alcoholContent: '4,7%', category: 'Cervejas' },
  'antarctica': { alcoholContent: '4,5%', category: 'Cervejas' },
  'bohemia': { alcoholContent: '5%', category: 'Cervejas' },
  'original': { alcoholContent: '5%', category: 'Cervejas' },
  'itaipava': { alcoholContent: '4,5%', category: 'Cervejas' },
  
  // Destilados - Vodka
  'smirnoff': { alcoholContent: '37,5%', category: 'Destilados' },
  'absolut': { alcoholContent: '40%', category: 'Destilados' },
  'grey goose': { alcoholContent: '40%', category: 'Destilados' },
  'ketel one': { alcoholContent: '40%', category: 'Destilados' },
  'skyy': { alcoholContent: '40%', category: 'Destilados' },
  'ciroc': { alcoholContent: '40%', category: 'Destilados' },
  'orloff': { alcoholContent: '37,5%', category: 'Destilados' },
  
  // Destilados - Whisky
  'johnnie walker red label': { alcoholContent: '40%', category: 'Destilados' },
  'johnnie walker black label': { alcoholContent: '40%', category: 'Destilados' },
  'johnnie walker': { alcoholContent: '40%', category: 'Destilados' },
  'red label': { alcoholContent: '40%', category: 'Destilados' },
  'black label': { alcoholContent: '40%', category: 'Destilados' },
  'jack daniels': { alcoholContent: '40%', category: 'Destilados' },
  "jack daniel's": { alcoholContent: '40%', category: 'Destilados' },
  'chivas regal': { alcoholContent: '40%', category: 'Destilados' },
  'chivas': { alcoholContent: '40%', category: 'Destilados' },
  'ballantines': { alcoholContent: '40%', category: 'Destilados' },
  "ballantine's": { alcoholContent: '40%', category: 'Destilados' },
  'white horse': { alcoholContent: '40%', category: 'Destilados' },
  'old parr': { alcoholContent: '40%', category: 'Destilados' },
  'buchanan\'s': { alcoholContent: '40%', category: 'Destilados' },
  'buchanans': { alcoholContent: '40%', category: 'Destilados' },
  
  // Destilados - Gin
  'tanqueray': { alcoholContent: '47,3%', category: 'Destilados' },
  'beefeater': { alcoholContent: '40%', category: 'Destilados' },
  'bombay': { alcoholContent: '40%', category: 'Destilados' },
  'gordon\'s': { alcoholContent: '37,5%', category: 'Destilados' },
  'gordons': { alcoholContent: '37,5%', category: 'Destilados' },
  'larios': { alcoholContent: '37,5%', category: 'Destilados' },
  'hendricks': { alcoholContent: '41,4%', category: 'Destilados' },
  
  // Destilados - Cachaça
  '51': { alcoholContent: '40%', category: 'Destilados' },
  'pitu': { alcoholContent: '40%', category: 'Destilados' },
  'pitú': { alcoholContent: '40%', category: 'Destilados' },
  'velho barreiro': { alcoholContent: '39%', category: 'Destilados' },
  'ypioca': { alcoholContent: '39%', category: 'Destilados' },
  'salinas': { alcoholContent: '40%', category: 'Destilados' },
  
  // Destilados - Rum
  'bacardi': { alcoholContent: '37,5%', category: 'Destilados' },
  'havana club': { alcoholContent: '40%', category: 'Destilados' },
  'captain morgan': { alcoholContent: '35%', category: 'Destilados' },
  'malibu': { alcoholContent: '21%', category: 'Destilados' },
  
  // Destilados - Tequila
  'jose cuervo': { alcoholContent: '38%', category: 'Destilados' },
  'josé cuervo': { alcoholContent: '38%', category: 'Destilados' },
  
  // Energéticos
  'red bull': { alcoholContent: '', category: 'Energéticos' },
  'monster': { alcoholContent: '', category: 'Energéticos' },
  'tnt': { alcoholContent: '', category: 'Energéticos' },
  'fusion': { alcoholContent: '', category: 'Energéticos' },
  
  // Vinhos
  'casillero del diablo': { alcoholContent: '13%', category: 'Vinhos' },
  'concha y toro': { alcoholContent: '13%', category: 'Vinhos' },
};

// Normaliza string para comparação
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

// Busca informações da marca no conhecimento interno (hardcoded)
function findHardcodedBrandKnowledge(text: string): { brand: string; alcoholContent?: string; category?: string } | null {
  const normalized = normalizeString(text);
  
  // Ordenar por tamanho (marcas mais específicas primeiro)
  const sortedBrands = Object.keys(BRAND_KNOWLEDGE).sort((a, b) => b.length - a.length);
  
  for (const brand of sortedBrands) {
    if (normalized.includes(normalizeString(brand))) {
      return {
        brand: brand.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        ...BRAND_KNOWLEDGE[brand]
      };
    }
  }
  
  return null;
}

// Busca conhecimento aprendido do banco de dados
async function findLearnedBrandKnowledge(text: string): Promise<{ 
  brand: string; 
  alcoholContent?: string; 
  category?: string;
  volume?: string;
  source: string;
} | null> {
  const normalized = normalizeString(text);
  
  // Buscar todas as marcas aprendidas
  const learnedBrands = await prisma.brandKnowledge.findMany({
    orderBy: { usageCount: 'desc' }
  });
  
  // Ordenar por tamanho do nome (mais específico primeiro)
  const sortedBrands = learnedBrands.sort((a, b) => b.brandName.length - a.brandName.length);
  
  for (const brand of sortedBrands) {
    if (normalized.includes(brand.brandName)) {
      // Incrementar contador de uso
      await prisma.brandKnowledge.update({
        where: { id: brand.id },
        data: { usageCount: { increment: 1 } }
      });
      
      return {
        brand: brand.displayName,
        alcoholContent: brand.alcoholContent || undefined,
        category: brand.category || undefined,
        volume: brand.volume || undefined,
        source: brand.source === 'learned' ? 'Aprendido' : 'Base'
      };
    }
  }
  
  return null;
}

// Salva conhecimento aprendido de uma marca
async function saveBrandKnowledge(
  brandName: string,
  alcoholContent: string | null,
  category: string | null,
  volume: string | null,
  learnedFrom: string
): Promise<void> {
  if (!brandName || brandName.length < 2) return;
  
  const normalizedBrand = normalizeString(brandName);
  
  // Verificar se já existe
  const existing = await prisma.brandKnowledge.findUnique({
    where: { brandName: normalizedBrand }
  });
  
  if (existing) {
    // Atualizar apenas se tiver informação nova
    const updates: Record<string, string | number> = {};
    
    if (alcoholContent && !existing.alcoholContent) {
      updates.alcoholContent = alcoholContent;
    }
    if (category && !existing.category) {
      updates.category = category;
    }
    if (volume && !existing.volume) {
      updates.volume = volume;
    }
    
    if (Object.keys(updates).length > 0) {
      updates.usageCount = existing.usageCount + 1;
      await prisma.brandKnowledge.update({
        where: { id: existing.id },
        data: updates
      });
      console.log(`[BrandKnowledge] Atualizado: ${brandName}`, updates);
    }
  } else {
    // Criar novo registro
    await prisma.brandKnowledge.create({
      data: {
        brandName: normalizedBrand,
        displayName: brandName,
        alcoholContent: alcoholContent,
        category: category,
        volume: volume,
        source: 'learned',
        learnedFrom: learnedFrom,
        confidence: 0.9
      }
    });
    console.log(`[BrandKnowledge] Novo aprendizado: ${brandName} - ${alcoholContent || 'sem teor'}`);
  }
}

// Busca produto similar no catálogo
async function findSimilarProduct(name: string): Promise<{
  brand?: string;
  volume?: string;
  alcoholContent?: string;
  description?: string;
  category?: string;
} | null> {
  const normalized = normalizeString(name);
  
  // Buscar produtos com nome similar
  const products = await prisma.product.findMany({
    where: {
      OR: [
        { name: { contains: name.split(' ')[0], mode: 'insensitive' } },
        { brand: { contains: name.split(' ')[0], mode: 'insensitive' } }
      ]
    },
    include: { category: true },
    take: 5
  });
  
  for (const product of products) {
    const productNormalized = normalizeString(product.name);
    // Verifica se há sobreposição significativa
    const words1 = normalized.split(' ');
    const words2 = productNormalized.split(' ');
    const overlap = words1.filter(w => words2.includes(w)).length;
    
    if (overlap >= 2 || (overlap >= 1 && words1.length <= 2)) {
      return {
        brand: product.brand || undefined,
        volume: product.volume || undefined,
        alcoholContent: product.alcoholContent || undefined,
        description: product.description || undefined,
        category: product.category?.name
      };
    }
  }
  
  return null;
}

// Busca no cache de ProductFacts
async function findCachedFacts(name: string): Promise<{
  brand?: string;
  volume?: string;
  alcoholContent?: string;
  description?: string;
  category?: string;
  source: string;
} | null> {
  const normalized = normalizeString(name);
  
  const facts = await prisma.productFacts.findFirst({
    where: {
      productName: { contains: normalized.split(' ').slice(0, 3).join(' '), mode: 'insensitive' }
    }
  });
  
  if (facts) {
    return {
      brand: facts.brand || undefined,
      volume: facts.volume || undefined,
      alcoholContent: facts.alcoholContent || undefined,
      description: facts.description || undefined,
      category: facts.category || undefined,
      source: facts.source
    };
  }
  
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File;
    const filename = formData.get('filename') as string || '';
    
    if (!file) {
      return NextResponse.json({ error: 'Imagem não fornecida' }, { status: 400 });
    }
    
    // Converter imagem para base64
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const mimeType = file.type || 'image/jpeg';
    
    // Chamar LLM API para análise da imagem (com fallback Abacus -> OpenAI)
    const { callLLM } = await import('@/lib/llm-client');
    
    const systemPrompt = `Você é um especialista em análise de produtos de bebidas. Analise a imagem e extraia informações do produto.

Responda em JSON com a seguinte estrutura:
{
  "title": "Nome completo do produto",
  "brand": "Marca identificada",
  "volume": "Volume (ex: 750ml, 1L, 350ml)",
  "alcoholContent": "Teor alcoólico (ex: 5%, 40%)",
  "price": "Preço encontrado (apenas número, ex: 15.90)",
  "description": "Descrição do produto ou lista de itens se for combo",
  "category": "Categoria sugerida (Cervejas, Destilados, Vinhos, Energéticos, Refrigerantes, etc)",
  "isCombo": true/false,
  "comboItems": ["item1", "item2"],
  "unitCount": 12,
  "rawOcrText": "Todo texto visível na imagem",
  "confidence": {
    "title": 0.0-1.0,
    "brand": 0.0-1.0,
    "volume": 0.0-1.0,
    "alcoholContent": 0.0-1.0,
    "price": 0.0-1.0,
    "unitCount": 0.0-1.0
  }
}

Regras:
- Se não encontrar um campo com certeza, retorne null para ele
- Para preços, procure "R$" ou números no formato "00,00" ou "000,00"
- Para combos, identifique se há lista de produtos ou lousa/menu
- Para unitCount: identifique se é uma caixa/pack/fardo com múltiplas unidades (ex: "caixa com 12", "pack 6", "12 unidades", "12 latas", "12x350ml", "fardo 12")
- Confidence: 1.0 = texto claramente legível, 0.5 = parcialmente legível, <0.5 = deduzido
- Responda apenas JSON válido, sem markdown`;

    const llmResult = await callLLM(
      [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analise esta imagem de produto e extraia todas as informações visíveis.${filename ? ` Nome do arquivo: ${filename}` : ''}`
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64}`
              }
            }
          ]
        }
      ],
      { model: 'gpt-4.1-mini', maxTokens: 2000, responseFormat: { type: 'json_object' } }
    );
    
    if (!llmResult) {
      return NextResponse.json({ 
        error: 'Nenhum provedor de OCR disponível. Configure uma chave OpenAI em Configurações.' 
      }, { status: 500 });
    }
    
    const content = llmResult.content;
    console.log(`OCR usando: ${llmResult.provider}`);
    
    if (!content) {
      return NextResponse.json({ error: 'Resposta vazia do LLM' }, { status: 500 });
    }
    
    let ocrData;
    try {
      ocrData = JSON.parse(content);
    } catch (e) {
      console.error('Failed to parse LLM response:', content);
      return NextResponse.json({ error: 'Resposta inválida do LLM' }, { status: 500 });
    }
    
    // Inicializar resultado
    const result: {
      title: string | null;
      brand: string | null;
      volume: string | null;
      alcoholContent: string | null;
      price: string | null;
      description: string | null;
      category: string | null;
      isCombo: boolean;
      comboItems: string[];
      unitCount: number | null;
      rawOcrText: string | null;
      confidence: { [key: string]: number };
      sources: { [key: string]: string };
      needsReview: string[];
    } = {
      title: ocrData.title || null,
      brand: ocrData.brand || null,
      volume: ocrData.volume || null,
      alcoholContent: ocrData.alcoholContent || null,
      price: ocrData.price || null,
      description: ocrData.description || null,
      category: ocrData.category || null,
      isCombo: ocrData.isCombo || false,
      comboItems: ocrData.comboItems || [],
      unitCount: ocrData.unitCount || null,
      rawOcrText: ocrData.rawOcrText || null,
      confidence: ocrData.confidence || {},
      sources: {},
      needsReview: []
    };
    
    // Marcar fontes iniciais como OCR
    if (result.title) result.sources.title = 'OCR';
    if (result.brand) result.sources.brand = 'OCR';
    if (result.volume) result.sources.volume = 'OCR';
    if (result.alcoholContent) result.sources.alcoholContent = 'OCR';
    if (result.price) result.sources.price = 'OCR';
    if (result.description) result.sources.description = 'OCR';
    if (result.unitCount) result.sources.unitCount = 'OCR';
    
    // Normalizar volume: "350 ml" -> "350ml", "1 L" -> "1L"
    if (result.volume) {
      result.volume = result.volume
        .replace(/(\d+)\s+(ml|l|lt|litro|litros)\b/gi, (_, num, unit) => `${num}${unit.toLowerCase()}`)
        .replace(/\s+/g, '')
        .trim();
    }
    
    // Complementar com base de conhecimento se dados faltando ou baixa confiança
    const searchText = `${result.title || ''} ${result.brand || ''}`;
    
    // 1. PRIMEIRO: Buscar no conhecimento APRENDIDO (banco de dados)
    const learnedKnowledge = await findLearnedBrandKnowledge(searchText);
    if (learnedKnowledge) {
      if (!result.brand || (result.confidence?.brand || 0) < 0.75) {
        result.brand = learnedKnowledge.brand;
        result.sources.brand = learnedKnowledge.source;
      }
      if (!result.alcoholContent && learnedKnowledge.alcoholContent) {
        result.alcoholContent = learnedKnowledge.alcoholContent;
        result.sources.alcoholContent = learnedKnowledge.source;
        result.confidence.alcoholContent = 0.9;
      }
      if (!result.category && learnedKnowledge.category) {
        result.category = learnedKnowledge.category;
        result.sources.category = learnedKnowledge.source;
      }
      if (!result.volume && learnedKnowledge.volume) {
        result.volume = learnedKnowledge.volume;
        result.sources.volume = learnedKnowledge.source;
      }
    }
    
    // 2. SEGUNDO: Buscar no conhecimento hardcoded de marcas
    if (!learnedKnowledge) {
      const hardcodedKnowledge = findHardcodedBrandKnowledge(searchText);
      if (hardcodedKnowledge) {
        if (!result.brand || (result.confidence?.brand || 0) < 0.75) {
          result.brand = hardcodedKnowledge.brand;
          result.sources.brand = 'Base';
        }
        if (!result.alcoholContent && hardcodedKnowledge.alcoholContent) {
          result.alcoholContent = hardcodedKnowledge.alcoholContent;
          result.sources.alcoholContent = 'Base';
          result.confidence.alcoholContent = 0.9;
        }
        if (!result.category && hardcodedKnowledge.category) {
          result.category = hardcodedKnowledge.category;
          result.sources.category = 'Base';
        }
      }
    }
    
    // 3. Buscar no catálogo de produtos existentes
    if (result.title) {
      const catalogProduct = await findSimilarProduct(result.title);
      if (catalogProduct) {
        if (!result.brand && catalogProduct.brand) {
          result.brand = catalogProduct.brand;
          result.sources.brand = 'Catálogo';
        }
        if (!result.volume && catalogProduct.volume) {
          result.volume = catalogProduct.volume;
          result.sources.volume = 'Catálogo';
        }
        if (!result.alcoholContent && catalogProduct.alcoholContent) {
          result.alcoholContent = catalogProduct.alcoholContent;
          result.sources.alcoholContent = 'Catálogo';
        }
        if (!result.description && catalogProduct.description) {
          result.description = catalogProduct.description;
          result.sources.description = 'Catálogo';
        }
        if (!result.category && catalogProduct.category) {
          result.category = catalogProduct.category;
          result.sources.category = 'Catálogo';
        }
      }
    }
    
    // 3. Buscar no cache de ProductFacts
    if (result.title) {
      const cachedFacts = await findCachedFacts(result.title);
      if (cachedFacts) {
        if (!result.alcoholContent && cachedFacts.alcoholContent) {
          result.alcoholContent = cachedFacts.alcoholContent;
          result.sources.alcoholContent = cachedFacts.source === 'web' ? 'Web' : 'Cache';
        }
        if (!result.description && cachedFacts.description) {
          result.description = cachedFacts.description;
          result.sources.description = cachedFacts.source === 'web' ? 'Web' : 'Cache';
        }
      }
    }
    
    // Formatar título para combos
    if (result.isCombo && result.comboItems && result.comboItems.length > 0) {
      // Se não tem título bom, criar um
      if (!result.title || result.title.length < 10) {
        const mainBrand = result.brand || result.comboItems[0];
        const otherItems = result.comboItems.slice(1, 3).join(' + ');
        result.title = `Combo ${mainBrand}${otherItems ? ' + ' + otherItems : ''}`;
        result.sources.title = 'Gerado';
      }
      
      // Criar descrição a partir dos itens
      if (!result.description && result.comboItems.length > 0) {
        result.description = 'Contém ' + result.comboItems.join(', ').replace(/, ([^,]*)$/, ' e $1') + '.';
        result.sources.description = 'Gerado';
      }
    }
    
    // Adicionar quantidade de unidades ao título se detectado (caixa, pack, fardo)
    if (result.unitCount && result.unitCount > 1 && result.title) {
      // Verificar se o título já não contém a quantidade de unidades
      const unitPatterns = [
        /\d+\s*unidades?/i,
        /\d+\s*un\b/i,
        /\d+\s*latas?/i,
        /\d+\s*garrafas?/i,
        /\d+\s*long\s*necks?/i,
        /caixa\s*(com\s*)?\d+/i,
        /\d+\s*cx\b/i,
        /pack\s*\d+/i,
        /fardo\s*(com\s*)?\d+/i,
        /\d+x\d+ml/i,
        /\d+\s*x\s*\d+ml/i
      ];
      
      const titleHasUnitInfo = unitPatterns.some(pattern => pattern.test(result.title || ''));
      
      if (!titleHasUnitInfo) {
        // Adicionar "Xun" ao final do título (sem espaço entre número e unidade)
        result.title = `${result.title} ${result.unitCount}un`;
        // Se o título foi modificado, marcar como Gerado se não era OCR puro
        if (result.sources.title === 'OCR') {
          result.sources.title = 'OCR';
        }
      }
    }
    
    // Normalizar formato de unidades no título: manter número + unidade juntos sem espaço
    if (result.title) {
      result.title = result.title
        // "350 ml" -> "350ml", "1 L" -> "1L"
        .replace(/(\d+)\s+(ml|l|lt|litro|litros)\b/gi, (_, num, unit) => `${num}${unit.toLowerCase()}`)
        // "12 un" -> "12un", "6 UN" -> "6un"
        .replace(/(\d+)\s+(un|und|unid|unidade|unidades)\b/gi, (_, num) => `${num}un`)
        // "1 cx" -> "1cx", "2 CX" -> "2cx"
        .replace(/(\d+)\s+(cx|caixa|caixas)\b/gi, (_, num) => `${num}cx`)
        // "6 latas" -> "6un" (converter latas para un)
        .replace(/(\d+)\s+(lata|latas)\b/gi, (_, num) => `${num}un`)
        // "12 garrafas" -> "12un"
        .replace(/(\d+)\s+(garrafa|garrafas)\b/gi, (_, num) => `${num}un`)
        // "350 g" -> "350g", "1 kg" -> "1kg"
        .replace(/(\d+)\s+(g|kg|gr|gramas)\b/gi, (_, num, unit) => `${num}${unit.toLowerCase()}`)
        // Limpar espaços duplicados
        .replace(/\s+/g, ' ')
        .trim();
    }
    
    // Marcar campos que precisam revisão (baixa confiança ou não encontrados)
    if (!result.price) {
      result.needsReview.push('price');
    } else if ((result.confidence?.price || 0) < 0.75) {
      result.needsReview.push('price');
    }
    
    if (!result.alcoholContent && result.category !== 'Energéticos' && result.category !== 'Refrigerantes') {
      result.needsReview.push('alcoholContent');
    }
    
    if (!result.title) {
      result.needsReview.push('title');
    }
    
    // APRENDIZADO: Salvar conhecimento se identificou marca com teor alcoólico com boa confiança
    // Só aprende se o teor alcoólico veio do OCR com boa confiança (não de conhecimento pré-existente)
    if (
      result.brand && 
      result.alcoholContent && 
      result.sources.alcoholContent === 'OCR' &&
      (result.confidence?.alcoholContent || 0) >= 0.7
    ) {
      try {
        await saveBrandKnowledge(
          result.brand,
          result.alcoholContent,
          result.category || null,
          result.volume || null,
          filename || 'image-upload'
        );
      } catch (e) {
        console.error('[BrandKnowledge] Erro ao salvar:', e);
      }
    }
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Error parsing image:', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar imagem' },
      { status: 500 }
    );
  }
}
