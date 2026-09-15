import { routes } from './app.routes';

describe('application role routes', () => {
  it('reserves administration routes for the system administrator', () => {
    const adminRoutes = routes.filter(route => route.path?.startsWith('admin/') && route.component);
    expect(adminRoutes.length).toBe(3);
    for (const route of adminRoutes) expect(route.data?.['allowedRoles']).toEqual(['SYSTEM_ADMIN']);
  });

  it('grants global academic routes to program coordinators without legacy roles', () => {
    const record = routes.find(route => route.path === 'expediente/:id');
    expect(record?.data?.['allowedRoles']).toContain('PROGRAM_COORDINATOR');
    expect(JSON.stringify(routes)).not.toContain('ACADEMIC_ADMIN');
  });
});
