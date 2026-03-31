import { formatName } from './utils.js';
import type { User, ApiResponse } from './types.js';

export function handleGetUser(id: string): ApiResponse<User> {
  return {
    data: { id, name: formatName('John', 'Doe'), email: 'john@example.com' },
    status: 200,
  };
}

export function handleListUsers(): ApiResponse<User[]> {
  return { data: [], status: 200 };
}
