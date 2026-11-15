/**
 * Master Sheet schema + initial data (seeded from "Pricing MasterSheet 2026 – Pricing v2" and agreed decisions).
 * Pure JS: used by SetupMasterSheet.js (Apps Script) and by Node tests.
 * Each tab: { kind: 'master' | 'record', headers: [...], rows: [[...]] }
 * After seeding, the Master Sheet is the source of truth — edit prices there, not here.
 */
var SEED = {
  Users: {
    kind: 'master',
    headers: ['email', 'name', 'role', 'manager_email', 'region', 'phone', 'active'],
    rows: [
      ['amith.lulla@optculture.com', 'Amith Lulla', 'Superadmin', '', 'Global', '', true],
      ['varaprasad@optculture.com', 'Varaprasad SN', 'Manager', 'amith.lulla@optculture.com', 'MEA', '+971 52 904 5457', true]
    ]
  },

  Entities: {
    kind: 'master',
    headers: ['entity_id', 'type', 'legal_name', 'short_name', 'reg_type', 'reg_no', 'address', 'country',
      'signatory_name', 'signatory_title', 'governing_law', 'logo_file_id', 'active'],
    rows: [
      ['OC-US', 'OptCulture', 'Retail Information Systems, Inc., doing business as OptCulture', 'OptCulture', '', '', '', 'United States', '', '', 'United States', '', true],
      ['OC-AE', 'OptCulture', 'RIS Services DMCC', 'OptCulture', 'Licence', 'DMCC-33689',
        'Office 1104, 11th Floor, X2 Tower, PB No. 73160, JLT, Dubai, UAE', 'United Arab Emirates', '', '', 'United Arab Emirates', '', true],
      ['OC-IN', 'OptCulture', 'OptCulture Private Limited', 'OptCulture', 'CIN', '', '', 'India', '', '', 'India', '', true],
      ['P-EG-CONGINEER', 'Partner', 'Congineer Business Solutions', 'Congineer', '', '', '', 'Egypt', '', '', 'Egypt', '', true]
    ]
  },

  Countries: {
    kind: 'master',
    // entity_id blank = no OptCulture entity -> rep must pick a local partner
    // default_currency is FIXED per country (rep cannot change it): INR for India, ZAR for South Africa, USD for all others
    headers: ['country', 'default_market', 'default_currency', 'dpa_addendum', 'entity_id'],
    rows: [
      ['United States', 'Developed', 'USD', '4F', 'OC-US'],
      ['Canada', 'Developed', 'USD', '4F', 'OC-US'],
      ['United Kingdom', 'Developed', 'USD', '4E', ''],
      ['European Union (any)', 'Developed', 'USD', '4E', ''],
      ['United Arab Emirates', 'High Income', 'USD', '4B', 'OC-AE'],
      ['Saudi Arabia', 'High Income', 'USD', '4A', ''],
      ['Qatar', 'High Income', 'USD', '4F', ''],
      ['Kuwait', 'High Income', 'USD', '4F', ''],
      ['Bahrain', 'High Income', 'USD', '4F', ''],
      ['Oman', 'High Income', 'USD', '4F', ''],
      ['Egypt', 'Emerging', 'USD', '4D', 'P-EG-CONGINEER'],
      ['South Africa', 'Emerging', 'ZAR', '4F', ''],
      ['India', 'India Only', 'INR', '4C', 'OC-IN']
    ]
  },

  Markets: {
    kind: 'master',
    headers: ['market', 'discount', 'example_countries'],
    rows: [
      ['Developed', 0, 'US, Canada'],
      ['High Income', 0.25, 'GCC'],
      ['Emerging', 0.35, 'Egypt, South Africa'],
      ['India Only', 0.75, 'India']
    ]
  },

  Currencies: {
    kind: 'master',
    headers: ['code', 'fx_rate', 'rounding_step', 'symbol'],
    rows: [
      ['USD', 1, 5, '$'],
      ['AED', 3.67, 5, 'AED'],
      ['EGP', 55, 5, 'EGP'],
      ['INR', 95, 5, '₹'],
      ['SAR', 3.74, 5, 'SAR'],
      ['ZAR', 16.5, 5, 'R']
    ]
  },

  Slabs: {
    kind: 'master',
    // sites = physical stores + e-commerce sites (licence is "per site")
    headers: ['label', 'min_sites', 'max_sites', 'discount'],
    rows: [
      ['Less than 10', 1, 9, 0],
      ['10 - 49', 10, 49, 0.10],
      ['50 - 99', 50, 99, 0.15],
      ['100 or more', 100, 999999, 0.20]
    ]
  },

  Packages: {
    kind: 'master',
    headers: ['package', 'price_per_site_month', 'setup_fee', 'ecom_install_fee', 'overage_per_1000_receipts',
      'receipts_included_per_site', 'display_order', 'active'],
    rows: [
      ['Engagement', 90, 1200, 500, 30, 2000, 1, true],
      ['Loyalty', 125, 1800, 1000, 45, 2000, 2, true],
      ['Advanced', 175, 3500, 1000, 60, 2000, 3, true]
    ]
  },

  PriceItems: {
    kind: 'master',
    // basis: FULL = market+slab discount and FX · FX_ONLY = currency conversion only · TEXT = text_value shown as-is
    // packages: ALL or comma list
    headers: ['item_id', 'category', 'label', 'unit', 'usd_price', 'basis', 'text_value', 'packages', 'display_order', 'active'],
    rows: [
      ['STORE_INSTALL', 'ONE_TIME', 'Installation per store', 'per store', 150, 'FULL', '', 'ALL', 1, true],
      ['CUSTOM_INT_HOUR', 'ONE_TIME', 'Custom integration on e-commerce sites (based on SOW ascertained by OC tech team)', 'per hour', 125, 'FULL', '', 'ALL', 2, true],
      ['MIGRATION_100K', 'ONE_TIME', 'Data migration from a different platform – up to 100,000 members', 'one-time', 1000, 'FULL', '', 'ALL', 3, true],
      ['MIGRATION_1M', 'ONE_TIME', 'Data migration from a different platform – up to 1,000,000 members', 'one-time', 4000, 'FULL', '', 'ALL', 4, true],
      ['MIGRATION_GT1M', 'ONE_TIME', 'Data migration from a different platform – more than 1,000,000 members', 'one-time', '', 'TEXT', 'Custom quote as per requirements', 'ALL', 5, true],
      ['INTEGRATION_SUPPORT', 'ONE_TIME', 'New integrations – support the integrator & test', 'one-time', 10000, 'FULL', '', 'ALL', 6, true],
      ['AI_SETUP', 'ONE_TIME', 'AI set-up', 'one-time', 20000, 'FULL', '', 'ALL', 7, true],

      ['GIFT_CARDS', 'ADDON', 'Gift Cards', 'per month', 50, 'FULL', '', 'Loyalty,Advanced', 1, true],
      ['EMPLOYEE_DISCOUNT', 'ADDON', 'Employee Discount Program', 'per month', 50, 'FULL', '', 'Loyalty,Advanced', 2, true],
      ['MANAGED_SERVICES', 'ADDON', 'Managed Services', 'per month', 5000, 'FULL', '', 'ALL', 3, true],
      ['AGENTIC_100K', 'ADDON', 'Agentic Marketing – 100,000 receipts per month', 'per month', 2500, 'FULL', '', 'ALL', 4, true],
      ['AGENTIC_1M', 'ADDON', 'Agentic Marketing – 1 million receipts per month', 'per month', 10000, 'FULL', '', 'ALL', 5, true],
      ['AGENTIC_EXTRA_100K', 'ADDON', 'Agentic Marketing – each additional 100,000 receipts after 1 million', 'per month', 500, 'FULL', '', 'ALL', 6, true],
      ['AI_RECOMMENDATIONS', 'ADDON', 'AI Recommendations', 'per month', '', 'TEXT', 'Custom quote', 'ALL', 7, true],
      ['AI_REPORTING', 'ADDON', 'AI Reporting', 'per month', '', 'TEXT', 'Custom quote', 'ALL', 8, true],
      ['AI_CLUSTERING', 'ADDON', 'AI Grouping & Clustering', 'per month', '', 'TEXT', 'Custom quote', 'ALL', 9, true],
      ['AI_PREDICTIVE', 'ADDON', 'AI Segmentation – Predictive Analytics', 'per month', '', 'TEXT', 'Custom quote', 'ALL', 10, true],
      ['AI_CAMPAIGN', 'ADDON', 'AI Assisted Campaign Creation', 'per month', '', 'TEXT', 'Custom quote', 'ALL', 11, true],

      ['STORAGE_10GB', 'USAGE', 'Storage beyond two years of customer data – per every 10 GB / 100,000 receipts', 'per month', 10, 'FULL', '', 'ALL', 1, true],
      ['SMS', 'USAGE', 'SMS costs (optional)', '', '', 'TEXT', 'Custom quote as per geography', 'ALL', 3, true],
      ['WHATSAPP', 'USAGE', 'WhatsApp charges (optional)', '', '', 'TEXT', 'Actuals as per Meta price list + {whatsapp_markup_pct}', 'ALL', 4, true],

      ['CONSULT_10D', 'CONSULTING', 'Loyalty Consulting & Marketing Campaign Management – 10 man days / month', 'per month', 1200, 'FX_ONLY', '', 'ALL', 1, true],
      ['CONSULT_20D', 'CONSULTING', 'Loyalty Consulting & Marketing Campaign Management – 20 man days / month', 'per month', 1800, 'FX_ONLY', '', 'ALL', 2, true]
    ]
  },

  Features: {
    kind: 'master',
    // values: Included | Not included | Add-on
    headers: ['feature', 'Engagement', 'Loyalty', 'Advanced', 'description_en', 'description_ar', 'display_order', 'addon_item_id'],
    rows: [
      ['E-receipts', 'Included', 'Included', 'Included', 'Branded digital receipts delivered via Email or WhatsApp after every purchase in-store or online. Customers view their basket, capture feedback, browse personalised offers, and enrol in the loyalty program directly from the receipt.', '', 1, ''],
      ['Customer 360, Customer Persona & Analytics', 'Included', 'Included', 'Included', 'A single customer profile spanning every store, brand and online store, capturing demographics, preferences, channel behaviour, purchase patterns and engagement history, so marketers can segment on unified signals.', '', 2, ''],
      ['Campaign', 'Included', 'Included', 'Included', '', '', 3, ''],
      ['Marketing Automation', 'Included', 'Included', 'Included', 'Orchestrate customer journeys across Email, SMS, WhatsApp and push, triggered by behaviour on any channel, such as onboarding, cross-sell and win-back flows.', '', 4, ''],
      ['Offers: Coupons, Promotions', 'Included', 'Included', 'Included', 'Design, manage and track promotions scoped to a brand, store, city or category. Generate single-use or multi-use coupons, barcodes or QR codes integrated with POS, e-commerce and campaign channels.', '', 5, ''],
      ['Rule Based Recommendation', 'Included', 'Included', 'Included', '', '', 6, ''],
      ['Coupons on Wallets', 'Included', 'Included', 'Included', '', '', 7, ''],
      ['Xio', 'Included', 'Included', 'Included', '', '', 8, ''],
      ['Reports & Dashboards', 'Included', 'Included', 'Included', 'Real-time, interactive dashboards comparing brand and store performance, cross-channel behaviour, program health, campaign ROI and customer lifetime value.', '', 9, ''],
      ['Form Builder', 'Included', 'Included', 'Included', 'Capture insight via forms and NPS surveys embedded in digital receipts, web pages and emails, and compare satisfaction trends across stores and channels.', '', 10, ''],
      ['Web App', 'Included', 'Included', 'Included', '', '', 11, ''],
      ['Loyalty', 'Not included', 'Included', 'Included', 'A flexible loyalty program designed for omnichannel earn and burn. Members accrue points at any store or online and redeem on any channel, with tier benefits, multipliers and category accelerators.', '', 12, ''],
      ['Rewards', 'Not included', 'Included', 'Included', 'Configure reward structures aligned to brand goals (points, spend tiers, engagement milestones, surprise rewards) to drive participation, repeat purchases and basket size.', '', 13, ''],
      ['Fraud Alerts', 'Not included', 'Included', 'Included', '', '', 14, ''],
      ['Loyalty Cards on Apple Wallet & Google Wallet (standard)', 'Not included', 'Included', 'Included', 'Issue a digital loyalty card that lives in the customer\'s Apple Wallet or Google Wallet — no app to download — with tier status, point balance and offers pushed to the lock-screen.', '', 15, ''],
      ['Affiliates/Referrals', 'Not included', 'Not included', 'Included', 'Empower existing members to refer friends and family, with automated tracking and rewards paid into the member wallet.', '', 16, ''],
      ['Membership Program', 'Not included', 'Not included', 'Included', '', '', 17, ''],
      ['Family Membership', 'Not included', 'Not included', 'Included', '', '', 18, ''],
      ['Sync with Google and Meta Audiences', 'Not included', 'Not included', 'Included', '', '', 19, ''],
      ['Gift Cards', 'Not included', 'Add-on', 'Add-on', 'Launch physical and digital gift cards usable across all stores, brands and online, with balances, usage and redemption tracked by brand, store and channel.', '', 20, 'GIFT_CARDS'],
      ['Employee Discount Program', 'Not included', 'Add-on', 'Add-on', '', '', 21, 'EMPLOYEE_DISCOUNT'],
      ['AI Recommendations', 'Add-on', 'Add-on', 'Add-on', '', '', 22, 'AI_RECOMMENDATIONS'],
      ['AI Reporting', 'Add-on', 'Add-on', 'Add-on', '', '', 23, 'AI_REPORTING'],
      ['AI Grouping & Clustering', 'Add-on', 'Add-on', 'Add-on', '', '', 24, 'AI_CLUSTERING'],
      ['AI Segmentation - Predictive Analytics', 'Add-on', 'Add-on', 'Add-on', '', '', 25, 'AI_PREDICTIVE'],
      ['AI Assisted Campaign Creation', 'Add-on', 'Add-on', 'Add-on', '', '', 26, 'AI_CAMPAIGN']
    ]
  },

  CommercialTerms: {
    kind: 'master',
    headers: ['key', 'value', 'note'],
    rows: [
      ['offer_validity_days', 30, 'Offer price valid from proposal date'],
      ['price_lock_months', 12, 'Commercials fixed for initial period'],
      ['annual_uplift_pct', 0.06, 'Increase per year after price lock'],
      ['late_fee_pct_month', 0.015, 'Interest on late payments per month'],
      ['payment_days', 30, 'Invoice due within N days'],
      ['liability_cap_months', 12, 'ToS liability cap = fees of preceding N months'],
      ['non_solicit_months', 24, 'Non-solicitation of employees after termination'],
      ['whatsapp_markup_pct', 0.175, 'Markup over Meta price list'],
      ['consulting_free_months', 3, 'Free consulting after go-live'],
      ['renewal_notice_days', 60, 'Non-renewal notice period'],
      ['data_export_days', 30, 'Customer data available after termination'],
      ['round_whole_below_steps', 10, 'Prices below rounding_step x N are rounded to a whole number instead of the step'],
      ['quote_valid_days', 30, 'Order Form quote valid for N days'],
      ['uptime_pct', '99.9%', 'SLA monthly availability'],
      ['support_email', 'support@optculture.com', 'SLA contact'],
      ['support_phone', '+91 9666004933', 'SLA call/WhatsApp number'],
      ['support_hours', 'Monday to Friday, 10 AM to 6 PM', 'SLA working hours'],
      ['executive_contact_name', 'Amith Lulla', 'SLA escalation – Executive Director'],
      ['executive_contact_email', 'amith.lulla@optculture.com', 'SLA escalation – Executive Director'],
      ['legal_email', 'legal@optculture.com', 'ToS contact'],
      ['default_hosting_region', '', 'DPA hosting region (to be confirmed by OC Tech)'],
      ['brand_table_header_bg', '#7B3FE4', 'Table header background (white bold text) – all documents'],
      ['brand_heading_color', '#B6262B', 'Heading colour (OptCulture red)'],
      ['stale_days', 60, 'Open deals with no update for this many days are highlighted for follow-up'],
      ['optculture_logo_file_id', '1dURALQP4yA58Fp5eSZY509NrB3gqagb9', 'OptCulture logo (PNG in _Templates) – {{IMAGE:OptCultureLogo}}']
    ]
  },

  CommsTiers: {
    kind: 'master',
    // Platform charges for outbound multi-channel conversations (email, SMS, chat, WhatsApp & push).
    // Volume tiers, currency-converted only (no market/slab discount). Price below list needs approval; floor = lowest acceptable.
    headers: ['tier_id', 'label', 'messages', 'list_usd', 'floor_usd', 'display_order', 'active'],
    rows: [
      ['COMMS_100K', 'Platform charges – up to 100,000 conversations / month (email & push included; SMS & WhatsApp charged extra)', 100000, 250, 100, 1, true],
      ['COMMS_1M', 'Platform charges – up to 1,000,000 conversations / month (email & push included; SMS & WhatsApp charged extra)', 1000000, 1500, 500, 2, true]
    ]
  },

  SubProcessors: {
    kind: 'master',
    // To be completed by OC Tech (Sprint 0 input 0.9)
    headers: ['name', 'service', 'location', 'condition', 'display_order', 'active'],
    rows: [
      ['TBC – cloud hosting provider', 'Cloud hosting', 'TBC', '', 1, true],
      ['Meta Platforms (WhatsApp Business)', 'WhatsApp messaging', 'Global', 'if used', 2, true],
      ['Apple / Google', 'Wallet passes and push notifications', 'Global', 'if used', 3, true]
    ]
  },

  Numbering: {
    kind: 'master',
    headers: ['doc_type', 'prefix', 'year', 'last_no'],
    rows: [
      ['PROPOSAL', 'OC-P', 2026, 0],
      ['ORDER_FORM', 'OC-Q', 2026, 0],
      ['TOS', 'OC-TOS', 2026, 0],
      ['DPA', 'OC-DPA', 2026, 0],
      ['DEAL', 'D', 2026, 0],
      ['CLIENT', 'C', '-', 0]
    ]
  },

  Templates: {
    kind: 'master',
    headers: ['doc_type', 'language', 'file_id', 'version', 'active', 'notes'],
    rows: []
  },

  AIPrompts: {
    kind: 'master',
    headers: ['key', 'model', 'temperature', 'prompt'],
    rows: [
      ['PROPOSAL_NARRATIVE', 'gemini-2.5-flash', 0.4,
        'You write sections of OptCulture sales proposals. Use only the facts in CLIENT NOTES and the listed MODULES. ' +
        'Never mention prices, discounts or features not listed. Write in a confident, professional B2B tone. ' +
        'Return JSON: {"executiveSummary": "3 paragraphs", "journeys": ["journey 1", "journey 2"], "multiBrandIntro": "1 paragraph or empty"}.']
    ]
  },

  // ---------- records (written by the app only) ----------
  Clients: {
    kind: 'record',
    headers: ['client_id', 'legal_name', 'short_name', 'country', 'address', 'reg_type', 'reg_no', 'website', 'brands',
      'pos', 'ecom_platform', 'business_contact', 'billing_contact', 'owner_email', 'created_at']
  },
  Deals: {
    kind: 'record',
    headers: ['deal_id', 'created_at', 'created_by', 'updated_at', 'status', 'client_id', 'client_name', 'country',
      'market', 'currency', 'entity_id', 'stores', 'ecom_sites', 'packages', 'input_json', 'quote_json',
      'needs_approval', 'approval_status', 'ai_draft_json', 'final_text_json', 'version']
  },
  Documents: {
    kind: 'record',
    headers: ['doc_no', 'deal_id', 'doc_type', 'language', 'version', 'template_version', 'doc_file_id', 'pdf_file_id',
      'created_by', 'created_at', 'status']
  },
  Approvals: {
    kind: 'record',
    headers: ['approval_id', 'deal_id', 'version', 'requested_by', 'requested_at', 'reasons', 'decision', 'decided_by', 'decided_at', 'comment']
  },
  AuditLog: {
    kind: 'record',
    headers: ['timestamp', 'user_email', 'action', 'deal_id', 'doc_no', 'details']
  },
  ChangeLog: {
    kind: 'record',
    headers: ['date', 'raised_by', 'area', 'change', 'gate_affected', 'status', 'sprint']
  }
};
