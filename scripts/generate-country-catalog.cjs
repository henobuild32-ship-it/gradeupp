const fs = require('node:fs')
const path = require('node:path')
const countries = require('i18n-iso-countries')
const fr = require('i18n-iso-countries/langs/fr.json')
const en = require('i18n-iso-countries/langs/en.json')
const phone = require('libphonenumber-js/max')
const examples = require('libphonenumber-js/examples.mobile.json')

countries.registerLocale(fr)
countries.registerLocale(en)

const namesFr = countries.getNames('fr')
const namesEn = countries.getNames('en')
const supportedRegions = new Set(phone.getCountries())
const toFlag = (code) => String.fromCodePoint(...[...code].map((char) => 0x1f1e6 + char.charCodeAt(0) - 65))

const records = Object.keys(namesFr)
  .filter((code) => /^[A-Z]{2}$/.test(code))
  .map((code) => {
    const hasPhoneMetadata = supportedRegions.has(code)
    let exampleNational = null
    if (hasPhoneMetadata) {
      try {
        exampleNational = phone.getExampleNumber(code, examples)?.formatNational() ?? null
      } catch {}
    }
    return {
      code,
      nameFr: namesFr[code],
      nameEn: namesEn[code] ?? namesFr[code],
      callingCode: hasPhoneMetadata ? `+${phone.getCountryCallingCode(code)}` : null,
      flag: toFlag(code),
      exampleNational,
    }
  })
  .sort((a, b) => a.nameFr.localeCompare(b.nameFr, 'fr', { sensitivity: 'base' }))

const output = path.join(process.cwd(), 'src/lib/countries.generated.json')
fs.writeFileSync(output, `${JSON.stringify(records, null, 2)}\n`, 'utf8')
console.log(`Generated ${records.length} country and territory records in ${output}`)
