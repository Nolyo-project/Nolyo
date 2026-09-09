/**
 * Micro-entreprise — recettes des activités libérales (BNC), versement libératoire, hors ACRE.
 * Taux alignés sur le détail URSSAF autoentrepreneur (cotisations + VL).
 * CFP : 0 % dans ton extrait actuel (colonne à 0 €).
 */
const SOCIAL_RATE = 0.256
const VERSEMENT_LIBERATOIRE_RATE = 0.022
const CFP_RATE = 0
const COTISATION_RATE = SOCIAL_RATE + VERSEMENT_LIBERATOIRE_RATE + CFP_RATE

const ACTIVITY_LABEL = 'BNC · activité libérale'
const URSSAF_PAY_URL = 'https://www.autoentrepreneur.urssaf.fr/portail/accueil.html'

module.exports = {
  SOCIAL_RATE,
  VERSEMENT_LIBERATOIRE_RATE,
  CFP_RATE,
  COTISATION_RATE,
  ACTIVITY_LABEL,
  URSSAF_PAY_URL,
}
