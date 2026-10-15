// Lista de marcas conhecidas por categoria
const BRAND_DATABASE: { [key: string]: string[] } = {
  // Cervejas
  cervejas: [
    'Heineken', 'Budweiser', 'Corona', 'Coronita', 'Skol', 'Brahma', 'Antarctica',
    'Amstel', 'Stella Artois', 'Stella', 'Bohemia', 'Spaten', "Beck's", 'Becks',
    'Itaipava', 'Glacial', 'Petra', 'Caracu', 'Eisenbahn', 'Império', 'Imperio',
    'Cabaré', 'Cabare', 'Original', 'Devassa', 'Kaiser', 'Sol', 'Quilmes',
    'Patagonia', 'Colorado', 'Dado Bier', 'Wäls', 'Kirin', 'Asahi', 'Sapporo',
    'Blue Moon', 'Lagunitas', 'Goose Island', 'Leffe', 'Hoegaarden', 'Erdinger'
  ],
  
  // Destilados
  destilados: [
    'Absolut', 'Smirnoff', 'Grey Goose', 'Ketel One', 'Belvedere', 'Stolichnaya',
    'Johnnie Walker', 'Jack Daniels', "Jack Daniel's", 'Jim Beam', 'Jameson',
    'Chivas Regal', 'Chivas', 'Ballantines', "Ballantine's", 'Grants', "Grant's",
    'Dewar\'s', 'Dewars', 'Old Parr', 'Buchanan\'s', 'Buchanans', 'The Famous Grouse',
    'Bacardi', 'Havana Club', 'Captain Morgan', 'Malibu', 'Kraken',
    'José Cuervo', 'Jose Cuervo', 'Patrón', 'Patron', 'Don Julio', 'Olmeca', '1800',
    'Cachaça 51', '51', 'Pitú', 'Pitu', 'Velho Barreiro', 'Ypioca', 'Ypióca', 'Sagatiba', 'Leblon',
    'Cachaça', 'Cachaca', 'Weber Haus', 'Salinas', 'Caninha da Roça', 'Old Cesar',
    'Gordon\'s', 'Gordons', 'Tanqueray', 'Beefeater', 'Bombay', 'Hendrick\'s', 'Hendricks',
    'Larios', 'Rocks',
    'Campari', 'Aperol', 'Cynar', 'Fernet', 'Underberg',
    'Licor 43', 'Licor Stock', 'Stock', 'Cointreau', 'Grand Marnier', 'Amarula', 'Baileys', 'Jägermeister',
    'Jagermeister', 'Drambuie', 'Frangelico', 'Kahlúa', 'Kahlua',
    'Martini', 'Cinzano', 'Chandon', 'Domecq', 'Contini', 'Leonoff', 'Orloff', 'Skyy', 'Ciroc',
    'Excellent', 'White Horse', 'Black & White', 'Tequileiro', 'Rainha Indomada'
  ],
  
  // Refrigerantes
  refrigerantes: [
    'Coca-Cola', 'Coca Cola', 'Pepsi', 'Fanta', 'Sprite', 'Guaraná',
    'Guaraná Antarctica', 'Kuat', 'H2O', 'Sukita', 'Schweppes', 'Tônica',
    'Antarctica', 'Dolly', 'Convenção', 'Schin', 'Pureza', 'It!', 'Itubaína',
    'Mineirinho', 'Mate Couro', 'Flexa', 'Água Tônica', 'Cascatazul'
  ],
  
  // Energéticos
  energeticos: [
    'Red Bull', 'Monster', 'TNT', 'Baly', 'Bad Boy', 'Fusion', 'Burn',
    'Rockstar', 'Reign', 'C4', 'Gatorade', 'Powerade', 'Guaraviton',
    'Guaracrac', 'Minotauro'
  ],
  
  // Vinhos e Espumantes
  vinhos: [
    'Casillero del Diablo', 'Casillero', 'Concha y Toro', 'Casal Garcia',
    'Salton', 'Casa Perini', 'Aurora', 'Miolo', 'Chandon', 'Freixenet',
    'Mumm', 'Veuve Clicquot', 'Möet', 'Moet', 'Dom Pérignon', 'Sidra Líder',
    'Almadén', 'Almaden', 'Marcus James', 'Santa Helena', 'Gato Negro',
    'Reservado', 'Novecento', 'Chac Chac', 'Reno', 'Campo Largo', 'Cantina da Serra',
    'Galioto', 'Pérgola', 'Pergola', 'Monte Carmo', 'Saint German', 'Piscine', 'Alecrim'
  ],
  
  // Drinks Prontos
  drinks: [
    'Ice 51', 'Smirnoff Ice', 'Skol Beats', 'Beats', 'Mike\'s', 'Mikes',
    'Brutal Fruit', 'St. Pierre', 'Catuaba', 'Selvagem', 'Reggiane', 'Jurupinga',
    'Xeque Mate', 'Pink Lemonade', 'Dinalle', 'Gin Tônica'
  ],
  
  // Sucos e Não Alcoólicos
  sucos: [
    'Del Valle', 'Maguary', 'Sufresh', 'Kapo', 'Ades', 'Toddynho', 'Nescau',
    'Leão', 'Ice Tea', 'Mate Leão', 'H2O', 'Guaravita', 'Kero Coco', 'Tang',
    'Puro Coco', 'Coco Leve'
  ],
  
  // Cigarros
  cigarros: [
    'Marlboro', 'Lucky Strike', 'Dunhill', 'Kent', 'Camel', 'Winston',
    'Rothmans', 'L&M', 'Carlton', 'Minister', 'Bic'
  ],
  
  // Chocolates/Sobremesas
  sobremesas: [
    'Nestlé', 'Nestle', 'Lacta', 'Garoto', 'Hershey\'s', 'Hersheys',
    'Kit Kat', 'Bis', 'Alpino', 'Chokito', 'Prestígio', 'Prestigio',
    'Baton', 'Classic', 'Galak', 'Paçoquita', 'Pacoquita', 'Trident', 'Halls'
  ],
  
  // Águas
  aguas: [
    'Crystal', 'Cristal', 'Bonafont', 'Indaiá', 'Minalba', 'Petrópolis', 'São Lourenço',
    'Água da Pedra', 'Lindoya', 'Ouro Fino', 'Cascatazul'
  ],
  
  // Chopp de Vinho
  chopp: [
    'Pink Moon', 'Stempel'
  ],
  
  // Churrasco
  churrasco: [
    'Cisne', 'Bom Gosto'
  ],
  
  // Diversos
  diversos: [
    'Flop\'s'
  ]
};

// Criar lista unificada de todas as marcas
const ALL_BRANDS: string[] = Object.values(BRAND_DATABASE).flat();

// Mapeamento de nomes de produtos para marcas corretas
const BRAND_MAPPING: { [key: string]: string } = {
  'red bull': 'Red Bull',
  'redbull': 'Red Bull',
  'baly': 'Baly',
  'monster': 'Monster',
  'bad boy': 'Bad Boy',
  'badboy': 'Bad Boy',
  'gatorade': 'Gatorade',
  'guaraviton': 'Guaraviton',
  'guaracrac': 'Guaracrac',
  'fusion': 'Fusion',
  'minotauro': 'Minotauro',
  'tnt': 'TNT',
  'heineken': 'Heineken',
  'budweiser': 'Budweiser',
  'corona': 'Corona',
  'coronita': 'Coronita',
  'skol': 'Skol',
  'brahma': 'Brahma',
  'antarctica': 'Antarctica',
  'amstel': 'Amstel',
  'stella artois': 'Stella Artois',
  'stella': 'Stella Artois',
  'bohemia': 'Bohemia',
  'spaten': 'Spaten',
  'beck\'s': "Beck's",
  'becks': "Beck's",
  'itaipava': 'Itaipava',
  'glacial': 'Glacial',
  'petra': 'Petra',
  'caracu': 'Caracu',
  'eisenbahn': 'Eisenbahn',
  'império': 'Império',
  'imperio': 'Império',
  'coca-cola': 'Coca-Cola',
  'coca cola': 'Coca-Cola',
  'pepsi': 'Pepsi',
  'fanta': 'Fanta',
  'sprite': 'Sprite',
  'guaraná antarctica': 'Guaraná Antarctica',
  'kuat': 'Kuat',
  'h2o': 'H2O',
  'sukita': 'Sukita',
  'schweppes': 'Schweppes',
  'mineirinho': 'Mineirinho',
  'flexa': 'Flexa',
  'del valle': 'Del Valle',
  'toddynho': 'Toddynho',
  'ice tea': 'Ice Tea',
  'mate leão': 'Mate Leão',
  'guaravita': 'Guaravita',
  'absolut': 'Absolut',
  'smirnoff': 'Smirnoff',
  'jack daniels': "Jack Daniel's",
  'jack daniel\'s': "Jack Daniel's",
  'johnnie walker': 'Johnnie Walker',
  'chivas': 'Chivas Regal',
  'ballantines': "Ballantine's",
  'buchanan\'s': "Buchanan's",
  'buchanans': "Buchanan's",
  'bacardi': 'Bacardi',
  'tanqueray': 'Tanqueray',
  'beefeater': 'Beefeater',
  'bombay': 'Bombay',
  'gordon\'s': "Gordon's",
  'gordons': "Gordon's",
  'campari': 'Campari',
  'aperol': 'Aperol',
  'amarula': 'Amarula',
  'licor 43': 'Licor 43',
  'licor stock': 'Licor Stock',
  'velho barreiro': 'Velho Barreiro',
  'ypioca': 'Ypioca',
  'ypióca': 'Ypioca',
  'pitu': 'Pitú',
  'pitú': 'Pitú',
  '51': '51',
  'salinas': 'Salinas',
  'cabaré': 'Cabaré',
  'cabare': 'Cabaré',
  'white horse': 'White Horse',
  'black & white': 'Black & White',
  'domecq': 'Domecq',
  'martini': 'Martini',
  'jose cuervo': 'Jose Cuervo',
  'josé cuervo': 'Jose Cuervo',
  'tequileiro': 'Tequileiro',
  'orloff': 'Orloff',
  'skyy': 'Skyy',
  'ciroc': 'Ciroc',
  'leonoff': 'Leonoff',
  'excellent': 'Excellent',
  'contini': 'Contini',
  'larios': 'Larios',
  'rocks': 'Rocks',
  'salton': 'Salton',
  'casa perini': 'Casa Perini',
  'casillero del diablo': 'Casillero del Diablo',
  'casillero': 'Casillero del Diablo',
  'casal garcia': 'Casal Garcia',
  'chandon': 'Chandon',
  'reservado': 'Reservado',
  'novecento': 'Novecento',
  'chac chac': 'Chac Chac',
  'galioto': 'Galioto',
  'aurora': 'Aurora',
  'campo largo': 'Campo Largo',
  'saint german': 'Saint German',
  'piscine': 'Piscine',
  'gato negro': 'Gato Negro',
  'santa helena': 'Santa Helena',
  'cantina da serra': 'Cantina da Serra',
  'pérgola': 'Pérgola',
  'pergola': 'Pérgola',
  'monte carmo': 'Monte Carmo',
  'reno': 'Reno',
  'alecrim': 'Alecrim',
  'sidra líder': 'Sidra Líder',
  'ice 51': 'Ice 51',
  'skol beats': 'Skol Beats',
  'beats': 'Beats',
  'mike\'s': "Mike's",
  'mikes': "Mike's",
  'brutal fruit': 'Brutal Fruit',
  'st. pierre': 'St. Pierre',
  'catuaba': 'Catuaba',
  'selvagem': 'Selvagem',
  'reggiane': 'Reggiane',
  'jurupinga': 'Jurupinga',
  'xeque mate': 'Xeque Mate',
  'pink lemonade': 'Pink Lemonade',
  'dinalle': 'Dinalle',
  'marlboro': 'Marlboro',
  'lucky strike': 'Lucky Strike',
  'dunhill': 'Dunhill',
  'kent': 'Kent',
  'rothmans': 'Rothmans',
  'bic': 'Bic',
  'kit kat': 'Kit Kat',
  'bis': 'Bis',
  'alpino': 'Alpino',
  'chokito': 'Chokito',
  'prestígio': 'Prestígio',
  'prestigio': 'Prestígio',
  'baton': 'Baton',
  'galak': 'Galak',
  'nestlé': 'Nestlé',
  'nestle': 'Nestlé',
  'lacta': 'Lacta',
  'paçoquita': 'Paçoquita',
  'pacoquita': 'Paçoquita',
  'trident': 'Trident',
  'halls': 'Halls',
  'minalba': 'Minalba',
  'crystal': 'Crystal',
  'cristal': 'Crystal',
  'cascatazul': 'Cascatazul',
  'kero coco': 'Kero Coco',
  'puro coco': 'Puro Coco',
  'coco leve': 'Coco Leve',
  'tang': 'Tang',
  'água tônica': 'Água Tônica',
  'agua tonica': 'Água Tônica',
  'pink moon': 'Pink Moon',
  'stempel': 'Stempel',
  'cisne': 'Cisne',
  'bom gosto': 'Bom Gosto',
  'flop\'s': "Flop's",
  'flops': "Flop's",
  'old cesar': 'Old Cesar',
  'caninha da roça': 'Caninha da Roça',
  'caninha da roca': 'Caninha da Roça',
  'rainha indomada': 'Rainha Indomada',
  'leão': 'Leão'
};

/**
 * Detecta a marca a partir do nome do produto
 * IMPORTANTE: Match exato como palavra completa, não deduzir de números
 */
export function detectBrand(productName: string): string | null {
  if (!productName) return null;
  
  const nameLower = productName.toLowerCase();
  
  // Primeiro, tentar o mapeamento direto
  for (const [pattern, brand] of Object.entries(BRAND_MAPPING)) {
    // Escapar caracteres especiais de regex
    const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Match como palavra completa
    const regex = new RegExp(`(^|\\s|[^a-záàâãéêíóôõúç])${escapedPattern}($|\\s|[^a-záàâãéêíóôõúç])`, 'i');
    
    if (regex.test(nameLower)) {
      return brand;
    }
  }
  
  // Segundo, tentar o banco de marcas (ordenado por tamanho para evitar match parcial)
  const sortedBrands = [...ALL_BRANDS].sort((a, b) => b.length - a.length);
  
  for (const brand of sortedBrands) {
    const brandLower = brand.toLowerCase();
    
    // Pular marcas que são apenas números (como "51") a menos que o nome tenha contexto
    if (/^\d+$/.test(brand)) {
      // Para números, exigir contexto (como "cachaça 51", "ice 51")
      const contextRegex = new RegExp(`(cachaça|cachaca|ice|pinga)\\s*${brand}\\b`, 'i');
      if (contextRegex.test(nameLower)) {
        return brand;
      }
      continue;
    }
    
    // Escapar caracteres especiais de regex
    const escapedBrand = brandLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Match EXATO como palavra completa (com word boundaries em ambos os lados)
    const regex = new RegExp(`(^|\\s|[^a-záàâãéêíóôõúç0-9])${escapedBrand}($|\\s|[^a-záàâãéêíóôõúç0-9])`, 'i');
    
    if (regex.test(nameLower)) {
      // Retornar a marca com a capitalização do mapeamento se existir
      return BRAND_MAPPING[brandLower] || brand;
    }
  }
  
  return null;
}

/**
 * Extrai o volume do nome do produto
 * Exemplos: "350ml", "1L", "2L", "500g", "1kg"
 */
export function extractVolume(productName: string): string | null {
  if (!productName) return null;
  
  // Regex para capturar volumes comuns
  // Matches: 350ml, 350ML, 1L, 1l, 1,5L, 1.5L, 500g, 1kg, etc.
  const volumeRegex = /\b(\d+(?:[,.]\d+)?\s*(?:ml|l|lt|litro|litros|g|gr|gramas|kg|quilos))\b/gi;
  
  const matches = productName.match(volumeRegex);
  
  if (matches && matches.length > 0) {
    // Pegar o primeiro match e formatar
    let volume = matches[0].trim().toUpperCase();
    
    // Normalizar
    volume = volume
      .replace(/\s+/g, '') // Remover espaços
      .replace('LITRO', 'L')
      .replace('LITROS', 'L')
      .replace('LT', 'L')
      .replace('GR', 'G')
      .replace('GRAMAS', 'G')
      .replace('QUILOS', 'KG');
    
    return volume;
  }
  
  return null;
}

/**
 * Extrai a descrição do nome do arquivo
 * Padrões: __D=descrição aqui, __D=texto...
 * Retorna: { description: string | null, cleanedName: string }
 */
export function extractDescription(productName: string): { description: string | null; cleanedName: string } {
  if (!productName) return { description: null, cleanedName: productName };
  
  // Regex para capturar descrição após __D=
  // Matches: __D=descrição aqui até o final ou próximo delimitador
  const descRegex = /\s*__D=(.+?)(?:\.jpg|\.png|\.jpeg|\.webp)?$/i;
  
  const match = productName.match(descRegex);
  
  if (match) {
    const description = match[1].trim().replace(/\.+$/, ''); // Remove pontos extras no final
    const cleanedName = productName.replace(descRegex, '').trim();
    
    return { description, cleanedName };
  }
  
  return { description: null, cleanedName: productName };
}

/**
 * Extrai o teor alcoólico do nome do produto e remove do título
 * Padrões: 4,5%t, 40%t, 4.5%t, 5,2%, 12% (com ou sem 't')
 * Retorna: { alcoholContent: string | null, cleanedName: string }
 */
export function extractAlcoholContent(productName: string): { alcoholContent: string | null; cleanedName: string } {
  if (!productName) return { alcoholContent: null, cleanedName: productName };
  
  // Regex para capturar teor alcoólico (número + % com ou sem 't')
  // Matches: 4,5%t, 40%t, 4.5%t, 12%t, 5,2%, 12%, etc.
  // Não captura padrões que parecem preço ou desconto (ex: 15% desconto, 0%)
  const alcoholRegex = /\s+(\d+(?:[,.]\d+)?)\s*%t?\s*(?=\s+-\s+|\s*$|\s+__D=)/gi;
  
  const match = productName.match(alcoholRegex);
  
  if (match && match.length > 0) {
    // Extrair apenas o número do primeiro match
    const numMatch = match[0].match(/(\d+(?:[,.]\d+)?)/);
    // Manter o formato brasileiro com vírgula
    const alcoholContent = numMatch ? numMatch[1].replace('.', ',') + '%' : null;
    
    // Remover o teor do nome
    const cleanedName = productName.replace(alcoholRegex, ' ').trim().replace(/\s+/g, ' ');
    
    return { alcoholContent, cleanedName };
  }
  
  return { alcoholContent: null, cleanedName: productName };
}

/**
 * Extrai o valor do nome do produto (padrão: " - 00,00" no final)
 * Retorna: { price: string | null, cleanedName: string }
 */
export function extractPrice(productName: string): { price: string | null; cleanedName: string } {
  if (!productName) return { price: null, cleanedName: productName };
  
  // Regex para capturar preço no final (padrão: " - 00,00" ou " - 00.00")
  // O valor sempre vem no final com " - " antes
  const priceRegex = /\s+-\s+(\d+[,.]\d{2})\s*$/;
  
  const match = productName.match(priceRegex);
  
  if (match) {
    const price = match[1].replace(',', '.');
    const cleanedName = productName.replace(priceRegex, '').trim();
    
    return { price, cleanedName };
  }
  
  return { price: null, cleanedName: productName };
}

/**
 * Processa o nome do produto e retorna informações extraídas
 * Também limpa o nome removendo descrição, teor e valor se encontrados
 * Ordem de extração: descrição -> preço -> teor -> marca/volume
 */
export function processProductName(productName: string): {
  brand: string | null;
  volume: string | null;
  alcoholContent: string | null;
  price: string | null;
  description: string | null;
  cleanedName: string;
} {
  if (!productName) {
    return { brand: null, volume: null, alcoholContent: null, price: null, description: null, cleanedName: '' };
  }
  
  // Remover extensão do arquivo se presente
  let workingName = productName.replace(/\.(jpg|jpeg|png|webp|gif)$/i, '');
  
  // 1. Primeiro extrair descrição (está no final após __D=)
  const { description, cleanedName: afterDesc } = extractDescription(workingName);
  
  // 2. Depois extrair preço (padrão: " - 00,00" no final)
  const { price, cleanedName: afterPrice } = extractPrice(afterDesc);
  
  // 3. Depois extrair teor alcoólico (antes do preço)
  const { alcoholContent, cleanedName: finalName } = extractAlcoholContent(afterPrice);
  
  return {
    brand: detectBrand(finalName),
    volume: extractVolume(finalName),
    alcoholContent,
    price,
    description,
    cleanedName: finalName
  };
}

/**
 * Lista todas as marcas disponíveis (para autocomplete)
 */
export function getAllBrands(): string[] {
  // Remover duplicatas e ordenar
  return [...new Set(ALL_BRANDS)].sort();
}

/**
 * Obter marcas por categoria
 */
export function getBrandsByCategory(category: string): string[] {
  const categoryKey = category.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/\s+/g, '');
  
  // Tentar encontrar a categoria
  for (const [key, brands] of Object.entries(BRAND_DATABASE)) {
    if (categoryKey.includes(key) || key.includes(categoryKey)) {
      return brands;
    }
  }
  
  return ALL_BRANDS;
}
