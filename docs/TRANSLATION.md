# Arabic / bilingual templates

The app already supports Arabic (right-to-left layout, Arabic dates, Arabic module text, Gemini in Arabic).
It needs **translated templates**, which must be produced by a professional (legal) translator.

## Steps (per document)
1. In `_Templates`, open the current English template (e.g. "TEMPLATE – Terms of Service (EN) v1.2"). Use **File → Make a copy** and name it "TEMPLATE – Terms of Service (AR) v1.0".
2. The translator replaces the English text with Arabic. **Every `{{…}}` tag must stay exactly as it is.** Tags such as `{{ClientLegalName}}` and `{{#IF IsPartner}}` are filled or removed by the app.
3. For **bilingual**, use a 2-column table per section (English left, Arabic right) and register it with language **Bilingual**.
4. In the app: **Admin → Register a new template version**. Paste the link, choose the document and language, add a version and notes (e.g. "translated by …, reviewed by counsel"), then click **Check & activate**. The app refuses to activate the template if any tag was broken.
5. Optional: fill `description_ar` in the **Features** tab (Admin → Features) so the module list in Arabic proposals is in Arabic. Any feature without Arabic text falls back to English.

## How the app behaves
- A rep chooses Arabic or Bilingual on step 3. Documents that have an active template in that language are generated in it; the rest are generated in English, and the form says so.
- Arabic documents are set to right-to-left automatically. Amounts keep the currency code (e.g. "SAR 1,200"), and dates show Arabic month names with Western digits.
