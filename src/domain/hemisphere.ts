/**
 * The hemisphere the Season Review follows (DESIGN §14.3 "Where's your summer?"): her setting, else
 * inferred from the device time zone.
 *
 * A zone is south when its tzdata `zone.tab` / `zone1970.tab` latitude is below 0 (tzdata 2025b,
 * the tropics included: the equator is the only line a time zone can be judged by). The list also
 * holds every backward-compatible alias of such a zone that isn't itself a northern zone, and the
 * ids ICU/CLDR actually report (`Intl.DateTimeFormat().resolvedOptions().timeZone` gives the short
 * `America/Cordoba`, not `America/Argentina/Cordoba`). Unknown zones read as north. Regenerate the
 * list from tzdata when a southern zone is added.
 */
import type { AppState, Hemisphere } from '@/state/types';

/** Whole areas that lie south of the equator. */
const SOUTHERN_PREFIXES = ['Australia/', 'Antarctica/', 'America/Argentina/', 'Brazil/', 'Chile/'];
const SOUTHERN_ZONES: ReadonlySet<string> = new Set([
  // Africa
  'Africa/Blantyre', 'Africa/Brazzaville', 'Africa/Bujumbura', 'Africa/Dar_es_Salaam', 'Africa/Gaborone',
  'Africa/Harare', 'Africa/Johannesburg', 'Africa/Kigali', 'Africa/Kinshasa', 'Africa/Luanda', 'Africa/Lubumbashi',
  'Africa/Lusaka', 'Africa/Maputo', 'Africa/Maseru', 'Africa/Mbabane', 'Africa/Nairobi', 'Africa/Windhoek',
  // America
  'America/Araguaina', 'America/Asuncion', 'America/Bahia', 'America/Belem', 'America/Buenos_Aires',
  'America/Campo_Grande', 'America/Catamarca', 'America/Cordoba', 'America/Coyhaique', 'America/Cuiaba',
  'America/Eirunepe', 'America/Fortaleza', 'America/Guayaquil', 'America/Jujuy', 'America/La_Paz', 'America/Lima',
  'America/Maceio', 'America/Manaus', 'America/Mendoza', 'America/Montevideo', 'America/Noronha',
  'America/Porto_Acre', 'America/Porto_Velho', 'America/Punta_Arenas', 'America/Recife', 'America/Rio_Branco',
  'America/Rosario', 'America/Santarem', 'America/Santiago', 'America/Sao_Paulo',
  // Asia
  'Asia/Dili', 'Asia/Jakarta', 'Asia/Jayapura', 'Asia/Makassar', 'Asia/Pontianak', 'Asia/Ujung_Pandang',
  // Atlantic
  'Atlantic/South_Georgia', 'Atlantic/St_Helena', 'Atlantic/Stanley',
  // Indian
  'Indian/Antananarivo', 'Indian/Chagos', 'Indian/Christmas', 'Indian/Cocos', 'Indian/Comoro', 'Indian/Kerguelen',
  'Indian/Mahe', 'Indian/Mauritius', 'Indian/Mayotte', 'Indian/Reunion',
  // Pacific
  'Pacific/Apia', 'Pacific/Auckland', 'Pacific/Bougainville', 'Pacific/Chatham', 'Pacific/Easter', 'Pacific/Efate',
  'Pacific/Enderbury', 'Pacific/Fakaofo', 'Pacific/Fiji', 'Pacific/Funafuti', 'Pacific/Galapagos', 'Pacific/Gambier',
  'Pacific/Guadalcanal', 'Pacific/Kanton', 'Pacific/Marquesas', 'Pacific/Nauru', 'Pacific/Niue', 'Pacific/Norfolk',
  'Pacific/Noumea', 'Pacific/Pago_Pago', 'Pacific/Pitcairn', 'Pacific/Port_Moresby', 'Pacific/Rarotonga',
  'Pacific/Samoa', 'Pacific/Tahiti', 'Pacific/Tongatapu', 'Pacific/Wallis',
  // US
  'US/Samoa',
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
