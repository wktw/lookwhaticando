/**
 * The hemisphere the Season Review follows (DESIGN §14.3 "Where's your summer?"): her setting, else
 * inferred from the device time zone. Southern zones are listed; everything else, the tropics
 * included, reads as north.
 */
import type { AppState, Hemisphere } from '@/state/types';

const SOUTHERN_PREFIXES = ['Australia/', 'Antarctica/', 'America/Argentina/'];
const SOUTHERN_ZONES = new Set([
  'Pacific/Auckland',
  'Pacific/Chatham',
  'Pacific/Fiji',
  'Pacific/Tongatapu',
  'Pacific/Noumea',
  'Pacific/Efate',
  'Pacific/Apia',
  'Pacific/Rarotonga',
  'Pacific/Tahiti',
  'Pacific/Norfolk',
  'Pacific/Easter',
  'America/Sao_Paulo',
  'America/Santiago',
  'America/Montevideo',
  'America/Asuncion',
  'America/Buenos_Aires',
  'America/La_Paz',
  'America/Lima',
  'America/Punta_Arenas',
  'America/Campo_Grande',
  'America/Cuiaba',
  'America/Porto_Velho',
  'America/Rio_Branco',
  'America/Recife',
  'America/Bahia',
  'America/Maceio',
  'America/Fortaleza',
  'America/Belem',
  'America/Araguaina',
  'America/Manaus',
  'Atlantic/Stanley',
  'Atlantic/South_Georgia',
  'Atlantic/St_Helena',
  'Africa/Johannesburg',
  'Africa/Maputo',
  'Africa/Windhoek',
  'Africa/Harare',
  'Africa/Lusaka',
  'Africa/Gaborone',
  'Africa/Maseru',
  'Africa/Mbabane',
  'Africa/Blantyre',
  'Africa/Lubumbashi',
  'Africa/Luanda',
  'Africa/Dar_es_Salaam',
  'Africa/Kinshasa',
  'Africa/Brazzaville',
  'Indian/Antananarivo',
  'Indian/Mauritius',
  'Indian/Reunion',
  'Indian/Mayotte',
  'Indian/Comoro',
  'Indian/Kerguelen',
  'Asia/Jakarta',
  'Asia/Makassar',
  'Asia/Jayapura',
  'Asia/Dili',
  'Pacific/Port_Moresby',
  'Pacific/Guadalcanal',
  'Pacific/Pago_Pago',
  'Pacific/Wallis',
  'Pacific/Funafuti',
  'Pacific/Fakaofo',
]);

/** The hemisphere a time zone suggests ("Where's your summer?" preselected); north when unknown. */
export function inferHemisphere(timeZone: string | undefined): Hemisphere {
  if (!timeZone) return 'north';
  if (SOUTHERN_ZONES.has(timeZone) || SOUTHERN_PREFIXES.some((p) => timeZone.startsWith(p))) return 'south';
  return 'north';
}

/** The hemisphere the seasons follow: her setting, else the time zone's. */
export function hemisphereOf(s: Pick<AppState, 'settings'>, timeZone?: string): Hemisphere {
  return s.settings.hemisphere ?? inferHemisphere(timeZone);
}

