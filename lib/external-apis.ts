import { prisma } from '@/lib/db';

// Cache das configs para evitar queries repetidas
let configCache: Record<string, string> = {};
let cacheTimestamp = 0;
const CACHE_TTL = 60000; // 1 minuto

async function getApiConfig(key: string): Promise<string | null> {
  // Verifica cache
  if (Date.now() - cacheTimestamp < CACHE_TTL && Object.keys(configCache).length > 0) {
    return configCache[key] || null;
  }

  // Busca do banco
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

// Limpa o cache (chamar após salvar configs)
export function clearApiConfigCache() {
  configCache = {};
  cacheTimestamp = 0;
}

// ============================================
// CLOUDINARY
// ============================================

export interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

export async function getCloudinaryConfig(): Promise<CloudinaryConfig | null> {
  // Primeiro: variáveis de ambiente (Abacus ou manual)
  if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
    return {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      apiSecret: process.env.CLOUDINARY_API_SECRET,
    };
  }

  // Segundo: banco de dados
  const cloudName = await getApiConfig('CLOUDINARY_CLOUD_NAME');
  const apiKey = await getApiConfig('CLOUDINARY_API_KEY');
  const apiSecret = await getApiConfig('CLOUDINARY_API_SECRET');

  if (cloudName && apiKey && apiSecret) {
    return { cloudName, apiKey, apiSecret };
  }

  return null;
}

export async function uploadToCloudinary(file: Buffer, fileName: string): Promise<string | null> {
  const config = await getCloudinaryConfig();
  if (!config) return null;

  const timestamp = Math.round(Date.now() / 1000);
  const publicId = `zeexpress/${Date.now()}-${fileName.replace(/\.[^.]+$/, '')}`;

  // Criar signature
  const crypto = await import('crypto');
  const signatureString = `public_id=${publicId}&timestamp=${timestamp}${config.apiSecret}`;
  const signature = crypto.createHash('sha1').update(signatureString).digest('hex');

  const formData = new FormData();
  formData.append('file', new Blob([file]));
  formData.append('public_id', publicId);
  formData.append('timestamp', timestamp.toString());
  formData.append('api_key', config.apiKey);
  formData.append('signature', signature);

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`,
      { method: 'POST', body: formData }
    );

    if (!response.ok) {
      console.error('Cloudinary error:', await response.text());
      return null;
    }

    const data = await response.json();
    return data.secure_url;
  } catch (e) {
    console.error('Cloudinary upload error:', e);
    return null;
  }
}

// ============================================
// OPENAI (para OCR)
// ============================================

export async function getOpenAIKey(): Promise<string | null> {
  // Primeiro: variável de ambiente
  if (process.env.OPENAI_API_KEY) {
    return process.env.OPENAI_API_KEY;
  }

  // Segundo: banco de dados
  return await getApiConfig('OPENAI_API_KEY');
}

export async function callOpenAI(
  messages: Array<{ role: string; content: string | object[] }>,
  options?: { model?: string; maxTokens?: number }
): Promise<string | null> {
  const apiKey = await getOpenAIKey();
  if (!apiKey) return null;

  const model = options?.model || 'gpt-4o-mini';

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: options?.maxTokens || 1000,
      }),
    });

    if (!response.ok) {
      console.error('OpenAI error:', await response.text());
      return null;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (e) {
    console.error('OpenAI call error:', e);
    return null;
  }
}

// ============================================
// VERIFICAÇÃO DE DISPONIBILIDADE
// ============================================

export async function checkApiAvailability(): Promise<{
  abacusS3: boolean;
  abacusLLM: boolean;
  cloudinary: boolean;
  openai: boolean;
}> {
  const hasAbacusS3 = !!(process.env.AWS_BUCKET_NAME && process.env.AWS_FOLDER_PREFIX);
  const hasAbacusLLM = !!process.env.ABACUSAI_API_KEY;
  const cloudinaryConfig = await getCloudinaryConfig();
  const openaiKey = await getOpenAIKey();

  return {
    abacusS3: hasAbacusS3,
    abacusLLM: hasAbacusLLM,
    cloudinary: !!cloudinaryConfig,
    openai: !!openaiKey,
  };
}

// ============================================
// UPLOAD COM SELEÇÃO DE PROVEDOR
// ============================================

export async function uploadImageWithFallback(
  file: Buffer,
  fileName: string,
  contentType: string
): Promise<{ url: string; provider: 'abacus' | 'cloudinary' } | null> {
  
  // Buscar preferência do usuário
  const preferredProvider = await getApiConfig('STORAGE_PROVIDER');
  
  // Se usuário escolheu Cloudinary
  if (preferredProvider === 'cloudinary') {
    const cloudinaryUrl = await uploadToCloudinary(file, fileName);
    if (cloudinaryUrl) {
      return { url: cloudinaryUrl, provider: 'cloudinary' };
    }
    // Fallback para Abacus S3 se Cloudinary falhar
    if (process.env.AWS_BUCKET_NAME && process.env.AWS_FOLDER_PREFIX) {
      try {
        const { generatePresignedUploadUrl, getFileUrl } = await import('@/lib/s3');
        const { uploadUrl, cloud_storage_path } = await generatePresignedUploadUrl(
          fileName, contentType, true
        );
        const uploadResponse = await fetch(uploadUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': contentType },
        });
        if (uploadResponse.ok) {
          const url = await getFileUrl(cloud_storage_path, true);
          return { url, provider: 'abacus' };
        }
      } catch (e) {
        console.error('Abacus S3 fallback failed:', e);
      }
    }
  } else {
    // Default: Abacus S3 primeiro
    if (process.env.AWS_BUCKET_NAME && process.env.AWS_FOLDER_PREFIX) {
      try {
        const { generatePresignedUploadUrl, getFileUrl } = await import('@/lib/s3');
        const { uploadUrl, cloud_storage_path } = await generatePresignedUploadUrl(
          fileName, contentType, true
        );
        const uploadResponse = await fetch(uploadUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': contentType },
        });
        if (uploadResponse.ok) {
          const url = await getFileUrl(cloud_storage_path, true);
          return { url, provider: 'abacus' };
        }
      } catch (e) {
        console.error('Abacus S3 failed:', e);
      }
    }
    // Fallback para Cloudinary
    const cloudinaryUrl = await uploadToCloudinary(file, fileName);
    if (cloudinaryUrl) {
      return { url: cloudinaryUrl, provider: 'cloudinary' };
    }
  }

  return null;
}
