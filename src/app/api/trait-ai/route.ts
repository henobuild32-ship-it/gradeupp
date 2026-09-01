import { NextRequest, NextResponse } from 'next/server'

const GLM_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions'
const GLM_API_KEY = process.env.GLM_API_KEY || ''

/* ═══════════════════════════════════════════════════════════════
   LOCAL AI — Always works, zero latency, multilingual
   ═══════════════════════════════════════════════════════════════ */

interface MatchResult {
  response: string
  actions?: Array<{ label: string; page: string }>
}

const PAGES = {
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

function detectLang(text: string): 'fr' | 'en' | 'es' | 'ar' | 'pt' | 'other' {
  const lower = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  if (lower.match(/\b(salut|bonjour|bonsoir|comment|quest|merci|aussi|mais|donc|pourquoi|cette|peut|importe|fait|dit|vraiment|beaucoup|toujours|jamais|aujourd|demain|hier|maintenant|encore|juste|assez|trop|rien|toute|tout|chaque|autre|entre|apres|avant|pendant|depuis|vers|chez|pour|par|avec|sans|dans|sur|sous|cote)\b/)) return 'fr'
  if (lower.match(/\b(hello|hi|hey|how|what|when|where|why|who|which|thank|please|sorry|help|money|send|withdraw|deposit|balance|card|transfer|pay|bill|price|work|app|feature)\b/)) return 'en'
  if (lower.match(/\b(hola|gracias|por favor|como|cuanto|donde|cuando|que|quiero|necesito|puedo|dinero|enviar|retirar|depositar|tarjeta|factura|pago)\b/)) return 'es'
  if (lower.match(/[\u0600-\u06FF]/) || lower.match(/\b(marhaba|shukran|afwan|kayfa|kam|ayna|mata|maa|man|alladhi|yurid|yummkin|fulus|irsal|sadh|imaan|bitaqa|fatura)\b/)) return 'ar'
  if (lower.match(/\b(ola|obrigado|por favor|como|quanto|onde|quando|o que|quem|quero|preciso|posso|dinheiro|enviar|retirar|depositar|cartao|fatura|pagamento)\b/)) return 'pt'
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

  // ── GREETINGS ──────────────────────────────────────────────
  if (lower.match(/^(salut|bonjour|bonsoir|bonne nuit|hey|hello|hi|yo|hola|ola|marhaba|shukran|coucou|allô|alllo|ca va|comment ca va|how are you|que tal|como estas)/)) {
    const responses = [
      reply(lang,
        "Salut ! 😊 Je suis TRAIT IA, votre assistant personnel. Je peux vous aider avec vos transferts, retraits, dépôts ou toute autre question sur l'app. Que souhaitez-vous faire ?",
        "Hey there! 😊 I'm TRAIT IA, your personal assistant. I can help you with transfers, withdrawals, deposits or any question about the app. What would you like to do?",
        "¡Hola! 😊 Soy TRAIT IA, tu asistente personal. Puedo ayudarte con transferencias, retiros, depósitos o cualquier pregunta sobre la app. ¿Qué deseas hacer?",
      )
    ]
    return { response: responses[0], actions: [{ label: PAGES.send, page: 'send' }, { label: PAGES.withdraw, page: 'withdraw' }] }
  }

  // ── THANKS ─────────────────────────────────────────────────
  if (lower.match(/^(merci|thanks|thank you|gracias|shukran|obrigado|ok|d'accord|c'est bon|super|parfait|genial|cool|excellent)/)) {
    return { response: reply(lang,
      "Avec plaisir ! 😊 N'hésitez pas si vous avez d'autres questions, je suis toujours là pour vous aider.",
      "You're welcome! 😊 Feel free to ask if you have more questions, I'm always here to help.",
      "¡De nada! 😊 No dudes en preguntar si tienes más preguntas, siempre estoy aquí para ayudarte.",
    )}
  }

  // ── GOODBYE ────────────────────────────────────────────────
  if (lower.match(/^(au revoir|bye|a plus|ciao|tchao|goodbye|see you|adios|hasta|ma3a salama)/)) {
    return { response: reply(lang,
      "Au revoir ! 👋 Passez une excellente journée et revenez quand vous voulez. Je suis toujours là !",
      "Goodbye! 👋 Have a wonderful day and come back anytime. I'm always here!",
      "¡Adiós! 👋 Que tengas un excelente día y vuelve cuando quieras. ¡Siempre estoy aquí!",
    )}
  }

  // ── FEES ───────────────────────────────────────────────────
  if (lower.match(/(frais|commiss|coute|cout|tarif|price|fee|cost|how much|combien|cuanto|precio|menuhir|ثمن|preco)/)) {
    return {
      response: reply(lang,
        "Les frais sur TRAIT sont très avantageux 💰\n\n• Dépôt : **Gratuit** ✅\n• Retrait : **0.7%**\n• Transfert : **0.7%**\n\nC'est l'un des meilleurs tarifs du marché ! Voulez-vous effectuer une opération ?",
        "TRAIT fees are very competitive 💰\n\n• Deposit: **Free** ✅\n• Withdrawal: **0.7%**\n• Transfer: **0.7%**\n\nOne of the best rates available! Would you like to make a transaction?",
        "Las tarifas en TRAIT son muy competitivas 💰\n\n• Depósito: **Gratis** ✅\n• Retiro: **0.7%**\n• Transferencia: **0.7%**\n\n¡Es una de las mejores tarifas del mercado! ¿Deseas hacer una transacción?",
      ),
      actions: [{ label: PAGES.send, page: 'send' }, { label: PAGES.withdraw, page: 'withdraw' }],
    }
  }

  // ── TRANSFER / SEND ────────────────────────────────────────
  if (lower.match(/(transfert|transfer|envoyer|send|envoie|send money|transferir|irsal|تحويل|enviar dinero)/)) {
    return {
      response: reply(lang,
        "Voici comment envoyer de l'argent sur TRAIT 📤\n\n1️⃣ Appuyez sur « Envoyer »\n2️⃣ Entrez le montant\n3️⃣ Choisissez le destinataire (nom, téléphone ou code agent)\n4️⃣ Confirmez avec votre PIN\n\nLe transfert est **instantané** et coûte seulement 0.7%. Prêt à envoyer ?",
        "Here's how to send money on TRAIT 📤\n\n1️⃣ Tap « Send »\n2️⃣ Enter the amount\n3️⃣ Choose the recipient (name, phone or agent code)\n4️⃣ Confirm with your PIN\n\nTransfer is **instant** and costs only 0.7%. Ready to send?",
        "Así se envía dinero en TRAIT 📤\n\n1️⃣ Toca « Enviar »\n2️⃣ Ingresa el monto\n3️⃣ Elige al destinatario (nombre, teléfono o código de agente)\n4️⃣ Confirma con tu PIN\n\nLa transferencia es **instantánea** y cuesta solo 0.7%. ¿Listo para enviar?",
      ),
      actions: [{ label: '📤 Envoyer maintenant', page: 'send' }],
    }
  }

  // ── WITHDRAWAL ─────────────────────────────────────────────
  if (lower.match(/(retrait|retirer|withdraw|cash|retirar|sacar|سحب|retir)/)) {
    return {
      response: reply(lang,
        "Pour retirer du cash 💵\n\n1️⃣ Allez dans « Retirer »\n2️⃣ Entrez le montant souhaité\n3️⃣ Trouvez un agent TRAIT proche de vous\n4️⃣ Confirmez avec votre PIN\n5️⃣ Récupérez votre cash chez l'agent\n\nFrais : seulement 0.7%. Voulez-vous retirer ?",
        "To withdraw cash 💵\n\n1️⃣ Go to « Withdraw »\n2️⃣ Enter the amount\n3️⃣ Find a TRAIT agent near you\n4️⃣ Confirm with your PIN\n5️⃣ Get your cash from the agent\n\nFee: only 0.7%. Want to withdraw?",
        "Para retirar efectivo 💵\n\n1️⃣ Ve a « Retirar »\n2️⃣ Ingresa el monto\n3️⃣ Encuentra un agente TRAIT cerca\n4️⃣ Confirma con tu PIN\n5️⃣ Recibe tu efectivo del agente\n\nComisión: solo 0.7%. ¿Quieres retirar?",
      ),
      actions: [{ label: '💵 Retirer', page: 'withdraw' }],
    }
  }

  // ── DEPOSIT ────────────────────────────────────────────────
  if (lower.match(/(depot|deposer|deposit|recharge|depósito|deposar|recargar|إيداع|top up)/)) {
    return {
      response: reply(lang,
        "Pour déposer de l'argent 🏦\n\n1️⃣ Allez dans « Dépôt »\n2️⃣ Choisissez le montant\n3️⃣ Sélectionnez un agent ou mode de paiement\n4️⃣ Confirmez la transaction\n\n✅ Le dépôt est **100% gratuit** ! Voulez-vous déposer ?",
        "To deposit money 🏦\n\n1️⃣ Go to « Deposit »\n2️⃣ Choose the amount\n3️⃣ Select an agent or payment method\n4️⃣ Confirm the transaction\n\n✅ Deposit is **100% free**! Want to deposit?",
        "Para depositar dinero 🏦\n\n1️⃣ Ve a « Depósito »\n2️⃣ Elige el monto\n3️⃣ Selecciona un agente o método de pago\n4️⃣ Confirma la transacción\n\n✅ ¡El depósito es **100% gratis**! ¿Quieres depositar?",
      ),
      actions: [{ label: '🏦 Déposer', page: 'deposit' }],
    }
  }

  // ── BALANCE ────────────────────────────────────────────────
  if (lower.match(/(solde|balance|combien|how much|mon argent|mon cash|mein|mi saldo|mi cuenta| saldo|.balance|الرصيد|quanto ho)/)) {
    return {
      response: reply(lang,
        "Pour vérifier votre solde 💳\n\nVotre solde s'affiche en haut de l'écran d'accueil. Vous pouvez aussi aller dans « Portefeuille » pour voir le détail de vos comptes USD et FC.\n\nVoulez-vous y aller ?",
        "To check your balance 💳\n\nYour balance is displayed at the top of the home screen. You can also go to « Wallet » to see details of your USD and FC accounts.\n\nWant to go there?",
        "Para verificar tu saldo 💳\n\nTu saldo se muestra en la parte superior de la pantalla de inicio. También puedes ir a « Monedero » para ver los detalles de tus cuentas USD y FC.\n\n¿Quieres ir allí?",
      ),
      actions: [{ label: '🏠 Voir mon solde', page: 'home' }],
    }
  }

  // ── CARD ───────────────────────────────────────────────────
  if (lower.match(/(carte|card|virtuelle|virtual|virtual card|ccv|cvv|numeros|card number|tarjeta|tarjeta virtual|بطاقة)/)) {
    return {
      response: reply(lang,
        "La carte TRAIT 💳\n\n• Carte virtuelle sécurisée\n• Utilisable en ligne et en magasin\n• Code CCV visible au dos de la carte\n• Gérez-la directement dans l'app\n• Ajoutez une carte enfant si besoin\n\nVoulez-vous voir votre carte ?",
        "The TRAIT Card 💳\n\n• Secure virtual card\n• Use online and in stores\n• CCV code visible on the back\n• Manage it directly in the app\n• Add a child card if needed\n\nWant to see your card?",
        "La tarjeta TRAIT 💳\n\n• Tarjeta virtual segura\n• Úsala en línea y en tiendas\n• Código CCV visible en el reverso\n• Gestiónala directamente en la app\n• Añade una tarjeta hija si necesitas\n\n¿Quieres ver tu tarjeta?",
      ),
      actions: [{ label: '💳 Ma carte', page: 'card' }],
    }
  }

  // ── BILLS ──────────────────────────────────────────────────
  if (lower.match(/(facture|bill|electricite|eau|internet|phone|recharge|pay|payer|factura|pago|bill pay|fatura|eletricidade|agua|invoice|لفاتورة|فواتير)/)) {
    return {
      response: reply(lang,
        "Pour payer vos factures 📄\n\n1️⃣ Allez dans « Factures »\n2️⃣ Choisissez le type (électricité, eau, internet...)\n3️⃣ Entrez votre numéro client\n4️⃣ Vérifiez le montant\n5️⃣ Payez depuis votre portefeuille\n\nC'est simple et rapide ! Voulez-vous payer ?",
        "To pay your bills 📄\n\n1️⃣ Go to « Bills »\n2️⃣ Choose the type (electricity, water, internet...)\n3️⃣ Enter your client number\n4️⃣ Verify the amount\n5️⃣ Pay from your wallet\n\nSimple and fast! Want to pay?",
        "Para pagar tus facturas 📄\n\n1️⃣ Ve a « Facturas »\n2️⃣ Elige el tipo (electricidad, agua, internet...)\n3️⃣ Ingresa tu número de cliente\n4️⃣ Verifica el monto\n5️⃣ Paga desde tu monedero\n\n¡Simple y rápido! ¿Quieres pagar?",
      ),
      actions: [{ label: '📄 Payer une facture', page: 'bills' }],
    }
  }

  // ── MARKETPLACE ────────────────────────────────────────────
  if (lower.match(/(marche|market|marketplace|acheter|buy|produit|product|shop|store|tienda|mercado|comprar|سوق|comprar)/)) {
    return {
      response: reply(lang,
        "Le marché TRAIT 🛒\n\n• Parcourez les produits des vendeurs locaux\n• Payez directement depuis l'app\n• Livraison ou retrait sur place\n• Paiement sécurisé\n\nTrouvez de bonnes affaires ! Voulez-vous explorer ?",
        "The TRAIT Marketplace 🛒\n\n• Browse products from local sellers\n• Pay directly from the app\n• Delivery or pickup available\n• Secure payment\n\nFind great deals! Want to explore?",
        "El Mercado TRAIT 🛒\n\n• Explora productos de vendedores locales\n• Paga directamente desde la app\n• Entrega o recogida disponible\n• Pago seguro\n\n¡Encuentra ofertas! ¿Quieres explorar?",
      ),
      actions: [{ label: '🛒 Explorer', page: 'marketplace' }],
    }
  }

  // ── SAVINGS ────────────────────────────────────────────────
  if (lower.match(/(epargne|saving|savings|objectif|goal|budget|ahorrar|ahorro|metas|.JSONException|ma sparplan|ma spar|ادخار| poupanca)/)) {
    return {
      response: reply(lang,
        "L'épargne TRAIT 🎯\n\n• Créez des objectifs d'épargne personnalisés\n• Suivez vos progrès en temps réel\n• Épargnez automatiquement\n• Atteignez vos objectifs plus vite\n\nVoulez-vous créer un objectif ?",
        "TRAIT Savings 🎯\n\n• Create personalized savings goals\n• Track your progress in real time\n• Save automatically\n• Reach your goals faster\n\nWant to create a goal?",
        "Ahorro TRAIT 🎯\n\n• Crea metas de ahorro personalizadas\n• Sigue tu progreso en tiempo real\n• Ahorra automáticamente\n• Alcanza tus metas más rápido\n\n¿Quieres crear una meta?",
      ),
      actions: [{ label: '🎯 Créer un objectif', page: 'savings-goals' }],
    }
  }

  // ── REFERRAL ───────────────────────────────────────────────
  if (lower.match(/(parrainage|referral|ami|friend|inviter|invite|bonus|recompense|gift|regalo|premio|padrino|referir|دعوة|مكافأة|indicado)/)) {
    return {
      response: reply(lang,
        "Le parrainage TRAIT 🎁\n\n• Partagez votre code de parrainage unique\n• Gagnez des bonus pour chaque ami inscrit\n• Vos amis gagnent aussi un bonus de bienvenue\n• Suivez vos gains dans l'app\n\nVoulez-vous voir votre code ?",
        "TRAIT Referral 🎁\n\n• Share your unique referral code\n• Earn bonuses for each friend who signs up\n• Your friends also get a welcome bonus\n• Track your earnings in the app\n\nWant to see your code?",
        "Referidos TRAIT 🎁\n\n• Comparte tu código de referido único\n• Gana bonificaciones por cada amigo que se registre\n• Tus amigos también reciben un bono de bienvenida\n• Sigue tus ganancias en la app\n\n¿Quieres ver tu código?",
      ),
      actions: [{ label: '🎁 Mon code', page: 'referral' }],
    }
  }

  // ── SECURITY ───────────────────────────────────────────────
  if (lower.match(/(securite|security|pin|code|password|mot de passe|mdp|contraseña|clave|pin code|emprunte|biometrie|face|finger|锁|密码|كلمة المرور|seguranca)/)) {
    return {
      response: reply(lang,
        "La sécurité TRAIT 🔒\n\n• Code PIN à 4 chiffres pour chaque transaction\n• Authentification par empreinte ou reconnaissance faciale\n• Chiffrement de toutes vos données\n• Bloquez/débloquez votre carte en 1 clic\n• Activez la double authentification\n\nVoulez-vous modifier votre PIN ?",
        "TRAIT Security 🔒\n\n• 4-digit PIN for each transaction\n• Fingerprint or face recognition\n• All your data is encrypted\n• Block/unblock your card in 1 tap\n• Enable two-factor authentication\n\nWant to change your PIN?",
        "Seguridad TRAIT 🔒\n\n• PIN de 4 dígitos para cada transacción\n• Huella dactilar o reconocimiento facial\n• Todos tus datos están encriptados\n• Bloquea/desbloquea tu tarjeta con 1 toque\n• Activa la autenticación de dos factores\n\n¿Quieres cambiar tu PIN?",
      ),
      actions: [{ label: '⚙️ Paramètres', page: 'settings' }],
    }
  }

  // ── AGENT ──────────────────────────────────────────────────
  if (lower.match(/(agent|agence|agency|point de vente|commercant|boutique|negocio|agente|agen| وكيل|محل)/)) {
    return {
      response: reply(lang,
        "Les agents TRAIT 🏪\n\n• Les agents sont des partenaires vérifiés\n• Ils facilitent vos dépôts et retraits en cash\n• Trouvez un agent proche de vous\n• Agents disponibles dans toute la région\n\nVoulez-vous trouver un agent ?",
        "TRAIT Agents 🏪\n\n• Agents are verified partners\n• They help with cash deposits and withdrawals\n• Find an agent near you\n• Agents available throughout the region\n\nWant to find an agent?",
        "Agentes TRAIT 🏪\n\n• Los agentes son socios verificados\n• Facilitan depósitos y retiros en efectivo\n• Encuentra un agente cerca de ti\n• Agentes disponibles en toda la región\n\n¿Quieres encontrar un agente?",
      ),
      actions: [{ label: '🏪 Trouver un agent', page: 'deposit' }],
    }
  }

  // ── WHAT IS TRAIT ──────────────────────────────────────────
  if (lower.match(/(quest|what|what is|c.est quoi|definition|signification|como es|que es|ma huwa|o que|trait cest|trait est|trait app)/)) {
    return {
      response: reply(lang,
        "TRAIT est une application fintech moderne 🚀\n\n• 💸 Envoyez et recevez de l'argent instantanément\n• 💳 Carte virtuelle sécurisée\n• 🏦 Dépôts et retraits via des agents\n• 📄 Payez vos factures\n• 🛒 Achetez sur le marché local\n• 🎯 Épargnez pour vos objectifs\n• 🤖 TRAIT IA vous assiste 24/7\n\nQue voulez-vous découvrir en premier ?",
        "TRAIT is a modern fintech app 🚀\n\n• 💸 Send and receive money instantly\n• 💳 Secure virtual card\n• 🏦 Deposits and withdrawals via agents\n• 📄 Pay your bills\n• 🛒 Shop at the local marketplace\n• 🎯 Save for your goals\n• 🤖 TRAIT IA assists you 24/7\n\nWhat would you like to discover first?",
        "TRAIT es una aplicación fintech moderna 🚀\n\n• 💸 Envía y recibe dinero al instante\n• 💳 Tarjeta virtual segura\n• 🏦 Depósitos y retiros a través de agentes\n• 📄 Paga tus facturas\n• 🛒 Compra en el mercado local\n• 🎯 Ahorra para tus metas\n• 🤖 TRAIT IA te asiste 24/7\n\n¿Qué quieres descubrir primero?",
      ),
      actions: [{ label: '🏠 Découvrir', page: 'home' }, { label: '📤 Envoyer', page: 'send' }],
    }
  }

  // ── HELP ───────────────────────────────────────────────────
  if (lower.match(/(aide|help|assistance|support|besoin|problem|bug|erreur|error|issue|problema|ayuda|soporte|mushkila|مساعدة|ajuda)/)) {
    return {
      response: reply(lang,
        "Je suis là pour vous aider ! 🤝\n\nVoici ce que je peux faire :\n• 💸 Envoyer de l'argent\n• 💵 Retirer du cash\n• 🏦 Déposer des fonds\n• 📄 Payer des factures\n• 💳 Gérer votre carte\n• 🎯 Créer un objectif d'épargne\n• 🛒 Explorer le marché\n\nPosez-moi n'importe quelle question !",
        "I'm here to help! 🤝\n\nHere's what I can do:\n• 💸 Send money\n• 💵 Withdraw cash\n• 🏦 Deposit funds\n• 📄 Pay bills\n• 💳 Manage your card\n• 🎯 Create savings goals\n• 🛒 Explore the marketplace\n\nAsk me anything!",
        "¡Estoy aquí para ayudar! 🤝\n\nEsto es lo que puedo hacer:\n• 💸 Enviar dinero\n• 💵 Retirar efectivo\n• 🏦 Depositar fondos\n• 📄 Pagar facturas\n• 💳 Gestionar tu tarjeta\n• 🎯 Crear metas de ahorro\n• 🛒 Explorar el mercado\n\n¡Pregúntame lo que sea!",
      ),
      actions: [{ label: '🏠 Accueil', page: 'home' }, { label: '💬 Support', page: 'support' }],
    }
  }

  // ── HISTORY ────────────────────────────────────────────────
  if (lower.match(/(historique|history|transaction|transaction log|mi historial|meine historik|minhas transacoes|السجل|العمليات)/)) {
    return {
      response: reply(lang,
        "Pour consulter votre historique 📋\n\nToutes vos transactions apparaissent dans l'onglet « Historique ». Vous pouvez filtrer par date, type ou montant.\n\nVoulez-vous y aller ?",
        "To view your history 📋\n\nAll your transactions appear in the « History » tab. You can filter by date, type or amount.\n\nWant to go there?",
        "Para ver tu historial 📋\n\nTodas tus transacciones aparecen en la pestaña « Historial ». Puedes filtrar por fecha, tipo o monto.\n\n¿Quieres ir allí?",
      ),
      actions: [{ label: '📋 Historique', page: 'history' }],
    }
  }

  // ── SETTINGS ───────────────────────────────────────────────
  if (lower.match(/(parametre|setting|configuration|option|preference|config|preferencia|configuracion|الإعدادات|configuracao)/)) {
    return {
      response: reply(lang,
        "Vos paramètres ⚙️\n\n• Modifiez votre profil\n• Changez votre PIN\n• Gérez la sécurité (empreinte, 2FA)\n• Activez/désactivez les notifications\n• Consultez les conditions d'utilisation\n\nVoulez-vous accéder aux paramètres ?",
        "Your settings ⚙️\n\n• Edit your profile\n• Change your PIN\n• Manage security (biometrics, 2FA)\n• Enable/disable notifications\n• View terms of use\n\nWant to access settings?",
        "Tus configuraciones ⚙️\n\n• Edita tu perfil\n• Cambia tu PIN\n• Gestiona la seguridad (biometría, 2FA)\n• Activa/desactiva notificaciones\n• Consulta los términos de uso\n\n¿Quieres acceder a la configuración?",
      ),
      actions: [{ label: '⚙️ Paramètres', page: 'settings' }],
    }
  }

  // ── PROFILE ────────────────────────────────────────────────
  if (lower.match(/(profil|profile|mon compte|my account|mi perfil|minha conta|mekan|الملف|meu perfil)/)) {
    return {
      response: reply(lang,
        "Votre profil 👤\n\n• Modifiez vos informations personnelles\n• Ajoutez une photo de profil\n• Vérifiez votre KYC\n• Gérez votre numéro de téléphone\n\nVoulez-vous modifier votre profil ?",
        "Your profile 👤\n\n• Edit your personal info\n• Add a profile photo\n• Complete your KYC verification\n• Manage your phone number\n\nWant to edit your profile?",
        "Tu perfil 👤\n\n• Edita tu información personal\n• Añade una foto de perfil\n• Completa tu verificación KYC\n• Gestiona tu número de teléfono\n\n¿Quieres editar tu perfil?",
      ),
      actions: [{ label: '👤 Profil', page: 'profile' }],
    }
  }

  // ── NOTIFICATIONS ──────────────────────────────────────────
  if (lower.match(/(notification|alert|alerte|avertissement|aviso|notification|الإشعارات|notificacao)/)) {
    return {
      response: reply(lang,
        "Vos notifications 🔔\n\n• Recevez des alertes pour chaque transaction\n• Notifications de sécurité importantes\n• Alertes promotionnelles\n• Activez les notifications push pour ne rien rater\n\nVoulez-vous voir vos notifications ?",
        "Your notifications 🔔\n\n• Get alerts for each transaction\n• Important security notifications\n• Promotional alerts\n• Enable push notifications to stay updated\n\nWant to see your notifications?",
        "Tus notificaciones 🔔\n\n• Recibe alertas por cada transacción\n• Notificaciones de seguridad importantes\n• Alertas promocionales\n• Activa las notificaciones push para no perderte nada\n\n¿Quieres ver tus notificaciones?",
      ),
      actions: [{ label: '🔔 Notifications', page: 'notifications' }],
    }
  }

  // ── KID / CHILD CARD ──────────────────────────────────────
  if (lower.match(/(enfant|child|kid|fille|fils|hijo|hija|filho|filha|bebe|baby|اولاد|ابن|بنت)/)) {
    return {
      response: reply(lang,
        "La carte enfant TRAIT 👨‍👩‍👧‍👦\n\n• Créez une carte pour vos enfants\n• Définissez une limite de dépenses\n• Suivez leurs achats en temps réel\n• Enseignez-leur la gestion de l'argent\n\nVoulez-vous créer une carte enfant ?",
        "TRAIT Child Card 👨‍👩‍👧‍👦\n\n• Create a card for your children\n• Set spending limits\n• Track their purchases in real time\n• Teach them money management\n\nWant to create a child card?",
        "Tarjeta Infantil TRAIT 👨‍👩‍👧‍👦\n\n• Crea una tarjeta para tus hijos\n• Establece límites de gasto\n• Sigue sus compras en tiempo real\n• Enséñales a manejar el dinero\n\n¿Quieres crear una tarjeta infantil?",
      ),
      actions: [{ label: '💳 Carte enfant', page: 'card' }],
    }
  }

  // ── MONEY / HOW MUCH ──────────────────────────────────────
  if (lower.match(/(argent|money|cash|euros|dollars|usd|fc|cdf|francs|dinero|efectivo|euro|dolar|fulus|نقود|فلوس|dinheiro)/)) {
    return {
      response: reply(lang,
        "Sur TRAIT, vous pouvez gérer votre argent en 💰\n\n• **USD** — Dollar américain\n• **FC** — Franc congolais\n• Changez le taux de change dans les paramètres\n• Transférez entre vos comptes\n\nQue voulez-vous faire avec votre argent ?",
        "On TRAIT, you can manage your money in 💰\n\n• **USD** — US Dollar\n• **FC** — Congolese Franc\n• Change the exchange rate in settings\n• Transfer between your accounts\n\nWhat would you like to do with your money?",
        "En TRAIT, puedes gestionar tu dinero en 💰\n\n• **USD** — Dólar estadounidense\n• **FC** — Franco congoleño\n• Cambia el tipo de cambio en configuración\n• Transfiere entre tus cuentas\n\n¿Qué quieres hacer con tu dinero?",
      ),
      actions: [{ label: '🏠 Voir mon solde', page: 'home' }],
    }
  }

  // ── NO MATCH ───────────────────────────────────────────────
  return null
}

/* ═══════════════════════════════════════════════════════════════
   GLM API — Bonus AI for complex questions
   ═══════════════════════════════════════════════════════════════ */

const GLM_SYSTEM_PROMPT = `You are TRAIT IA, a fintech app assistant. You help users with transfers, withdrawals, deposits, cards, bills, marketplace, savings, referrals, and app navigation. Be concise (2-3 sentences max). Respond in the SAME language the user writes in. Never do real financial operations. Be friendly and helpful. If asked about fees: deposit free, withdrawal 0.7%, transfer 0.7%. Available pages: home, send, withdraw, deposit, history, marketplace, bills, card, savings-goals, referral, settings, profile, notifications, support, agent-dashboard, seller-dashboard, ussd.`

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

    // 1. Try local match first (instant, always works)
    const localMatch = matchMessage(message)
    if (localMatch) {
      return NextResponse.json({ success: true, message: localMatch.response, actions: localMatch.actions || [] })
    }

    // 2. Try GLM API for complex questions
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

    // 3. Fallback for unmatched questions
    const lang = detectLang(message)
    return NextResponse.json({
      success: true,
      message: reply(lang,
        "Je ne suis pas sûr de comprendre votre question. Voici ce que je peux faire :\n\n• 💸 Envoyer de l'argent\n• 💵 Retirer du cash\n• 🏦 Déposer des fonds\n• 📄 Payer des factures\n• 💳 Gérer votre carte\n• 🛒 Explorer le marché\n\nN'hésitez pas à me poser une question précise !",
        "I'm not sure I understand your question. Here's what I can do:\n\n• 💸 Send money\n• 💵 Withdraw cash\n• 🏦 Deposit funds\n• 📄 Pay bills\n• 💳 Manage your card\n• 🛒 Explore the marketplace\n\nFeel free to ask me a specific question!",
        "No estoy seguro de entender tu pregunta. Esto es lo que puedo hacer:\n\n• 💸 Enviar dinero\n• 💵 Retirar efectivo\n• 🏦 Depositar fondos\n• 📄 Pagar facturas\n• 💳 Gestionar tu tarjeta\n• 🛒 Explorar el mercado\n\n¡No dudes en preguntarme algo específico!",
      ),
      actions: [{ label: '🏠 Accueil', page: 'home' }, { label: '💬 Support', page: 'support' }],
    })
  } catch (error) {
    console.error('Trait AI error:', error)
    return NextResponse.json({
      success: true,
      message: "Je suis TRAIT IA, votre assistant. Posez-moi une question sur l'application et je vous aiderai !",
      actions: [{ label: '🏠 Accueil', page: 'home' }],
    })
  }
}
