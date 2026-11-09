const baseUrl = 'https://bebidasexpress-oficial.vercel.app';

async function testPix() {
  console.log('1. Creating test order on:', baseUrl);
  const orderRes = await fetch(`${baseUrl}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerName: 'Cliente Teste IronPay',
      customerEmail: 'teste.ironpay@gmail.com',
      customerPhone: '11987654321',
      customerCpf: '07153496057',
      address: 'Av Paulista, 1000',
      complement: 'Apt 101',
      items: [{ id: 'prod1', name: 'Cerveja Heineken 350ml', price: 15.00, quantity: 1 }],
      subtotal: 15.00,
      deliveryFee: 0,
      total: 15.00,
      paymentMethod: 'PIX',
    }),
  });

  const orderData = await orderRes.json();
  console.log('Order response status:', orderRes.status, orderData);

  if (!orderData.success || !orderData.id) {
    throw new Error('Falha ao criar pedido: ' + JSON.stringify(orderData));
  }

  const orderId = orderData.id;
  console.log('2. Requesting PIX for orderId:', orderId);

  const pixRes = await fetch(`${baseUrl}/api/payments/create-pix`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderId,
      customerName: 'Cliente Teste IronPay',
      customerCpf: '07153496057',
      amount: 15.00,
    }),
  });

  const pixData = await pixRes.json();
  console.log('PIX response status:', pixRes.status);
  console.log('PIX response data:', JSON.stringify(pixData, null, 2));

  if (pixData.success && pixData.qrCode) {
    console.log('\n=======================================');
    console.log('✅ TESTE PIX COM IRONPAY SUCESSO!');
    console.log('Transaction ID:', pixData.transactionId);
    console.log('QR Code / Copia e Cola:', pixData.qrCode);
    console.log('=======================================');
  } else {
    console.error('❌ Falha ao obter QR code PIX');
  }
}

testPix().catch(console.error);
