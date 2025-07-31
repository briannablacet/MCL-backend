const cron = require('node-cron');
const axios = require('axios');
const { parseISO, differenceInDays } = require('date-fns');

const headers = {
    Authorization: `Bearer ${process.env.HUBSPOT_API_KEY}`,
    'Content-Type': 'application/json'
}

const daysFromNow = (dateString, days) => {
    if (!dateString) return false;
    const targetDate = parseISO(dateString);
    const today = new Date();
    const diff = differenceInDays(targetDate, today);
    return diff === days;
};
  
const isDateInPast = (dateString) => {
    if (!dateString) return false;
    const targetDate = parseISO(dateString);
    const today = new Date();
    return targetDate < today;
};
  
async function checkAndUpdateDealStage(dealId, subscriptionStartDate) {
    let dealstage = null;

    if (daysFromNow(subscriptionStartDate, 7)) {
        dealstage = 'qualifiedtobuy';
    } else if (daysFromNow(subscriptionStartDate, 2)) {
        dealstage = 'presentationscheduled';
    } else if (isDateInPast(subscriptionStartDate)) {
        dealstage = 'decisionmakerboughtin';
    }

    if (dealstage) {
        const url = `https://api.hubapi.com/crm/v3/objects/deals/${dealId}`;
        const properties = { dealstage: dealstage };
        await axios.patch(url, { properties }, { headers });
    }
}

async function getAllDeals() {
  const url = 'https://api.hubapi.com/crm/v3/objects/deals?limit=100&properties=first_subscription_date,dealstage';
  const response = await axios.get(url, { headers });
  return response.data.results;
}


cron.schedule('0 0 * * *', async () => {
  const deals = await getAllDeals();
  for (const deal of deals) {
    const startDate = deal.properties['first_subscription_date'];
    await checkAndUpdateDealStage(deal.id, startDate);
  }
});
