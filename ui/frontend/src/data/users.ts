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
    id: 'admin',
    name: 'Admin',
    initials: 'AD',
    phone: '90000 00002',
    role: 'admin',
    locale: 'en',
    previewPin: '9999'
  },
  {
    id: 'viewer',
    name: 'Viewer',
    initials: 'VW',
    phone: '90000 00003',
    role: 'viewer',
    locale: 'gu',
    previewPin: '1111'
  }
];

/**
 * Profiles are named by role. Only the owner is a person ("Rajesh"), and only once signed in;
 * the login screen shows Owner, Admin and Viewer.
 */
export function greetingName(user: AppUser, roleLabel: string) {
  return user.role === 'owner' ? user.name.split(' ')[0] : roleLabel;
}

export function displayName(user: AppUser, roleLabel: string) {
  return user.role === 'owner' ? user.name : roleLabel;
}

export function findUser(userId: string | undefined) {
  return users.find((user) => user.id === userId);
}
