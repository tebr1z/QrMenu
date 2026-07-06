export const PAGE_KEYS = [
  'Welcome',
  'Contact',
  'Menu',
  'Category',
  'Product',
  'Tables',
  'TableManage',
  'Accounts',
  'Finance',
  'SetRequests',
  'Complaints',
  'StockControl',
  'SetIngredients',
  'SoldProducts',
  'SalesReport',
  'EmployeePayroll',
  'Users',
  'AuditLog',
];

export const PAGE_LABELS = {
  Welcome: 'Ana səhifə',
  Contact: 'Əlaqə',
  Menu: 'Menu',
  Category: 'Kateqoriya',
  Product: 'Məhsul',
  Tables: 'Masalar',
  TableManage: 'Masaların idarəsi',
  Accounts: 'Hesablar',
  Finance: 'Günlük xərclər',
  SetRequests: 'Set sorğuları',
  Complaints: 'Şikayətlər',
  StockControl: 'Stok',
  SetIngredients: 'Set məhsulları (kassa)',
  SoldProducts: 'Satılan məhsullar',
  SalesReport: 'Satış hesabatı',
  EmployeePayroll: 'İşçi maaş',
  Users: 'İstifadəçilər',
  AuditLog: 'Dəyişiklik jurnalı',
};

const LEGACY_ROLE_DEFAULTS = {
  kassa: {
    Tables: { view: true, edit: true, delete: false },
    TableManage: { view: true, edit: true, delete: true },
    Accounts: { view: true, edit: false, delete: false },
    Finance: { view: true, edit: true, delete: false },
    EmployeePayroll: { view: true, edit: false, delete: false },
    StockControl: { view: true, edit: true, delete: false },
    SetIngredients: { view: true, edit: false, delete: false },
    Product: { view: true, edit: true, delete: false },
  },
  novbe: {
    TableManage: { view: true, edit: true, delete: false },
    EmployeePayroll: { view: true, edit: false, delete: false },
  },
  staff: {},
};

export const ROLES = {
  MASTER_ADMIN: 'master_admin',
  STAFF: 'staff',
  KASSA: 'kassa',
  NOVBE: 'novbe',
};

export function emptyPermissions() {
  return Object.fromEntries(
    PAGE_KEYS.map((key) => [key, { view: false, edit: false, delete: false }])
  );
}

export function normalizePermissions(input) {
  const base = emptyPermissions();
  if (!input || typeof input !== 'object') return base;
  PAGE_KEYS.forEach((key) => {
    const p = input[key];
    if (p && typeof p === 'object') {
      base[key] = {
        view: Boolean(p.view),
        edit: Boolean(p.edit),
        delete: Boolean(p.delete),
      };
    }
  });
  return base;
}

export function isMasterAdmin(role) {
  return role === ROLES.MASTER_ADMIN;
}

export function hasPermission(user, page, action) {
  if (!user?.role) return false;
  if (isMasterAdmin(user.role)) return true;

  const perms = user.permissions?.[page];
  if (perms && typeof perms === 'object') {
    if (action === 'view') return Boolean(perms.view || perms.edit || perms.delete);
    return Boolean(perms[action]);
  }

  const legacy = LEGACY_ROLE_DEFAULTS[user.role]?.[page];
  if (legacy) {
    if (action === 'view') return Boolean(legacy.view || legacy.edit || legacy.delete);
    return Boolean(legacy[action]);
  }

  return false;
}

export function canPageAction(role, permissions, page, action) {
  if (page === 'Users' || page === 'AuditLog' || page === 'SalesReport' || page === 'SetIngredients') {
    if (page === 'SetIngredients') {
      return isMasterAdmin(role) || hasPermission({ role, permissions }, page, action);
    }
    return isMasterAdmin(role);
  }
  return hasPermission({ role, permissions }, page, action);
}

export function canAccessRoute(role, permissions, pathSegment) {
  return canPageAction(role, permissions, pathSegment, 'view');
}

export function getDefaultAdminRoute(role, permissions) {
  if (isMasterAdmin(role)) return '/Admin';
  const key = PAGE_KEYS.find(
    (page) => page !== 'Welcome' && canPageAction(role, permissions, page, 'view')
  );
  return key ? `/Admin/${key}` : '/Sign';
}

export const ACTION_LABELS = {
  view: 'Baxa bilər',
  edit: 'Dəyişdirə bilər',
  delete: 'Silə bilər',
};
