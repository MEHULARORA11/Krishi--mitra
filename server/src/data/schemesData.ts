/**
 * Curated government scheme seed data.
 * These are real Indian agricultural schemes with official URLs.
 * last_verified_date should be updated when the data is re-verified.
 */

export type SchemeSeed = {
  title: string
  state: string
  eligibilityRules: string
  requiredDocuments: string[]
  officialLink: string
  description: string
  category: string
  lastVerifiedDate: string
}

export const SCHEME_SEED_DATA: SchemeSeed[] = [
  {
    title: 'PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)',
    state: 'Central',
    eligibilityRules:
      'All landholding farmer families with cultivable land. Excludes institutional landholders, ' +
      'former/present holders of constitutional posts, serving/retired government employees with ' +
      'pension above ₹10,000/month, income tax payers, professionals like doctors/engineers/lawyers.',
    requiredDocuments: ['Aadhaar Card', 'Land ownership records', 'Bank account details', 'Mobile number'],
    officialLink: 'https://pmkisan.gov.in/',
    description:
      'Direct income support of ₹6,000 per year in three equal installments to small and marginal farmer families. ' +
      'Amount is transferred directly to the bank account of eligible farmers.',
    category: 'Income Support',
    lastVerifiedDate: '2025-06-01',
  },
  {
    title: 'PMFBY (Pradhan Mantri Fasal Bima Yojana)',
    state: 'Central',
    eligibilityRules:
      'All farmers growing notified crops in notified areas, including sharecroppers and tenant farmers. ' +
      'Farmers must have insurable interest in the crop. Both loanee and non-loanee farmers are eligible.',
    requiredDocuments: [
      'Aadhaar Card', 'Land records / Tenancy agreement', 'Bank account', 'Sowing certificate',
      'Crop details declaration',
    ],
    officialLink: 'https://pmfby.gov.in/',
    description:
      'Comprehensive crop insurance scheme covering yield losses from natural calamities, pests, and diseases. ' +
      'Farmer premium: 2% for Kharif, 1.5% for Rabi, 5% for commercial/horticultural crops. ' +
      'Government subsidizes the remaining premium.',
    category: 'Crop Insurance',
    lastVerifiedDate: '2025-06-01',
  },
  {
    title: 'KCC (Kisan Credit Card)',
    state: 'Central',
    eligibilityRules:
      'All farmers — individual/joint borrowers who are owner cultivators, tenant farmers, ' +
      'sharecroppers, oral lessees, and self-help groups or joint liability groups of farmers. ' +
      'Also covers fisheries and animal husbandry farmers.',
    requiredDocuments: [
      'Aadhaar Card', 'PAN Card (for loans above ₹1.6 lakh)', 'Land ownership/tenancy proof',
      'Passport-size photographs', 'Application form from bank',
    ],
    officialLink: 'https://www.pmkisan.gov.in/KCC.aspx',
    description:
      'Provides affordable short-term credit to farmers for crop production, post-harvest, and consumption needs. ' +
      'Interest rate: 4% p.a. (with prompt repayment subvention). Credit limit based on land holding and crop pattern.',
    category: 'Credit',
    lastVerifiedDate: '2025-06-01',
  },
  {
    title: 'Soil Health Card Scheme',
    state: 'Central',
    eligibilityRules:
      'All farmers across India. The scheme is universal — no income or landholding restrictions. ' +
      'Soil samples are collected by the government; farmers receive cards for their specific fields.',
    requiredDocuments: ['Aadhaar Card', 'Land details (survey number)'],
    officialLink: 'https://soilhealth.dac.gov.in/',
    description:
      'Provides soil health cards to farmers with crop-wise recommendations for nutrients and fertilizers. ' +
      'Helps farmers improve productivity through informed soil management. Cards issued every 2 years.',
    category: 'Advisory',
    lastVerifiedDate: '2025-06-01',
  },
  {
    title: 'PM-KUSUM (Pradhan Mantri Kisan Urja Suraksha evam Utthaan Mahabhiyan)',
    state: 'Central',
    eligibilityRules:
      'All farmers, farmer groups, cooperatives, panchayats, and water user associations. ' +
      'Component A: Farmers with barren/fallow land for solar plants. ' +
      'Component B: Farmers with existing grid-connected pumps. ' +
      'Component C: Farmers wanting standalone solar pumps.',
    requiredDocuments: [
      'Aadhaar Card', 'Land ownership proof', 'Electricity connection details (for Component B)',
      'Bank account', 'Application through state DISCOM/agency',
    ],
    officialLink: 'https://pmkusum.mnre.gov.in/',
    description:
      'Supports installation of solar pumps and solar power plants by farmers. ' +
      'Component A: 10,000 MW solar plants on barren land. ' +
      'Component B: Solarization of 20 lakh grid-connected pumps. ' +
      'Component C: 17.5 lakh standalone solar pumps with 60% subsidy.',
    category: 'Energy/Subsidy',
    lastVerifiedDate: '2025-06-01',
  },
  {
    title: 'RKVY (Rashtriya Krishi Vikas Yojana)',
    state: 'Central',
    eligibilityRules:
      'Primarily a state-level scheme. Benefits flow to farmers through state agriculture departments. ' +
      'Individual eligibility varies by state implementation and specific sub-scheme.',
    requiredDocuments: ['Aadhaar Card', 'Land records', 'State-specific application forms'],
    officialLink: 'https://rkvy.nic.in/',
    description:
      'Incentivizes states to increase public investment in agriculture and allied sectors. ' +
      'Funds infrastructure, innovation, agri-entrepreneurship, and value chain development.',
    category: 'Infrastructure',
    lastVerifiedDate: '2025-06-01',
  },
  {
    title: 'NFSM (National Food Security Mission)',
    state: 'Central',
    eligibilityRules:
      'Farmers in identified districts for target crops (rice, wheat, pulses, coarse cereals, nutri-cereals, ' +
      'commercial crops). Selection based on district-level implementation.',
    requiredDocuments: ['Aadhaar Card', 'Land records', 'Bank account'],
    officialLink: 'https://nfsm.gov.in/',
    description:
      'Aims to increase production of rice, wheat, pulses, and coarse cereals through area expansion, ' +
      'productivity enhancement, and restoring soil fertility. Provides subsidized seeds, micro-nutrients, ' +
      'and demonstrations.',
    category: 'Production',
    lastVerifiedDate: '2025-06-01',
  },
  {
    title: 'eNAM (National Agriculture Market)',
    state: 'Central',
    eligibilityRules:
      'All farmers, traders, commission agents, and FPOs can register. ' +
      'Farmers need to register on the eNAM portal or through their local APMC.',
    requiredDocuments: ['Aadhaar Card', 'Bank account', 'Mobile number', 'APMC license (for traders)'],
    officialLink: 'https://enam.gov.in/',
    description:
      'Online trading platform for agricultural commodities. Connects APMC mandis across India to create ' +
      'a unified national market. Enables transparent price discovery and online payment.',
    category: 'Market Access',
    lastVerifiedDate: '2025-06-01',
  },
  {
    title: 'Sub-Mission on Agricultural Mechanization (SMAM)',
    state: 'Central',
    eligibilityRules:
      'All farmers. Special priority for SC/ST/small/marginal farmers and women farmers. ' +
      'Subsidy ranges from 40-50% for individual farmers and up to 80% for farmer groups/FPOs.',
    requiredDocuments: [
      'Aadhaar Card', 'Land records', 'Bank account', 'Caste certificate (if applicable)',
      'Application through state agriculture department',
    ],
    officialLink: 'https://agrimachinery.nic.in/',
    description:
      'Provides subsidy on purchase of agricultural machinery and equipment including tractors, ' +
      'power tillers, harvesters, and implements. Also supports custom hiring centers and farm machinery banks.',
    category: 'Mechanization/Subsidy',
    lastVerifiedDate: '2025-06-01',
  },
  {
    title: 'Micro Irrigation Fund (PMKSY-PDMC)',
    state: 'Central',
    eligibilityRules:
      'All farmers, with priority to small and marginal farmers. ' +
      'Subsidy: 55% for small/marginal farmers, 45% for other farmers.',
    requiredDocuments: [
      'Aadhaar Card', 'Land records', 'Water source availability proof', 'Bank account',
    ],
    officialLink: 'https://pmksy.gov.in/',
    description:
      'Promotes drip and sprinkler irrigation systems to improve water use efficiency. ' +
      'Part of Pradhan Mantri Krishi Sinchai Yojana. Covers drip systems, sprinklers, rain guns, ' +
      'and micro-sprinklers.',
    category: 'Irrigation/Subsidy',
    lastVerifiedDate: '2025-06-01',
  },
  {
    title: 'Kerala State Crop Insurance Scheme',
    state: 'Kerala',
    eligibilityRules:
      'Farmers in Kerala cultivating notified crops. Both landowners and tenant farmers are eligible. ' +
      'Must register through Krishi Bhavan or online portal.',
    requiredDocuments: [
      'Aadhaar Card', 'Land ownership / lease agreement', 'Krishi Bhavan registration',
      'Bank account', 'Crop sowing details',
    ],
    officialLink: 'https://keralaagriculture.gov.in/',
    description:
      'State-level crop insurance supplementing PMFBY. Covers additional crops and perennial plantations ' +
      'specific to Kerala agriculture including coconut, rubber, pepper, and spices.',
    category: 'Crop Insurance',
    lastVerifiedDate: '2025-06-01',
  },
  {
    title: 'Kerala Karshaka Kshemanidhi (Farmers Welfare Fund)',
    state: 'Kerala',
    eligibilityRules:
      'All farmers in Kerala between 18-55 years of age. Must be engaged in agriculture or allied activities. ' +
      'Monthly contribution of ₹100 by the farmer.',
    requiredDocuments: [
      'Aadhaar Card', 'Age proof', 'Krishi Bhavan certificate', 'Bank account', 'Photographs',
    ],
    officialLink: 'https://welfarefund.kerala.gov.in/',
    description:
      'Welfare fund providing pension (₹5,000/month), medical aid, education support for children, ' +
      'marriage assistance, and death benefits to registered farmer members.',
    category: 'Welfare',
    lastVerifiedDate: '2025-06-01',
  },
  {
    title: 'Paramparagat Krishi Vikas Yojana (PKVY)',
    state: 'Central',
    eligibilityRules:
      'Farmer groups/clusters of at least 50 farmers with 50 acres of land in a contiguous area. ' +
      'Individual farmers can participate through cluster formation.',
    requiredDocuments: [
      'Aadhaar Card', 'Land records', 'Group/cluster formation documents', 'Bank account',
    ],
    officialLink: 'https://pgsindia-ncof.gov.in/',
    description:
      'Promotes organic farming through cluster approach. Provides ₹50,000 per hectare over 3 years for ' +
      'organic inputs, certification (PGS-India), and value addition. ' +
      'Includes training and marketing support.',
    category: 'Organic Farming',
    lastVerifiedDate: '2025-06-01',
  },
  {
    title: 'Agriculture Infrastructure Fund (AIF)',
    state: 'Central',
    eligibilityRules:
      'Farmers, FPOs, PACS, marketing cooperative societies, SHGs, agri-entrepreneurs, startups, ' +
      'and aggregation infrastructure providers. No income or land ceiling.',
    requiredDocuments: [
      'Aadhaar Card / PAN', 'Project report', 'Bank account', 'Organization registration (if applicable)',
    ],
    officialLink: 'https://agriinfra.dac.gov.in/',
    description:
      'Provides medium-long term debt financing for post-harvest management and community farming assets. ' +
      'Interest subvention of 3% p.a. and credit guarantee support up to ₹2 crore.',
    category: 'Infrastructure/Credit',
    lastVerifiedDate: '2025-06-01',
  },
  {
    title: 'National Horticulture Mission (NHM)',
    state: 'Central',
    eligibilityRules:
      'Farmers growing horticultural crops including fruits, vegetables, spices, flowers, and medicinal plants. ' +
      'Available in all states except the northeastern and Himalayan states (covered under HMNEH).',
    requiredDocuments: [
      'Aadhaar Card', 'Land records', 'Bank account', 'State horticulture department application',
    ],
    officialLink: 'https://nhm.nic.in/',
    description:
      'Supports holistic growth of the horticulture sector. Provides subsidies for area expansion, ' +
      'rejuvenation of old orchards, protected cultivation (polyhouse, shade net), ' +
      'and post-harvest infrastructure.',
    category: 'Horticulture/Subsidy',
    lastVerifiedDate: '2025-06-01',
  },
]
