/**
 * ChileAutos Catalog Crawler (via Edge Function)
 *
 * Fetches the complete Brand → Model hierarchy from ChileAutos
 * by calling the chileautos-sync edge function's get_specs operation.
 * The edge function handles authentication and token refresh automatically.
 *
 * Usage:
 *   npx tsx scripts/crawl-chileautos.ts
 *
 * Output: scripts/chileautos-catalog.json
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

interface CatalogOutput {
  crawledAt: string;
  source: string;
  brands: CrawledBrand[];
  stats: {
    totalBrands: number;
    totalModels: number;
    totalVersions: number;
  };
}

// ─── Config ──────────────────────────────────────────────────────────────────

const OUTPUT_FILE = path.join(__dirname, 'chileautos-catalog.json');
const DELAY_MS = 300; // Short delay between API calls

// ─── Brand name normalization (from chileautos-sync/index.ts) ────────────────

const BRAND_NAME_MAP: Record<string, string> = {
  'mercedes benz': 'Mercedes-Benz',
  'mercedes': 'Mercedes-Benz',
  'mercedes-benz': 'Mercedes-Benz',
  'bmw': 'BMW',
  'vw': 'Volkswagen',
  'volkswagen': 'Volkswagen',
  'chevy': 'Chevrolet',
  'chevrolet': 'Chevrolet',
  'alfa romeo': 'Alfa Romeo',
  'aston martin': 'Aston Martin',
  'land rover': 'Land Rover',
  'mini': 'MINI',
  'gmc': 'GMC',
  'mg': 'MG',
  'jac': 'JAC',
  'byd': 'BYD',
  'gac': 'GAC',
  'dfsk': 'DFSK',
  'geely': 'Geely',
  'changan': 'Changan',
  'chery': 'Chery',
  'great wall': 'Great Wall',
  'haval': 'Haval',
  'jetour': 'Jetour',
  'maxus': 'Maxus',
  'foton': 'Foton',
  'faw': 'FAW',
  'zotye': 'Zotye',
  'brilliance': 'Brilliance',
  'dongfeng': 'Dongfeng',
  'lifan': 'Lifan',
  'mahindra': 'Mahindra',
  'citroen': 'Citroën',
  'citroën': 'Citroën',
  'peugeot': 'Peugeot',
  'renault': 'Renault',
  'ds': 'DS',
  'fiat': 'Fiat',
  'jeep': 'Jeep',
  'ram': 'RAM',
  'ssangyong': 'SsangYong',
  'subaru': 'Subaru',
  'gwm': 'GWM',
  'baic': 'BAIC',
  'jmc': 'JMC',
  'zna': 'ZNA',
  'saic': 'SAIC',
  'gap': 'GAP',
  'seat': 'SEAT',
  'cupra': 'Cupra',
  'volvo': 'Volvo',
  'audi': 'Audi',
  'toyota': 'Toyota',
  'honda': 'Honda',
  'nissan': 'Nissan',
  'mazda': 'Mazda',
  'suzuki': 'Suzuki',
  'hyundai': 'Hyundai',
  'kia': 'Kia',
  'mitsubishi': 'Mitsubishi',
  'ford': 'Ford',
  'dodge': 'Dodge',
  'porsche': 'Porsche',
  'lexus': 'Lexus',
  'infiniti': 'Infiniti',
  'acura': 'Acura',
  'jaguar': 'Jaguar',
  'maserati': 'Maserati',
  'ferrari': 'Ferrari',
  'lamborghini': 'Lamborghini',
  'bentley': 'Bentley',
  'rolls royce': 'Rolls-Royce',
  'rolls-royce': 'Rolls-Royce',
  'lincoln': 'Lincoln',
  'cadillac': 'Cadillac',
  'chrysler': 'Chrysler',
  'isuzu': 'Isuzu',
  'tata': 'Tata',
  'opel': 'Opel',
  'skoda': 'Skoda',
};

function normalizeBrandName(raw: string): string {
  const key = raw.toLowerCase().trim();
  if (BRAND_NAME_MAP[key]) return BRAND_NAME_MAP[key];
  return raw.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

function slugify(name: string): string {
  return name.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Supabase Client ─────────────────────────────────────────────────────────

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  return { client: createClient(url, key), url, key };
}

// ─── Edge Function Calls ─────────────────────────────────────────────────────

async function callEdgeFunction(
  supabaseUrl: string,
  serviceRoleKey: string,
  body: Record<string, any>
): Promise<any> {
  const response = await fetch(`${supabaseUrl}/functions/v1/chileautos-sync`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Edge function error (${response.status}): ${text}`);
  }

  return response.json();
}

async function fetchMakes(
  supabaseUrl: string,
  serviceRoleKey: string,
  clientId: number
): Promise<string[]> {
  const result = await callEdgeFunction(supabaseUrl, serviceRoleKey, {
    operation: 'get_specs',
    clientId,
    specType: 'makes',
  });

  if (!result.success) {
    throw new Error(`Failed to fetch makes: ${result.error}`);
  }

  return result.data?.results || result.data || [];
}

async function fetchModelsForMake(
  supabaseUrl: string,
  serviceRoleKey: string,
  clientId: number,
  makeName: string
): Promise<string[]> {
  const result = await callEdgeFunction(supabaseUrl, serviceRoleKey, {
    operation: 'get_specs',
    clientId,
    specType: 'models',
    makeName,
  });

  if (!result.success) {
    console.warn(`  ⚠️  Failed to fetch models for "${makeName}": ${result.error}`);
    return [];
  }

  return result.data?.results || result.data || [];
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('🚗 ChileAutos Catalog Crawler (via Edge Function)');
  console.log('');

  const { client: supabase, url: supabaseUrl, key: serviceRoleKey } = getSupabase();

  // Find a valid clientId from chileautos_integration
  console.log('🔍 Finding a valid ChileAutos integration...');
  const { data: integrations, error: intError } = await supabase
    .from('chileautos_integration')
    .select('client_id, seller_identifier')
    .not('seller_identifier', 'is', null)
    .limit(1);

  if (intError || !integrations?.length) {
    throw new Error(
      'No ChileAutos integrations found.\n' +
      'At least one client needs a configured chileautos_integration with seller_identifier.'
    );
  }

  const clientId = integrations[0].client_id;
  console.log(`  ✅ Using client_id: ${clientId} (seller: ${integrations[0].seller_identifier})`);

  // Phase 1: Fetch all makes
  console.log('\n📋 Phase 1: Fetching makes...');
  const makes = await fetchMakes(supabaseUrl, serviceRoleKey, clientId);
  console.log(`  ✅ Found ${makes.length} makes`);

  // Phase 2: Fetch models for each make
  console.log(`\n📋 Phase 2: Fetching models for ${makes.length} makes...`);
  const brands: CrawledBrand[] = [];

  for (let i = 0; i < makes.length; i++) {
    const make = makes[i];
    process.stdout.write(`  [${i + 1}/${makes.length}] ${make}...`);

    await sleep(DELAY_MS);
    const models = await fetchModelsForMake(supabaseUrl, serviceRoleKey, clientId, make);

    brands.push({
      name: normalizeBrandName(make),
      slug: slugify(make),
      models: models.map(m => ({
        name: m,
        slug: slugify(m),
        versions: [],
      })),
    });

    console.log(` ${models.length} models`);
  }

  // Deduplicate brands (merge models when same normalized name)
  const brandMap = new Map<string, CrawledBrand>();
  for (const brand of brands) {
    const key = brand.name.toLowerCase().trim();
    const existing = brandMap.get(key);
    if (existing) {
      // Merge models, dedup by lowercase name
      const existingModelNames = new Set(existing.models.map(m => m.name.toLowerCase().trim()));
      for (const model of brand.models) {
        if (model.name.trim() && !existingModelNames.has(model.name.toLowerCase().trim())) {
          existing.models.push(model);
          existingModelNames.add(model.name.toLowerCase().trim());
        }
      }
    } else {
      // Filter out empty model names
      brand.models = brand.models.filter(m => m.name.trim().length > 0);
      brandMap.set(key, brand);
    }
  }
  const dedupedBrands = Array.from(brandMap.values());
  console.log(`\n🧹 After dedup: ${dedupedBrands.length} unique brands (was ${brands.length})`);

  // Save catalog
  const totalModels = dedupedBrands.reduce((sum, b) => sum + b.models.length, 0);

  const output: CatalogOutput = {
    crawledAt: new Date().toISOString(),
    source: 'chileautos.cl API (specifications)',
    brands: dedupedBrands,
    stats: {
      totalBrands: dedupedBrands.length,
      totalModels,
      totalVersions: 0,
    },
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));

  console.log(`\n✅ Catalog saved to ${OUTPUT_FILE}`);
  console.log(`   Brands: ${output.stats.totalBrands}`);
  console.log(`   Models: ${output.stats.totalModels}`);
  console.log(`   Versions: ${output.stats.totalVersions} (not available in spec API)`);
  console.log('\n📝 Next step: Review the JSON, then run:');
  console.log('   npx tsx scripts/generate-catalog-migration.ts');
}

main().catch(err => {
  console.error('❌ Failed:', err.message || err);
  process.exit(1);
});
