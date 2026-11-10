import type {AppUser} from '@/types';

export const users: AppUser[] = [
  {
    id: 'rajesh',
    name: 'Rajesh Desai',
    initials: 'RD',
    phone: '90000 00001',
    role: 'owner',
    locale: 'en',
    previewPin: '1234'
  },
  {
    id: 'rishi',
    name: 'Rishi',
    initials: 'RS',
    phone: '90000 00002',
    role: 'admin',
    locale: 'en',
    previewPin: '9999'
  },
  {
    id: 'papa',
    name: 'Papa',
    initials: 'PD',
    phone: '90000 00003',
    role: 'viewer',
    locale: 'gu',
    previewPin: '1111'
  }
];

export function findUser(userId: string | undefined) {
  return users.find((user) => user.id === userId);
}
