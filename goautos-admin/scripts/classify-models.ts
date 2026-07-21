/**
 * Classify ChileAutos entries into Models vs Variants
 *
 * Logic:
 * 1. Sort entries by name length (shortest first)
 * 2. For each entry, check if it starts with an already-identified model name
 *    → Yes: it's a variant of that model
 *    → No: it's a new base model
 *
 * Output: scripts/chileautos-classified.json
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

interface ClassifiedModel {
  name: string
  variants: string[]
}

interface ClassifiedBrand {
  name: string
  models: ClassifiedModel[]
  totalEntries: number
}

interface ClassifiedOutput {
  classifiedAt: string
  brands: ClassifiedBrand[]
  stats: {
    totalBrands: number
    totalModels: number
    totalVariants: number
    totalEntries: number
  }
}

function normalizeForCompare(s: string): string {
  return s.toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

/**
 * Classify a list of entry names into models and variants.
 *
 * A variant is an entry whose name starts with a shorter entry's name
 * followed by a space or separator. E.g.:
 *   "911" → model
 *   "911 Carrera S" → variant of "911"
 *   "911 Turbo" → variant of "911"
 *   "Cayenne" → model
 *   "Cayenne GTS" → variant of "Cayenne"
 */
function classifyEntries(entries: string[]): ClassifiedModel[] {
  // Sort by length, then alphabetically for stability
  const sorted = [...entries].sort((a, b) => {
    const lenDiff = a.length - b.length
    if (lenDiff !== 0) return lenDiff
    return a.localeCompare(b)
  })

  const models: ClassifiedModel[] = []
  const assignedToModel = new Set<string>()

  for (const entry of sorted) {
    const entryNorm = normalizeForCompare(entry)

    // Skip if already assigned as a variant
    if (assignedToModel.has(entryNorm)) continue

    // Check if this entry is a variant of an existing model
    let parentModel: ClassifiedModel | null = null

    for (const model of models) {
      const modelNorm = normalizeForCompare(model.name)

      // Entry starts with model name + space/separator
      if (entryNorm.startsWith(modelNorm + ' ') ||
          entryNorm.startsWith(modelNorm + '-') ||
          entryNorm.startsWith(modelNorm + '_')) {
        parentModel = model
        break
      }
    }

    if (parentModel) {
      parentModel.variants.push(entry)
      assignedToModel.add(entryNorm)
    } else {
      // New base model
      models.push({ name: entry, variants: [] })
    }
  }

  // Sort models alphabetically
  models.sort((a, b) => a.name.localeCompare(b.name))

  return models
}

function main() {
  const catalogPath = path.join(__dirname, 'chileautos-catalog.json')
  if (fs.existsSync(catalogPath) === false) {
    console.error('Run crawl-chileautos.ts first')
    process.exit(1)
  }

  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'))
  const classifiedBrands: ClassifiedBrand[] = []

  let totalModels = 0
  let totalVariants = 0
  let totalEntries = 0

  for (const brand of catalog.brands) {
    const entryNames: string[] = brand.models.map((m: any) => m.name)
    totalEntries += entryNames.length

    const classified = classifyEntries(entryNames)
    const brandModels = classified.length
    const brandVariants = classified.reduce((s, m) => s + m.variants.length, 0)

    totalModels += brandModels
    totalVariants += brandVariants

    classifiedBrands.push({
      name: brand.name,
      models: classified,
      totalEntries: entryNames.length,
    })
  }

  // Save full classification
  const output: ClassifiedOutput = {
    classifiedAt: new Date().toISOString(),
    brands: classifiedBrands,
    stats: { totalBrands: classifiedBrands.length, totalModels, totalVariants, totalEntries },
  }

  const outputPath = path.join(__dirname, 'chileautos-classified.json')
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2))

  // Print summary for key brands
  console.log('='.repeat(60))
  console.log('  MODEL vs VARIANT CLASSIFICATION')
  console.log('='.repeat(60))
  console.log()
  console.log(`  Total entries:  ${totalEntries}`)
  console.log(`  → Models:       ${totalModels}`)
  console.log(`  → Variants:     ${totalVariants}`)
  console.log()

  // Print detailed view for notable brands
  const showBrands = [
    'BMW', 'Toyota', 'Porsche', 'Mercedes-Benz', 'Audi',
    'Chevrolet', 'Ford', 'Hyundai', 'Kia', 'Volkswagen',
  ]

  for (const brandName of showBrands) {
    const brand = classifiedBrands.find(b => b.name === brandName)
    if (brand === undefined) continue

    const modelsWithVariants = brand.models.filter(m => m.variants.length > 0)
    const modelsWithout = brand.models.filter(m => m.variants.length === 0)

    console.log(`${'─'.repeat(60)}`)
    console.log(`  ${brand.name} (${brand.totalEntries} entries → ${brand.models.length} models + ${brand.totalEntries - brand.models.length} variants)`)
    console.log(`${'─'.repeat(60)}`)

    for (const model of modelsWithVariants) {
      console.log(`  📦 ${model.name}`)
      for (const v of model.variants) {
        console.log(`     └─ ${v}`)
      }
    }

    if (modelsWithout.length > 0) {
      console.log(`  Standalone models: ${modelsWithout.map(m => m.name).join(', ')}`)
    }
    console.log()
  }

  console.log(`\n✅ Full classification saved to ${outputPath}`)
}

main()
