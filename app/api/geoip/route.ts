import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Função para extrair o IP real do cliente de vários headers
function getClientIP(request: NextRequest): string {
  const headers = [
    'cf-connecting-ip',      // Cloudflare
    'x-real-ip',             // Nginx proxy
    'x-client-ip',           // Apache proxy
    'true-client-ip',        // Akamai
    'x-forwarded-for',       // Padrão - pegar o primeiro IP
  ];

  for (const header of headers) {
    const value = request.headers.get(header);
    if (value) {
      const ip = value.split(',')[0].trim();
      if (ip && !isPrivateIP(ip)) {
        return ip;
      }
    }
  }

  return '127.0.0.1';
}

function isPrivateIP(ip: string): boolean {
  return ip.startsWith('192.168.') || 
         ip.startsWith('10.') || 
         ip.startsWith('172.16.') ||
         ip.startsWith('172.17.') ||
         ip.startsWith('172.18.') ||
         ip.startsWith('172.19.') ||
         ip.startsWith('172.2') ||
         ip.startsWith('172.30.') ||
         ip.startsWith('172.31.') ||
         ip === '127.0.0.1' ||
         ip === '::1' ||
         ip.startsWith('fc') ||
         ip.startsWith('fd') ||
         ip.startsWith('fe80');
}

export async function GET(request: NextRequest) {
  try {
    const clientIp = getClientIP(request);
    
    // Log para debug
    console.log('GeoIP Debug:', {
      clientIp,
      xForwardedFor: request.headers.get('x-forwarded-for'),
      xRealIp: request.headers.get('x-real-ip'),
    });
    
    // Se for IP privado, retornar localização default (NÃO é mobile - está em rede local/Wi-Fi)
    if (isPrivateIP(clientIp)) {
      return NextResponse.json({
        city: 'São Paulo',
        state: 'SP',
        isMobile: false, // IP privado = Wi-Fi/rede local, NÃO é rede móvel
      });
    }

    // Tentar ip-api.com - ele detecta se o IP é de operadora MÓVEL (4G/5G)
    // IMPORTANTE: data.mobile = true significa que o IP é de operadora móvel (Claro, Vivo, Tim, etc)
    // Se o usuário está no Wi-Fi, mesmo num celular, o IP é do provedor fixo e data.mobile = false
    try {
      const response = await fetch(
        `http://ip-api.com/json/${clientIp}?fields=status,city,regionName,mobile,proxy`,
        { signal: AbortSignal.timeout(3000) }
      );
      
      if (response.ok) {
        const data = await response.json();
        console.log('ip-api.com response:', data);
        
        if (data.status === 'success') {
          return NextResponse.json({
            city: data.city || 'São Paulo',
            state: data.regionName || 'SP',
            // APENAS usar data.mobile da API - isso indica se o IP é de rede móvel (4G/5G)
            // NÃO usar User-Agent porque celular no Wi-Fi tem User-Agent mobile mas IP fixo
            isMobile: data.mobile === true,
          });
        }
      }
    } catch (e) {
      console.error('ip-api.com error:', e);
    }

    // Fallback: ipapi.co
    try {
      const response = await fetch(
        `https://ipapi.co/${clientIp}/json/`,
        { signal: AbortSignal.timeout(3000) }
      );
      
      if (response.ok) {
        const data = await response.json();
        if (!data.error) {
          return NextResponse.json({
            city: data.city || 'São Paulo',
            state: data.region || 'SP',
            // ipapi.co não tem campo mobile, assumir false (conservador)
            isMobile: false,
          });
        }
      }
    } catch (e) {
      console.error('ipapi.co error:', e);
    }

    // Se todos falharem, assumir que NÃO é móvel (conservador)
    return NextResponse.json({ 
      city: 'São Paulo', 
      state: 'SP', 
      isMobile: false 
    });
  } catch (error) {
    console.error('GeoIP error:', error);
    return NextResponse.json({ 
      city: 'São Paulo', 
      state: 'SP', 
      isMobile: false 
    });
  }
}
