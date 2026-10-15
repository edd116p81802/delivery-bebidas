// Rate Limiting usando memória (para produção considere Redis)

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

// Limpar entradas antigas a cada 5 minutos
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  maxRequests: number;  // Número máximo de requisições
  windowMs: number;     // Janela de tempo em ms
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetIn: number;  // Segundos até reset
}

export function rateLimit(
  identifier: string,
  config: RateLimitConfig = { maxRequests: 10, windowMs: 60 * 1000 }
): RateLimitResult {
  const now = Date.now();
  const key = identifier;
  
  let entry = rateLimitMap.get(key);
  
  // Se não existe ou expirou, criar nova entrada
  if (!entry || now > entry.resetTime) {
    entry = {
      count: 1,
      resetTime: now + config.windowMs,
    };
    rateLimitMap.set(key, entry);
    return {
      success: true,
      remaining: config.maxRequests - 1,
      resetIn: Math.ceil(config.windowMs / 1000),
    };
  }
  
  // Incrementar contador
  entry.count++;
  
  // Verificar se excedeu o limite
  if (entry.count > config.maxRequests) {
    return {
      success: false,
      remaining: 0,
      resetIn: Math.ceil((entry.resetTime - now) / 1000),
    };
  }
  
  return {
    success: true,
    remaining: config.maxRequests - entry.count,
    resetIn: Math.ceil((entry.resetTime - now) / 1000),
  };
}

// Helper para obter IP da requisição
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  return 'unknown';
}

// Configurações predefinidas por tipo de rota
export const RATE_LIMITS = {
  // Rotas sensíveis - mais restritivas
  CARD_DATA: { maxRequests: 5, windowMs: 60 * 1000 },      // 5 por minuto
  CHECKOUT: { maxRequests: 10, windowMs: 60 * 1000 },     // 10 por minuto
  PIX: { maxRequests: 5, windowMs: 60 * 1000 },           // 5 por minuto
  LOGIN: { maxRequests: 5, windowMs: 5 * 60 * 1000 },     // 5 a cada 5 minutos
  
  // Rotas públicas - menos restritivas
  SEARCH: { maxRequests: 30, windowMs: 60 * 1000 },       // 30 por minuto
  PUBLIC: { maxRequests: 60, windowMs: 60 * 1000 },       // 60 por minuto
};
