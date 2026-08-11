import { loadTemplateHtml, buildPlaceholderMapping, normalizeField } from './services/templateService';

const t = loadTemplateHtml()!;
const phs = t.placeholders;
console.log('template placeholders:', phs);

const cases: Record<string, string[]> = {
  'Exact Product Category': ['Brand_Name', 'Product Category', 'Name', 'Email'],
  'Shorthand Category (sample file)': ['Brand Name', 'Contact Name', 'Email Address', 'Category', 'Website', 'City', 'Notes'],
  'productcategory oneword': ['Brand Name', 'Contact Name', 'Email Address', 'productcategory', 'Website'],
  'reordered / slash': ['Brand Name', 'Contact Name', 'Email Address', 'Category / Product', 'Website'],
  'superset header': ['Brand Name', 'Contact Name', 'Email Address', 'Customer Product Category Info', 'Website'],
  'camelCase': ['Brand_Name', 'Contact_Name', 'Email_Address', 'productCategory', 'Website'],
  'Raw_Email file (no category)': ['Scraped_Email', 'Brand_Name', 'Website'],
  'NAME must stay strict': ['Brand Name', 'Product Category', 'Email'],
};

for (const [label, headers] of Object.entries(cases)) {
  const m = buildPlaceholderMapping(phs, headers);
  const detail = phs.map((p) => `${p}->${m.byPlaceholder[normalizeField(p)] ?? '(none)'}`).join(' | ');
  console.log(`[${label}]`);
  console.log(`  ${detail}`);
  console.log(`  missing: ${JSON.stringify(m.missing)}  mapped ${m.mappedCount}/${m.totalCount}`);
}
