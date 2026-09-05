import { NextRequest, NextResponse } from 'next/server'

const GLM_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions'
const GLM_API_KEY = process.env.GLM_API_KEY || ''

interface MatchResult {
  response: string
  actions?: Array<{ label: string; page: string }>
}

const PAGES: Record<string, string> = {
  home: '🏠 Accueil',
  send: '📤 Envoyer',
  withdraw: '💵 Retirer',
  deposit: '🏦 Déposer',
  history: '📋 Historique',
  marketplace: '🛒 Marché',
  bills: '📄 Factures',
  card: '💳 Carte',
  'savings-goals': '🎯 Épargne',
  referral: '🎁 Parrainage',
  settings: '⚙️ Paramètres',
  profile: '👤 Profil',
  notifications: '🔔 Notifications',
  support: '💬 Support',
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function detectLang(text: string): 'fr' | 'en' | 'es' | 'ar' | 'pt' | 'other' {
  const lower = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  if (lower.match(/[\u0600-\u06FF]/) || lower.match(/\b(marhaba|shukran|afwan|kayfa|kam|ayna|mata|maa|fulus|irsal|bitaqa|fatura)\b/)) return 'ar'
  if (lower.match(/\b(hola|gracias|por favor|como|cuanto|donde|cuando|quiero|necesito|puedo|dinero|enviar|retirar|depositar|tarjeta|factura|pago|tambien|puedes|ayudame|necesitar|quisiera)\b/)) return 'es'
  if (lower.match(/\b(ola|obrigado|obrigada|por favor|como|quanto|onde|quando|o que|quem|quero|preciso|posso|dinheiro|enviar|retirar|depositar|cartao|fatura|pagamento|tambem|pode|ajudar|precisar)\b/)) return 'pt'
  if (lower.match(/\b(salut|bonjour|bonsoir|bonne nuit|merci|aussi|mais|donc|pourquoi|comment|quest|cette|peut|importe|fait|dit|vraiment|beaucoup|toujours|jamais|aujourd|demain|hier|maintenant|encore|juste|assez|trop|rien|toute|tout|chaque|autre|entre|apres|avant|pendant|depuis|vers|chez|pour|par|avec|sans|dans|sur|sous|voila|daccord|super|ok|genial|bien|mal|peux|veux|voulez|pouvez|besoin|aide|question|reponse|explique|comment|combien|coute|cout|tarif|frais|transfert|envoyer|retrait|retirer|depot|deposer|solde|carte|facture|marche|epargne|parrainage|agent|securite|parametre|profil|notification|support)\b/)) return 'fr'
  if (lower.match(/\b(hello|hi|hey|how|what|when|where|why|who|which|thank|please|sorry|help|money|send|withdraw|deposit|balance|card|transfer|pay|bill|price|work|app|feature|can|could|would|tell|show|need|want|give|make|do|is|are|was|were|have|has|does|doing|about|think|know|right|good|bad|great|nice|yes|no|sure|okay|cool|awesome|love|like|really|very|much|more|most|best|better|also|too|well|just|now|here|there|then|than|about|into|over|after|before|during|while|since|until|because|so|but|and|or|not|all|some|any|every|each|other|another|next|last|new|old|big|small|first|last|long|short|high|low|fast|slow|easy|hard|free|busy|ready|safe|secure|private|public|personal|official|local|global|digital|virtual|real|actual|true|false|possible|impossible|important|necessary|useful|helpful|available|popular|common|rare|special|unique|different|similar|same|equal|opposite|simple|complex|clear|vague|open|close|start|stop|begin|end|enter|exit|join|leave|add|remove|create|delete|update|change|keep|save|send|receive|buy|sell|pay|get|take|give|put|set|run|move|turn|go|come|see|look|watch|listen|hear|feel|touch|smell|taste|read|write|speak|talk|ask|answer|say|tell|call|ring|speak|meet|visit|travel|walk|run|drive|fly|swim|eat|drink|sleep|wake|work|play|rest|relax|enjoy|have|be|do|get|make|go|come|see|know|think|take|want|give|use|find|tell|ask|try|keep|let|begin|seem|help|show|hear|play|run|move|live|believe|hold|bring|happen|write|sit|stand|lose|pay|meet|include|continue|learn|change|lead|understand|watch|follow|stop|create|speak|read|allow|add|spend|grow|open|walk|win|offer|remember|love|consider|appear|buy|wait|serve|die|send|expect|build|stay|fall|cut|reach|kill|remain|suggest|raise|pass|sell|require|report|decide|pull|develop)\b/)) return 'en'
  return 'other'
}

function reply(lang: 'fr' | 'en' | 'es' | 'ar' | 'pt' | 'other', fr: string, en: string, es?: string, ar?: string, pt?: string): string {
  if (lang === 'fr') return fr
  if (lang === 'en') return en
  if (lang === 'es' && es) return es
  if (lang === 'ar' && ar) return ar
  if (lang === 'pt' && pt) return pt
  return en
}

function matchMessage(message: string): MatchResult | null {
  const lower = message.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const lang = detectLang(message)

  // ── GREETINGS (5 variants) ─────────────────────────────────
  if (lower.match(/^(salut|bonjour|bonsoir|bonne nuit|hey|hello|hi|yo|hola|ola|marhaba|coucou|allô|ca va|comment ca va|how are you|que tal|como estas|buenos|buenas)/)) {
    const responses = {
      fr: pick([
        `Salut ${pick(['', '!'])} ${pick(['😊', '👋', '✨'])} Je suis TRAIT IA, votre assistant personnel. ${pick(['Comment puis-je vous aider?', 'Que puis-je faire pour vous?', 'Dites-moi ce dont vous avez besoin.', 'Je suis là pour vous aider!'])}`,
        `Hey ${pick(['!', ''])} ${pick(['🎉', '💫', '🌟'])} ${pick(['Content de vous voir!', 'Ravi de vous parler!', 'Bienvenue!'])} Je suis TRAIT IA. ${pick(['Comment puis-je vous aider?', 'Que souhaitez-vous faire?'])}`,
        `Bonjour! ${pick(['👋', '😊', '✨'])} ${pick(['Je suis TRAIT IA, votre assistant fintech.', 'Votre assistant personnel TRAIT IA est là.', 'TRAIT IA à votre service!'])} ${pick(['Posez-moi vos questions!', 'Demandez-moi de l\'aide!', 'Je suis prêt à vous aider.'])}`,
        `${pick(['Salut', 'Bonjour'])} ${pick(['!', ''])} ${pick(['🤖', '💙', '🚀'])} ${pick(['Comment puis-je vous assister?', 'Besoin d\'aide avec quelque chose?', 'Que voulez-vous savoir?'])}`,
        `${pick(['Hey', 'Salut', 'Bonjour'])}! ${pick(['Je suis TRAIT IA.', 'C\'est TRAIT IA.', 'Votre assistant TRAIT IA ici.'])} ${pick(['Je peux tout vous expliquer sur l\'app!', 'Posez vos questions!', 'Comment puis-je vous aider?'])}`,
      ]),
      en: pick([
        `Hey ${pick(['!', ''])} ${pick(['😊', '👋', '✨'])} I'm TRAIT IA, your personal assistant. ${pick(['How can I help you?', 'What can I do for you?', 'Tell me what you need.', 'I\'m here to help!'])}`,
        `Hello ${pick(['!', ''])} ${pick(['🎉', '💫', '🌟'])} ${pick(['Great to see you!', 'Happy to help!', 'Welcome!'])} I'm TRAIT IA. ${pick(['How can I assist you?', 'What would you like to do?'])}`,
        `Hi there! ${pick(['👋', '😊', '✨'])} ${pick(['I\'m your TRAIT IA assistant.', 'Your personal fintech assistant.', 'TRAIT IA at your service!'])} ${pick(['Ask me anything!', 'How can I help you today?'])}`,
      ]),
      es: pick([
        `¡Hola! ${pick(['😊', '👋', '✨'])} Soy TRAIT IA, tu asistente personal. ${pick(['¿Cómo puedo ayudarte?', '¿Qué puedo hacer por ti?', 'Dime lo que necesitas.', '¡Estoy aquí para ayudarte!'])}`,
        `¡Hey! ${pick(['🎉', '💫', '🌟'])} ${pick(['¡Qué bueno verte!', '¡Encantado de hablar contigo!', '¡Bienvenido!'])} Soy TRAIT IA. ${pick(['¿Cómo puedo asistirte?', '¿Qué deseas hacer?'])}`,
      ]),
    }
    return {
      response: responses[lang as keyof typeof responses] || responses.en,
      actions: [{ label: PAGES.send, page: 'send' }, { label: PAGES.withdraw, page: 'withdraw' }],
    }
  }

  // ── THANKS (3 variants) ────────────────────────────────────
  if (lower.match(/^(merci|thanks|thank you|gracias|shukran|obrigado|ok|d'accord|c'est bon|super|parfait|genial|cool|excellent|muito bem|muito obrigado|muy bien)/)) {
    return {
      response: pick([
        reply(lang,
          `${pick(['Avec plaisir', 'De rien', 'Pas de problème', 'Toujours là'])}! ${pick(['😊', '💫', '✨'])} ${pick(['N\'hésitez pas si vous avez d\'autres questions!', 'Je suis toujours disponible!', 'Revenez quand vous voulez!', 'Dites-moi si vous avez besoin d\'autre chose!'])}`,
          `${pick(['You\'re welcome', 'My pleasure', 'No problem', 'Always happy to help'])}! ${pick(['😊', '💫', '✨'])} ${pick(['Feel free to ask more questions!', 'I\'m always available!', 'Come back anytime!', 'Let me know if you need anything else!'])}`,
          `${pick(['¡De nada', 'Con mucho gusto', 'No hay problema', 'Siempre aquí para ayudar'])}! ${pick(['😊', '💫', '✨'])} ${pick(['¡No dudes en preguntar más!', '¡Estoy siempre disponible!', '¡Vuelve cuando quieras!'])}`,
        ),
      ]),
    }
  }

  // ── GOODBYE (3 variants) ───────────────────────────────────
  if (lower.match(/^(au revoir|bye|a plus|ciao|tchao|goodbye|see you|adios|hasta|ma3a salama|auf wiedersehen)/)) {
    return {
      response: pick([
        reply(lang,
          `${pick(['Au revoir', 'À bientôt', 'Salut', 'Bonne journée'])}! ${pick(['👋', '🌟', '💫'])} ${pick(['Passez une excellente journée!', 'Revenez quand vous voulez!', 'Je serai toujours là!', 'À très bientôt!'])}`,
          `${pick(['Goodbye', 'See you', 'Bye', 'Have a great day'])}! ${pick(['👋', '🌟', '💫'])} ${pick(['Have a wonderful day!', 'Come back anytime!', 'I\'ll be here!', 'See you soon!'])}`,
          `${pick(['Adiós', 'Hasta luego', 'Nos vemos', 'Que tengas un buen día'])}! ${pick(['👋', '🌟', '💫'])} ${pick(['¡Que tengas un excelente día!', '¡Vuelve cuando quieras!', '¡Siempre estoy aquí!'])}`,
        ),
      ]),
    }
  }

  // ── FEES (5 variants) ──────────────────────────────────────
  if (lower.match(/(frais|commiss|coute|cout|tarif|price|fee|cost|how much|combien|cuanto|precio|menuhir|ثمن|preco)/)) {
    return {
      response: pick([
        reply(lang,
          `Les frais sur TRAIT sont très avantageux ${pick(['💰', '💸', '✅'])}\n\n• Dépôt : **Gratuit** ✅\n• Retrait : **0.7%**\n• Transfert : **0.7%**\n\n${pick(['C\'est l\'un des meilleurs tarifs du marché!', 'Des tarifs imbattables!', 'Le meilleur rapport qualité-prix!'])}`,
          `TRAIT fees are very competitive ${pick(['💰', '💸', '✅'])}\n\n• Deposit: **Free** ✅\n• Withdrawal: **0.7%**\n• Transfer: **0.7%**\n\n${pick(['One of the best rates available!', 'Unbeatable prices!', 'Best value for your money!'])}`,
          `Las tarifas en TRAIT son muy competitivas ${pick(['💰', '💸', '✅'])}\n\n• Depósito: **Gratis** ✅\n• Retiro: **0.7%**\n• Transferencia: **0.7%**\n\n${pick(['¡Es una de las mejores tarifas del mercado!', '¡Precios inmejorables!'])}`,
        ),
        reply(lang,
          `Voici nos frais ${pick(['💰', '📊'])} :\n\n• Dépôt : **GRATUIT** ${pick(['🎉', '✅', '💪'])}\n• Retrait : **0.7%** du montant\n• Transfert : **0.7%** du montant\n\n${pick(['Pas de frais cachés!', 'Tout est transparent!', 'Des frais minimes!'])}`,
          `Here are our fees ${pick(['💰', '📊'])}:\n\n• Deposit: **FREE** ${pick(['🎉', '✅', '💪'])}\n• Withdrawal: **0.7%**\n• Transfer: **0.7%**\n\n${pick(['No hidden fees!', 'Everything is transparent!', 'Minimal fees!'])}`,
        ),
      ]),
      actions: [{ label: PAGES.send, page: 'send' }, { label: PAGES.withdraw, page: 'withdraw' }],
    }
  }

  // ── TRANSFER (5 variants) ──────────────────────────────────
  if (lower.match(/(transfert|transfer|envoyer|send|envoie|send money|transferir|irsal|تحويل|enviar dinero)/)) {
    return {
      response: pick([
        reply(lang,
          `Pour envoyer de l'argent sur TRAIT ${pick(['📤', '💸', '💰'])}\n\n1️⃣ Appuyez sur « Envoyer »\n2️⃣ Entrez le montant\n3️⃣ Choisissez le destinataire\n4️⃣ Confirmez avec votre PIN\n\n${pick(['Le transfert est instantané!', 'C\'est rapide et sécurisé!', 'En quelques secondes!'])} Frais: 0.7%.`,
          `How to send money on TRAIT ${pick(['📤', '💸', '💰'])}\n\n1️⃣ Tap « Send »\n2️⃣ Enter the amount\n3️⃣ Choose the recipient\n4️⃣ Confirm with your PIN\n\n${pick(['Transfer is instant!', 'Fast and secure!', 'In just seconds!'])} Fee: 0.7%.`,
          `Para enviar dinero en TRAIT ${pick(['📤', '💸', '💰'])}\n\n1️⃣ Toca « Enviar »\n2️⃣ Ingresa el monto\n3️⃣ Elige al destinatario\n4️⃣ Confirma con tu PIN\n\n${pick(['¡La transferencia es instantánea!', '¡Rápido y seguro!', '¡En segundos!'])} Comisión: 0.7%.`,
        ),
        reply(lang,
          `Envoyer de l'argent est simple ${pick(['📤', '⚡'])} :\n\n• Allez dans « Envoyer »\n• Sélectionnez un contact ou entrez un numéro\n• Indiquez le montant en USD ou FC\n• Validez avec votre code PIN\n\n${pick(['Transfert instantané!', 'Argent reçu en quelques secondes!', 'Ça arrive tout de suite!'])}`,
          `Sending money is easy ${pick(['📤', '⚡'])}:\n\n• Go to « Send »\n• Select a contact or enter a number\n• Enter the amount in USD or FC\n• Confirm with your PIN\n\n${pick(['Instant transfer!', 'Money arrives in seconds!', 'Right away!'])}`,
        ),
      ]),
      actions: [{ label: '📤 Envoyer maintenant', page: 'send' }],
    }
  }

  // ── WITHDRAWAL (5 variants) ────────────────────────────────
  if (lower.match(/(retrait|retirer|withdraw|cash|retirar|sacar|سحب|retir|atm|guichet)/)) {
    return {
      response: pick([
        reply(lang,
          `Pour retirer du cash ${pick(['💵', '🏧', '💰'])}\n\n1️⃣ Allez dans « Retirer »\n2️⃣ Entrez le montant\n3️⃣ Trouvez un agent TRAIT proche\n4️⃣ Confirmez avec votre PIN\n5️⃣ Récupérez votre cash\n\n${pick(['Frais: 0.7%', 'Seulement 0.7% de commission!'])}`,
          `To withdraw cash ${pick(['💵', '🏧', '💰'])}\n\n1️⃣ Go to « Withdraw »\n2️⃣ Enter the amount\n3️⃣ Find a nearby TRAIT agent\n4️⃣ Confirm with your PIN\n5️⃣ Get your cash\n\n${pick(['Fee: 0.7%', 'Only 0.7% commission!'])}`,
          `Para retirar efectivo ${pick(['💵', '🏧', '💰'])}\n\n1️⃣ Ve a « Retirar »\n2️⃣ Ingresa el monto\n3️⃣ Encuentra un agente cerca\n4️⃣ Confirma con tu PIN\n5️⃣ Recibe tu efectivo\n\n${pick(['Comisión: 0.7%', '¡Solo 0.7%!'])}`,
        ),
        reply(lang,
          `Retirer du cash ${pick(['💵', '🏪'])}:\n\n• Cherchez un agent TRAIT près de chez vous\n• Montrez le montant à retirer\n• Entrez votre code PIN\n• Recevez votre cash\n\n${pick(['Simple et rapide!', 'En quelques minutes!', 'Frais: seulement 0.7%!'])}`,
          `Withdraw cash ${pick(['💵', '🏪'])}:\n\n• Find a TRAIT agent near you\n• Show the withdrawal amount\n• Enter your PIN code\n• Receive your cash\n\n${pick(['Simple and fast!', 'In just minutes!', 'Fee: only 0.7%!'])}`,
        ),
      ]),
      actions: [{ label: '💵 Retirer', page: 'withdraw' }],
    }
  }

  // ── DEPOSIT (5 variants) ───────────────────────────────────
  if (lower.match(/(depot|deposer|deposit|recharge|depósito|deposar|recargar|إيداع|top up|recharger)/)) {
    return {
      response: pick([
        reply(lang,
          `Pour déposer de l'argent ${pick(['🏦', '💳', '💰'])}\n\n1️⃣ Allez dans « Dépôt »\n2️⃣ Choisissez le montant\n3️⃣ Sélectionnez un agent\n4️⃣ Confirmez\n\n✅ ${pick(['Le dépôt est 100% gratuit!', 'Aucun frais de dépôt!', 'Dépôt totalement gratuit!'])}`,
          `To deposit money ${pick(['🏦', '💳', '💰'])}\n\n1️⃣ Go to « Deposit »\n2️⃣ Choose the amount\n3️⃣ Select an agent\n4️⃣ Confirm\n\n✅ ${pick(['Deposit is 100% free!', 'No deposit fees!', 'Completely free!'])}`,
          `Para depositar ${pick(['🏦', '💳', '💰'])}\n\n1️⃣ Ve a « Depósito »\n2️⃣ Elige el monto\n3️⃣ Selecciona un agente\n4️⃣ Confirma\n\n✅ ${pick(['¡El depósito es 100% gratis!', '¡Sin comisiones!', '¡Totalmente gratuito!'])}`,
        ),
      ]),
      actions: [{ label: '🏦 Déposer', page: 'deposit' }],
    }
  }

  // ── BALANCE (5 variants) ───────────────────────────────────
  if (lower.match(/(solde|balance|combien|how much|mon argent|mon cash|mein|mi saldo|mi cuenta|saldo|.balance|الرصيد|quanto ho|portefeuille|wallet)/)) {
    return {
      response: pick([
        reply(lang,
          `Pour vérifier votre solde ${pick(['💳', '📊', '👀'])}\n\n• Votre solde s'affiche en haut de l'accueil\n• Allez dans « Portefeuille » pour le détail\n• Vos comptes USD et FC y sont affichés\n\n${pick(['Voulez-vous y aller?', 'Je vous y emmène?'])}`,
          `To check your balance ${pick(['💳', '📊', '👀'])}\n\n• Your balance shows at the top of home\n• Go to « Wallet » for details\n• Your USD and FC accounts are there\n\n${pick(['Want to go there?', 'Shall I take you there?'])}`,
          `Para verificar tu saldo ${pick(['💳', '📊', '👀'])}\n\n• Tu saldo aparece arriba en el inicio\n• Ve a « Monedero » para detalles\n• Tus cuentas USD y FC están ahí\n\n${pick(['¿Quieres ir allí?', '¿Te llevo?'])}`,
        ),
      ]),
      actions: [{ label: '🏠 Voir mon solde', page: 'home' }],
    }
  }

  // ── CARD (4 variants) ──────────────────────────────────────
  if (lower.match(/(carte|card|virtuelle|virtual|virtual card|ccv|cvv|numeros|card number|tarjeta|tarjeta virtual|بطاقة)/)) {
    return {
      response: pick([
        reply(lang,
          `La carte TRAIT ${pick(['💳', '💎', '✨'])}\n\n• ${pick(['Carte virtuelle sécurisée', 'Carte sécurisée'])}\n• ${pick(['Utilisable en ligne et en magasin', 'Paiements en ligne et en magasin'])}\n• Code CCV au dos\n• ${pick(['Gérez-la dans l\'app', 'Gestion directe dans l\'app'])}\n\n${pick(['Voulez-vous la voir?', 'Je vous la montre?'])}`,
          `The TRAIT Card ${pick(['💳', '💎', '✨'])}\n\n• ${pick(['Secure virtual card', 'Secured card'])}\n• ${pick(['Use online and in stores', 'Online and in-store payments'])}\n• CCV code on the back\n• ${pick(['Manage it in the app', 'Direct management in the app'])}\n\n${pick(['Want to see it?', 'Shall I show you?'])}`,
          `La tarjeta TRAIT ${pick(['💳', '💎', '✨'])}\n\n• ${pick(['Tarjeta virtual segura', 'Tarjeta segura'])}\n• ${pick(['Úsala en línea y en tiendas', 'Pagos en línea y en tiendas'])}\n• Código CCV en el reverso\n• ${pick(['Gestiónala en la app', 'Gestión directa en la app'])}\n\n${pick(['¿Quieres verla?', '¿Te la muestro?'])}`,
        ),
      ]),
      actions: [{ label: '💳 Ma carte', page: 'card' }],
    }
  }

  // ── BILLS (4 variants) ─────────────────────────────────────
  if (lower.match(/(facture|bill|electricite|eau|internet|phone|recharge|pay|payer|factura|pago|bill pay|fatura|eletricidade|agua|invoice|لفاتورة|فواتير|edl|snel|regideso)/)) {
    return {
      response: pick([
        reply(lang,
          `Pour payer vos factures ${pick(['📄', '⚡', '💧'])}\n\n1️⃣ Allez dans « Factures »\n2️⃣ Choisissez le type\n3️⃣ Entrez votre numéro client\n4️⃣ Vérifiez le montant\n5️⃣ Payez depuis votre portefeuille\n\n${pick(['C\'est simple et rapide!', 'En quelques clics!', 'Facile et rapide!'])}`,
          `To pay your bills ${pick(['📄', '⚡', '💧'])}\n\n1️⃣ Go to « Bills »\n2️⃣ Choose the type\n3️⃣ Enter your client number\n4️⃣ Verify the amount\n5️⃣ Pay from your wallet\n\n${pick(['Simple and fast!', 'In just a few clicks!', 'Easy and quick!'])}`,
          `Para pagar tus facturas ${pick(['📄', '⚡', '💧'])}\n\n1️⃣ Ve a « Facturas »\n2️⃣ Elige el tipo\n3️⃣ Ingresa tu número de cliente\n4️⃣ Verifica el monto\n5️⃣ Paga desde tu monedero\n\n${pick(['¡Simple y rápido!', '¡En unos clics!', '¡Fácil y rápido!'])}`,
        ),
      ]),
      actions: [{ label: '📄 Payer une facture', page: 'bills' }],
    }
  }

  // ── MARKETPLACE (3 variants) ───────────────────────────────
  if (lower.match(/(marche|market|marketplace|acheter|buy|produit|product|shop|store|tienda|mercado|comprar|سوق|comprar)/)) {
    return {
      response: pick([
        reply(lang,
          `Le marché TRAIT ${pick(['🛒', '🏪', '🛍️'])}\n\n• ${pick(['Parcourez les produits locaux', 'Des produits de vendeurs locaux'])}\n• ${pick(['Payez directement dans l\'app', 'Paiement sécurisé dans l\'app'])}\n• ${pick(['Livraison ou retrait', 'Livraison ou sur place'])}\n\n${pick(['Explorez le marché!', 'Voulez-vous y aller?'])}`,
          `The TRAIT Marketplace ${pick(['🛒', '🏪', '🛍️'])}\n\n• ${pick(['Browse local products', 'Products from local sellers'])}\n• ${pick(['Pay directly in the app', 'Secure payment in the app'])}\n• ${pick(['Delivery or pickup', 'Delivery or in-person'])}\n\n${pick(['Explore the marketplace!', 'Want to go there?'])}`,
        ),
      ]),
      actions: [{ label: '🛒 Explorer', page: 'marketplace' }],
    }
  }

  // ── SAVINGS (3 variants) ───────────────────────────────────
  if (lower.match(/(epargne|saving|savings|objectif|goal|budget|ahorrar|ahorro|metas|sparplan|ادخار| poupanca|thunes)/)) {
    return {
      response: pick([
        reply(lang,
          `L'épargne TRAIT ${pick(['🎯', '🏆', '💰'])}\n\n• ${pick(['Créez des objectifs d\'épargne', 'Définissez vos objectifs'])}\n• ${pick(['Suivez vos progrès', 'Progression en temps réel'])}\n• ${pick(['Épargnez automatiquement', 'Épargne automatique'])}\n• ${pick(['Atteignez vos buts plus vite', 'Objectifs atteints plus rapidement'])}\n\n${pick(['Créez un objectif!', 'Voulez-vous commencer?'])}`,
          `TRAIT Savings ${pick(['🎯', '🏆', '💰'])}\n\n• ${pick(['Create savings goals', 'Set your goals'])}\n• ${pick(['Track your progress', 'Real-time progress'])}\n• ${pick(['Save automatically', 'Automatic savings'])}\n• ${pick(['Reach goals faster', 'Achieve goals faster'])}\n\n${pick(['Create a goal!', 'Want to start?'])}`,
        ),
      ]),
      actions: [{ label: '🎯 Créer un objectif', page: 'savings-goals' }],
    }
  }

  // ── REFERRAL (3 variants) ──────────────────────────────────
  if (lower.match(/(parrainage|referral|ami|friend|inviter|invite|bonus|recompense|gift|regalo|premio|padrino|referir|دعوة|مكافأة)/)) {
    return {
      response: pick([
        reply(lang,
          `Le parrainage TRAIT ${pick(['🎁', '🎉', '💝'])}\n\n• ${pick(['Partagez votre code unique', 'Envoyez votre code'])}\n• ${pick(['Gagnez des bonus', 'Des récompenses pour chaque ami'])}\n• ${pick(['Vos amis gagnent aussi!', 'Bonus de bienvenue pour vos amis'])}\n• ${pick(['Suivez vos gains', 'Gains suivis dans l\'app'])}\n\n${pick(['Voir mon code!', 'Voulez-vous votre code?'])}`,
          `TRAIT Referral ${pick(['🎁', '🎉', '💝'])}\n\n• ${pick(['Share your unique code', 'Send your code'])}\n• ${pick(['Earn bonuses', 'Rewards for each friend'])}\n• ${pick(['Your friends earn too!', 'Welcome bonus for your friends'])}\n• ${pick(['Track your earnings', 'Earnings tracked in the app'])}\n\n${pick(['See my code!', 'Want your code?'])}`,
        ),
      ]),
      actions: [{ label: '🎁 Mon code', page: 'referral' }],
    }
  }

  // ── SECURITY (3 variants) ──────────────────────────────────
  if (lower.match(/(securite|security|pin|code|password|mot de passe|mdp|contraseña|clave|pin code|emprunte|biometrie|face|finger|锁|密码|كلمة المرور|seguranca|empreinte)/)) {
    return {
      response: pick([
        reply(lang,
          `La sécurité TRAIT ${pick(['🔒', '🛡️', '🔐'])}\n\n• Code PIN à 4 chiffres\n• ${pick(['Empreinte digitale ou reconnaissance faciale', 'Authentification biométrique'])}\n• ${pick(['Données chiffrées', 'Chiffrement de toutes les données'])}\n• ${pick(['Bloquez/débloquez la carte en 1 clic', 'Gérez la sécurité facilement'])}\n\n${pick(['Voulez-vous changer votre PIN?', 'Paramètres de sécurité?'])}`,
          `TRAIT Security ${pick(['🔒', '🛡️', '🔐'])}\n\n• 4-digit PIN code\n• ${pick(['Fingerprint or face recognition', 'Biometric authentication'])}\n• ${pick(['Encrypted data', 'All data encrypted'])}\n• ${pick(['Block/unblock card in 1 tap', 'Easy security management'])}\n\n${pick(['Want to change your PIN?', 'Security settings?'])}`,
        ),
      ]),
      actions: [{ label: '⚙️ Paramètres', page: 'settings' }],
    }
  }

  // ── AGENT (3 variants) ─────────────────────────────────────
  if (lower.match(/(agent|agence|agency|point de vente|commercant|boutique|negocio|agente|agen|وكيل|محل)/)) {
    return {
      response: pick([
        reply(lang,
          `Les agents TRAIT ${pick(['🏪', '🤝', '💼'])}\n\n• ${pick(['Partenaires vérifiés', 'Agents de confiance'])}\n• ${pick(['Dépôts et retraits en cash', 'Facilitent vos transactions'])}\n• ${pick(['Trouvez un agent proche', 'Agents disponibles partout'])}\n\n${pick(['Voulez-vous trouver un agent?', 'Comment trouver un agent?'])}`,
          `TRAIT Agents ${pick(['🏪', '🤝', '💼'])}\n\n• ${pick(['Verified partners', 'Trusted agents'])}\n• ${pick(['Cash deposits and withdrawals', 'Handle your transactions'])}\n• ${pick(['Find an agent nearby', 'Agents available everywhere'])}\n\n${pick(['Want to find an agent?', 'How to find an agent?'])}`,
        ),
      ]),
      actions: [{ label: '🏪 Trouver un agent', page: 'deposit' }],
    }
  }

  // ── WHAT IS TRAIT (3 variants) ─────────────────────────────
  if (lower.match(/(quest|what|what is|c'est quoi|definition|signification|como es|que es|ma huwa|o que|trait cest|trait est|trait app|quest-ce|c`est|tell me about)/)) {
    return {
      response: pick([
        reply(lang,
          `TRAIT est une application fintech moderne ${pick(['🚀', '📱', '✨'])}\n\n• 💸 ${pick(['Transferts instantanés', 'Envoyez et recevez de l\'argent'])}\n• 💳 ${pick(['Carte virtuelle sécurisée', 'Carte virtuelle'])}\n• 🏦 ${pick(['Dépôts et retraits via agents', 'Via des agents'])}\n• 📄 ${pick(['Paiement de factures', 'Payez vos factures'])}\n• 🛒 ${pick(['Marché local', 'Achetez localement'])}\n• 🎯 ${pick(['Épargne', 'Objectifs d\'épargne'])}\n• 🤖 ${pick(['TRAIT IA 24/7', 'Assistant IA'])}\n\n${pick(['Que voulez-vous découvrir?', 'Par quoi commencer?'])}`,
          `TRAIT is a modern fintech app ${pick(['🚀', '📱', '✨'])}\n\n• 💸 ${pick(['Instant transfers', 'Send and receive money'])}\n• 💳 ${pick(['Secure virtual card', 'Virtual card'])}\n• 🏦 ${pick(['Deposits & withdrawals via agents', 'Via agents'])}\n• 📄 ${pick(['Bill payments', 'Pay your bills'])}\n• 🛒 ${pick(['Local marketplace', 'Shop locally'])}\n• 🎯 ${pick(['Savings', 'Savings goals'])}\n• 🤖 ${pick(['TRAIT IA 24/7', 'AI assistant'])}\n\n${pick(['What would you like to explore?', 'Where to start?'])}`,
        ),
      ]),
      actions: [{ label: '🏠 Découvrir', page: 'home' }, { label: '📤 Envoyer', page: 'send' }],
    }
  }

  // ── HELP (3 variants) ──────────────────────────────────────
  if (lower.match(/(aide|help|assistance|support|besoin|problem|bug|erreur|error|issue|problema|ayuda|soporte|mushkila|مساعدة|ajuda|assistir)/)) {
    return {
      response: pick([
        reply(lang,
          `Je suis là pour vous aider! ${pick(['🤝', '💪', '✨'])}\n\n${pick(['Voici ce que je peux faire:', 'Je peux vous aider avec:'])}\n• 💸 ${pick(['Envoyer de l\'argent', 'Transferts'])}\n• 💵 ${pick(['Retirer du cash', 'Retraits'])}\n• 🏦 ${pick(['Déposer des fonds', 'Dépôts'])}\n• 📄 ${pick(['Payer des factures', 'Factures'])}\n• 💳 ${pick(['Gérer votre carte', 'Carte'])}\n• 🎯 ${pick(['Épargne', 'Objectifs'])}\n• 🛒 ${pick(['Marché', 'Achats'])}\n\n${pick(['Posez-moi n\'importe quelle question!', 'Demandez-moi ce que vous voulez!'])}`,
          `I'm here to help! ${pick(['🤝', '💪', '✨'])}\n\n${pick(['Here\'s what I can do:', 'I can help with:'])}\n• 💸 ${pick(['Send money', 'Transfers'])}\n• 💵 ${pick(['Withdraw cash', 'Withdrawals'])}\n• 🏦 ${pick(['Deposit funds', 'Deposits'])}\n• 📄 ${pick(['Pay bills', 'Bills'])}\n• 💳 ${pick(['Manage card', 'Card'])}\n• 🎯 ${pick(['Savings', 'Goals'])}\n• 🛒 ${pick(['Marketplace', 'Shopping'])}\n\n${pick(['Ask me anything!', 'What do you need?'])}`,
        ),
      ]),
      actions: [{ label: '🏠 Accueil', page: 'home' }, { label: '💬 Support', page: 'support' }],
    }
  }

  // ── HISTORY ────────────────────────────────────────────────
  if (lower.match(/(historique|history|transaction|transaction log|mi historial|minhas transacoes|السجل|العمليات)/)) {
    return {
      response: reply(lang,
        `Pour consulter votre historique ${pick(['📋', '📊'])}\n\n${pick(['Toutes vos transactions sont dans l\'onglet Historique.', 'Voir toutes vos transactions dans Historique.'])} ${pick(['Filtrez par date, type ou montant.', 'Vous pouvez filtrer par date ou type.'])}\n\n${pick(['Voulez-vous y aller?', 'Je vous y emmène?'])}`,
        `To view your history ${pick(['📋', '📊'])}\n\n${pick(['All your transactions are in the History tab.', 'See all transactions in History.'])} ${pick(['Filter by date, type or amount.', 'Filter by date or type.'])}\n\n${pick(['Want to go there?', 'Shall I take you?'])}`,
      ),
      actions: [{ label: '📋 Historique', page: 'history' }],
    }
  }

  // ── SETTINGS ───────────────────────────────────────────────
  if (lower.match(/(parametre|setting|configuration|option|preference|config|preferencia|configuracion|الإعدادات|configuracao)/)) {
    return {
      response: reply(lang,
        `Vos paramètres ${pick(['⚙️', '🔧'])}\n\n• ${pick(['Modifiez votre profil', 'Profil'])}\n• ${pick(['Changez votre PIN', 'PIN'])}\n• ${pick(['Sécurité', 'Sécurité biométrique'])}\n• ${pick(['Notifications', 'Alertes'])}\n• ${pick(['Conditions d\'utilisation', 'CGU'])}\n\n${pick(['Voulez-vous y aller?', 'Accédez aux paramètres?'])}`,
        `Your settings ${pick(['⚙️', '🔧'])}\n\n• ${pick(['Edit profile', 'Profile'])}\n• ${pick(['Change PIN', 'PIN'])}\n• ${pick(['Security', 'Biometric security'])}\n• ${pick(['Notifications', 'Alerts'])}\n• ${pick(['Terms of use', 'Terms'])}\n\n${pick(['Want to go there?', 'Access settings?'])}`,
      ),
      actions: [{ label: '⚙️ Paramètres', page: 'settings' }],
    }
  }

  // ── PROFILE ────────────────────────────────────────────────
  if (lower.match(/(profil|profile|mon compte|my account|mi perfil|minha conta|mekan|الملف|meu perfil)/)) {
    return {
      response: reply(lang,
        `Votre profil ${pick(['👤', '🧑', '📋'])}\n\n• ${pick(['Informations personnelles', 'Vos infos'])}\n• ${pick(['Photo de profil', 'Avatar'])}\n• ${pick(['Vérification KYC', 'KYC'])}\n• ${pick(['Numéro de téléphone', 'Téléphone'])}\n\n${pick(['Voulez-vous modifier votre profil?', 'Modifier votre profil?'])}`,
        `Your profile ${pick(['👤', '🧑', '📋'])}\n\n• ${pick(['Personal information', 'Your info'])}\n• ${pick(['Profile photo', 'Avatar'])}\n• ${pick(['KYC verification', 'KYC'])}\n• ${pick(['Phone number', 'Phone'])}\n\n${pick(['Want to edit your profile?', 'Edit your profile?'])}`,
      ),
      actions: [{ label: '👤 Profil', page: 'profile' }],
    }
  }

  // ── NOTIFICATIONS ──────────────────────────────────────────
  if (lower.match(/(notification|alert|alerte|avertissement|aviso|notification|الإشعارات|notificacao)/)) {
    return {
      response: reply(lang,
        `Vos notifications ${pick(['🔔', '📢', '💡'])}\n\n• ${pick(['Alertes de transactions', 'Chaque transaction'])}\n• ${pick(['Alertes de sécurité', 'Sécurité'])}\n• ${pick(['Promotions', 'Offres spéciales'])}\n• ${pick(['Activez les push', 'Notifications push'])}\n\n${pick(['Voulez-vous voir vos notifications?', 'Voir les notifications?'])}`,
        `Your notifications ${pick(['🔔', '📢', '💡'])}\n\n• ${pick(['Transaction alerts', 'Every transaction'])}\n• ${pick(['Security alerts', 'Security'])}\n• ${pick(['Promotions', 'Special offers'])}\n• ${pick(['Enable push', 'Push notifications'])}\n\n${pick(['Want to see notifications?', 'View notifications?'])}`,
      ),
      actions: [{ label: '🔔 Notifications', page: 'notifications' }],
    }
  }

  // ── CHILD CARD ─────────────────────────────────────────────
  if (lower.match(/(enfant|child|kid|fille|fils|hijo|hija|filho|filha|bebe|baby|اولاد|ابن|بنت|mon gamin)/)) {
    return {
      response: reply(lang,
        `La carte enfant TRAIT ${pick(['👨‍👩‍👧‍👦', '👶', '🧒'])}\n\n• ${pick(['Créez une carte pour vos enfants', 'Carte pour les kids'])}\n• ${pick(['Limite de dépenses', 'Définissez des limites'])}\n• ${pick(['Suivi des achats', 'Achats en temps réel'])}\n• ${pick(['Éducation financière', 'Enseignez la gestion'])}\n\n${pick(['Créer une carte enfant?', 'Voulez-vous créer?'])}`,
        `TRAIT Child Card ${pick(['👨‍👩‍👧‍👦', '👶', '🧒'])}\n\n• ${pick(['Create a card for your kids', 'Card for children'])}\n• ${pick(['Spending limits', 'Set limits'])}\n• ${pick(['Purchase tracking', 'Real-time tracking'])}\n• ${pick(['Financial education', 'Teach money management'])}\n\n${pick(['Create a child card?', 'Want to create?'])}`,
      ),
      actions: [{ label: '💳 Carte enfant', page: 'card' }],
    }
  }

  // ── MONEY ──────────────────────────────────────────────────
  if (lower.match(/(argent|money|cash|euros|dollars|usd|fc|cdf|francs|dinero|efectivo|euro|dolar|fulus|نقود|فلوس|dinheiro|monnaie|currency)/)) {
    return {
      response: reply(lang,
        `Sur TRAIT, gérez votre argent en ${pick(['💰', '💵', '💱'])}\n\n• **USD** — Dollar américain\n• **FC** — Franc congolais\n• ${pick(['Changez le taux de change', 'Taux de change'])} dans les paramètres\n• ${pick(['Transférez entre comptes', 'Transferts internes'])}\n\n${pick(['Que voulez-vous faire?', 'Quelle opération?'])}`,
        `On TRAIT, manage your money in ${pick(['💰', '💵', '💱'])}\n\n• **USD** — US Dollar\n• **FC** — Congolese Franc\n• ${pick(['Change exchange rate', 'Exchange rate'])} in settings\n• ${pick(['Transfer between accounts', 'Internal transfers'])}\n\n${pick(['What would you like to do?', 'Which operation?'])}`,
      ),
      actions: [{ label: '🏠 Voir mon solde', page: 'home' }],
    }
  }

  // ── OFFERS / PROMO ─────────────────────────────────────────
  if (lower.match(/(offre|promo|promotion|discount|reduction|solde|deal|优惠|خصم)/)) {
    return {
      response: reply(lang,
        `Les offres TRAIT ${pick(['🎉', '🏷️', '🔥'])}\n\n• ${pick(['Consultez le marché pour les offres', 'Offres disponibles sur le marché'])}\n• ${pick(['Parrainage = bonus', 'Gagnez avec le parrainage'])}\n• ${pick(['Promotions régulières', 'Offres spéciales'])}\n\n${pick(['Voulez-vous voir le marché?', 'Explorer les offres?'])}`,
        `TRAIT Offers ${pick(['🎉', '🏷️', '🔥'])}\n\n• ${pick(['Check marketplace for deals', 'Offers on the marketplace'])}\n• ${pick(['Referral = bonus', 'Earn with referrals'])}\n• ${pick(['Regular promotions', 'Special offers'])}\n\n${pick(['Want to see the marketplace?', 'Explore offers?'])}`,
      ),
      actions: [{ label: '🛒 Marché', page: 'marketplace' }, { label: '🎁 Parrainage', page: 'referral' }],
    }
  }

  // ── CONTACT / PHONE ────────────────────────────────────────
  if (lower.match(/(contact|telephoner|appeler|numero|number|phone|teléfono|telefone|هاتف|اتصال)/)) {
    return {
      response: reply(lang,
        `Pour contacter quelqu'un ${pick(['📞', '📱', '💬'])}\n\n• ${pick(['Utilisez le transfert', 'Envoyez de l\'argent'])} pour envoyer\n• ${pick(['Le support est disponible', 'Contactez le support'])} pour les questions\n• ${pick(['Appelez un agent', 'Trouvez un agent'])} près de chez vous\n\n${pick(['Que souhaitez-vous faire?', 'Quel est votre besoin?'])}`,
        `To contact someone ${pick(['📞', '📱', '💬'])}\n\n• ${pick(['Use transfer to send', 'Send money'])}\n• ${pick(['Support is available', 'Contact support'])} for questions\n• ${pick(['Call an agent', 'Find an agent'])} near you\n\n${pick(['What would you like to do?', 'What do you need?'])}`,
      ),
      actions: [{ label: '📤 Envoyer', page: 'send' }, { label: '💬 Support', page: 'support' }],
    }
  }

  // ── COMPLAINT / PROBLEM ────────────────────────────────────
  if (lower.match(/(plainte|reclamation|problem|problema|problème|bug|erreur|ne marche pas|doesn't work|no funciona|pas content|unhappy| mécontent)/)) {
    return {
      response: pick([
        reply(lang,
          `Je suis désolé d\'entendre cela ${pick(['😔', '😐', '💬'])}\n\n• ${pick(['Décrivez votre problème', 'Expliquez-moi le souci'])}\n• ${pick(['Le support TRAIT peut vous aider', 'Notre équipe vous assiste'])}\n• ${pick(['Ouvrez un ticket de support', 'Contactez le support'])}\n\n${pick(['Voulez-vous contacter le support?', 'Ouvrir un ticket?'])}`,
          `I'm sorry to hear that ${pick(['😔', '😐', '💬'])}\n\n• ${pick(['Describe your problem', 'Tell me the issue'])}\n• ${pick(['TRAIT support can help', 'Our team assists you'])}\n• ${pick(['Open a support ticket', 'Contact support'])}\n\n${pick(['Want to contact support?', 'Open a ticket?'])}`,
        ),
      ]),
      actions: [{ label: '💬 Support', page: 'support' }],
    }
  }

  // ── SALARY / WORK ──────────────────────────────────────────
  if (lower.match(/(salaire|salary|travailler|work|emploi|job|emploi|trabajo|empleo|kerja|عمل)/)) {
    return {
      response: reply(lang,
        `TRAIT ${pick(['💼', '🏦'])}\n\n• ${pick(['Devenez agent TRAIT', 'Rejoignez nos agents'])}\n• ${pick(['Gagnez des commissions', 'Commissions attractives'])}\n• ${pick(['Ou vendez sur le marché', 'Vendez vos produits'])}\n\n${pick(['Intéressé? Découvrez nos offres!', 'Voulez-vous devenir agent?'])}`,
        `TRAIT ${pick(['💼', '🏦'])}\n\n• ${pick(['Become a TRAIT agent', 'Join our agents'])}\n• ${pick(['Earn commissions', 'Attractive commissions'])}\n• ${pick(['Or sell on the marketplace', 'Sell your products'])}\n\n${pick(['Interested? Check our offers!', 'Want to become an agent?'])}`,
      ),
      actions: [{ label: '🏪 Devenir agent', page: 'deposit' }, { label: '🛒 Marché', page: 'marketplace' }],
    }
  }

  // ── CRYPTO / INVEST ────────────────────────────────────────
  if (lower.match(/(crypto|bitcoin|btc|eth|investir|invest|trading|bourse|action|stock|bitcoin)/)) {
    return {
      response: reply(lang,
        `TRAIT ne propose pas encore de trading crypto ${pick(['📈', '💡'])}\n\n• ${pick(['Restez connecté pour les mises à jour', 'Bientôt disponible'])}\n• ${pick(['Utilisez l\'épargne pour vos objectifs', 'Épargnez maintenant'])}\n• ${pick(['Consultez le marché', 'Explorez nos services'])}\n\n${pick(['En attendant, que puis-je faire pour vous?', 'Voulez-vous autre chose?'])}`,
        `TRAIT doesn't offer crypto trading yet ${pick(['📈', '💡'])}\n\n• ${pick(['Stay tuned for updates', 'Coming soon'])}\n• ${pick(['Use savings for your goals', 'Save now'])}\n• ${pick(['Check the marketplace', 'Explore our services'])}\n\n${pick(['Meanwhile, what can I do for you?', 'Anything else?'])}`,
      ),
      actions: [{ label: '🎯 Épargne', page: 'savings-goals' }],
    }
  }

  // ── TIME / DATE ────────────────────────────────────────────
  if (lower.match(/(heure|time|date|jour|day|mois|month|année|year|aujourd|demain|hier|maintenant|now|today|tomorrow|yesterday|hora|fecha|heure|وقت|تاريخ)/)) {
    return {
      response: reply(lang,
        `TRAIT est disponible 24h/24, 7j/7 ${pick(['⏰', '📅', '🌍'])}\n\n• ${pick(['Transferts instantanés à tout moment', 'Envoyez de l\'argent quand vous voulez'])}\n• ${pick(['Service client disponible', 'Support disponible'])}\n• ${pick(['Agent disponibles selon horaires', 'Agents selon leurs horaires'])}\n\n${pick(['Que voulez-vous faire maintenant?', 'Quelle opération?'])}`,
        `TRAIT is available 24/7 ${pick(['⏰', '📅', '🌍'])}\n\n• ${pick(['Instant transfers anytime', 'Send money anytime'])}\n• ${pick(['Customer service available', 'Support available'])}\n• ${pick(['Agents available by schedule', 'Agents by schedule'])}\n\n${pick(['What would you like to do now?', 'Which operation?'])}`,
      ),
      actions: [{ label: '📤 Envoyer', page: 'send' }],
    }
  }

  // ── LANGUAGES ──────────────────────────────────────────────
  if (lower.match(/(langue|language|français|english|español|arabe|portugais|lingala|swahili|langues|idioma|idiomas|لغة|لغات)/)) {
    return {
      response: reply(lang,
        `TRAIT IA parle ${pick(['🌍', '🗣️', '💬'])} ${pick(['français', 'plusieurs langues'])}\n\n• ${pick(['Répondez dans la langue de votre choix', 'Écrivez dans votre langue'])}\n• ${pick(['Je comprends le français, anglais, espagnol', 'FR, EN, ES, AR, PT'])}\n• ${pick(['Utilisez votre langue naturellement', 'Parlez naturellement'])}\n\n${pick(['Dans quelle langue voulez-vous continuer?', 'Continuez dans votre langue!'])}`,
        `TRAIT IA speaks ${pick(['🌍', '🗣️', '💬'])} ${pick(['French', 'multiple languages'])}\n\n• ${pick(['Reply in your preferred language', 'Write in your language'])}\n• ${pick(['I understand French, English, Spanish', 'FR, EN, ES, AR, PT'])}\n• ${pick(['Use your language naturally', 'Speak naturally'])}\n\n${pick(['Which language would you like to continue in?', 'Continue in your language!'])}`,
      ),
    }
  }

  // ── NO MATCH ───────────────────────────────────────────────
  return null
}

/* ═══════════════════════════════════════════════════════════════
   GLM API — Bonus AI for complex questions
   ═══════════════════════════════════════════════════════════════ */

const GLM_SYSTEM_PROMPT = `You are TRAIT IA, a fintech app assistant for TRAIT (money transfers, payments, cards, marketplace, savings in DRC Congo). You help users navigate the app. Be concise (2-3 sentences). Respond in the SAME language the user writes in. Never do real financial operations. Be friendly. Fees: deposit free, withdrawal 0.7%, transfer 0.7%. Pages: home, send, withdraw, deposit, history, marketplace, bills, card, savings-goals, referral, settings, profile, notifications, support.`

async function callGLM(message: string, userName: string, userRole: string, history: Array<{role: string; content: string}>): Promise<string | null> {
  if (!GLM_API_KEY) return null

  try {
    const roleCtx = userRole ? `\nUser: "${userName || 'User'}", Role: "${userRole}".` : ''
    const msgs = [
      { role: 'system', content: `${GLM_SYSTEM_PROMPT}${roleCtx}` },
      ...history.slice(-6).map(h => ({ role: h.role === 'user' ? 'user' : 'assistant', content: h.content })),
      { role: 'user', content: message },
    ]

    const response = await fetch(GLM_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GLM_API_KEY}` },
      body: JSON.stringify({ model: 'glm-4.7-flash', messages: msgs, temperature: 0.7, max_tokens: 2048, top_p: 0.9 }),
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) return null

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''
    return content.trim() || null
  } catch {
    return null
  }
}

/* ═══════════════════════════════════════════════════════════════
   ROUTE HANDLER
   ═══════════════════════════════════════════════════════════════ */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, userName, userRole, history } = body

    if (!message) {
      return NextResponse.json({ success: false, message: 'Message requis' }, { status: 400 })
    }

    const localMatch = matchMessage(message)
    if (localMatch) {
      return NextResponse.json({ success: true, message: localMatch.response, actions: localMatch.actions || [] })
    }

    const glmResponse = await callGLM(message, userName || '', userRole || '', history || [])
    if (glmResponse) {
      let actions: Array<{ label: string; page: string }> = []
      try {
        const jsonMatch = glmResponse.match(/\{[\s\S]*"message"[\s\S]*\}/)
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0])
          const allowed = Object.keys(PAGES)
          actions = (parsed.actions || []).filter((a: {page: string}) => allowed.includes(a.page))
          return NextResponse.json({ success: true, message: parsed.message || glmResponse, actions })
        }
      } catch {}
      return NextResponse.json({ success: true, message: glmResponse, actions })
    }

    const lang = detectLang(message)
    return NextResponse.json({
      success: true,
      message: reply(lang,
        `Je ne suis pas sûr de comprendre ${pick(['🤔', '💡', '❓'])}\n\nVoici ce que je peux faire :\n• 💸 Envoyer de l'argent\n• 💵 Retirer du cash\n• 🏦 Déposer des fonds\n• 📄 Payer des factures\n• 💳 Gérer votre carte\n• 🛒 Explorer le marché\n\n${pick(['Posez-moi une question précise!', 'Essayez une autre question!'])}`,
        `I'm not sure I understand ${pick(['🤔', '💡', '❓'])}\n\nHere's what I can do:\n• 💸 Send money\n• 💵 Withdraw cash\n• 🏦 Deposit funds\n• 📄 Pay bills\n• 💳 Manage your card\n• 🛒 Explore the marketplace\n\n${pick(['Ask me a specific question!', 'Try another question!'])}`,
      ),
      actions: [{ label: '🏠 Accueil', page: 'home' }, { label: '💬 Support', page: 'support' }],
    })
  } catch (error) {
    console.error('Trait AI error:', error)
    return NextResponse.json({
      success: true,
      message: `Je suis TRAIT IA, votre assistant ${pick(['🤖', '💙', '✨'])}. ${pick(['Posez-moi une question!', 'Comment puis-je vous aider?'])}`,
      actions: [{ label: '🏠 Accueil', page: 'home' }],
    })
  }
}
