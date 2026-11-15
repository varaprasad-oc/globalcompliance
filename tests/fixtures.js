/* Sample deal used by tests and by the placeholder dictionary generator. */
module.exports.sampleDeal = {
  dealId: 'D-TEST-1', version: 1,
  client: {
    legalName: 'Fashion Retail Group S.A.E.', shortName: 'FRG', country: 'Egypt', address: 'Cairo, Egypt',
    regType: 'Commercial Registration', regNo: '123456', website: 'frg.store', brands: 'SKECHERS, ANTA SPORTS, ECCO',
    pos: 'Retail Pro', ecomPlatform: 'Shopify',
    businessContact: { name: 'A. Client', email: 'a@frg.example', phone: '+20 100 000 0000' },
    billingContact: { name: 'Finance', email: 'finance@frg.example' },
    signatoryName: 'A. Client', signatoryTitle: 'CEO', signatoryEmail: 'a@frg.example'
  },
  entityId: 'P-EG-CONGINEER',
  commercial: {
    market: 'Emerging', currency: 'USD', stores: 46, ecomSites: 1, packages: ['Loyalty', 'Advanced'],
    specialPrices: { Loyalty: 70 }, addOns: ['GIFT_CARDS'], oneTimeItems: [{ id: 'MIGRATION_100K', qty: 1 }],
    orderPackage: 'Loyalty', termMonths: 12, startDate: '2026-12-01', billingCycle: 'Annual', autoRenew: true
  },
  proposal: { title: 'Unified Omnichannel Loyalty & Customer Engagement Platform', tagline: 'Earn anywhere. Redeem everywhere.', multiBrand: true },
  narrative: { executiveSummary: 'Para one.\n\nPara two.', journeys: ['Cross-channel activation: A customer…', 'Lifecycle win-back: A shopper…'], multiBrandIntro: '' },
  dpa: { hostingRegion: 'EU (Frankfurt)' }
};
module.exports.ctx = { docNo: 'OC-P-2026-0001', docDate: '2026-11-01T00:00:00', user: { name: 'Varaprasad SN', email: 'varaprasad@optculture.com', phone: '+971 52 904 5457' } };
