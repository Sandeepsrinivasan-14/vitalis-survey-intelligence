/** Fictional geography: none of these places, or the people in them, exist. */
export const GEOGRAPHY: { id: string; name: string; districts: string[] }[] = [
  { id: 'NV', name: 'Northvale', districts: ['Ashgrove', 'Birchfield', 'Cedarton', 'Dunmore'] },
  { id: 'SR', name: 'Sunreach', districts: ['Emberly', 'Fairhaven', 'Goldcrest', 'Hollowbrook'] },
  { id: 'EM', name: 'Eastmere', districts: ['Ironwick', 'Juniper Bay', 'Kestrel Point', 'Larkspur'] },
];

export const SURVEY_STATES = GEOGRAPHY.map((g) => g.name);
