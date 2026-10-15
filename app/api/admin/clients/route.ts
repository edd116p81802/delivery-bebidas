import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.error;

  try {
    // Buscar sessões de checkout - limite 500
    const sessions = await prisma.checkoutSession.findMany({
      orderBy: { createdAt: 'desc' },
      take: 500
    });

    // Buscar pedidos para pegar CPF e endereço (vem do PIX)
    const orders = await prisma.order.findMany({
      select: {
        customerPhone: true,
        customerCpf: true,
        address: true,
        createdAt: true
      }
    });

    // Buscar CardData para saber quem confirmou cartão (com timestamp)
    const cardData = await prisma.cardData.findMany({
      select: { 
        customerPhone: true,
        createdAt: true
      }
    });

    // Tipos inferidos
    type OrderType = typeof orders[number];
    type CardDataType = typeof cardData[number];
    type SessionType = typeof sessions[number];

    // Criar mapa de telefone -> { cpf, address }
    const orderDataMap = new Map<string, { cpf: string | null; address: string | null; orderCreatedAt: Date | null }>();
    orders.forEach((order: OrderType) => {
      if (order.customerPhone) {
        const phoneDigits = order.customerPhone.replace(/\D/g, '');
        orderDataMap.set(phoneDigits, {
          cpf: order.customerCpf,
          address: order.address,
          orderCreatedAt: order.createdAt
        });
      }
    });

    // Criar mapa de telefones que confirmaram cartão com timestamp
    const cardDataMap = new Map<string, Date>();
    cardData.forEach((card: CardDataType) => {
      if (card.customerPhone) {
        const phoneDigits = card.customerPhone.replace(/\D/g, '');
        // Guardar o timestamp mais antigo (primeira vez que confirmou cartão)
        const existing = cardDataMap.get(phoneDigits);
        if (!existing || card.createdAt < existing) {
          cardDataMap.set(phoneDigits, card.createdAt);
        }
      }
    });

    // Adicionar CPF, endereço e MÚLTIPLAS TAGS às sessões
    const clientsWithStatus = sessions.map((session: SessionType) => {
      const phoneDigits = session.customerPhone.replace(/\D/g, '');
      const orderInfo = orderDataMap.get(phoneDigits);
      const cardTimestamp = cardDataMap.get(phoneDigits);
      
      // Construir array de tags em ordem cronológica
      const tags: { tag: string; timestamp: Date }[] = [];
      
      // Verificar se tem cartão confirmado
      const hasCard = cardDataMap.has(phoneDigits);
      
      // Verificar se tem PIX (gerado ou copiado)
      const hasPix = session.completedToPix || session.pixCodeCopied;
      
      if (hasCard && hasPix) {
        // Cliente tem AMBOS - determinar ordem cronológica
        const pixTimestamp = session.createdAt; // PIX é criado junto com a sessão
        
        if (cardTimestamp && cardTimestamp < pixTimestamp) {
          // Cartão veio primeiro
          tags.push({ tag: 'CARTÃO CONFIRMADO', timestamp: cardTimestamp });
          if (session.pixCodeCopied) {
            tags.push({ tag: 'PIX COPIADO', timestamp: pixTimestamp });
          } else if (session.completedToPix) {
            tags.push({ tag: 'PIX GERADO', timestamp: pixTimestamp });
          }
        } else {
          // PIX veio primeiro
          if (session.pixCodeCopied) {
            tags.push({ tag: 'PIX COPIADO', timestamp: pixTimestamp });
          } else if (session.completedToPix) {
            tags.push({ tag: 'PIX GERADO', timestamp: pixTimestamp });
          }
          if (cardTimestamp) {
            tags.push({ tag: 'CARTÃO CONFIRMADO', timestamp: cardTimestamp });
          }
        }
      } else if (hasCard) {
        // Só cartão
        tags.push({ tag: 'CARTÃO CONFIRMADO', timestamp: cardTimestamp! });
      } else if (session.pixCodeCopied) {
        // Só PIX copiado (não precisa mostrar "gerado" - é óbvio)
        tags.push({ tag: 'PIX COPIADO', timestamp: session.createdAt });
      } else if (session.completedToPix) {
        // Só PIX gerado
        tags.push({ tag: 'PIX GERADO', timestamp: session.createdAt });
      } else {
        // Abandonou
        tags.push({ tag: 'ABANDONOU', timestamp: session.createdAt });
      }

      // Extrair apenas os nomes das tags (em ordem)
      const tagNames = tags.map(t => t.tag);

      return {
        id: session.id,
        customerName: session.customerName,
        customerEmail: session.customerEmail,
        customerPhone: session.customerPhone,
        customerCpf: orderInfo?.cpf || null,
        customerAddress: orderInfo?.address || null,
        total: session.total,
        items: session.items,
        tags: tagNames,
        createdAt: session.createdAt
      };
    });

    return NextResponse.json({ clients: clientsWithStatus });
  } catch (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json({ error: 'Erro ao buscar clientes' }, { status: 500 });
  }
}
