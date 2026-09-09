/** Micro-entreprise, prestations de services BIC, versement libératoire, hors ACRE. */
const SOCIAL_RATE = 0.212
const VERSEMENT_LIBERATOIRE_RATE = 0.017
const COTISATION_RATE = SOCIAL_RATE + VERSEMENT_LIBERATOIRE_RATE

const URSSAF_PAY_URL = 'https://www.autoentrepreneur.urssaf.fr/portail/accueil.html'

module.exports = {
  SOCIAL_RATE,
  VERSEMENT_LIBERATOIRE_RATE,
  COTISATION_RATE,
  URSSAF_PAY_URL,
}
