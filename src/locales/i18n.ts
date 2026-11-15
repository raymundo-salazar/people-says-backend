import * as BackendModule from 'i18next-fs-backend'
import { LanguageDetector } from 'i18next-http-middleware'
import * as i18nextModule from 'i18next'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDirectory = path.dirname(fileURLToPath(import.meta.url))
const sourceLocalesDirectory = path.resolve(currentDirectory, '../../src/locales')
const i18next = i18nextModule.default
const Backend = BackendModule.default as unknown as Parameters<typeof i18next.use>[0]

await i18next
  .use(Backend)
  .use(LanguageDetector)
  .init({
    fallbackLng: 'en',
    supportedLngs: ['en', 'es'],
    nonExplicitSupportedLngs: true,
    preload: ['en', 'es'],
    backend: {
      loadPath: path.join(sourceLocalesDirectory, '{{lng}}', 'translation.json'),
    },
    detection: {
      order: ['querystring', 'header'],
      lookupQuerystring: 'lng',
      lookupHeader: 'accept-language',
    },
    interpolation: { escapeValue: false },
  })

export default i18next
