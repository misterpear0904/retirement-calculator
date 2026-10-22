// One-off repair of mojibake in generated city data (rehydrates corrupted accents).
import { readFileSync, writeFileSync } from 'node:fs';

const path = 'src/data/majorCities.ts';
let text = readFileSync(path, 'utf8');

const R = '?';
const map = [
  [`${R}r${R}mqi`, 'Ürümqi'],
  ['Asunci' + R + 'n', 'Asunción'],
  ['Bel' + R + 'm', 'Belém'],
  ['Bi' + R + 'n H' + R + 'a', 'Biên Hòa'],
  ['Bogot' + R, 'Bogotá'],
  ['Bras' + R + 'lia', 'Brasília'],
  ['C' + R + 'n Tho', 'C\u1EA7n Th\u01A1'],
  ['C' + R + 'rdoba', 'Córdoba'],
  ['Ciudad Ju' + R + 'rez', 'Ciudad Juárez'],
  ['Goi' + R + 'nia', 'Goiânia'],
  ['Hu' + R, 'Hu\u1EBF'],
  ['K' + R + 'ln', 'Köln'],
  ['L' + R + 'liang', 'Lüliang'],
  ['Le' + R + 'n de los Aldama', 'León de los Aldama'],
  ['Lom' + R, 'Lomé'],
  ['Lu' + R + 'an', "Lu'an"],
  ['M' + R + 'rida', 'Mérida'],
  ['Macei' + R, 'Maceió'],
  ['Medell' + R + 'n', 'Medellín'],
  ['Montr' + R + 'al', 'Montréal'],
  ['Ra' + R + 's Bayrut', "Ra's Bayrut"],
  ['Rui' + R + 'an', "Rui'an"],
  ['S' + R + 'o Paulo', 'São Paulo'],
  ['Santiago de Quer' + R + 'taro', 'Santiago de Querétaro'],
  ['Tai' + R + 'an', "Tai'an"],
  ['Xi' + R + 'an', "Xi'an"],
  ['Yaound' + R, 'Yaoundé'],
];

for (const [from, to] of map) text = text.split(from).join(to);

writeFileSync(path, text, 'utf8');

const remaining = (text.match(/n: '[^']*\?[^']*'/g) || []).length;
console.log('remaining corrupted names:', remaining);
