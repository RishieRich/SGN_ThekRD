import type {Company, Invoice, Issue, Reminder, Shift, Worker, WorkerRole} from '@/types';

export const companies: Company[] = [
  {
    id: 'shree-polymers',
    name: 'Shree Polymers',
    shortName: 'SP',
    location: 'Vapi GIDC',
    colorIndex: 1,
    dayHeadcount: 28,
    nightHeadcount: 17,
    rateType: 'role',
    roleRatesPaise: {fitter: 72_000, welder: 76_000, helper: 62_000, supervisor: 80_000},
    worksSunday: true
  },
  {
    id: 'om-packaging',
    name: 'Om Packaging',
    shortName: 'OP',
    location: 'Vapi GIDC',
    colorIndex: 2,
    dayHeadcount: 22,
    nightHeadcount: 13,
    rateType: 'flat',
    flatRatePaise: 65_000,
    worksSunday: true
  },
  {
    id: 'sarigam-chemicals',
    name: 'Sarigam Chemicals',
    shortName: 'SC',
    location: 'Sarigam GIDC',
    colorIndex: 3,
    dayHeadcount: 18,
    nightHeadcount: 12,
    rateType: 'role',
    roleRatesPaise: {fitter: 70_000, welder: 74_000, helper: 60_000, supervisor: 78_000},
    worksSunday: true
  },
  {
    id: 'vapi-fab-works',
    name: 'Vapi Fab Works',
    shortName: 'VF',
    location: 'Vapi GIDC',
    colorIndex: 4,
    dayHeadcount: 25,
    nightHeadcount: 0,
    rateType: 'flat',
    flatRatePaise: 70_000,
    worksSunday: false
  },
  {
    id: 'daman-packaging',
    name: 'Daman Packaging',
    shortName: 'DP',
    location: 'Daman',
    colorIndex: 5,
    dayHeadcount: 11,
    nightHeadcount: 6,
    rateType: 'flat',
    flatRatePaise: 64_000,
    worksSunday: true
  }
];

const companyRolePlan: Record<string, Record<WorkerRole, number>> = {
  'shree-polymers': {supervisor: 1, fitter: 11, welder: 5, helper: 28},
  'om-packaging': {supervisor: 1, fitter: 9, welder: 3, helper: 22},
  'sarigam-chemicals': {supervisor: 1, fitter: 8, welder: 3, helper: 18},
  'vapi-fab-works': {supervisor: 1, fitter: 8, welder: 4, helper: 12},
  'daman-packaging': {supervisor: 1, fitter: 4, welder: 1, helper: 11}
};

const fixedWorkers: Array<{
  name: string;
  companyId: string | null;
  role: WorkerRole;
  shift: Shift;
  attendancePercent: number;
}> = [
  {name: 'Manoj Kumar', companyId: 'shree-polymers', role: 'helper', shift: 'day', attendancePercent: 78},
  {name: 'Suresh Yadav', companyId: 'shree-polymers', role: 'helper', shift: 'day', attendancePercent: 94},
  {name: 'Ravi Chauhan', companyId: 'shree-polymers', role: 'helper', shift: 'night', attendancePercent: 88},
  {name: 'Ramesh Patil', companyId: 'shree-polymers', role: 'fitter', shift: 'day', attendancePercent: 97},
  {name: 'Ramesh Patel', companyId: 'sarigam-chemicals', role: 'helper', shift: 'day', attendancePercent: 91},
  {name: 'Kiran Dhodia', companyId: 'om-packaging', role: 'helper', shift: 'day', attendancePercent: 87},
  {name: 'Raju Bhoi', companyId: 'om-packaging', role: 'helper', shift: 'night', attendancePercent: 89},
  {name: 'Imran Shaikh', companyId: 'vapi-fab-works', role: 'welder', shift: 'day', attendancePercent: 96},
  {name: 'Jyoti Halpati', companyId: 'daman-packaging', role: 'helper', shift: 'day', attendancePercent: 84},
  {name: 'Sachin Kale', companyId: 'vapi-fab-works', role: 'supervisor', shift: 'day', attendancePercent: 99},
  {name: 'Pankaj Varli', companyId: null, role: 'helper', shift: 'day', attendancePercent: 82}
];

const firstNames = [
  'Ramesh', 'Suresh', 'Manoj', 'Vikram', 'Ganesh', 'Imran', 'Dinesh', 'Santosh', 'Ravi', 'Prakash',
  'Ajay', 'Sunil', 'Mahesh', 'Kiran', 'Raju', 'Anil', 'Nilesh', 'Jitendra', 'Bharat', 'Sachin',
  'Mukesh', 'Rakesh', 'Jignesh', 'Hitesh', 'Paresh', 'Kamlesh', 'Bhavesh', 'Sanjay', 'Vijay', 'Deepak',
  'Amit', 'Rohit', 'Arjun', 'Sandeep', 'Yogesh', 'Rajendra', 'Shankar', 'Mohan', 'Arvind', 'Govind',
  'Lalit', 'Naresh', 'Umesh', 'Tushar', 'Prashant', 'Vinod', 'Ashok', 'Dilip', 'Haresh', 'Kishor',
  'Pravin', 'Ramdas', 'Babu', 'Salim', 'Aslam', 'Rafiq', 'Iqbal', 'Shabbir', 'Laxmi', 'Sunita',
  'Geeta', 'Kavita', 'Savita', 'Jyoti', 'Manisha'
];

const surnames = [
  'Patel', 'Patil', 'Yadav', 'Solanki', 'Jadhav', 'Shaikh', 'Rathod', 'More', 'Chauhan', 'Vasava',
  'Parmar', 'Gavit', 'Pawar', 'Dhodia', 'Bhoi', 'Thakor', 'Shinde', 'Mishra', 'Halpati', 'Kale',
  'Varli', 'Koli', 'Tandel', 'Mali', 'Gupta', 'Prajapati', 'Rana', 'Makwana', 'Chaudhari', 'Pandey',
  'Tiwari', 'Kushwaha', 'Sonawane', 'Bhosale', 'Gaikwad', 'Ansari', 'Khan', 'Naik', 'Dubla', 'Kokni'
];

const wageRanges: Record<WorkerRole, [number, number]> = {
  helper: [450, 520],
  fitter: [580, 650],
  welder: [620, 690],
  supervisor: [700, 800]
};

function wageFor(role: WorkerRole, index: number) {
  const [minimum, maximum] = wageRanges[role];
  const steps = (maximum - minimum) / 10 + 1;
  return (minimum + (index % steps) * 10) * 100;
}

function createWorkers(): Worker[] {
  const usedNames = new Set(fixedWorkers.map((worker) => worker.name));
  const result: Worker[] = [];
  let generatedNameIndex = 0;
  let workerIndex = 0;

  function nextName() {
    while (true) {
      const first = firstNames[generatedNameIndex % firstNames.length];
      const last = surnames[Math.floor(generatedNameIndex / firstNames.length) % surnames.length];
      generatedNameIndex += 1;
      const name = `${first} ${last}`;
      if (!usedNames.has(name)) {
        usedNames.add(name);
        return name;
      }
    }
  }

  for (const company of companies) {
    const roles = companyRolePlan[company.id];
    const companyFixed = fixedWorkers.filter((worker) => worker.companyId === company.id);
    let remainingNight = company.nightHeadcount;

    for (const role of ['supervisor', 'fitter', 'welder', 'helper'] as WorkerRole[]) {
      const fixedForRole = companyFixed.filter((worker) => worker.role === role);
      for (let roleIndex = 0; roleIndex < roles[role]; roleIndex += 1) {
        const fixed = fixedForRole[roleIndex];
        const shift: Shift = fixed?.shift ?? (role !== 'supervisor' && remainingNight > 0 ? 'night' : 'day');
        if (!fixed && shift === 'night') remainingNight -= 1;
        if (fixed?.shift === 'night') remainingNight -= 1;
        const name = fixed?.name ?? nextName();
        result.push({
          id: `worker-${String(workerIndex + 1).padStart(3, '0')}`,
          name,
          phone: `90000 ${String(workerIndex + 1).padStart(5, '0')}`,
          role,
          companyId: company.id,
          shift,
          dailyWagePaise: wageFor(role, workerIndex),
          payMode: company.id === 'om-packaging' || role === 'supervisor' ? 'bank' : 'cash',
          pfStatus: workerIndex < 15 ? 'pending' : 'done',
          esicStatus: workerIndex < 9 ? 'pending' : 'done',
          status: 'active',
          attendancePercent: fixed?.attendancePercent ?? 86 + ((workerIndex * 7) % 14)
        });
        workerIndex += 1;
      }
    }
  }

  const pankaj = fixedWorkers.find((worker) => worker.name === 'Pankaj Varli');
  if (pankaj) {
    const replacementIndex = result.findIndex(
      (worker) => worker.role === 'helper' && !fixedWorkers.some((fixed) => fixed.name === worker.name)
    );
    result[replacementIndex] = {
      ...result[replacementIndex],
      name: pankaj.name,
      companyId: null,
      attendancePercent: pankaj.attendancePercent
    };
  }

  const secondUnplacedIndex = result.findIndex(
    (worker) =>
      worker.name !== 'Pankaj Varli' &&
      worker.role === 'helper' &&
      !fixedWorkers.some((fixed) => fixed.name === worker.name)
  );
  result[secondUnplacedIndex] = {...result[secondUnplacedIndex], companyId: null};

  for (let index = result.length - 4; index < result.length; index += 1) {
    result[index] = {...result[index], status: 'inactive'};
  }

  return result;
}

export const workers = createWorkers();

export const issues: Issue[] = [
  {
    id: 'issue-1',
    type: 'health',
    workerName: 'Jyoti Halpati',
    companyName: 'Daman Packaging',
    summary: 'Follow-up visit and two days of rest.',
    daysOpen: 3,
    sensitive: true
  },
  {
    id: 'issue-2',
    type: 'statutory',
    workerName: 'Manoj Kumar',
    companyName: 'Shree Polymers',
    summary: 'PF number is still pending.',
    daysOpen: 12
  },
  {
    id: 'issue-3',
    type: 'dispute',
    workerName: 'Company count',
    companyName: 'Om Packaging',
    summary: 'October count differs by four man-days.',
    daysOpen: 8
  },
  {
    id: 'issue-4',
    type: 'advance',
    workerName: 'Kiran Dhodia',
    companyName: 'Om Packaging',
    summary: '₹2,500 advance remains open.',
    daysOpen: 5
  }
];

/** Delivered October bills. Om Packaging and Daman Packaging cheques are still pending. */
export const invoices: Invoice[] = [
  {id: 'inv-oct-sp', companyId: 'shree-polymers', month: '2026-10', totalPaise: 108_642_000, deliveredDaysAgo: 9, paid: true},
  {id: 'inv-oct-op', companyId: 'om-packaging', month: '2026-10', totalPaise: 81_240_000, deliveredDaysAgo: 6, paid: false},
  {id: 'inv-oct-sc', companyId: 'sarigam-chemicals', month: '2026-10', totalPaise: 66_918_000, deliveredDaysAgo: 9, paid: true},
  {id: 'inv-oct-vf', companyId: 'vapi-fab-works', month: '2026-10', totalPaise: 50_472_000, deliveredDaysAgo: 9, paid: true},
  {id: 'inv-oct-dp', companyId: 'daman-packaging', month: '2026-10', totalPaise: 44_630_000, deliveredDaysAgo: 9, paid: false}
];

/** Sample reminders, relative to the moment they are first loaded. */
export function sampleReminders(now: Date): Reminder[] {
  const at = (days: number, hours: number, minutes = 0) => {
    const date = new Date(now);
    date.setDate(date.getDate() + days);
    date.setHours(hours, minutes, 0, 0);
    return date.toISOString();
  };
  const created = now.toISOString();
  return [
    {id: 'sample-rem-1', text: 'Call Daman Packaging accounts about the October cheque', dueAt: at(1, 10), done: false, createdAt: created, companyId: 'daman-packaging', sample: true},
    {id: 'sample-rem-2', text: 'Collect PF documents from Manoj Kumar', dueAt: at(2, 9, 30), done: false, createdAt: created, workerId: workers.find((worker) => worker.name === 'Manoj Kumar')?.id ?? null, sample: true},
    {id: 'sample-rem-3', text: 'Ask Om Packaging to recheck the October count', dueAt: at(0, 17), done: false, createdAt: created, companyId: 'om-packaging', sample: true}
  ];
}
