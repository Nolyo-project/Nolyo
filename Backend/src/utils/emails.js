const { firstName, publicUrl } = require("./site");
const { sendMail } = require("./mail");

async function sendRequestReceived(request) {
  const name = firstName(request.name);
  const subject = "Nous avons bien reçu votre demande d’abonnement Nolyo";
  const text = `Bonjour ${name},

Nous avons bien reçu votre demande d’abonnement à Nolyo.

Merci pour votre confiance !

Votre demande va maintenant être étudiée par notre équipe. Le fondateur de Nolyo reviendra vers vous prochainement pour vous présenter les prochaines étapes et vous accompagner dans votre inscription.

Et bonne nouvelle : votre premier mois est offert.

A très bientôt sur Nolyo

L’équipe Nolyo`;
  return sendMail({
    to: request.email,
    subject,
    text,
    html: `<p style="line-height:1.6;margin:0 0 16px;">Bonjour ${name},</p>
      <p style="line-height:1.6;margin:0 0 16px;">Nous avons bien reçu votre demande d’abonnement à Nolyo.</p>
      <p style="line-height:1.6;margin:0 0 16px;">Merci pour votre confiance !</p>
      <p style="line-height:1.6;margin:0 0 16px;">Votre demande va maintenant être étudiée par notre équipe. Le fondateur de Nolyo reviendra vers vous prochainement pour vous présenter les prochaines étapes et vous accompagner dans votre inscription.</p>
      <p style="line-height:1.6;margin:0 0 16px;"><strong>Et bonne nouvelle : votre premier mois est offert.</strong> 🎁</p>
      <p style="line-height:1.6;margin:0 0 4px;">A très bientôt sur Nolyo</p>
      <p style="line-height:1.6;margin:0;">L’équipe Nolyo</p>`,
  });
}

async function sendFounderNewRequest(request, founder) {
  if (!founder?.email) return { skipped: true, reason: "no-founder" };
  const plan = request.plan === "pro" ? "Nolyo Pro" : "Nolyo Essentiel";
  const href = publicUrl("/president");
  const subject = `Nouvelle demande — ${request.company || request.name} (${plan})`;
  const text = `Bonjour ${firstName(founder.name)},

Nouvelle demande d’abonnement sur Nolyo.

Nom : ${request.name}
E-mail : ${request.email}
Activité : ${request.company || "—"}
Offre : ${plan}
${request.message ? `\nMessage :\n${request.message}\n` : ""}
Ouvre ton espace fondateur pour la traiter : ${href}`;
  return sendMail({
    to: founder.email,
    replyTo: request.email,
    subject,
    text,
    html: `<p style="line-height:1.6;margin:0 0 16px;">Bonjour ${firstName(founder.name)},</p>
      <p style="line-height:1.6;margin:0 0 16px;"><strong>Nouvelle demande d’abonnement</strong> sur Nolyo.</p>
      <p style="line-height:1.6;margin:0 0 4px;">Nom : ${request.name}</p>
      <p style="line-height:1.6;margin:0 0 4px;">E-mail : ${request.email}</p>
      <p style="line-height:1.6;margin:0 0 4px;">Activité : ${request.company || "—"}</p>
      <p style="line-height:1.6;margin:0 0 16px;">Offre : ${plan}</p>
      ${request.message ? `<p style="line-height:1.6;margin:0 0 16px;">Message : ${request.message}</p>` : ""}
      <p style="line-height:1.6;margin:0;"><a href="${href}" style="display:inline-block;background:#243026;color:#faf7f1;text-decoration:none;padding:12px 22px;border-radius:999px;">Ouvrir l’espace fondateur</a></p>`,
  });
}

async function sendInviteCode(request) {
  const name = firstName(request.name);
  const href = publicUrl(
    `/inscription?code=${encodeURIComponent(request.inviteCode)}`,
  );
  const subject = "Bienvenue sur Nolyo — votre accès est prêt";
  const text = `Bonjour ${name},

Bienvenue sur Nolyo !

Votre abonnement a bien été validé et votre accès est maintenant prêt.

Votre code d’accès unique

${request.inviteCode}

Ce code vous permettra de créer votre compte Nolyo et d’accéder à votre espace personnel.

Rendez-vous sur https://nolyo.fr/inscription et utilisez ce code lors de votre inscription.

Votre premier mois est offert, vous pouvez donc dès maintenant découvrir Nolyo et commencer à configurer votre espace.

Une fois votre compte créé, vous serez accompagné par notre onboarding personnalisé afin de configurer Nolyo selon votre activité et vos besoins.

Prenez quelques minutes pour compléter les différentes étapes : elles nous permettront de personnaliser au mieux votre expérience et de vous permettre de profiter pleinement de Nolyo.

Si vous avez la moindre question ou si vous rencontrez un problème lors de votre inscription, vous pouvez simplement répondre à cet e-mail. Je vous répondrai directement.

Encore bienvenue sur Nolyo, et merci pour votre confiance !

À très bientôt,

Florentin
Fondateur de Nolyo`;
  return sendMail({
    to: request.email,
    subject,
    text,
    html: `<p style="line-height:1.6;margin:0 0 16px;">Bonjour ${name},</p>
      <p style="line-height:1.6;margin:0 0 16px;"><strong>Bienvenue sur Nolyo ! 👋</strong></p>
      <p style="line-height:1.6;margin:0 0 16px;">Votre abonnement a bien été validé et votre accès est maintenant prêt.</p>
      <p style="line-height:1.6;margin:0 0 8px;"><strong>Votre code d’accès unique</strong></p>
      <p style="font-family:ui-monospace,monospace;font-size:22px;letter-spacing:.08em;margin:0 0 16px;">${request.inviteCode}</p>
      <p style="line-height:1.6;margin:0 0 16px;">Ce code vous permettra de créer votre compte Nolyo et d’accéder à votre espace personnel.</p>
      <p style="line-height:1.6;margin:0 0 16px;">Rendez-vous sur <a href="${href}" style="color:#c45c26;font-weight:600;text-decoration:underline;">/inscription</a> et utilisez ce code lors de votre inscription.</p>
      <p style="line-height:1.6;margin:0 0 16px;"><strong>Votre premier mois est offert</strong>, vous pouvez donc dès maintenant découvrir Nolyo et commencer à configurer votre espace.</p>
      <p style="line-height:1.6;margin:0 0 16px;">Une fois votre compte créé, vous serez accompagné par notre onboarding personnalisé afin de configurer Nolyo selon votre activité et vos besoins.</p>
      <p style="line-height:1.6;margin:0 0 16px;">Prenez quelques minutes pour compléter les différentes étapes : elles nous permettront de personnaliser au mieux votre expérience et de vous permettre de profiter pleinement de Nolyo.</p>
      <p style="line-height:1.6;margin:0 0 16px;">Si vous avez la moindre question ou si vous rencontrez un problème lors de votre inscription, vous pouvez simplement répondre à cet e-mail. Je vous répondrai directement.</p>
      <p style="line-height:1.6;margin:0 0 16px;"><strong>Encore bienvenue sur Nolyo, et merci pour votre confiance !</strong></p>
      <p style="line-height:1.6;margin:0 0 4px;">À très bientôt,</p>
      <p style="line-height:1.6;margin:0 0 4px;">Florentin</p>
      <p style="line-height:1.6;margin:0;">Fondateur de Nolyo</p>`,
  });
}

async function sendWelcome(user) {
  const name = firstName(user.name);
  const href = publicUrl("/dashboard");
  const subject = "Bienvenue sur Nolyo — Votre espace est prêt";
  const text = `Bonjour ${name},

Bienvenue sur Nolyo !

Votre compte a bien été créé et votre espace Nolyo est maintenant accessible.

Vous pouvez dès à présent commencer à configurer votre espace et découvrir les différentes fonctionnalités de la plateforme.

Pour vous accompagner dans vos premiers pas, un onboarding personnalisé vous est proposé directement dans Nolyo. Il vous permettra de renseigner les informations essentielles concernant votre activité et de configurer votre espace selon vos besoins.

Prenez quelques minutes pour compléter les différentes étapes afin de profiter pleinement de votre expérience sur Nolyo.

Si vous avez la moindre question ou si vous rencontrez un problème, vous pouvez simplement répondre à cet e-mail. Je serai ravi de vous aider.

Encore bienvenue sur Nolyo, et merci pour votre confiance !

À très bientôt,

Florentin
Fondateur de Nolyo`;
  return sendMail({
    to: user.email,
    subject,
    text,
    html: `<p style="line-height:1.6;margin:0 0 16px;">Bonjour ${name},</p>
      <p style="line-height:1.6;margin:0 0 16px;"><strong>Bienvenue sur Nolyo !</strong></p>
      <p style="line-height:1.6;margin:0 0 16px;">Votre compte a bien été créé et votre espace Nolyo est maintenant accessible.</p>
      <p style="line-height:1.6;margin:0 0 16px;">Vous pouvez dès à présent commencer à configurer votre espace et découvrir les différentes fonctionnalités de la plateforme.</p>
      <p style="line-height:1.6;margin:0 0 16px;">Pour vous accompagner dans vos premiers pas, un onboarding personnalisé vous est proposé directement dans Nolyo. Il vous permettra de renseigner les informations essentielles concernant votre activité et de configurer votre espace selon vos besoins.</p>
      <p style="line-height:1.6;margin:0 0 16px;">Prenez quelques minutes pour compléter les différentes étapes afin de profiter pleinement de votre expérience sur Nolyo.</p>
      <p style="line-height:1.6;margin:0 0 16px;">Si vous avez la moindre question ou si vous rencontrez un problème, vous pouvez simplement répondre à cet e-mail. Je serai ravi de vous aider.</p>
      <p style="line-height:1.6;margin:0 0 16px;">Encore bienvenue sur Nolyo, et merci pour votre confiance !</p>
      <p style="line-height:1.6;margin:0 0 16px;"><a href="${href}" style="display:inline-block;background:#243026;color:#faf7f1;text-decoration:none;padding:12px 22px;border-radius:999px;">Ouvrir mon espace</a></p>
      <p style="line-height:1.6;margin:0 0 4px;">À très bientôt,</p>
      <p style="line-height:1.6;margin:0 0 4px;">Florentin</p>
      <p style="line-height:1.6;margin:0;">Fondateur de Nolyo</p>`,
  });
}

async function sendTrialEnding(user) {
  const name = firstName(user.name);
  const subject = "Votre période d’essai Nolyo se termine bientôt";
  const text = `Bonjour ${name},

Votre premier mois offert sur Nolyo arrive bientôt à son terme.

Dans 2 jours, votre période d’essai prendra fin et votre abonnement passera à la formule indiquée sur votre devis.

À partir de cette date, votre première facture Nolyo vous sera envoyée afin de procéder au règlement de votre abonnement.

D’ici là, vous pouvez continuer à utiliser pleinement votre espace et à découvrir les différentes fonctionnalités de Nolyo.

Si vous avez la moindre question concernant votre abonnement, votre facture ou le fonctionnement de Nolyo, je reste bien entendu disponible pour vous répondre.

Merci encore pour votre confiance et pour cette première expérience avec Nolyo

À très bientôt,

Florentin
Fondateur de Nolyo`;
  return sendMail({
    to: user.email,
    subject,
    text,
    html: `<p style="line-height:1.6;margin:0 0 16px;">Bonjour ${name},</p>
      <p style="line-height:1.6;margin:0 0 16px;">Votre premier mois offert sur Nolyo arrive bientôt à son terme.</p>
      <p style="line-height:1.6;margin:0 0 16px;">Dans 2 jours, votre période d’essai prendra fin et votre abonnement passera à la formule indiquée sur votre devis.</p>
      <p style="line-height:1.6;margin:0 0 16px;">À partir de cette date, votre première facture Nolyo vous sera envoyée afin de procéder au règlement de votre abonnement.</p>
      <p style="line-height:1.6;margin:0 0 16px;">D’ici là, vous pouvez continuer à utiliser pleinement votre espace et à découvrir les différentes fonctionnalités de Nolyo.</p>
      <p style="line-height:1.6;margin:0 0 16px;">Si vous avez la moindre question concernant votre abonnement, votre facture ou le fonctionnement de Nolyo, je reste bien entendu disponible pour vous répondre.</p>
      <p style="line-height:1.6;margin:0 0 16px;">Merci encore pour votre confiance et pour cette première expérience avec Nolyo</p>
      <p style="line-height:1.6;margin:0 0 4px;">À très bientôt,</p>
      <p style="line-height:1.6;margin:0 0 4px;">Florentin</p>
      <p style="line-height:1.6;margin:0;">Fondateur de Nolyo</p>`,
  });
}

async function sendPaymentFailed(user, invoice = {}) {
  const name = firstName(user.name);
  const href = publicUrl("/facture");
  const subject = "Paiement Nolyo non abouti — espace en pause";
  const text = `Bonjour ${name},

Votre dernier paiement Nolyo n’a pas abouti (carte refusée, fonds insuffisants, ou règlement non finalisé).

Votre tableau de bord est temporairement bloqué. Dès que vous réglez, l’accès se rouvre automatiquement.

Payer et déverrouiller : ${href}
${invoice.hosted_invoice_url ? `\nLien Stripe : ${invoice.hosted_invoice_url}\n` : ""}
Si vous avez la moindre question, je reste disponible.

Florentin
Fondateur de Nolyo`;
  return sendMail({
    to: user.email,
    subject,
    text,
    html: `<p style="line-height:1.6;margin:0 0 16px;">Bonjour ${name},</p>
      <p style="line-height:1.6;margin:0 0 16px;">Votre dernier paiement Nolyo n’a pas abouti (carte refusée, fonds insuffisants, ou règlement non finalisé).</p>
      <p style="line-height:1.6;margin:0 0 16px;"><strong>Votre tableau de bord est temporairement bloqué.</strong> Dès que vous réglez, l’accès se rouvre automatiquement.</p>
      <p style="line-height:1.6;margin:0 0 16px;"><a href="${href}" style="display:inline-block;background:#243026;color:#faf7f1;text-decoration:none;padding:12px 22px;border-radius:999px;">Payer et déverrouiller</a></p>
      ${invoice.hosted_invoice_url ? `<p style="line-height:1.6;margin:0 0 16px;"><a href="${invoice.hosted_invoice_url}">Ouvrir la facture Stripe</a></p>` : ""}
      <p style="line-height:1.6;margin:0 0 4px;">Florentin</p>
      <p style="line-height:1.6;margin:0;">Fondateur de Nolyo</p>`,
  });
}

async function sendInvoiceReady(user, invoice = {}) {
  const { getPlan } = require("../config/plans");
  const name = firstName(user.name);
  const plan = getPlan(user.subscription?.plan);
  const formule = plan?.name || "Nolyo";
  const amountCents =
    invoice.amount_due ??
    invoice.amount_remaining ??
    Math.round((plan?.price || 0) * 100);
  const montant = (Number(amountCents) / 100).toFixed(2).replace(".", ",");
  const dueRaw = invoice.due_date
    ? new Date(invoice.due_date * 1000)
    : invoice.status_transitions?.finalized_at
      ? new Date(invoice.status_transitions.finalized_at * 1000)
      : null;
  const dateEcheance = dueRaw
    ? dueRaw.toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "dès réception";
  const href = publicUrl("/facture");
  const subject = "Votre première facture Nolyo";
  const text = `Bonjour ${name},

Votre premier mois offert sur Nolyo est maintenant terminé.

Votre première facture Nolyo est prête. Stripe vous l’a également adressée : vous pouvez la régler en ligne en quelques clics.

Votre abonnement

Formule : ${formule}
Montant à régler : ${montant} €
Date d’échéance : ${dateEcheance}

Régler ma facture (retour automatique sur Nolyo) : ${href}
${invoice.hosted_invoice_url ? `\nLien Stripe direct : ${invoice.hosted_invoice_url}\n` : ""}
Votre espace Nolyo est temporairement suspendu dans l’attente de la réception du règlement. Dès que votre paiement sera confirmé, votre accès sera automatiquement réactivé et vous pourrez continuer à utiliser Nolyo normalement.

Si vous avez la moindre question concernant votre facture ou votre abonnement, je reste bien entendu disponible pour vous répondre.

Merci pour votre confiance et pour votre utilisation de Nolyo

À très bientôt,

Florentin
Fondateur de Nolyo`;
  return sendMail({
    to: user.email,
    subject,
    text,
    html: `<p style="line-height:1.6;margin:0 0 16px;">Bonjour ${name},</p>
      <p style="line-height:1.6;margin:0 0 16px;">Votre premier mois offert sur Nolyo est maintenant terminé.</p>
      <p style="line-height:1.6;margin:0 0 16px;">Votre première facture Nolyo est prête. Stripe vous l’a également adressée : vous pouvez la régler en ligne en quelques clics.</p>
      <p style="line-height:1.6;margin:0 0 8px;"><strong>Votre abonnement</strong></p>
      <p style="line-height:1.6;margin:0 0 4px;">Formule : ${formule}</p>
      <p style="line-height:1.6;margin:0 0 4px;">Montant à régler : ${montant} €</p>
      <p style="line-height:1.6;margin:0 0 16px;">Date d’échéance : ${dateEcheance}</p>
      <p style="margin:0 0 16px;"><a href="${href}" style="display:inline-block;background:#c45c26;color:#faf7f1;text-decoration:none;padding:12px 22px;border-radius:999px;">Régler ma facture</a></p>
      <p style="line-height:1.6;margin:0 0 16px;">Après le paiement, Stripe vous renvoie sur Nolyo et votre espace se débloque automatiquement.</p>
      <p style="line-height:1.6;margin:0 0 16px;">Si vous avez la moindre question concernant votre facture ou votre abonnement, je reste bien entendu disponible pour vous répondre.</p>
      <p style="line-height:1.6;margin:0 0 16px;">Merci pour votre confiance et pour votre utilisation de Nolyo</p>
      <p style="line-height:1.6;margin:0 0 4px;">À très bientôt,</p>
      <p style="line-height:1.6;margin:0 0 4px;">Florentin</p>
      <p style="line-height:1.6;margin:0;">Fondateur de Nolyo</p>`,
  });
}

async function sendPaymentReceived(user) {
  const name = firstName(user.name);
  const href = publicUrl("/dashboard");
  const subject = "Paiement confirmé — Votre espace Nolyo est actif";
  const text = `Bonjour ${name},

Nous avons bien reçu votre paiement pour votre abonnement Nolyo.

Votre espace est désormais actif et vous pouvez continuer à utiliser Nolyo pleinement.

Je tenais également à vous remercier personnellement pour votre confiance.

Nolyo est un projet que je développe avec l'envie de proposer un outil simple, accessible et réellement utile aux entreprises, sans les contraintes des solutions trop complexes.

Votre confiance nous permet de faire grandir Nolyo et de continuer à l'améliorer chaque jour.

Si vous avez une question, une suggestion ou simplement une idée pour améliorer Nolyo, n'hésitez surtout pas à me contacter. Vos retours comptent vraiment et peuvent directement contribuer aux prochaines évolutions de la plateforme.

Encore une fois, merci beaucoup pour votre confiance et votre soutien.

Je suis très heureux de vous compter parmi les utilisateurs de Nolyo et j'espère que la plateforme vous accompagnera pleinement dans votre activité.

À très bientôt sur Nolyo,

Florentin
Fondateur de Nolyo`;
  return sendMail({
    to: user.email,
    subject,
    text,
    html: `<p style="line-height:1.6;margin:0 0 16px;">Bonjour ${name},</p>
      <p style="line-height:1.6;margin:0 0 16px;">Nous avons bien reçu votre paiement pour votre abonnement Nolyo.</p>
      <p style="line-height:1.6;margin:0 0 16px;"><strong>✅ Votre espace est désormais actif</strong> et vous pouvez continuer à utiliser Nolyo pleinement.</p>
      <p style="line-height:1.6;margin:0 0 16px;"><a href="${href}" style="display:inline-block;background:#243026;color:#faf7f1;text-decoration:none;padding:12px 22px;border-radius:999px;">Retourner sur mon espace</a></p>
      <p style="line-height:1.6;margin:0 0 16px;">Je tenais également à vous remercier personnellement pour votre confiance.</p>
      <p style="line-height:1.6;margin:0 0 16px;">Nolyo est un projet que je développe avec l’envie de proposer un outil simple, accessible et réellement utile aux entreprises, sans les contraintes des solutions trop complexes.</p>
      <p style="line-height:1.6;margin:0 0 16px;">Votre confiance nous permet de faire grandir Nolyo et de continuer à l’améliorer chaque jour.</p>
      <p style="line-height:1.6;margin:0 0 16px;">Si vous avez une question, une suggestion ou simplement une idée pour améliorer Nolyo, n’hésitez surtout pas à me contacter. Vos retours comptent vraiment et peuvent directement contribuer aux prochaines évolutions de la plateforme.</p>
      <p style="line-height:1.6;margin:0 0 16px;">Encore une fois, merci beaucoup pour votre confiance et votre soutien.</p>
      <p style="line-height:1.6;margin:0 0 16px;">Je suis très heureux de vous compter parmi les utilisateurs de Nolyo et j’espère que la plateforme vous accompagnera pleinement dans votre activité.</p>
      <p style="line-height:1.6;margin:0 0 4px;">À très bientôt sur Nolyo,</p>
      <p style="line-height:1.6;margin:0 0 4px;">Florentin</p>
      <p style="line-height:1.6;margin:0;">Fondateur de Nolyo</p>`,
  });
}

function bookingWhen(startAt) {
  const date = new Date(startAt);
  return {
    dateLabel: date.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    timeLabel: date.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

function fillTemplate(template, vars) {
  return String(template || "").replace(/\{\{(\w+)\}\}/g, (_, key) =>
    vars[key] != null ? String(vars[key]) : "",
  );
}

async function sendBookingEmails({
  owner,
  contact,
  appointment,
  pageTitle,
  guestConfirm,
}) {
  const { dateLabel, timeLabel } = bookingWhen(appointment.startAt);
  const company =
    owner.subscription?.company ||
    owner.onboarding?.company ||
    owner.business?.tradeName ||
    owner.name ||
    "Nolyo";
  const guestFirst = firstName(contact.firstName || contact.name);
  const serviceName = appointment.serviceName || "Rendez-vous";
  const vars = {
    prenom: guestFirst,
    prestation: serviceName,
    date: dateLabel,
    heure: timeLabel,
    entreprise: company,
    page: pageTitle || company,
  };

  const notif = owner.notifications || {};
  const defaultGuestSubject = `Confirmation — ${serviceName} le ${dateLabel}`;
  const defaultGuestBody = `Bonjour ${guestFirst},

Votre rendez-vous « ${serviceName} » est confirmé le ${dateLabel} à ${timeLabel}.

À bientôt,
${company}`;
  const customSubject =
    fillTemplate(
      guestConfirm?.subject || notif.clientBookingEmailSubject,
      vars,
    ) || defaultGuestSubject;
  const customBody =
    fillTemplate(guestConfirm?.body || notif.clientBookingEmailBody, vars) ||
    guestConfirm?.fallbackBody ||
    defaultGuestBody;

  const jobs = [];

  if (contact.email) {
    const htmlBody = customBody
      .split(/\n+/)
      .map(
        (line) =>
          `<p style="line-height:1.6;margin:0 0 12px;">${line || "&nbsp;"}</p>`,
      )
      .join("");
    jobs.push({
      label: "client",
      mail: {
        to: contact.email,
        replyTo: owner.email,
        subject: customSubject,
        text: customBody,
        html: htmlBody,
      },
    });
  } else {
    console.warn("Booking mail: pas d’e-mail client, confirmation non envoyée");
  }

  if (notif.emailBooking !== false) {
    jobs.push({
      label: "owner",
      mail: {
        to: owner.email,
        replyTo: contact.email || owner.email,
        subject: `Nouveau rendez-vous — ${contact.name || guestFirst}`,
        text: `Bonjour ${firstName(owner.name)},

Nouveau rendez-vous sur Nolyo.

Client : ${contact.name || guestFirst}
${contact.email ? `E-mail : ${contact.email}\n` : ""}${contact.phone ? `Tél. : ${contact.phone}\n` : ""}Prestation : ${serviceName}
Quand : ${dateLabel} à ${timeLabel}

Ouvrez votre agenda Nolyo pour le détail.`,
        html: `<p style="line-height:1.6;margin:0 0 16px;">Bonjour ${firstName(owner.name)},</p>
          <p style="line-height:1.6;margin:0 0 16px;"><strong>Nouveau rendez-vous</strong> sur Nolyo.</p>
          <p style="line-height:1.6;margin:0 0 4px;">Client : ${contact.name || guestFirst}</p>
          ${contact.email ? `<p style="line-height:1.6;margin:0 0 4px;">E-mail : ${contact.email}</p>` : ""}
          ${contact.phone ? `<p style="line-height:1.6;margin:0 0 4px;">Tél. : ${contact.phone}</p>` : ""}
          <p style="line-height:1.6;margin:0 0 4px;">Prestation : ${serviceName}</p>
          <p style="line-height:1.6;margin:0 0 16px;">Quand : ${dateLabel} à ${timeLabel}</p>`,
      },
    });
  }

  // EmailJS : 1 requête / seconde. Les envoyer en parallèle faisait échouer la confirmation client.
  for (let i = 0; i < jobs.length; i += 1) {
    if (i > 0) await new Promise((resolve) => setTimeout(resolve, 1200));
    const job = jobs[i];
    try {
      const result = await sendMail(job.mail);
      if (result?.skipped) {
        console.warn(
          `[mail] ${job.label} ignoré (${result.reason || "skipped"}) → ${job.mail.to}`,
        );
      }
    } catch (err) {
      console.error(
        `[mail] ${job.label} échoué → ${job.mail.to}`,
        err?.text || err?.message || err,
      );
    }
  }
}

async function sendMaintenanceNotice(user, { startsAt, endsAt, message } = {}) {
  const name = firstName(user.name);
  const startLabel = startsAt
    ? new Date(startsAt).toLocaleString("fr-FR", {
        timeZone: "Europe/Paris",
        dateStyle: "full",
        timeStyle: "short",
      })
    : null;
  const endLabel = endsAt
    ? new Date(endsAt).toLocaleString("fr-FR", {
        timeZone: "Europe/Paris",
        dateStyle: "full",
        timeStyle: "short",
      })
    : null;

  let windowText = "Une maintenance est prévue sur Nolyo.";
  if (startLabel && endLabel)
    windowText = `Une maintenance est prévue du ${startLabel} au ${endLabel}.`;
  else if (startLabel)
    windowText = `Une maintenance est prévue à partir du ${startLabel}.`;
  else if (endLabel)
    windowText = `Une maintenance est en cours jusqu’au ${endLabel}.`;

  const extra = String(message || "").trim();
  const subject = "Maintenance Nolyo — information importante";
  const text = `Bonjour ${name},

${windowText}
${extra ? `\n${extra}\n` : ""}
Pendant cette période, le site public peut être temporairement indisponible. Votre espace reste accessible via votre connexion habituelle dès que possible.

Merci de votre compréhension.

L’équipe Nolyo`;
  return sendMail({
    to: user.email,
    subject,
    text,
    html: `<p style="line-height:1.6;margin:0 0 16px;">Bonjour ${name},</p>
      <p style="line-height:1.6;margin:0 0 16px;">${windowText}</p>
      ${extra ? `<p style="line-height:1.6;margin:0 0 16px;">${extra}</p>` : ""}
      <p style="line-height:1.6;margin:0 0 16px;">Pendant cette période, le site public peut être temporairement indisponible. Votre espace reste accessible via votre connexion habituelle dès que possible.</p>
      <p style="line-height:1.6;margin:0 0 16px;">Merci de votre compréhension.</p>
      <p style="line-height:1.6;margin:0;">L’équipe Nolyo</p>`,
  });
}

module.exports = {
  sendRequestReceived,
  sendFounderNewRequest,
  sendInviteCode,
  sendWelcome,
  sendTrialEnding,
  sendInvoiceReady,
  sendPaymentFailed,
  sendPaymentReceived,
  sendBookingEmails,
  sendMaintenanceNotice,
};
