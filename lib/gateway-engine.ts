import crypto from 'crypto';

export interface GatewayExecutionParams {
  id?: string;
  name: string;
  apiUrl: string;
  endpoint?: string | null;
  productName?: string | null;
  authHeaderName?: string | null;
  authHeaderPrefix?: string | null;
  publicKey?: string | null;
  privateKey: string;
  valueFormat?: string | null;
  responseQrCodePath?: string | null;
  responsePixCodePath?: string | null;
  responseTransactionId?: string | null;
  payloadTemplate?: string | null;
}

export interface OrderDetailsForPix {
  orderId: string;
  customerName: string;
  customerCpf: string;
  customerEmail?: string;
  customerPhone?: string;
  amount: number; // in Reais (e.g. 25.50)
}

// Extract value by dot-notation path
export function getValueByPath(obj: any, path?: string | null): any {
  if (!obj || !path) return undefined;
  return path.split('.').reduce((current, key) => {
    if (current && typeof current === 'object') {
      return current[key];
    }
    return undefined;
  }, obj);
}

// Recursive search for Banco Central PIX code (starts with 000201)
export function findPixEmvCode(obj: any, depth = 0): string | null {
  if (!obj || depth > 8) return null;
  if (typeof obj === 'string') {
    const trimmed = obj.trim();
    if (trimmed.startsWith('000201') && trimmed.length >= 30) {
      return trimmed;
    }
    return null;
  }
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = findPixEmvCode(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (typeof obj === 'object') {
    // Check high priority keys first
    const priorityKeys = [
      'copy_paste',
      'pix_copy_paste',
      'pixCopyPasteCode',
      'pix_code',
      'qr_code',
      'payload',
      'paymentCode',
      'qrcode',
      'emv',
      'pix',
    ];
    for (const k of priorityKeys) {
      if (k in obj) {
        const val = obj[k];
        if (typeof val === 'string' && val.trim().startsWith('000201')) {
          return val.trim();
        }
      }
    }
    // Search all values
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      const found = findPixEmvCode(val, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

// Find base64 QR Code image in response
export function findQrCodeImage(obj: any, depth = 0): string | null {
  if (!obj || depth > 8) return null;
  if (typeof obj === 'string') {
    const trimmed = obj.trim();
    if (trimmed.startsWith('data:image/') || (trimmed.startsWith('iVBORw0KGgo') && trimmed.length > 100)) {
      return trimmed.startsWith('data:image/') ? trimmed : `data:image/png;base64,${trimmed}`;
    }
    return null;
  }
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = findQrCodeImage(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (typeof obj === 'object') {
    const priorityKeys = ['qr_code_base64', 'qrCodeBase64', 'encodedImage', 'raw_qr_code_base64', 'qrcode_base64'];
    for (const k of priorityKeys) {
      if (k in obj && typeof obj[k] === 'string') {
        const res = findQrCodeImage(obj[k], depth + 1);
        if (res) return res;
      }
    }
    for (const key of Object.keys(obj)) {
      const found = findQrCodeImage(obj[key], depth + 1);
      if (found) return found;
    }
  }
  return null;
}

// Generate valid 11-digit Brazilian CPF
export function generateValidCPF(): string {
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

// Build payload from template or fallback
export function buildGatewayPayload(
  gateway: GatewayExecutionParams,
  variables: Record<string, any>,
  siteUrl: string
): Record<string, any> {
  const template = gateway.payloadTemplate?.trim();

  if (template && template !== '{}' && template !== '') {
    try {
      let replaced = template;
      // Replace number placeholders (quoted or unquoted)
      replaced = replaced.replace(/"\{\{total_cents\}\}"|\{\{total_cents\}\}/g, String(variables.total_cents));
      replaced = replaced.replace(/"\{\{total_reais_number\}\}"|\{\{total_reais_number\}\}/g, String(Number(variables.total_reais)));
      replaced = replaced.replace(/"\{\{amount_number\}\}"|\{\{amount_number\}\}/g, String(Number(variables.total_reais)));

      // Replace string placeholders
      const stringKeys = [
        'customer_name',
        'customer_cpf',
        'customer_email',
        'customer_phone',
        'order_id',
        'product_name',
        'site_url',
        'due_date_iso',
        'due_date_ymd',
        'api_key',
        'public_key',
        'total_reais',
      ];
      for (const key of stringKeys) {
        const val = String(variables[key] ?? '');
        // Replace inside quotes or raw
        replaced = replaced.split(`{{${key}}}`).join(val.replace(/"/g, '\\"'));
      }

      return JSON.parse(replaced);
    } catch (parseErr) {
      console.warn('[GATEWAY-ENGINE] Custom payloadTemplate invalid, falling back to auto:', parseErr);
    }
  }

  // Built-in presets fallback logic
  const gName = (gateway.name || '').toUpperCase();
  const gUrl = (gateway.apiUrl || '').toLowerCase();
  const amountCents = variables.total_cents as number;
  const amountReais = Number(variables.total_reais);
  const productName = variables.product_name || 'ATESTADO MEDICO';

  // 0. BossPay / ECOMERCE (bosspaybr.com)
  if (gName.includes('BOSS') || gName.includes('ECOMERCE') || gUrl.includes('bosspay')) {
    return {
      external_id: String(variables.order_id),
      total_amount: Number(variables.total_reais),
      payment_method: 'PIX',
      webhook_url: `${siteUrl}/api/payments/webhook`,
      items: [
        {
          id: 'sku-1',
          title: 'Produto X10',
          price: Number(variables.total_reais),
          quantity: 1,
        },
      ],
      customer: {
        name: variables.customer_name,
        email: variables.customer_email,
        phone: String(variables.customer_phone).replace(/\D/g, ''),
        document: String(variables.customer_cpf).replace(/\D/g, ''),
      },
    };
  }

  // 1. TiggerPay
  if (gName.includes('TIGGER') || gUrl.includes('tigger')) {
    return {
      amount: amountCents,
      description: 'Produto X10',
      api_key: gateway.privateKey?.trim() || String(variables.api_key),
      customer: {
        name: variables.customer_name,
        email: variables.customer_email,
        cellphone: variables.customer_phone,
        taxId: String(variables.customer_cpf).replace(/\D/g, ''),
      },
    };
  }

  // 1. SkalaPay / SkalePay
  if (gName.includes('SKALA') || gName.includes('SKALE') || gUrl.includes('skala')) {
    return {
      amount: amountReais,
      payment_method: 'pix',
      description: productName,
      customer_data: {
        name: variables.customer_name,
        email: variables.customer_email,
        document: String(variables.customer_cpf).replace(/\D/g, ''),
        phone: String(variables.customer_phone).replace(/\D/g, ''),
      },
      postback_url: `${siteUrl}/api/payments/webhook`,
      metadata: { order_id: String(variables.order_id) },
    };
  }

  // 2. Pix Black (pixxblack.com)
  if (gName.includes('PIX BLACK') || gName.includes('PIXXBLACK') || gUrl.includes('pixxblack')) {
    return {
      amount_cents: amountCents,
      description: productName,
      external_reference: String(variables.order_id),
      payer: {
        name: variables.customer_name,
        document: String(variables.customer_cpf).replace(/\D/g, ''),
        email: variables.customer_email,
        phone: String(variables.customer_phone).replace(/\D/g, ''),
      },
    };
  }

  // 3. BlackPix Site (blackpix.site)
  if (gName.includes('BLACKPIX') || gUrl.includes('blackpix.site')) {
    return {
      amountCents: amountCents,
      description: productName,
    };
  }

  // 4. DropPay
  if (gName.includes('DROP') || gUrl.includes('droppay')) {
    return {
      amount: amountReais,
      payer_name: variables.customer_name,
      payer_email: variables.customer_email,
      payer_cpf: String(variables.customer_cpf).replace(/\D/g, ''),
      payer_phone: String(variables.customer_phone).replace(/\D/g, ''),
      reference: String(variables.order_id),
    };
  }

  // 5. SuitPay
  if (gName.includes('SUIT') || gUrl.includes('suitpay')) {
    return {
      requestNumber: String(variables.order_id),
      dueDate: variables.due_date_iso,
      amount: amountReais,
      client: {
        name: variables.customer_name,
        document: String(variables.customer_cpf).replace(/\D/g, ''),
        phoneNumber: String(variables.customer_phone).replace(/\D/g, ''),
        email: variables.customer_email,
      },
      callbackUrl: `${siteUrl}/api/payments/webhook`,
    };
  }

  // 6. PushinPay
  if (gName.includes('PUSHIN') || gUrl.includes('pushinpay')) {
    return {
      value: amountCents,
      webhook_url: `${siteUrl}/api/payments/webhook`,
      external_reference: String(variables.order_id),
    };
  }

  // 7. IronPay
  if (gName.includes('IRON') || gUrl.includes('ironpay')) {
    return {
      amount: amountCents,
      payment_method: 'pix',
      offer_hash: gateway.payloadTemplate || 'efvbs',
      cart: [{
        operation_type: 1,
        product_hash: gateway.publicKey || 'y3mvnis5fa',
        title: productName,
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

  // Default Standard Payload
  return {
    amount: gateway.valueFormat === 'reais' ? amountReais : amountCents,
    external_id: String(variables.order_id),
    customer: {
      name: variables.customer_name,
      document: String(variables.customer_cpf).replace(/\D/g, ''),
      email: variables.customer_email,
      phone: String(variables.customer_phone).replace(/\D/g, ''),
    },
    description: productName,
  };
}

export interface GatewayExecutionResult {
  success: boolean;
  httpStatus: number;
  qrCode: string | null;
  qrCodeImage?: string | null;
  transactionId: string | null;
  error?: string;
  details?: any;
  rawResponse?: any;
}

// Main execution function
export async function executeGatewayPix(
  gateway: GatewayExecutionParams,
  order: OrderDetailsForPix,
  siteUrl: string
): Promise<GatewayExecutionResult> {
  const gName = (gateway.name || '').toUpperCase();
  const gUrl = (gateway.apiUrl || '').toLowerCase();

  const isBossPay = gName.includes('BOSS') || gName.includes('ECOMERCE') || gUrl.includes('bosspay');
  const isTigger = gName.includes('TIGGER') || gUrl.includes('tigger');
  const isSkala = gName.includes('SKALA') || gName.includes('SKALE') || gUrl.includes('skala');
  const isIron = gName.includes('IRON') || gUrl.includes('ironpay');
  const isPixBlack = gName.includes('PIX BLACK') || gName.includes('PIXXBLACK') || gUrl.includes('pixxblack');
  const isBlackPix = gName.includes('BLACKPIX') || gUrl.includes('blackpix.site');
  const isDrop = gName.includes('DROP') || gUrl.includes('droppay');
  const isSuit = gName.includes('SUIT') || gUrl.includes('suitpay');

  // Build clean variables & Mask customer data for all gateways as instructed
  const cleanCpf = String(order.customerCpf || '').replace(/\D/g, '');
  let cleanPhone = String(order.customerPhone || '').replace(/\D/g, '') || '11999999999';
  if (cleanPhone.length < 10) cleanPhone = '11999999999';

  // Mask email: Anonymous privacy email for all gateways
  const cleanFirstName = (order.customerName || 'cliente')
    .split(' ')[0]
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
  const cleanEmail = `${cleanFirstName || 'cliente'}${cleanCpf.slice(-4) || Math.floor(1000 + Math.random() * 9000)}@gmail.com`;

  // Enforce "Produto X10" across all gateways as instructed
  const productName = 'Produto X10';

  const now = new Date();
  const dueDateIso = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const dueDateYmd = dueDateIso.split('T')[0];

  const variables: Record<string, any> = {
    total_cents: Math.round(order.amount * 100),
    total_reais: order.amount.toFixed(2),
    customer_name: order.customerName,
    customer_cpf: cleanCpf,
    customer_email: cleanEmail,
    customer_phone: cleanPhone,
    order_id: order.orderId,
    product_name: productName,
    api_key: gateway.privateKey || '',
    public_key: gateway.publicKey || '',
    site_url: siteUrl,
    due_date_iso: dueDateIso,
    due_date_ymd: dueDateYmd,
  };

  const payload = buildGatewayPayload(gateway, variables, siteUrl);

  // URL formatting
  let apiBaseUrl = gateway.apiUrl.trim();
  if (!apiBaseUrl.startsWith('http')) apiBaseUrl = `https://${apiBaseUrl}`;
  apiBaseUrl = apiBaseUrl.replace(/\/+$/, '');

  let endpoint = (gateway.endpoint || '/cash-in').trim();
  if (!endpoint.startsWith('/')) endpoint = `/${endpoint}`;

  let targetUrl = `${apiBaseUrl}${endpoint}`;
  if (isIron) {
    const sep = targetUrl.includes('?') ? '&' : '?';
    targetUrl = `${targetUrl}${sep}api_token=${gateway.privateKey.trim()}`;
  }

  // Headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  if (isBossPay) {
    headers['api-secret'] = gateway.privateKey.trim();
  } else if (isTigger) {
    headers['x-api-key'] = gateway.privateKey.trim();
  } else if (isSkala) {
    headers['X-Client-Id'] = (gateway.publicKey || '').trim();
    headers['X-Client-Secret'] = (gateway.privateKey || '').trim();
  } else if (isSuit) {
    headers['ci'] = (gateway.publicKey || '').trim();
    headers['cs'] = (gateway.privateKey || '').trim();
  } else if (isDrop) {
    headers['Authorization'] = `Bearer ${gateway.privateKey.trim()}`;
    headers['Idempotency-Key'] = `${order.orderId}-pix`;
    if (gateway.publicKey?.trim()) {
      headers['X-Client-ID'] = gateway.publicKey.trim();
    }
  } else if (isBlackPix || isPixBlack) {
    headers['Authorization'] = `Bearer ${gateway.privateKey.trim()}`;
    headers['Idempotency-Key'] = `order-${order.orderId || Date.now()}`;
  } else {
    // Custom / Generic auth header
    const authHeaderName = (gateway.authHeaderName || 'Authorization').trim();
    const authHeaderPrefix = gateway.authHeaderPrefix || '';
    if (authHeaderName.toLowerCase() !== 'none' && gateway.privateKey?.trim()) {
      headers[authHeaderName] = `${authHeaderPrefix}${gateway.privateKey.trim()}`;
    }
    if (gateway.publicKey?.trim() && !headers['X-Client-ID'] && !headers['X-Client-Id']) {
      headers['X-Client-ID'] = gateway.publicKey.trim();
    }
  }

  console.log(`[GATEWAY-ENGINE] Calling ${gateway.name} at: ${targetUrl}`);

  let response: Response;
  let responseText: string;
  try {
    response = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    responseText = await response.text();
  } catch (netErr: any) {
    return {
      success: false,
      httpStatus: 502,
      qrCode: null,
      transactionId: null,
      error: `Erro de rede/conexão ao acessar ${targetUrl}: ${netErr.message || netErr}`,
    };
  }

  let jsonResponse: any;
  try {
    jsonResponse = JSON.parse(responseText);
  } catch {
    jsonResponse = { raw: responseText };
  }

  if (!response.ok) {
    const errorMsg =
      jsonResponse.message ||
      jsonResponse.error ||
      jsonResponse.errorDetails ||
      jsonResponse.msg ||
      `Erro retornado pelo gateway (${response.status})`;

    return {
      success: false,
      httpStatus: response.status,
      qrCode: null,
      transactionId: null,
      error: errorMsg,
      details: jsonResponse,
      rawResponse: jsonResponse,
    };
  }

  // Extract PIX code: 1. Configured path -> 2. EMV scanner
  let pixCode: string | null = null;
  if (gateway.responsePixCodePath) {
    const fromPath = getValueByPath(jsonResponse, gateway.responsePixCodePath);
    if (typeof fromPath === 'string' && fromPath.trim().length > 10) {
      pixCode = fromPath.trim();
    }
  }

  if (!pixCode) {
    pixCode = findPixEmvCode(jsonResponse);
  }

  // Extract QR Code Image (if base64 or URL)
  let qrCodeImg: string | null = null;
  if (jsonResponse.pix?.qrcode && typeof jsonResponse.pix.qrcode === 'string') {
    qrCodeImg = jsonResponse.pix.qrcode;
  }
  if (!qrCodeImg && gateway.responseQrCodePath) {
    const fromPath = getValueByPath(jsonResponse, gateway.responseQrCodePath);
    if (typeof fromPath === 'string' && fromPath.length > 20) {
      qrCodeImg = fromPath.startsWith('http') || fromPath.startsWith('data:image/')
        ? fromPath
        : `data:image/png;base64,${fromPath}`;
    }
  }
  if (!qrCodeImg) {
    qrCodeImg = findQrCodeImage(jsonResponse);
  }

  // Extract Transaction ID
  let txId: string | null = null;
  if (gateway.responseTransactionId) {
    const fromPath = getValueByPath(jsonResponse, gateway.responseTransactionId);
    if (fromPath !== undefined && fromPath !== null) {
      txId = String(fromPath);
    }
  }
  if (!txId) {
    txId =
      jsonResponse.txid ||
      jsonResponse.transaction?.id ||
      jsonResponse.deposit?.id ||
      jsonResponse.id ||
      jsonResponse.order_id ||
      jsonResponse.transaction_id ||
      `TX_${Date.now()}`;
  }

  if (!pixCode && !qrCodeImg) {
    return {
      success: false,
      httpStatus: response.status,
      qrCode: null,
      transactionId: txId,
      error: 'Gateway respondeu sucesso, mas o código PIX Copia e Cola não foi localizado no formato esperado.',
      rawResponse: jsonResponse,
    };
  }

  return {
    success: true,
    httpStatus: response.status,
    qrCode: pixCode || qrCodeImg,
    qrCodeImage: qrCodeImg,
    transactionId: txId,
    rawResponse: jsonResponse,
  };
}
