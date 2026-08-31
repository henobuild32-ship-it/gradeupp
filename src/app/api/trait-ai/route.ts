import { NextRequest, NextResponse } from 'next/server'

const GLM_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions'
const GLM_API_KEY = process.env.GLM_API_KEY || ''

const TRAIT_SYSTEM_PROMPT = `Tu es TRAIT IA, l'assistant intelligent intégré à l'application TRAIT fintech.

RÈGLES FONDAMENTALES:
1. Tu NE JAMAIS effectuer d'opérations financières (dépôt, retrait, transfert, paiement). Tu expliques et guides uniquement.
2. Tu connais le contexte de l'utilisateur: son nom, son rôle (client, agent, fournisseur de service, administrateur).
3. Tu adresses l'utilisateur par son prénom quand tu le connais.
4. Tu respondes en français.
5. Tu es professionnel, concis, utile et chaleureux.
6. Tu peux proposer des boutons d'action contextuels pour naviguer vers les bonnes interfaces.

ROLES ET FONCTIONNALITÉS:

CLIENT:
- Transfert d'argent (envoi/reception)
- Portefeuille (solde USD/FC)
- Historique des transactions
- Paiements (QR, liens, boutiques)
- Bénéficiaires
- Factures et services
- Épargne et objectifs
- Cartes (demande, activation)
- Parrainage
- Profil et sécurité
- KYC

AGENT:
- Dépôt d'argent pour clients
- Validation de retraits
- Commission et historique
- Gestion de la caisse
- Messages clients
- Code agent

FOURNISSEUR (SELLER):
- Produits et services
- QR Scanner
- Paiements reçus
- Dashboard vendeur
- Gestion produits

ADMINISTRATEUR:
- Gestion des utilisateurs
- Validation agents/vendeurs
- Transactions
- Rapports et analytics
- Bonus et campagnes
- Paramètres système
- Support

NAVIGATION (routes autorisées):
- home: Accueil client
- send: Transfert/Envoi
- withdraw: Retrait
- deposit: Dépôt
- history: Historique
- marketplace: Marché
- bills: Factures
- card: Cartes
- savings-goals: Épargne
- referral: Parrainage
- settings: Paramètres
- profile: Profil
- notifications: Notifications
- support: Support
- agent-dashboard: Dashboard agent
- agent-deposit: Dépôt agent
- agent-withdraw-validate: Validation retrait
- agent-activity: Activité agent
- seller-dashboard: Dashboard vendeur
- seller-products: Produits vendeur

FORMAT DE RÉPONSE:
- Sois concis (2-4 phrases max par réponse sauf explications détaillées)
- Utilise des étapes numérotées pour les procédures
- Propose toujours un bouton d'action pertinent quand applicable
- Réponds en JSON: { "message": "texte", "actions": [{ "label": "Nom du bouton", "page": "page-name" }] }

Les actions sont optionnelles. Ne propose un bouton que si l'utilisateur demande comment faire quelque chose de spécifique.`

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, userName, userRole, history } = body

    if (!message) {
      return NextResponse.json({ success: false, message: 'Message requis' }, { status: 400 })
    }

    if (!GLM_API_KEY) {
      return NextResponse.json({ success: false, message: 'Clé API non configurée' }, { status: 500 })
    }

    const roleContext = userRole
      ? `L'utilisateur s'appelle "${userName || 'Utilisateur'}" et est "${userRole}".`
      : ''

    const messages = [
      { role: 'system', content: `${TRAIT_SYSTEM_PROMPT}\n\n${roleContext}` },
      ...(history || []).map((h: { role: string; content: string }) => ({
        role: h.role === 'user' ? 'user' : 'assistant',
        content: h.content,
      })),
      { role: 'user', content: message },
    ]

    const response = await fetch(GLM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GLM_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'glm-4-flash',
        messages,
        temperature: 0.7,
        max_tokens: 1024,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('GLM API error:', error)
      return NextResponse.json(
        { success: false, message: 'Erreur du service IA. Veuillez réessayer.' },
        { status: 502 }
      )
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''

    // Try to parse actions from the response
    let actions: Array<{ label: string; page: string }> = []
    let cleanMessage = content

    // Try JSON extraction
    try {
      const jsonMatch = content.match(/\{[\s\S]*"message"[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        cleanMessage = parsed.message || content
        actions = parsed.actions || []
      }
    } catch {
      cleanMessage = content
    }

    // Validate actions - only allow known pages
    const allowedPages = [
      'home', 'send', 'withdraw', 'deposit', 'history', 'marketplace',
      'bills', 'card', 'savings-goals', 'referral', 'settings', 'profile',
      'notifications', 'support', 'agent-dashboard', 'agent-deposit',
      'agent-withdraw-validate', 'agent-activity', 'seller-dashboard',
      'seller-products', 'ussd', 'barter', 'payment-links', 'payment-requests',
      'recurring-payments', 'bundle-catalog', 'micro-credit', 'kyc-verification',
      'my-qr-code', 'two-factor-setup', 'change-pin',
    ]

    actions = actions.filter((a) => allowedPages.includes(a.page))

    return NextResponse.json({
      success: true,
      message: cleanMessage,
      actions,
    })
  } catch (error) {
    console.error('Trait AI error:', error)
    return NextResponse.json(
      { success: false, message: 'Erreur interne. Veuillez réessayer.' },
      { status: 500 }
    )
  }
}
