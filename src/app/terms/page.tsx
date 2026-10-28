'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Download, Check, FileText, ArrowUp } from 'lucide-react'

const sections = [
  {
    title: '1. Introduction',
    content: `Bienvenue sur TRAIT (ci-après dénommé "l'Application", "la Plateforme" ou "le Service"). TRAIT est une application mobile de services financiers développée et exploitée par la société TRAIT TECHNOLOGIES (ci-après "la Société", "Nous", "Nos").

Les présentes Conditions Générales d'Utilisation (ci-après "CGU" ou "Conditions") régissent l'accès et l'utilisation de l'Application TRAIT, de ses fonctionnalités, de ses API, et de tous les services associés.

En créant un compte, en accédant ou en utilisant l'Application, vous reconnaissez avoir lu, compris et accepté sans réserve l'intégralité des présentes Conditions. Si vous n'acceptez pas ces Conditions, vous devez vous abstenir d'utiliser l'Application.

Ces Conditions constituent un contrat juridiquement contraignant entre vous et TRAIT TECHNOLOGIES.`
  },
  {
    title: '2. Définitions',
    content: `Aux fins des présentes CGU, les termes suivants ont la signification qui leur est donnée ci-après :

• "Utilisateur" : toute personne physique ou morale utilisant l'Application TRAIT.
• "Compte" : espace personnel créé par l'Utilisateur au sein de l'Application.
• "Client" : Utilisateur disposant d'un compte personnel pour effectuer des opérations financières.
• "Agent" : Utilisateur enregistré en tant qu'intermédiaire agréé autorisé à effectuer des opérations de dépôt et de retrait pour le compte de Clients.
• "Vendeur/Service" : Utilisateur enregistré pour vendre des biens ou services via la Plateforme.
• "Transaction" : toute opération financière réalisée via l'Application (transfert, dépôt, retrait, paiement, etc.).
• "Solde" : montant des fonds disponibles sur le Compte de l'Utilisateur.
• "Bonus" : montant crédité à titre promotionnel, non réclamable et soumis à conditions.
• "KYC" : Know Your Customer, processus de vérification d'identité.
• "OTP" : One-Time Password, code à usage unique pour la sécurisation des opérations.
• "PIN" : code secret personnel à 4 à 6 chiffres utilisé pour autoriser les transactions.`
  },
  {
    title: '3. Éligibilité et Inscription',
    content: `3.1. Pour créer un Compte TRAIT, vous devez :
• Être âgé(e) d'au moins 18 ans ou avoir la capacité juridique de contracter ;
• Résider dans un pays où TRAIT est proposé ;
• Disposer d'un numéro de téléphone mobile valide ;
• Disposer d'une adresse email valide ;
• Fournir des informations exactes, complètes et à jour.

3.2. Lors de l'inscription, vous vous engagez à :
• Fournir votre nom complet, numéro de téléphone, adresse email et mot de passe ;
• Choisir un mot de passe sécurisé d'au moins 8 caractères ;
• Ne pas créer de compte sous une fausse identité ;
• Ne pas créer plusieurs comptes sans autorisation explicite.

3.3. TRAIT se réserve le droit de :
• Refuser toute inscription sans justification ;
• Demander des pièces justificatives supplémentaires (KYC) ;
• Suspendre ou supprimer tout compte en cas de suspicion de fraude ou de non-respect des présentes CGU.`
  },
  {
    title: '4. Services Financiers',
    content: `4.1. Transferts d'Argent : L'Application permet d'effectuer des transferts d'argent entre Utilisateurs TRAIT, en temps réel ou différé, en USD et en Franc congolais (CDF).

4.2. Dépôts et Retraits : Les Agents agréés peuvent effectuer des opérations de dépôt et de retrait pour le compte de Clients. Ces opérations sont soumises à des limites de montant et à des procédures de vérification.

4.3. Paiement de Factures : TRAIT permet de payer des factures (électricité SNEL, eau REGIDESO, Internet, éducation, etc.) via des partenaires agréés.

4.4. Achats de Bundles : L'Application permet l'achat de crédit téléphonique, forfaits Internet, et abonnements TV (DSTV, Canal+) pour plusieurs opérateurs.

4.5. Paiement par QR Code : Les Utilisateurs peuvent effectuer des paiements par scan de QR Code chez les commerçants partenaires.

4.6. Paiement par Lien : Les Utilisateurs peuvent générer des liens de paiement à partager avec des tiers pour recevoir des fonds.

4.7. Paiements Récurrents : Possibilité de programmer des paiements automatiques récurrents (quotidiens, hebdomadaires, mensuels).

4.8. Demandes de Paiement : Les Utilisateurs peuvent envoyer des demandes de paiement à d'autres Utilisateurs.

4.9. Transferts Internationaux : TRAIT peut proposer des services de transfert d'argent international via des partenaires agréés, sous réserve de disponibilité géographique.

4.10. Épargne et Objectifs : Les Utilisateurs peuvent créer des objectifs d'épargne avec contribution automatique.

4.11. Micro-Crédit : Sous réserve d'éligibilité et d'analyse de solvabilité, TRAIT peut accorder des micro-crédits remboursables selon des modalités définies au cas par cas.

4.12. Cartes : TRAIT peut proposer des cartes de paiement (physiques ou virtuelles) sous réserve de validation KYC et de disponibilité.`
  },
  {
    title: '5. Sécurité et Confidentialité',
    content: `5.1. Protection des Données : TRAIT s'engage à protéger vos données personnelles conformément à la réglementation applicable (RGPD, lois nationales). Vos données sont stockées de manière sécurisée et ne sont jamais partagées avec des tiers non autorisés.

5.2. Authentification : L'accès à votre Compte est protégé par un mot de passe et/ou un code PIN. Vous pouvez également activer l'authentification biométrique (empreinte digitale, reconnaissance faciale) sur les appareils compatibles.

5.3. Vérification en Deux Étapes (2FA) : TRAIT propose l'authentification à deux facteurs pour renforcer la sécurité de votre compte.

5.4. OTP : Les opérations sensibles peuvent nécessiter la saisie d'un code OTP envoyé par email ou SMS.

5.5. Responsabilité : Vous êtes seul responsable de la confidentialité de votre mot de passe, PIN et données biométriques. TRAIT décline toute responsabilité en cas d'accès non autorisé à votre compte dû à une négligence de votre part.

5.6. Signalement : Tout accès non autorisé ou suspicion de fraude doit être signalé immédiatement à TRAIT via le support client.`
  },
  {
    title: '6. Frais et Commission',
    content: `6.1. TRAIT applique des frais sur certaines opérations, clairement indiqués avant validation de chaque transaction.

6.2. Les frais applicables sont les suivants (susceptibles d'être modifiés) :
• Transfert entre Utilisateurs : 0% à 2% selon le montant
• Dépôt via Agent : frais fixes ou proportionnels affichés
• Retrait via Agent : frais fixes ou proportionnels affichés
• Paiement de factures : frais de service variables selon le partenaire
• Transfert international : frais variables selon le corridor et le montant
• Micro-crédit : intérêts et frais de dossier communiqués lors de l'offre
• Carte virtuelle/physique : frais d'émission et de maintenance annuelle

6.3. TRAIT se réserve le droit de modifier ses frais à tout moment, avec notification préalable de 7 jours aux Utilisateurs.`
  },
  {
    title: '7. Limites et Plafonds',
    content: `7.1. Compte Non Vérifié (KYC de base) :
• Solde maximum : 1 000 000 CDF ou équivalent
• Transfert quotidien : 500 000 CDF maximum
• Nombre de transactions par jour : 10 maximum

7.2. Compte Vérifié (KYC complet) :
• Solde maximum : selon le profil et l'analyse de risque
• Transfert quotidien : jusqu'à 10 000 000 CDF
• Nombre de transactions par jour : 50 maximum

7.3. Limites Agent :
• Dépôt quotidien : 20 000 000 CDF maximum
• Retrait quotidien : 10 000 000 CDF maximum
• Solde Agent flottant : 5 000 000 CDF maximum

7.4. TRAIT se réserve le droit d'ajuster ces limites à tout moment pour des raisons de sécurité, de conformité ou de gestion des risques.`
  },
  {
    title: '8. Obligations de l\'Utilisateur',
    content: `8.1. L'Utilisateur s'engage à :
• Utiliser l'Application conformément aux lois et réglementations en vigueur ;
• Ne pas utiliser l'Application à des fins frauduleuses ou illicites ;
• Ne pas tenter de contourner les mesures de sécurité ;
• Ne pas exploiter de bugs ou vulnérabilités ;
• Ne pas utiliser l'Application pour le blanchiment d'argent ou le financement du terrorisme ;
• Mettre à jour ses informations personnelles en cas de changement ;
• Conserver une preuve de chaque transaction effectuée.

8.2. Sont strictement interdits :
• La création de comptes fictifs ou multiples sans autorisation ;
• L'utilisation de l'Application pour des jeux d'argent non autorisés ;
• La revente non autorisée des services TRAIT ;
• Tout comportement abusif, harcelant ou menaçant envers d'autres Utilisateurs ou le personnel TRAIT.`
  },
  {
    title: '9. Suspension et Résiliation',
    content: `9.1. TRAIT peut suspendre ou résilier votre Compte immédiatement si :
• Vous violez les présentes CGU ;
• Vous fournissez des informations fausses ou frauduleuses ;
• Votre compte est compromis ou utilisé à des fins frauduleuses ;
• Vous utilisez l'Application d'une manière qui pourrait nuire à TRAIT ou à d'autres Utilisateurs ;
• La loi ou une autorité réglementaire l'exige.

9.2. En cas de suspension :
• Les opérations en cours peuvent être bloquées ;
• Les fonds disponibles sont conservés jusqu'à résolution de la situation ;
• Vous serez notifié des raisons de la suspension, sauf restriction légale.

9.3. Vous pouvez résilier votre Compte à tout moment en contactant le support. La résiliation prend effet dans un délai de 30 jours ouvrés, sous réserve du règlement de toutes les opérations en cours.`
  },
  {
    title: '10. Propriété Intellectuelle',
    content: `10.1. L'Application TRAIT, son nom, son logo, son code source, ses interfaces, son design et tout son contenu sont la propriété exclusive de TRAIT TECHNOLOGIES et sont protégés par les lois sur la propriété intellectuelle.

10.2. Aucune licence ou droit d'utilisation n'est accordé sur la marque TRAIT, ses logos ou ses éléments graphiques.

10.3. Vous n'êtes pas autorisé à :
• Copier, modifier, distribuer ou créer des œuvres dérivées de l'Application ;
• Décompiler, désassembler ou effectuer du reverse engineering ;
• Utiliser les marques ou logos TRAIT sans autorisation écrite préalable.`
  },
  {
    title: '11. Protection des Données Personnelles',
    content: `11.1. TRAIT collecte et traite vos données personnelles conformément à sa Politique de Confidentialité, qui fait partie intégrante des présentes CGU.

11.2. Données collectées :
• Données d'identité : nom, prénom, genre, date de naissance, pièce d'identité ;
• Données de contact : numéro de téléphone, adresse email, adresse postale ;
• Données financières : soldes, historique des transactions, cartes bancaires ;
• Données techniques : adresse IP, type d'appareil, système d'exploitation, logs de connexion ;
• Données biométriques : empreinte digitale ou données faciales (avec votre consentement explicite).

11.3. Finalités du traitement :
• Fourniture et gestion des services financiers ;
• Lutte contre la fraude et le blanchiment d'argent ;
• Respect des obligations légales et réglementaires ;
• Amélioration de l'Application et de l'expérience utilisateur ;
• Communication d'informations commerciales (avec votre consentement).

11.4. Vos droits :
• Droit d'accès, de rectification, d'effacement, de limitation ;
• Droit à la portabilité des données ;
• Droit d'opposition au traitement ;
• Droit de retirer votre consentement à tout moment.

11.5. Pour exercer vos droits, contactez : dpo@trait-technologies.com`
  },
  {
    title: '12. Limitation de Responsabilité',
    content: `12.1. TRAIT s'engage à mettre en œuvre tous les moyens raisonnables pour assurer le bon fonctionnement de l'Application et la sécurité des transactions.

12.2. Cependant, TRAIT ne peut être tenu responsable :
• En cas de force majeure (catastrophe naturelle, pandémie, guerre, grève, panne réseau) ;
• Des dommages indirects, pertes de profits, ou interruptions d'activité ;
• Des retards ou dysfonctionnements dus à des tiers (opérateurs télécom, banques, partenaires) ;
• Des actions frauduleuses de tiers malgré les mesures de sécurité mises en place ;
• De l'utilisation non conforme de l'Application par l'Utilisateur ;
• Des dommages résultant de la divulgation non autorisée du mot de passe ou PIN.

12.3. La responsabilité totale de TRAIT envers un Utilisateur est limitée au montant total des frais payés par cet Utilisateur au cours des 12 derniers mois précédant l'événement ayant donné lieu à la réclamation.`
  },
  {
    title: '13. Litiges et Droit Applicable',
    content: `13.1. Les présentes CGU sont régies par le droit de la République Démocratique du Congo.

13.2. Tout litige relatif à l'interprétation ou à l'exécution des présentes CGU sera soumis à une tentative de résolution amiable.

13.3. À défaut d'accord amiable dans un délai de 30 jours, le litige sera soumis aux tribunaux compétents de Kinshasa, République Démocratique du Congo.

13.4. Pour toute réclamation, contactez d'abord le service client TRAIT :
• Email : support@trait-technologies.com
• Dans l'Application : rubrique Support.`
  },
  {
    title: '14. Modifications des CGU',
    content: `14.1. TRAIT se réserve le droit de modifier les présentes CGU à tout moment.

14.2. Les Utilisateurs seront notifiés de toute modification substantielle par email ou via l'Application, au moins 15 jours avant l'entrée en vigueur.

14.3. L'utilisation continue de l'Application après l'entrée en vigueur des modifications constitue une acceptation des nouvelles CGU.

14.4. Si vous n'acceptez pas les modifications, vous pouvez résilier votre compte avant l'entrée en vigueur.`
  },
  {
    title: '15. Contact',
    content: `TRAIT TECHNOLOGIES
Adresse : Kinshasa, République Démocratique du Congo
Email : support@trait-technologies.com
Site web : https://trait-rho.vercel.app

Pour toute question relative aux présentes CGU, veuillez nous contacter via l'Application (rubrique Support) ou par email.

Dernière mise à jour : 17 juillet 2026`
  }
]

export default function TermsPage() {
  const [accepted, setAccepted] = useState(false)
  const [showBackToTop, setShowBackToTop] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky header with print button */}
      <div className="sticky top-0 z-10 bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm border-b print:hidden">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { if (window.history.length > 1) window.history.back(); else window.close() }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors cursor-pointer"
              title="Retour à l'application"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Retour</span>
            </button>
            <div className="w-px h-5 bg-border hidden sm:block" />
            <FileText className="w-5 h-5 text-[#0D5C63] hidden sm:block" />
            <h1 className="text-lg font-bold text-foreground">Conditions d&apos;Utilisation</h1>
          </div>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-[#0D5C63] text-white rounded-lg hover:bg-[#083A3E] transition-colors text-sm font-medium"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Télécharger PDF</span>
            <span className="sm:hidden">PDF</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#0D5C63]/10 mb-4">
            <FileText className="w-8 h-8 text-[#0D5C63]" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">CONDITIONS GÉNÉRALES D&apos;UTILISATION</h2>
          <p className="text-sm text-muted-foreground">TRAIT — Application de Services Financiers</p>
          <p className="text-xs text-muted-foreground mt-1">Dernière mise à jour : 17 juillet 2026</p>
        </div>

        <div className="space-y-8">
          {sections.map((section) => (
            <section key={section.title} className="space-y-3">
              <h3 className="text-lg font-bold text-foreground">{section.title}</h3>
              <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {section.content}
              </div>
            </section>
          ))}
        </div>

        {/* Acceptance footer */}
        <div className="mt-12 p-6 bg-muted rounded-xl border print:hidden">
          <div className="flex items-start gap-3">
            <button
              onClick={() => setAccepted(!accepted)}
              className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all cursor-pointer ${
                accepted
                  ? 'bg-[#0D5C63] border-[#0D5C63]'
                  : 'border-gray-300 hover:border-[#0D5C63]/50'
              }`}
            >
              {accepted && <Check className="w-3 h-3 text-white" />}
            </button>
            <div>
              <p className="text-sm font-medium text-foreground">
                J&apos;accepte les Conditions Générales d&apos;Utilisation
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                En cochant cette case, vous reconnaissez avoir lu, compris et accepté l&apos;intégralité des présentes conditions.
              </p>
            </div>
          </div>
        </div>

        {/* Back to top */}
        <div className="flex justify-center mt-10 print:hidden">
          <button
            onClick={scrollToTop}
            className="flex items-center gap-2 px-6 py-3 bg-[#0D5C63]/10 hover:bg-[#0D5C63]/20 text-[#0D5C63] rounded-xl transition-colors text-sm font-medium"
          >
            <ArrowUp className="w-4 h-4" />
            Retour au début
          </button>
        </div>

        {/* Floating back to top */}
        {showBackToTop && (
          <button
            onClick={scrollToTop}
            className="fixed bottom-6 right-6 z-20 w-12 h-12 bg-[#0D5C63] text-white rounded-full shadow-lg hover:bg-[#083A3E] transition-all flex items-center justify-center print:hidden"
            aria-label="Retour au début"
          >
            <ArrowUp className="w-5 h-5" />
          </button>
        )}

        {/* Footer */}
        <div className="mt-8 pt-6 border-t text-center">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} TRAIT TECHNOLOGIES. Tous droits réservés.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Kinshasa, République Démocratique du Congo
          </p>
        </div>
      </div>
    </div>
  )
}
