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

// Validates and returns a mathematically valid Brazilian CPF
function getValidCPF(rawCpf?: string | null): string {
  const digits = String(rawCpf || '').replace(/\D/g, '');
  if (digits.length === 11 && !/^(\d)\1{10}$/.test(digits)) {
    let d1 = 0, d2 = 0;
    for (let i = 0; i < 9; i++) d1 += parseInt(digits[i], 10) * (10 - i);
    d1 = (d1 * 10) % 11;
    if (d1 === 10 || d1 === 11) d1 = 0;
    for (let i = 0; i < 10; i++) d2 += parseInt(digits[i], 10) * (11 - i);
    d2 = (d2 * 10) % 11;
    if (d2 === 10 || d2 === 11) d2 = 0;
    if (d1 === parseInt(digits[9], 10) && d2 === parseInt(digits[10], 10)) {
      return digits;
    }
  }
  // Generate mathematically valid Brazilian CPF
  const n = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  let d1 = 0, d2 = 0;
  for (let i = 0; i < 9; i++) d1 += n[i] * (10 - i);
  d1 = (d1 * 10) % 11;
  if (d1 === 10 || d1 === 11) d1 = 0;
  const n10 = [...n, d1];
  for (let i = 0; i < 10; i++) d2 += n10[i] * (11 - i);
  d2 = (d2 * 10) % 11;
  if (d2 === 10 || d2 === 11) d2 = 0;
  return [...n10, d2].join('');
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
  gateway: { name: string; productName: string | null; payloadTemplate: string | null; privateKey?: string; publicKey?: string; apiUrl?: string },
  variables: Record<string, string | number>,
  siteUrl: string
): Record<string, unknown> {
  const amountCents = variables.total_cents as number;
  const amountReais = variables.total_reais as string;
  
  // Dynamic product name: "deposito valor X,XX" format
  const productName = gateway.productName || 'Bebida';
  const dynamicProductName = productName.toLowerCase().includes('deposito valor')
    ? `deposito valor ${amountReais.replace('.', ',')}`
    : productName;

  // 1. SKALAPAY / SKALEPAY (https://skalapay.net/api/cash-in)
  if (
    gateway.name?.toUpperCase().includes('SKALA') ||
    gateway.name?.toUpperCase().includes('SKALE') ||
    gateway.apiUrl?.includes('skalapay')
  ) {
    const description = gateway.productName || 'produto x10';
    return {
      amount: Number(variables.total_reais),
      payment_method: 'pix',
      description,
      customer_data: {
        name: variables.customer_name,
        email: variables.customer_email,
        document: String(variables.customer_cpf).replace(/\D/g, ''),
        phone: String(variables.customer_phone).replace(/\D/g, ''),
      },
      postback_url: `${siteUrl}/api/payments/webhook`,
      metadata: {
        order_id: String(variables.order_id),
      },
    };
  }

  // 2. IRONPAY (https://api.ironpayapp.com.br/api/public/v1/transactions)
  if (
    gateway.name?.toUpperCase().includes('IRON') ||
    gateway.apiUrl?.includes('ironpay')
  ) {
    const offerHash = gateway.payloadTemplate || 'efvbs';
    const productHash = gateway.publicKey || 'y3mvnis5fa';
    return {
      amount: amountCents,
      payment_method: 'pix',
      offer_hash: offerHash,
      cart: [{
        operation_type: 1,
        product_hash: productHash,
        title: dynamicProductName || 'Bebidas Express Delivery',
        price: amountCents,
        quantity: 1
      }],
      customer: {
        name: variables.customer_name,
        email: variables.customer_email,
        phone_number: String(variables.customer_phone).replace(/\D/g, ''),
        document: String(variables.customer_cpf).replace(/\D/g, '')
      },
      postback_url: `${siteUrl}/api/payments/webhook`,
      external_id: String(variables.order_id)
    };
  }

  // 2. AVEN PAY / AVEM PAY (https://api.avempay.com.br/v1/gateway/)
  if (
    gateway.name?.toUpperCase().includes('AVEN') ||
    gateway.name?.toUpperCase().includes('AVEM') ||
    gateway.apiUrl?.includes('avempay')
  ) {
    return {
      'api-key': gateway.privateKey || String(variables.api_key),
      amount: Number(variables.total_reais),
      client: {
        name: variables.customer_name,
        document: String(variables.customer_cpf).replace(/\D/g, ''),
        telefone: String(variables.customer_phone).replace(/\D/g, ''),
        email: variables.customer_email,
      },
      callbackUrl: `${siteUrl}/api/payments/webhook`,
    };
  }

  // 3. MONETRIXPAY
  if (gateway.name?.toUpperCase().includes('MONETRIX')) {
    return {
      amount: amountCents,
      currency: 'BRL',
      method: 'PIX',
      description: dynamicProductName,
      externalRef: variables.order_id,
      notificationUrl: `${siteUrl}/api/payments/webhook`,
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

  // 4. Default Blackcat payload
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

    if (!orderId || !customerName || !amount) {
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
      const simulatedQrCode = `00020126580014br.gov.bcb.pix0136${Date.now()}520400005303986540${amount.toFixed(2)}5802BR5925Bebidas Express6009SAO PAULO62070503***6304`;
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
    const validCpf = getValidCPF(customerCpf || order.customerCpf);
    const amountInCents = Math.round(amount * 100);
    const randomEmail = `cliente${Date.now()}@gmail.com`;

    let phoneDigits = String(order.customerPhone || '').replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      phoneDigits = `119${Math.floor(10000000 + Math.random() * 90000000)}`;
    }

    let formattedName = String(customerName || order.customerName || 'Cliente').trim();
    if (!formattedName.includes(' ')) {
      formattedName = `${formattedName} Silva`;
    }
    
    let cleanEmail = String(order.customerEmail || '').trim().replace(/\s+/g, '');
    if (!cleanEmail.includes('@') || !cleanEmail.includes('.') || cleanEmail.includes(' ')) {
      cleanEmail = `cliente_${phoneDigits}@gmail.com`;
    }
    
    const variables: Record<string, string | number> = {
      total_cents: amountInCents,
      total_reais: amount.toFixed(2),
      customer_name: formattedName,
      customer_cpf: validCpf,
      customer_email: cleanEmail,
      customer_phone: phoneDigits,
      order_id: orderId,
      product_name: gateway.productName || 'Bebida',
      api_key: gateway.privateKey || '',
    };

    // Determine site URL dynamically from request host header
    const host = request.headers.get('host') || 'bebidasexpress-oficial.vercel.app';
    const proto = host.includes('localhost') ? 'http' : 'https';
    const siteUrl = process.env.NEXTAUTH_URL || `${proto}://${host}`;

    // Build payload based on gateway type
    const payload = buildPayload(gateway, variables, siteUrl);

    // Build API URL
    let apiBaseUrl = gateway.apiUrl;
    if (!apiBaseUrl.startsWith('http')) apiBaseUrl = `https://${apiBaseUrl}`;
    apiBaseUrl = apiBaseUrl.replace(/\/+$/, '');
    let endpoint = gateway.endpoint || '/v1/payment';
    if (!endpoint.startsWith('/')) endpoint = `/${endpoint}`;

    const isSkala =
      gateway.name?.toUpperCase().includes('SKALA') ||
      gateway.name?.toUpperCase().includes('SKALE') ||
      gateway.apiUrl?.includes('skalapay');

    const isIron =
      gateway.name?.toUpperCase().includes('IRON') ||
      gateway.apiUrl?.includes('ironpay');

    const isAvem =
      gateway.name?.toUpperCase().includes('AVEN') ||
      gateway.name?.toUpperCase().includes('AVEM') ||
      gateway.apiUrl?.includes('avempay');

    let apiUrl = `${apiBaseUrl}${endpoint}`;
    if (isIron) {
      const sep = apiUrl.includes('?') ? '&' : '?';
      apiUrl = `${apiUrl}${sep}api_token=${gateway.privateKey}`;
    }

    // Build headers
    const authHeaderName = gateway.authHeaderName || 'Authorization';
    const authHeaderPrefix = gateway.authHeaderPrefix || '';
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (isSkala) {
      headers['X-Client-Id'] = gateway.publicKey || 'xlux97_5yygfqtcmdgewm4kwz3w1nhr';
      headers['X-Client-Secret'] = gateway.privateKey || 'OFSBQxVoOp53PRQgVJ5Su4lxJI1qcKIOkrGv9cpn7bpNiCQ6r1K2wozUrzKsUmNX';
    } else if (!isAvem && !isIron && authHeaderName && authHeaderName.toLowerCase() !== 'none') {
      headers[authHeaderName] = `${authHeaderPrefix}${gateway.privateKey}`;
    }

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
      const errorMsg = (transaction.message as string) || (transaction.errorDetails as string) || 'Erro do gateway';
      console.error('[PIX] Gateway error:', response.status, errorMsg, transaction.details || transaction.errorDetails);
      return NextResponse.json({ error: errorMsg, details: transaction.details || transaction.errorDetails }, { status: response.status });
    }

    // Extract PIX data using configured paths or known gateway field names
    const qrCodePath = gateway.responseQrCodePath || 'paymentCodeBase64';
    const pixCodePath = gateway.responsePixCodePath || 'paymentCode';
    const transactionIdPath = gateway.responseTransactionId || 'idTransaction';
    
    const qrCodeValue = getValueByPath(transaction, qrCodePath) as string | undefined;
    const pixCodeValue = getValueByPath(transaction, pixCodePath) as string | undefined;
    const transactionIdValue = getValueByPath(transaction, transactionIdPath) as string | undefined;
    
    // Additional fallbacks for different gateway formats (SkalaPay, IronPay, Avem Pay, Monetrix, Blackcat, etc)
    const fallbackSkalaPix =
      (transaction.transaction as any)?.qr_code ||
      (transaction.transaction as any)?.pix_copy_paste ||
      (transaction.transaction as any)?.pix_code ||
      (transaction.acquirer_response as any)?.qr_code ||
      (transaction.acquirer_response as any)?.pix_copy_paste ||
      (transaction.qr_code as string) ||
      (transaction.pix_copy_paste as string);

    const fallbackSkalaId =
      (transaction.transaction as any)?.id ||
      (transaction.transaction as any)?.order_id ||
      (transaction.order_id as string) ||
      (transaction.transaction_id as string);

    const fallbackIronPix = (transaction.pix as any)?.pix_qr_code || (transaction.pix as any)?.pix_url;
    const fallbackIronHash = (transaction.hash as string) || (transaction.transaction as string);
    const fallbackPaymentCode = (transaction.paymentCode as string) || (transaction.data as any)?.paymentCode;
    const fallbackIdTransaction = (transaction.idTransaction as string) || (transaction.data as any)?.idTransaction;
    const fallbackQrCode = getValueByPath(transaction, 'data.paymentData.qrCode') as string | undefined;
    const fallbackCopyPaste = getValueByPath(transaction, 'data.paymentData.copyPaste') as string | undefined;
    const fallbackCopypaste = getValueByPath(transaction, 'data.copypaste') as string | undefined;
    
    // Pick the best PIX code available
    const pixQrCode = pixCodeValue || fallbackSkalaPix || fallbackIronPix || fallbackPaymentCode || qrCodeValue || fallbackCopypaste || fallbackCopyPaste || fallbackQrCode || null;
    const transactionId = transactionIdValue || fallbackSkalaId || fallbackIronHash || fallbackIdTransaction || (transaction.id as string) || `TX_${Date.now()}`;
    
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
