/**
 * Send a custom email to the applicants
 */
// Import class mail, the fetch and controllers methods
const fetch = require('node-fetch');
const Mails = require('./mail');
const controllers = require('../controllers');

/**
 * getCompanyNameAndLinks: get the names companies and links from torre API
 * @date 2020-06-22
 * @param {any} companyLink company link from "un mejor empleo" job board
 * @returns {any} the company name, the link from torre job, the torre explanation link and the language
 */
async function getCompanyNameAndLinks(companyLink) {
  let nameCompany = '';
  let linkJobTorre = '';
  let explainLink = '';
  let language = '';
  const idCompanyLink = companyLink.split('/')[3];
  const companyMetaHol = await fetch(`http://3.12.74.191:3002/api/v1/post/${idCompanyLink}`);
  const companyMetaHolJson = await companyMetaHol.json();
  if (Object.keys(companyMetaHolJson).length) {
    const companyMetaTorre = await fetch(
      `https://torre.co/api/opportunities/${companyMetaHolJson.source}`
    );
    const companyMetaTorreJson = await companyMetaTorre.json();
    linkJobTorre = `https://torre.co/jobs/${companyMetaHolJson.source}`;
    nameCompany = companyMetaTorreJson.organizations[0].name;
    language = 'es'; // companyMetaTorreJson.languages[0].language.code;
    if (language === 'en') {
      explainLink =
        'https://www.youtube.com/watch?v=6_zBo6EtuWk&list=PLIQS10CfZaEWn1adIi-_loTW9BKbYEtTb&index=3';
    } else {
      explainLink =
        'https://www.youtube.com/watch?v=r35ovTmDhEg&list=PLIQS10CfZaEWn1adIi-_loTW9BKbYEtTb&index=2';
    }
  } else {
    nameCompany = '';
    linkJobTorre = '';
    explainLink = '';
    language = '';
  }
  console.log('Variables: <', nameCompany, linkJobTorre, explainLink, language, '>');
  return {
    company: nameCompany,
    quickApply: linkJobTorre,
    explainme: explainLink,
    lang: language,
  };
}

/**
 * main: send emails to applicants
 * @date 2020-06-22
 * @returns {any} a list of emails sent
 */
const main = async () => {
  const sendEmail = new Mails.SendEmail();
  const jobOfferList = await controllers.JobOffer.getAllJobOffers();
  const allJobOffers = await Mails.SendEmail.getNoSentCandidates(jobOfferList);
  await sendEmail.configureTransporter();
  const idMessage = [];
  for (const jobOffer of allJobOffers) {
    if (jobOffer) {
      const { vacancy } = jobOffer;
      for (const companyLink in jobOffer.companies) {
        if (companyLink && !jobOffer.companies[companyLink].sentEmail) {
          await sendEmail.setEmails(jobOffer.companies[companyLink].emails);
          const { company, quickApply, explainme, lang } = await getCompanyNameAndLinks(
            companyLink
          );
          if (company && quickApply && explainme && lang) {
            await sendEmail.makeMessage(
              {
                company,
                quickApply,
                vacancy,
                explainme,
              },
              lang
            );
            const sendOk = await sendEmail.sendEmailsToAll();
            if (sendOk.messageId) {
              jobOffer.companies[companyLink].sentEmail = true;
            }
            idMessage.push(sendOk.messageId);
          }
        }
      }
    }
  }
  console.log(idMessage, idMessage.length, JSON.stringify(allJobOffers));
  return allJobOffers;
};
// export the function
module.exports = { main };

// Comment this in production
// main();
