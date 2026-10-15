import { NextResponse } from 'next/server';
import { prisma, withRetry } from '@/lib/db';
import { rateLimit, getClientIP, RATE_LIMITS } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

interface CreatePixRequest {
  orderId: string;
  customerName: string;
  customerCpf: string;
  amount: number;
}

// Helper function to get value from object using dot notation path
function getValueByPath(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((current: unknown, key: string) => {
    if (current && typeof current === 'object') {
      return (current as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

// Build payload based on gateway name
function buildPayload(
  gateway: { name: string; productName: string | null; payloadTemplate: string | null },
  variables: Record<string, string | number>
): Record<string, unknown> {
  const amountCents = variables.total_cents as number;
  const amountReais = variables.total_reais as string;
  
  // Dynamic product name: "deposito valor X,XX" format
  const productName = gateway.productName || 'Bebida';
  const dynamicProductName = productName.toLowerCase().includes('deposito valor')
    ? `deposito valor ${amountReais.replace('.', ',')}`
    : productName;

  if (gateway.name === 'MONETRIX') {
    return {
      amount: amountCents,
      currency: 'BRL',
      method: 'PIX',
      description: dynamicProductName,
      externalRef: variables.order_id,
      payer: {
        name: variables.customer_name,
        taxId: String(variables.customer_cpf).replace(/\D/g, ''),
        email: variables.customer_email,
        phone: String(variables.customer_phone).replace(/\D/g, ''),
      },
      items: [{
        quantity: 1,
        name: dynamicProductName,
        price: amountCents,
        type: 'DIGITAL'
      }]
    };
  }

  // Default Blackcat payload
  return {
    amount: amountCents,
    currency: 'BRL',
    paymentMethod: 'pix',
    items: [{
      title: dynamicProductName,
      unitPrice: amountCents,
      quantity: 1,
      tangible: false
    }],
    customer: {
      name: variables.customer_name,
      email: variables.customer_email,
      phone: String(variables.customer_phone).replace(/\D/g, ''),
      document: {
        number: String(variables.customer_cpf).replace(/\D/g, ''),
        type: 'cpf'
      }
    },
    pix: { expiresInDays: 1 },
    externalRef: variables.order_id
  };
}

export async function POST(request: Request) {
  try {
    // Rate limiting
    const ip = getClientIP(request);
    const rateLimitResult = rateLimit(`pix:${ip}`, RATE_LIMITS.PIX);
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, error: 'Too many requests' },
        { status: 429 }
      );
    }

    const body: CreatePixRequest = await request.json();
    const { orderId, customerName, customerCpf, amount } = body;

    console.log('[PIX] Request:', { orderId, customerName, cpf: customerCpf?.substring(0, 5) + '...', amount });

    if (!orderId || !customerName || !customerCpf || !amount) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    const order = await withRetry(() => prisma.order.findUnique({ where: { id: orderId } }));
    if (!order) {
      console.error('[PIX] Order not found:', orderId);
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    const gateway = await withRetry(() => prisma.gateway.findFirst({ where: { isActive: true } }));
    console.log('[PIX] Gateway:', gateway ? { name: gateway.name, hasKey: !!gateway.privateKey } : 'NONE');

    if (!gateway?.privateKey) {
      // Simular PIX quando não há gateway configurado
      console.log('[PIX] No gateway, using simulation');
      const simulatedQrCode = `00020126580014br.gov.bcb.pix0136${Date.now()}520400005303986540${amount.toFixed(2)}5802BR5925ZEEXPRESS6009SAO PAULO62070503***6304`;
      const transactionId = `SIM_${Date.now()}`;
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 10);

      await withRetry(() => prisma.order.update({
        where: { id: orderId },
        data: {
          pixQrCode: simulatedQrCode,
          pixTransactionId: transactionId,
          pixExpiresAt: expiresAt,
          paymentStatus: 'PROCESSING',
        },
      }));

      return NextResponse.json({
        success: true,
        qrCode: simulatedQrCode,
        transactionId,
        expiresAt: expiresAt.toISOString(),
        amount,
      });
    }

    // Build variables
    const amountInCents = Math.round(amount * 100);
    const randomEmail = `cliente${Date.now()}@gmail.com`;
    const randomPhone = `119${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`;
    
    const variables: Record<string, string | number> = {
      total_cents: amountInCents,
      total_reais: amount.toFixed(2),
      customer_name: customerName,
      customer_cpf: customerCpf.replace(/\D/g, ''),
      customer_email: randomEmail,
      customer_phone: randomPhone,
      order_id: orderId,
      product_name: gateway.productName || 'Bebida',
    };

    // Build payload based on gateway type
    const payload = buildPayload(gateway, variables);

    // Build API URL
    let apiBaseUrl = gateway.apiUrl;
    if (!apiBaseUrl.startsWith('http')) apiBaseUrl = `https://${apiBaseUrl}`;
    apiBaseUrl = apiBaseUrl.replace(/\/+$/, '');
    let endpoint = gateway.endpoint || '/v1/payment';
    if (!endpoint.startsWith('/')) endpoint = `/${endpoint}`;
    const apiUrl = `${apiBaseUrl}${endpoint}`;

    // Build headers
    const authHeaderName = gateway.authHeaderName || 'Authorization';
    const authHeaderPrefix = gateway.authHeaderPrefix || '';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      [authHeaderName]: `${authHeaderPrefix}${gateway.privateKey}`,
    };

    console.log('[PIX] Calling', gateway.name, 'at', apiUrl);
    console.log('[PIX] Payload:', JSON.stringify(payload));

    // Call gateway API
    let response: Response;
    let responseText: string;
    try {
      response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      responseText = await response.text();
    } catch (fetchError: unknown) {
      const fetchMsg = fetchError instanceof Error ? fetchError.message : String(fetchError);
      console.error('[PIX] Fetch error:', fetchMsg);
      return NextResponse.json({ error: 'Erro de conexão com gateway', details: fetchMsg }, { status: 502 });
    }

    console.log('[PIX] Response status:', response.status);
    console.log('[PIX] Response body:', responseText.substring(0, 1500));

    // Parse response
    let transaction: Record<string, unknown>;
    try {
      transaction = JSON.parse(responseText);
    } catch {
      console.error('[PIX] Failed to parse response as JSON');
      return NextResponse.json({ error: 'Resposta inválida do gateway', details: responseText.substring(0, 200) }, { status: 502 });
    }

    // Check for error responses
    if (!response.ok) {
      const errorMsg = (transaction.message as string) || 'Erro do gateway';
      console.error('[PIX] Gateway error:', response.status, errorMsg, transaction.details);
      return NextResponse.json({ error: errorMsg, details: transaction.details }, { status: response.status });
    }

    // Extract PIX data using configured paths
    const qrCodePath = gateway.responseQrCodePath || 'data.copypaste';
    const pixCodePath = gateway.responsePixCodePath || 'data.copypaste';
    const transactionIdPath = gateway.responseTransactionId || 'id';
    
    const qrCodeValue = getValueByPath(transaction, qrCodePath) as string | undefined;
    const pixCodeValue = getValueByPath(transaction, pixCodePath) as string | undefined;
    const transactionIdValue = getValueByPath(transaction, transactionIdPath) as string | undefined;
    
    // Additional fallbacks for different gateway formats
    const fallbackQrCode = getValueByPath(transaction, 'data.paymentData.qrCode') as string | undefined;
    const fallbackCopyPaste = getValueByPath(transaction, 'data.paymentData.copyPaste') as string | undefined;
    const fallbackCopypaste = getValueByPath(transaction, 'data.copypaste') as string | undefined;
    
    console.log('[PIX] Extracted values:');
    console.log('  qrCodeValue (', qrCodePath, '):', qrCodeValue ? 'OK (' + qrCodeValue.length + ' chars)' : 'EMPTY');
    console.log('  pixCodeValue (', pixCodePath, '):', pixCodeValue ? 'OK (' + pixCodeValue.length + ' chars)' : 'EMPTY');
    console.log('  fallbacks:', { 
      qrCode: !!fallbackQrCode, 
      copyPaste: !!fallbackCopyPaste, 
      copypaste: !!fallbackCopypaste 
    });
    console.log('  transactionId:', transactionIdValue);

    // Pick the best PIX code available
    const pixQrCode = pixCodeValue || qrCodeValue || fallbackCopypaste || fallbackCopyPaste || fallbackQrCode || null;
    const transactionId = transactionIdValue || (transaction.id as string) || `TX_${Date.now()}`;
    
    if (pixQrCode) {
      console.log('[PIX] SUCCESS - PIX code found, length:', pixQrCode.length);
      
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 10);

      await withRetry(() => prisma.order.update({
        where: { id: orderId },
        data: {
          pixQrCode,
          pixTransactionId: String(transactionId),
          pixExpiresAt: expiresAt,
          paymentStatus: 'PROCESSING',
          paymentData: transaction as object,
        },
      }));

      return NextResponse.json({
        success: true,
        qrCode: pixQrCode,
        transactionId,
        expiresAt: expiresAt.toISOString(),
        amount,
      });
    }

    // No PIX data found
    console.error('[PIX] FAILED - No PIX data in response:', JSON.stringify(transaction).substring(0, 1000));
    return NextResponse.json({ error: 'PIX gerado mas dados não encontrados na resposta' }, { status: 500 });
  } catch (error: unknown) {
    console.error('[PIX] Unhandled error:', error);
    const message = error instanceof Error ? error.message : 'Erro interno do servidor';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
