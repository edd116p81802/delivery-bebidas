/**
 * Cliente LLM com seleção de provedor: Abacus ou OpenAI
 * Respeita a preferência salva no banco (LLM_PROVIDER)
 */

import { prisma } from '@/lib/db';

// Cache das configs
let configCache: Record<string, string> = {};
let cacheTimestamp = 0;
const CACHE_TTL = 60000; // 1 minuto

async function getConfigFromDB(key: string): Promise<string | null> {
  // Verificar cache
  if (Date.now() - cacheTimestamp < CACHE_TTL && configCache[key] !== undefined) {
    return configCache[key] || null;
  }

  try {
    const configs = await prisma.apiConfig.findMany();
    configCache = {};
    for (const c of configs) {
      configCache[c.key] = c.value;
    }
    cacheTimestamp = Date.now();
    return configCache[key] || null;
  } catch (e) {
    console.error('Erro ao buscar config:', e);
    return null;
  }
}

export function clearLLMCache() {
  configCache = {};
  cacheTimestamp = 0;
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

export interface LLMCallOptions {
  model?: string;
  maxTokens?: number;
  responseFormat?: { type: string };
}

export interface LLMResult {
  content: string;
  provider: 'abacus' | 'openai';
}

/**
 * Chama LLM respeitando a preferência do usuário
 * Ordem: Preferência do usuário (LLM_PROVIDER) -> Fallback se necessário
 */
export async function callLLM(
  messages: LLMMessage[],
  options?: LLMCallOptions
): Promise<LLMResult | null> {
  
  // Buscar preferência do usuário
  const preferredProvider = await getConfigFromDB('LLM_PROVIDER');
  
  // Se usuário escolheu OpenAI
  if (preferredProvider === 'openai') {
    const openaiKey = process.env.OPENAI_API_KEY || await getConfigFromDB('OPENAI_API_KEY');
    if (openaiKey) {
      try {
        const result = await callOpenAILLM(openaiKey, messages, options);
        if (result) return { content: result, provider: 'openai' };
      } catch (e) {
        console.error('OpenAI failed:', e);
      }
    }
    // Fallback para Abacus se OpenAI falhar
    if (process.env.ABACUSAI_API_KEY) {
      try {
        const result = await callAbacusLLM(messages, options);
        if (result) return { content: result, provider: 'abacus' };
      } catch (e) {
        console.error('Abacus LLM fallback failed:', e);
      }
    }
  } else {
    // Default: Abacus primeiro (ou se preferredProvider === 'abacus')
    if (process.env.ABACUSAI_API_KEY) {
      try {
        const result = await callAbacusLLM(messages, options);
        if (result) return { content: result, provider: 'abacus' };
      } catch (e) {
        console.error('Abacus LLM failed:', e);
      }
    }
    // Fallback para OpenAI
    const openaiKey = process.env.OPENAI_API_KEY || await getConfigFromDB('OPENAI_API_KEY');
    if (openaiKey) {
      try {
        const result = await callOpenAILLM(openaiKey, messages, options);
        if (result) return { content: result, provider: 'openai' };
      } catch (e) {
        console.error('OpenAI fallback failed:', e);
      }
    }
  }

  console.error('Nenhum provedor LLM disponível');
  return null;
}

async function callAbacusLLM(
  messages: LLMMessage[],
  options?: LLMCallOptions
): Promise<string | null> {
  const response = await fetch('https://apps.abacus.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.ABACUSAI_API_KEY}`
    },
    body: JSON.stringify({
      model: options?.model || 'gpt-4.1-mini',
      messages,
      max_tokens: options?.maxTokens || 2000,
      ...(options?.responseFormat ? { response_format: options.responseFormat } : {})
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Abacus LLM error:', errorText);
    return null;
  }

  const result = await response.json();
  return result.choices?.[0]?.message?.content || null;
}

async function callOpenAILLM(
  apiKey: string,
  messages: LLMMessage[],
  options?: LLMCallOptions
): Promise<string | null> {
  // Mapear modelo para OpenAI se necessário
  let model = options?.model || 'gpt-4o-mini';
  if (model.includes('gpt-4.1')) {
    model = 'gpt-4o-mini'; // Fallback para modelo OpenAI
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: options?.maxTokens || 2000,
      ...(options?.responseFormat ? { response_format: options.responseFormat } : {})
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenAI error:', errorText);
    return null;
  }

  const result = await response.json();
  return result.choices?.[0]?.message?.content || null;
}

/**
 * Verifica quais provedores LLM estão disponíveis e qual está ativo
 */
export async function checkLLMAvailability(): Promise<{
  abacus: boolean;
  openaiEnv: boolean;
  openaiDb: boolean;
  activeProvider: 'abacus' | 'openai' | null;
}> {
  const dbKey = await getConfigFromDB('OPENAI_API_KEY');
  const preferredProvider = await getConfigFromDB('LLM_PROVIDER');
  
  const hasAbacus = !!process.env.ABACUSAI_API_KEY;
  const hasOpenai = !!process.env.OPENAI_API_KEY || !!dbKey;
  
  let activeProvider: 'abacus' | 'openai' | null = null;
  if (preferredProvider === 'openai' && hasOpenai) {
    activeProvider = 'openai';
  } else if (hasAbacus) {
    activeProvider = 'abacus';
  } else if (hasOpenai) {
    activeProvider = 'openai';
  }
  
  return {
    abacus: hasAbacus,
    openaiEnv: !!process.env.OPENAI_API_KEY,
    openaiDb: !!dbKey,
    activeProvider
  };
}
