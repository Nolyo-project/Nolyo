const PDFDocument = require('pdfkit')
const { getPlan } = require('../config/plans')

function money(value) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value)
}

function slug(value) {
  return String(value || 'nolyo')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function buildQuotePdf(request) {
  const plan = getPlan(request.plan) || getPlan('essentiel')
  const issued = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 56 })
    const chunks = []
    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    doc.fillColor('#c45c26').fontSize(10).text('NOLYO', { characterSpacing: 2 })
    doc.moveDown(0.4)
    doc.fillColor('#243026').fontSize(26).text('Devis d’abonnement')
    doc.moveDown(0.3)
    doc.fontSize(11).fillColor('#5c6b61').text(`Émis le ${issued}`)
    doc.moveDown(1.2)

    doc.fillColor('#243026').fontSize(12).text('Client')
    doc.moveDown(0.3)
    doc.fontSize(11).fillColor('#243026').text(request.name || '')
    if (request.company) doc.text(request.company)
    doc.fillColor('#5c6b61').text(request.email || '')
    doc.moveDown(1.2)

    doc.fillColor('#243026').fontSize(12).text('Offre')
    doc.moveDown(0.3)
    doc.fontSize(14).text(plan.name)
    doc.fontSize(11).fillColor('#5c6b61').text(`${money(plan.price)} / mois`)
    doc.moveDown(0.6)
    doc.fillColor('#243026').text('Premier mois offert. Aucun règlement à l’ouverture.')
    doc.text(`${plan.commitment}. Soit ${plan.totalMonths} mois au total, le premier étant offert.`)
    doc.moveDown(1)

    doc.fontSize(12).text('Inclus')
    doc.moveDown(0.3)
    doc.fontSize(11).fillColor('#5c6b61')
    for (const feature of plan.features) {
      doc.text(`•  ${feature}`)
    }

    doc.moveDown(1.4)
    doc.fillColor('#243026').fontSize(11).text(
      'Pour valider cet abonnement, retournez ce devis signé. Un code unique vous sera alors transmis pour créer votre compte Nolyo.',
      { lineGap: 3 },
    )
    doc.moveDown(1.6)
    doc.fontSize(10).fillColor('#5c6b61').text('Bon pour accord, précédé de la mention « Lu et approuvé ».')
    doc.moveDown(1.2)
    doc.fillColor('#243026').text('Date : ____________________     Signature : ____________________')
    doc.moveDown(2)
    doc.fontSize(10).fillColor('#5c6b61').text('Florentin — Fondateur de Nolyo')
    doc.end()
  })
}

function quoteFilename(request) {
  return `devis-nolyo-${slug(request.company || request.name)}.pdf`
}

module.exports = { buildQuotePdf, quoteFilename }
