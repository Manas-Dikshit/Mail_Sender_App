import { generateReports } from './services/reportGenerator';

const rows = [
  { rowId: 1, email: 'asha@example.com', name: 'Asha', raw: {} },
  { rowId: 2, email: 'bad@nodomain.invalid', name: 'Rohan', raw: {} },
  { rowId: 3, email: 'kavya@example.com', name: 'Kavya', raw: {} },
];
const validationResults = [
  { rowId: 1, email: 'asha@example.com', name: 'Asha', status: 'VALID', reason: '' },
  { rowId: 2, email: 'bad@nodomain.invalid', name: 'Rohan', status: 'INVALID_DOMAIN', reason: 'no MX' },
  { rowId: 3, email: 'kavya@example.com', name: 'Kavya', status: 'VALID', reason: '' },
];
const sendResults = [
  { rowId: 1, email: 'asha@example.com', name: 'Asha', validationStatus: 'VALID', sendStatus: 'SENT', attempts: 1, error: null, timestamp: new Date('2026-08-11T13:05:09Z').toISOString() },
  { rowId: 2, email: 'bad@nodomain.invalid', name: 'Rohan', validationStatus: 'INVALID_DOMAIN', sendStatus: 'SKIPPED', attempts: 0, error: 'Not attempted', timestamp: new Date().toISOString() },
  { rowId: 3, email: 'kavya@example.com', name: 'Kavya', validationStatus: 'VALID', sendStatus: 'FAILED', attempts: 2, error: 'SMTP 550 rejected', timestamp: new Date('2026-08-11T13:07:01Z').toISOString() },
];

const paths = generateReports({ campaignId: 'test_camp', rows, validationResults, sendResults });
console.log('files:', paths);

const XLSX = require('xlsx');
const wb = XLSX.readFile('reports/test_camp.xlsx');
const sheet = wb.Sheets.Main;
console.log('Main sheet (A1:E5):');
console.log(JSON.stringify(XLSX.utils.sheet_to_json(sheet, { header: 1 }), null, 2));
console.log('local time now sample:', new Date().toLocaleString(), '| tz offset', new Date().getTimezoneOffset());
