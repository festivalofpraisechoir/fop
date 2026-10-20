export type AttendanceStatus = 'Present' | 'Late' | 'Absent';

export type Contact = {
  id: string;
  name: string;
  email: string;
  phone: string;
  type: 'Singer' | 'Musician';
  partOrInstrument: string;
  church: string;
  churchLetterSubmitted: boolean;
};

export type AttendanceRecord = {
  id: string;
  name: string;
  status: AttendanceStatus;
  time: string;
  church: string;
};

export const contacts: Contact[] = [
  {
    id: 'c1',
    name: 'Michael Ziki',
    email: 'michaeluziki@gmail.com',
    phone: '07359113722',
    type: 'Musician',
    partOrInstrument: 'Keyboard',
    church: 'Forward in Faith Ministries',
    churchLetterSubmitted: true,
  },
  {
    id: 'c2',
    name: 'Rachid',
    email: 'rachid-renaud@hotmail.com',
    phone: '07502527539',
    type: 'Musician',
    partOrInstrument: 'Percussion drums',
    church: 'RCCG Stockpoort Road',
    churchLetterSubmitted: true,
  },
  {
    id: 'c3',
    name: 'Hans',
    email: 'hans13.hoa@gmail.com',
    phone: '07741406532',
    type: 'Musician',
    partOrInstrument: 'Drums',
    church: 'Winners Chapel Birmingham',
    churchLetterSubmitted: false,
  },
  {
    id: 'c4',
    name: 'Samuel Adedero',
    email: 'samuel.adedero@gmail.com',
    phone: '07411355562',
    type: 'Musician',
    partOrInstrument: 'Bass',
    church: 'Jubilee Church Manchester',
    churchLetterSubmitted: true,
  },
  {
    id: 'c5',
    name: 'Sinmi Alli-Balogun',
    email: 'sinmicomposer1@outlook.com',
    phone: '07516154416',
    type: 'Musician',
    partOrInstrument: 'Keyboard',
    church: 'Kingdom Culture',
    churchLetterSubmitted: true,
  },
  {
    id: 'c6',
    name: 'Caleb Adenuga',
    email: 'calebboss2k16@gmail.com',
    phone: '07842229032',
    type: 'Musician',
    partOrInstrument: 'Keyboard',
    church: 'RCCG Strongtower',
    churchLetterSubmitted: false,
  },
];

export const attendanceSeed: AttendanceRecord[] = [
  { id: 'a1', name: 'Michael Ziki', status: 'Present', time: '17:03', church: 'Forward in Faith Ministries' },
  { id: 'a2', name: 'Rachid', status: 'Present', time: '17:09', church: 'RCCG Stockpoort Road' },
  { id: 'a3', name: 'Hans', status: 'Late', time: '17:40', church: 'Winners Chapel Birmingham' },
  { id: 'a4', name: 'Samuel Adedero', status: 'Absent', time: '-', church: 'Jubilee Church Manchester' },
];

export const reportRows = [
  { date: '12 Jun 2025', present: 19, late: 2, absent: 5 },
  { date: '09 Jun 2025', present: 22, late: 3, absent: 2 },
  { date: '05 Jun 2025', present: 18, late: 1, absent: 6 },
  { date: '01 Jun 2025', present: 21, late: 2, absent: 4 },
];

export const defaultRole = 'Super admin';
