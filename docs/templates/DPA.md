# DATA PROCESSING AGREEMENT

> **DRAFT FOR LEGAL REVIEW** — prepared as a template. Not legal advice. Must be reviewed by qualified counsel in each jurisdiction before use.
>
> Placeholders follow `docs/PLACEHOLDERS.md`. Exactly one Country Addendum in Annex 4 is kept, based on the client country (flags Addendum4A–4F).

**DPA No.:** {{DocNo}}  **Date:** {{DocDate}}  **Related Order Form:** {{OrderFormNo}}

This Data Processing Agreement ("**DPA**") is entered into between:

1. **{{ClientLegalName}}**, {{ClientRegType}} No. {{ClientRegNo}}, {{ClientAddress}} (the "**Customer**"); and
2. **{{EntityName}}**, {{EntityRegType}} No. {{EntityRegNo}}, {{EntityAddress}} (the "**Provider**").

{{#IF IsPartner}}The Provider is an authorised local partner of OptCulture. The OptCulture platform is operated by **{{PlatformEntityName}}** ("**OptCulture**"), which acts as a Sub-processor of the Provider under this DPA.{{/IF IsPartner}}

This DPA forms part of the OptCulture Terms of Service, the Order Form and, where applicable, the Master Services Agreement (together, the "**Agreement**").

---

## 1. Definitions

1.1. "**Applicable Data Protection Law**" means all laws on the protection of personal data that apply to the processing under the Agreement, including the law named in the Country Addendum attached as Annex 4.

1.2. "**Personal Data**" means any information relating to an identified or identifiable natural person that the Provider processes on behalf of the Customer under the Agreement.

1.3. "**Controller**", "**Processor**", "**Data Subject**", "**Processing**" and "**Personal Data Breach**" have the meanings given in Applicable Data Protection Law. Where that law uses different terms (for example "Data Fiduciary" or "Data Holder"), they shall be read as their nearest equivalent.

1.4. "**Sub-processor**" means any third party engaged by the Provider to process Personal Data.

1.5. Capitalised terms not defined here have the meaning given in the Agreement.

## 2. Roles and Scope

2.1. The Customer is the Controller and the Provider is the Processor of Personal Data.

2.2. The subject matter, nature, purpose, duration, types of Personal Data and categories of Data Subjects are set out in **Annex 1**.

2.3. The Customer is responsible for the lawfulness of the Personal Data it provides, including having a valid legal basis and any consent required for marketing communications, loyalty enrolment and profiling.

## 3. Processing Instructions

3.1. The Provider shall process Personal Data only on the Customer's documented instructions, including those given through configuration of the Services, unless required otherwise by law. In that case, the Provider shall inform the Customer before processing unless the law prohibits it.

3.2. The Provider shall promptly inform the Customer if, in its opinion, an instruction infringes Applicable Data Protection Law.

3.3. The Provider shall not sell Personal Data, nor use it for its own marketing or to train general-purpose AI models for unrelated third parties.

3.4. The Provider may use aggregated and anonymised data, from which no individual can be identified, to operate, improve and benchmark the Services.

## 4. Confidentiality

4.1. The Provider shall ensure that persons authorised to process Personal Data are bound by appropriate confidentiality obligations and access it only as needed to perform the Services.

## 5. Security

5.1. The Provider shall implement and maintain appropriate technical and organisational measures to protect Personal Data, as described in **Annex 2**.

5.2. The Provider may update these measures, provided the overall level of protection is not reduced.

## 6. Sub-processors

6.1. The Customer gives general authorisation for the Provider to engage the Sub-processors listed in **Annex 3**.

6.2. The Provider shall give the Customer at least **thirty (30) days'** notice of any new or replacement Sub-processor. The Customer may object on reasonable data-protection grounds within that period. The parties shall discuss the objection in good faith; if it cannot be resolved, the Customer may terminate the affected Services and receive a refund of prepaid fees for the unused period.

6.3. The Provider shall impose data protection obligations on each Sub-processor that are no less protective than this DPA, and remains responsible for its Sub-processors' performance.

## 7. Data Subject Rights

7.1. Taking into account the nature of the processing, the Provider shall assist the Customer, through the functionality of the Services or otherwise, in responding to requests from Data Subjects to exercise their rights (such as access, correction, deletion, objection and withdrawal of consent).

7.2. If the Provider receives such a request directly, it shall forward it to the Customer without undue delay and shall not respond except on the Customer's instruction.

## 8. Personal Data Breach

8.1. The Provider shall notify the Customer **without undue delay, and in any event within forty-eight (48) hours**, after becoming aware of a Personal Data Breach affecting Customer Personal Data.

8.2. The notice shall describe, as far as known: the nature of the breach, categories and approximate number of Data Subjects and records affected, likely consequences, and the measures taken or proposed.

8.3. The Provider shall take reasonable steps to contain and remedy the breach and shall assist the Customer in meeting any obligation to notify a regulator or Data Subjects within the time limits of Applicable Data Protection Law (see Annex 4).

## 9. Data Location and Cross-Border Transfers

9.1. Personal Data shall be hosted in **{{HostingRegion}}**.

9.2. The Provider shall not transfer Personal Data outside that region, or to a Sub-processor in another country, except in compliance with Applicable Data Protection Law, including any transfer conditions, safeguards or regulator approvals set out in Annex 4.

## 10. Assistance, Records and Audits

10.1. The Provider shall provide reasonable assistance to the Customer with data protection impact assessments and consultations with regulators relating to the Services.

10.2. The Provider shall make available information reasonably necessary to demonstrate compliance with this DPA. The Customer may audit compliance no more than once in any twelve (12) month period, on at least thirty (30) days' written notice, during business hours, at its own cost, and subject to confidentiality. The Provider may satisfy this right by providing recent independent audit reports or certifications, where available.

## 11. Return and Deletion

11.1. On termination of the Services, the Provider shall make Customer Personal Data available for export for **thirty (30) days**. After that, the Provider shall delete it within a further **sixty (60) days**, unless retention is required by law. Backups shall be deleted in the normal backup cycle.

## 12. Liability

12.1. Each party's liability under this DPA is subject to the limitations and exclusions of liability in the Agreement.

## 13. Order of Precedence and Term

13.1. If there is a conflict between this DPA and the rest of the Agreement regarding the processing of Personal Data, this DPA prevails. If there is a conflict between this DPA and the Country Addendum, the Country Addendum prevails.

13.2. This DPA remains in force for as long as the Provider processes Customer Personal Data.

---

**Signed for and on behalf of:**

| | Customer | Provider |
|---|---|---|
| Legal Entity | {{ClientLegalName}} | {{EntityName}} |
| Authorised Signatory | {{ClientSignatoryName}} | {{EntitySignatoryName}} |
| Designation | {{ClientSignatoryTitle}} | {{EntitySignatoryTitle}} |
| Signature | | |
| Date | | |

---

## Annex 1 — Details of Processing

| Item | Details |
|---|---|
| Subject matter | Provision of the OptCulture customer engagement, loyalty and data platform under the Agreement |
| Nature of processing | Collection, storage, organisation, segmentation, analysis, transmission of communications, retrieval and deletion |
| Purpose | Loyalty programme management, digital receipts, customer profiles and analytics, campaigns and marketing automation, offers and coupons, feedback and NPS, and support |
| Categories of Data Subjects | Customer's shoppers, loyalty members and prospects; Customer's employees and authorised users {{ExtraDataSubjects}} |
| Types of Personal Data | Name, mobile number, email, gender, date of birth, location/store, purchase and transaction history, loyalty points and tier, communication preferences and consents, feedback responses, device and engagement data {{ExtraDataTypes}} |
| Special / sensitive data | None, unless stated here: {{SensitiveData}} |
| Duration | Term of the Agreement plus the return and deletion period in Section 11 |
| Hosting region | {{HostingRegion}} |

## Annex 2 — Technical and Organisational Measures

> **To be confirmed by OptCulture's technical team before use.**

1. Encryption of Personal Data in transit (TLS) and at rest.
2. Role-based access control, least-privilege access, and unique user accounts for platform administrators.
3. Multi-factor authentication for Provider staff accessing production systems.
4. Logging and monitoring of access to production systems.
5. Regular backups, with tested restore procedures.
6. Vulnerability management and periodic security testing.
7. Staff confidentiality undertakings and data protection training.
8. Documented incident response procedure.
9. Segregation of each customer's data within the platform.
10. Secure deletion on termination, as set out in Section 11.

## Annex 3 — Authorised Sub-processors

> **To be completed by OptCulture.** Maintained in the Master Sheet and filled in automatically.

| Sub-processor | Service | Location |
|---|---|---|
| {{EACH:SubProcessors}}{{name}} | {{service}} | {{location}} |

---

## Annex 4 — Country Addenda

> Only the addendum for the Customer's country is included. The legal references below must be verified by local counsel, as laws and implementing regulations change.

{{#IF Addendum4A}}

### 4A. Kingdom of Saudi Arabia — Personal Data Protection Law

1. **Applicable law:** the Personal Data Protection Law issued by Royal Decree No. (M/19) dated 9/2/1443H, as amended, and its Implementing Regulations and Regulations on Personal Data Transfer outside the Kingdom ("**KSA PDPL**"). The competent authority is the Saudi Data & AI Authority ("**SDAIA**").
2. **Terminology:** "Controller" includes "Controlling Entity" and "Processor" includes "Processing Entity" as used in the KSA PDPL.
3. **Breach notification:** the Provider shall notify the Customer under Section 8 in time for the Customer to notify SDAIA within the period required by the KSA PDPL (currently 72 hours from becoming aware), and Data Subjects where required.
4. **Transfers outside the Kingdom:** Personal Data shall only be transferred outside the Kingdom in accordance with the KSA PDPL transfer regulations, including adequacy decisions, approved safeguards (such as standard contractual clauses issued by SDAIA) or permitted exceptions. Hosting region: {{HostingRegion}}.
5. **Records:** the Provider shall assist the Customer in maintaining the record of processing activities required by the KSA PDPL.

{{/IF Addendum4A}}

{{#IF Addendum4B}}

### 4B. United Arab Emirates — Federal Personal Data Protection Law

1. **Applicable law:** Federal Decree-Law No. 45 of 2021 on the Protection of Personal Data and its executive regulations ("**UAE PDPL**"). Where the Customer is established in the DIFC or ADGM, the respective free-zone data protection law applies instead and this addendum shall be read accordingly.
2. **Processor obligations:** the Provider shall process Personal Data only in accordance with the Customer's instructions and the UAE PDPL, and shall assist the Customer in meeting Data Subject rights and security obligations.
3. **Breach notification:** the Provider shall notify the Customer under Section 8 so that the Customer can notify the UAE Data Office and affected Data Subjects as required.
4. **Cross-border transfers:** transfers outside the UAE shall be made only to jurisdictions or under conditions permitted by the UAE PDPL.

{{/IF Addendum4B}}

{{#IF Addendum4C}}

### 4C. India — Digital Personal Data Protection Act

1. **Applicable law:** the Digital Personal Data Protection Act, 2023 and the rules made under it ("**DPDP Act**"). The Customer is the "Data Fiduciary" and the Provider is the "Data Processor".
2. **Consent and notice:** the Customer is responsible for issuing notices and obtaining consent from Data Principals as required by the DPDP Act, including through Consent Managers where applicable.
3. **Breach notification:** the Provider shall notify the Customer under Section 8 so that the Customer can inform the Data Protection Board of India and affected Data Principals in the form and time prescribed.
4. **Erasure:** the Provider shall erase Personal Data on the Customer's instruction, or when the purpose is no longer served, as required by the DPDP Act.
5. **Transfers:** Personal Data shall not be transferred to any country restricted by the Central Government under the DPDP Act.

{{/IF Addendum4C}}

{{#IF Addendum4D}}

### 4D. Egypt — Personal Data Protection Law

1. **Applicable law:** Law No. 151 of 2020 on the Protection of Personal Data and its executive regulations ("**Egypt PDPL**"). The competent authority is the Personal Data Protection Center.
2. **Licensing:** each party shall obtain any licence, permit or registration required of it by the Egypt PDPL.
3. **Breach notification:** the Provider shall notify the Customer under Section 8 so that the Customer can notify the Personal Data Protection Center within the period required.
4. **Cross-border transfers:** transfers outside Egypt shall be made only in compliance with the Egypt PDPL, including any licence or adequacy requirements.

{{/IF Addendum4D}}

{{#IF Addendum4E}}

### 4E. European Union / United Kingdom — GDPR

1. **Applicable law:** Regulation (EU) 2016/679 ("**GDPR**") and, where relevant, the UK GDPR and Data Protection Act 2018. This DPA is intended to meet the requirements of Article 28 GDPR.
2. **Breach notification:** the Provider shall notify the Customer under Section 8 so that the Customer can notify the supervisory authority within 72 hours where required.
3. **International transfers:** transfers outside the EEA/UK shall be made under an adequacy decision or the European Commission's Standard Contractual Clauses (and the UK International Data Transfer Addendum, where relevant), which are incorporated by reference when required.

{{/IF Addendum4E}}

{{#IF Addendum4F}}

### 4F. Other Jurisdictions

1. The Provider shall comply with the data protection law applicable in {{ClientCountry}} to the extent it applies to the Provider as a processor.
2. Any additional mandatory requirements of that law shall be agreed in writing and attached to this DPA.

{{/IF Addendum4F}}
