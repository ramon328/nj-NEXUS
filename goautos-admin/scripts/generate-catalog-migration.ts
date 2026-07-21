/**
 * Generate SQL Migration from ChileAutos Catalog
 *
 * Reads the crawled catalog JSON, fetches existing data from Supabase,
 * computes the diff, and generates an idempotent SQL migration file.
 *
 * Usage:
 *   npx tsx scripts/generate-catalog-migration.ts
 *   npx tsx scripts/generate-catalog-migration.ts --dry-run   # Print stats only, no file
 *
 * Prerequisites:
 *   1. Run `npx tsx scripts/crawl-chileautos.ts` first
 *   2. Review scripts/chileautos-catalog.json
 *   3. Ensure .env has SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

// ─── Types ───────────────────────────────────────────────────────────────────

interface CrawledModel {
  name: string;
  slug: string;
  versions: string[];
}

interface CrawledBrand {
  name: string;
  slug: string;
  models: CrawledModel[];
}

interface CatalogData {
  crawledAt?: string;
  enrichedAt?: string;
  source: string;
  brands: CrawledBrand[];
  stats: { totalBrands: number; totalModels: number; totalVersions: number };
}

interface DbBrand {
  id: string;
  name: string;
}

interface DbModel {
  id: string;
  name: string;
  brand_id: string;
}

interface DbVersion {
  id: string;
  name: string;
  model_id: string;
}

// ─── Config ──────────────────────────────────────────────────────────────────

// Prefer enriched catalog (with versions), fallback to raw catalog
const ENRICHED_FILE = path.join(__dirname, 'chileautos-enriched-catalog.json');
const RAW_FILE = path.join(__dirname, 'chileautos-catalog.json');
const CATALOG_FILE = fs.existsSync(ENRICHED_FILE) ? ENRICHED_FILE : RAW_FILE;
const MIGRATIONS_DIR = path.resolve(__dirname, '..', 'supabase', 'migrations');

// ─── Supabase Client ─────────────────────────────────────────────────────────

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  }

  return createClient(url, key);
}

// ─── Fetch Existing Data ─────────────────────────────────────────────────────

async function fetchExistingData(supabase: ReturnType<typeof createClient>) {
  const [brandsRes, modelsRes, versionsRes] = await Promise.all([
    supabase.from('brands').select('id, name'),
    supabase.from('models').select('id, name, brand_id'),
    supabase.from('versions').select('id, name, model_id'),
  ]);

  if (brandsRes.error) throw new Error(`Brands fetch error: ${brandsRes.error.message}`);
  if (modelsRes.error) throw new Error(`Models fetch error: ${modelsRes.error.message}`);
  if (versionsRes.error) {
    // versions table might not exist yet, that's ok
    console.warn(`⚠️  Versions table not found or error: ${versionsRes.error.message}`);
  }

  return {
    brands: (brandsRes.data || []) as DbBrand[],
    models: (modelsRes.data || []) as DbModel[],
    versions: (versionsRes.data || []) as DbVersion[],
  };
}

// ─── SQL Escaping ────────────────────────────────────────────────────────────

function escSql(str: string): string {
  return str.replace(/'/g, "''");
}

// ─── Diff & Generate SQL ─────────────────────────────────────────────────────

function generateMigration(catalog: CatalogData, existing: {
  brands: DbBrand[];
  models: DbModel[];
  versions: DbVersion[];
}): { sql: string; stats: { newBrands: number; newModels: number; newVersions: number } } {
  const existingBrandsByName = new Map<string, DbBrand>();
  for (const b of existing.brands) {
    existingBrandsByName.set(b.name.toLowerCase(), b);
  }

  const existingModelsByKey = new Map<string, DbModel>();
  for (const m of existing.models) {
    existingModelsByKey.set(`${m.brand_id}:${m.name.toLowerCase()}`, m);
  }

  const existingVersionsByKey = new Set<string>();
  for (const v of existing.versions) {
    existingVersionsByKey.add(`${v.model_id}:${v.name.toLowerCase()}`);
  }

  let newBrands = 0;
  let newModels = 0;
  let newVersions = 0;

  const sqlBlocks: string[] = [];
  sqlBlocks.push('-- ChileAutos Catalog Sync Migration');
  sqlBlocks.push(`-- Generated: ${new Date().toISOString()}`);
  sqlBlocks.push(`-- Source: ${catalog.source}, date ${catalog.enrichedAt || catalog.crawledAt}`);
  sqlBlocks.push('');

  for (const brand of catalog.brands) {
    const brandLower = brand.name.toLowerCase();
    const existingBrand = existingBrandsByName.get(brandLower);
    const brandModelsToInsert: { name: string; versions: string[] }[] = [];
    const brandModelsExistingWithNewVersions: { name: string; brandId: string; versions: string[] }[] = [];

    if (!existingBrand) {
      // Brand doesn't exist — all its models and versions are new
      newBrands++;
      brandModelsToInsert.push(...brand.models.map(m => ({ name: m.name, versions: m.versions })));
      newModels += brand.models.length;
      newVersions += brand.models.reduce((s, m) => s + m.versions.length, 0);
    } else {
      // Brand exists — check which models are new
      for (const model of brand.models) {
        const modelKey = `${existingBrand.id}:${model.name.toLowerCase()}`;
        const existingModel = existingModelsByKey.get(modelKey);

        if (!existingModel) {
          brandModelsToInsert.push({ name: model.name, versions: model.versions });
          newModels++;
          newVersions += model.versions.length;
        } else if (model.versions.length > 0) {
          // Model exists — check versions
          const newVersionsForModel = model.versions.filter(v => {
            const vKey = `${existingModel.id}:${v.toLowerCase()}`;
            return !existingVersionsByKey.has(vKey);
          });
          if (newVersionsForModel.length > 0) {
            brandModelsExistingWithNewVersions.push({
              name: model.name,
              brandId: existingBrand.id,
              versions: newVersionsForModel,
            });
            newVersions += newVersionsForModel.length;
          }
        }
      }
    }

    // Skip brands with nothing new
    if (brandModelsToInsert.length === 0 && brandModelsExistingWithNewVersions.length === 0 && existingBrand) {
      continue;
    }

    // Generate SQL block for this brand
    const block: string[] = [];
    block.push(`-- === ${brand.name} ===`);
    block.push('DO $$');
    block.push('DECLARE');
    block.push('  v_brand_id TEXT;');
    if (brandModelsToInsert.some(m => m.versions.length > 0) || brandModelsExistingWithNewVersions.length > 0) {
      block.push('  v_model_id TEXT;');
    }
    block.push('BEGIN');

    if (!existingBrand) {
      // Insert the brand
      block.push(`  -- Insert brand`);
      block.push(`  INSERT INTO brands (id, name)`);
      block.push(`  SELECT gen_random_uuid(), '${escSql(brand.name)}'`);
      block.push(`  WHERE NOT EXISTS (SELECT 1 FROM brands WHERE LOWER(name) = '${escSql(brandLower)}');`);
      block.push('');
    }

    block.push(`  SELECT id::text INTO v_brand_id FROM brands WHERE LOWER(name) = '${escSql(brandLower)}';`);
    block.push('');

    // Insert new models (for this brand)
    for (const model of brandModelsToInsert) {
      const modelLower = model.name.toLowerCase();
      block.push(`  INSERT INTO models (name, brand_id) SELECT '${escSql(model.name)}', v_brand_id`);
      block.push(`    WHERE NOT EXISTS (SELECT 1 FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '${escSql(modelLower)}');`);

      // Insert versions for new models
      if (model.versions.length > 0) {
        block.push(`  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '${escSql(modelLower)}';`);
        for (const version of model.versions) {
          const versionLower = version.toLowerCase();
          block.push(`  INSERT INTO versions (name, model_id) SELECT '${escSql(version)}', v_model_id`);
          block.push(`    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id AND LOWER(name) = '${escSql(versionLower)}');`);
        }
      }
      block.push('');
    }

    // Insert versions for existing models that have new versions
    for (const entry of brandModelsExistingWithNewVersions) {
      const modelLower = entry.name.toLowerCase();
      block.push(`  SELECT id::text INTO v_model_id FROM models WHERE brand_id = v_brand_id AND LOWER(name) = '${escSql(modelLower)}';`);
      for (const version of entry.versions) {
        const versionLower = version.toLowerCase();
        block.push(`  INSERT INTO versions (name, model_id) SELECT '${escSql(version)}', v_model_id`);
        block.push(`    WHERE v_model_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM versions WHERE model_id = v_model_id AND LOWER(name) = '${escSql(versionLower)}');`);
      }
      block.push('');
    }

    block.push('END $$;');
    block.push('');

    sqlBlocks.push(block.join('\n'));
  }

  return {
    sql: sqlBlocks.join('\n'),
    stats: { newBrands, newModels, newVersions },
  };
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  console.log('📊 ChileAutos Catalog Migration Generator');

  // Load catalog
  if (!fs.existsSync(CATALOG_FILE)) {
    console.error(`❌ Catalog file not found: ${CATALOG_FILE}`);
    console.error('   Run "npx tsx scripts/crawl-chileautos.ts" first.');
    process.exit(1);
  }

  const catalog: CatalogData = JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf-8'));
  const catalogDate = catalog.enrichedAt || catalog.crawledAt || 'unknown';
  console.log(`   Catalog from: ${catalogDate}`);
  console.log(`   Source data: ${catalog.stats.totalBrands} brands, ${catalog.stats.totalModels} models, ${catalog.stats.totalVersions} versions`);

  // Fetch existing data from Supabase
  console.log('\n🔍 Fetching existing data from Supabase...');
  const supabase = getSupabaseClient();
  const existing = await fetchExistingData(supabase);
  console.log(`   Existing: ${existing.brands.length} brands, ${existing.models.length} models, ${existing.versions.length} versions`);

  // Generate migration
  console.log('\n📝 Computing diff...');
  const { sql, stats } = generateMigration(catalog, existing);

  console.log(`\n📊 Migration Summary:`);
  console.log(`   New brands:   ${stats.newBrands}`);
  console.log(`   New models:   ${stats.newModels}`);
  console.log(`   New versions: ${stats.newVersions}`);

  if (stats.newBrands === 0 && stats.newModels === 0 && stats.newVersions === 0) {
    console.log('\n✅ Database is already up to date! No migration needed.');
    return;
  }

  if (dryRun) {
    console.log('\n🔍 Dry run — not writing migration file.');
    console.log('\n--- SQL Preview (first 3000 chars) ---');
    console.log(sql.substring(0, 3000));
    if (sql.length > 3000) console.log('...(truncated)');
    return;
  }

  // Write migration file
  const timestamp = new Date().toISOString().replace(/[-:T]/g, '').substring(0, 14);
  const filename = `${timestamp}_sync_chileautos_catalog.sql`;
  const filepath = path.join(MIGRATIONS_DIR, filename);

  fs.writeFileSync(filepath, sql);
  console.log(`\n✅ Migration written to: ${filepath}`);
  console.log('   Review the file before applying!');
}

main().catch(err => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
