import { handleGetUser, handleListUsers } from './handler.js';

export function createRouter() {
  const routes = {
    '/users': handleListUsers,
    '/users/:id': handleGetUser,
  };
  return routes;
}
