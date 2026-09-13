/** Admin portal HTTP surface (not `/api/v1/admin` staff routes). */
export function isAdminApiPath(url?: string): boolean {
  const path = (url ?? '').split('?')[0];
  return path === '/api/admin' || path.startsWith('/api/admin/');
}
