/**
 * Build Enriched Catalog
 *
 * Merges:
 * 1. ChileAutos classified data (models + variants from API)
 * 2. Internet-researched variant data for high-end brands
 *
 * Output: scripts/chileautos-enriched-catalog.json
 *   - Same format as chileautos-catalog.json but with versions populated
 *   - High-end brands get rich variant data from research
 *   - Other brands keep their auto-classified variants
 *
 * Usage:
 *   npx tsx scripts/build-enriched-catalog.ts
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ─── Types ───────────────────────────────────────────────────────────────────

interface ClassifiedModel {
  name: string
  variants: string[]
}

interface ClassifiedBrand {
  name: string
  models: ClassifiedModel[]
  totalEntries: number
}

interface ClassifiedData {
  classifiedAt: string
  brands: ClassifiedBrand[]
  stats: {
    totalBrands: number
    totalModels: number
    totalVariants: number
    totalEntries: number
  }
}

interface EnrichedModel {
  name: string
  slug: string
  versions: string[]
}

interface EnrichedBrand {
  name: string
  slug: string
  models: EnrichedModel[]
}

interface EnrichedCatalog {
  enrichedAt: string
  source: string
  brands: EnrichedBrand[]
  stats: {
    totalBrands: number
    totalModels: number
    totalVersions: number
  }
}

type HighEndVariants = Record<string, Record<string, string[]>>

// ─── Helpers ─────────────────────────────────────────────────────────────────

function slugify(name: string): string {
  return name.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function normalizeForMatch(s: string): string {
  return s.toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

// ─── Main ────────────────────────────────────────────────────────────────────

function main() {
  // Load classified data
  const classifiedPath = path.join(__dirname, 'chileautos-classified.json')
  if (!fs.existsSync(classifiedPath)) {
    console.error('Run classify-models.ts first')
    process.exit(1)
  }
  const classified: ClassifiedData = JSON.parse(fs.readFileSync(classifiedPath, 'utf-8'))

  // Load high-end variants
  const variantsPath = path.join(__dirname, 'high-end-variants.json')
  if (!fs.existsSync(variantsPath)) {
    console.error('Missing high-end-variants.json')
    process.exit(1)
  }
  const highEndRaw = JSON.parse(fs.readFileSync(variantsPath, 'utf-8')) as Record<string, any>

  // Filter out metadata keys
  const highEnd: HighEndVariants = {}
  for (const [key, val] of Object.entries(highEndRaw)) {
    if (key.startsWith('_')) continue
    highEnd[key] = val as Record<string, string[]>
  }

  console.log('='.repeat(60))
  console.log('  ENRICHED CATALOG BUILDER')
  console.log('='.repeat(60))
  console.log()
  console.log(`  Classified data: ${classified.brands.length} brands, ${classified.stats.totalModels} models, ${classified.stats.totalVariants} variants`)
  console.log(`  High-end data:   ${Object.keys(highEnd).length} brands with rich variants`)
  console.log()

  const enrichedBrands: EnrichedBrand[] = []
  let totalModels = 0
  let totalVersions = 0

  // Track which high-end brands were matched
  const matchedHighEnd = new Set<string>()

  // Process each classified brand
  for (const brand of classified.brands) {
    const highEndData = highEnd[brand.name]

    if (highEndData) {
      // This is a high-end brand — use researched variants
      matchedHighEnd.add(brand.name)
      const models: EnrichedModel[] = []

      // For each classified model, check if we have rich variants
      for (const model of brand.models) {
        // Try exact match first, then normalized match
        let variants = highEndData[model.name]

        if (!variants) {
          // Try case-insensitive match
          const modelNorm = normalizeForMatch(model.name)
          for (const [hModelName, hVariants] of Object.entries(highEndData)) {
            if (hModelName.startsWith('_')) continue
            if (normalizeForMatch(hModelName) === modelNorm) {
              variants = hVariants
              break
            }
          }
        }

        if (variants && variants.length > 0) {
          models.push({
            name: model.name,
            slug: slugify(model.name),
            versions: variants,
          })
          totalVersions += variants.length
        } else {
          // No rich variant data — use classified variants if any
          models.push({
            name: model.name,
            slug: slugify(model.name),
            versions: model.variants,
          })
          totalVersions += model.variants.length
        }
      }

      // Also add high-end models not in classified data
      for (const [hModelName, hVariants] of Object.entries(highEndData)) {
        if (hModelName.startsWith('_')) continue
        const hModelNorm = normalizeForMatch(hModelName)
        const alreadyExists = models.some(m => normalizeForMatch(m.name) === hModelNorm)

        if (!alreadyExists) {
          models.push({
            name: hModelName,
            slug: slugify(hModelName),
            versions: hVariants,
          })
          totalVersions += hVariants.length
        }
      }

      totalModels += models.length
      enrichedBrands.push({
        name: brand.name,
        slug: slugify(brand.name),
        models,
      })
    } else {
      // Regular brand — use classified variants as versions
      const models: EnrichedModel[] = brand.models.map(m => ({
        name: m.name,
        slug: slugify(m.name),
        versions: m.variants,
      }))

      totalModels += models.length
      totalVersions += models.reduce((s, m) => s + m.versions.length, 0)

      enrichedBrands.push({
        name: brand.name,
        slug: slugify(brand.name),
        models,
      })
    }
  }

  // Add high-end brands not in classified data at all (e.g., McLaren)
  for (const [brandName, brandModels] of Object.entries(highEnd)) {
    if (matchedHighEnd.has(brandName)) continue

    const models: EnrichedModel[] = []
    for (const [modelName, variants] of Object.entries(brandModels)) {
      if (modelName.startsWith('_')) continue
      models.push({
        name: modelName,
        slug: slugify(modelName),
        versions: variants,
      })
      totalVersions += variants.length
    }

    if (models.length > 0) {
      totalModels += models.length
      enrichedBrands.push({
        name: brandName,
        slug: slugify(brandName),
        models,
      })
      console.log(`  + Added new brand: ${brandName} (${models.length} models)`)
    }
  }

  // Sort brands alphabetically
  enrichedBrands.sort((a, b) => a.name.localeCompare(b.name))

  // Build output
  const output: EnrichedCatalog = {
    enrichedAt: new Date().toISOString(),
    source: 'ChileAutos API + Internet Research',
    brands: enrichedBrands,
    stats: {
      totalBrands: enrichedBrands.length,
      totalModels,
      totalVersions,
    },
  }

  const outputPath = path.join(__dirname, 'chileautos-enriched-catalog.json')
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2))

  // Print summary
  console.log()
  console.log(`${'─'.repeat(60)}`)
  console.log(`  RESULT`)
  console.log(`${'─'.repeat(60)}`)
  console.log(`  Brands:   ${output.stats.totalBrands}`)
  console.log(`  Models:   ${output.stats.totalModels}`)
  console.log(`  Versions: ${output.stats.totalVersions}`)
  console.log()

  // Show high-end brand details
  console.log(`  High-end brands enriched:`)
  for (const brandName of Object.keys(highEnd)) {
    const brand = enrichedBrands.find(b => b.name === brandName)
    if (!brand) continue
    const versionsCount = brand.models.reduce((s, m) => s + m.versions.length, 0)
    console.log(`    ${brand.name}: ${brand.models.length} models, ${versionsCount} versions`)
  }

  console.log()
  console.log(`✅ Enriched catalog saved to ${outputPath}`)
  console.log()
  console.log('Next step: npx tsx scripts/generate-catalog-migration.ts')
  console.log('  (update it to read from chileautos-enriched-catalog.json)')
}

main()
