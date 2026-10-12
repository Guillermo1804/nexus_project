import { Route, Routes } from '@angular/router';
import { routes } from './app.routes';

function flattenRoutes(allRoutes: Routes): Route[] {
  return allRoutes.flatMap((route) => [route, ...(route.children ? flattenRoutes(route.children) : [])]);
}

describe('application role routes', () => {
  it('reserves administration routes for the system administrator', () => {
    const adminRoutes = flattenRoutes(routes).filter(route => route.path?.startsWith('admin/') && route.component);
    expect(adminRoutes.length).toBe(3);
    for (const route of adminRoutes) expect(route.data?.['allowedRoles']).toEqual(['SYSTEM_ADMIN']);
  });

  it('grants global academic routes to program coordinators without legacy roles', () => {
    const record = flattenRoutes(routes).find(route => route.path === 'expediente/:id');
    expect(record?.data?.['allowedRoles']).toContain('PROGRAM_COORDINATOR');
    expect(JSON.stringify(routes)).not.toContain('ACADEMIC_ADMIN');
  });
});
