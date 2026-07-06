import React, { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { ContextUser } from '../../context/CheckUserContext';
import { canAccessRoute, getDefaultAdminRoute } from '../../config/roles';
import { getRoleFromToken } from '../../utils/jwt';
import { getCookie } from '../../utils/http';
import Loading from '../Loading';

const RoleGuard = ({ routeKey, children }) => {
  const { userRole, userPermissions, hasJwtToken, authReady } = useContext(ContextUser);
  const location = useLocation();

  if (hasJwtToken && !authReady) {
    return <Loading fullScreen={false} />;
  }

  const effectiveRole = userRole || (hasJwtToken ? getRoleFromToken(getCookie('jwtToken')) : null);

  if (hasJwtToken && !effectiveRole) {
    return <Loading fullScreen={false} />;
  }

  if (!canAccessRoute(effectiveRole, userPermissions, routeKey)) {
    return <Navigate to={getDefaultAdminRoute(effectiveRole, userPermissions)} replace state={{ from: location }} />;
  }

  return children;
};

export default RoleGuard;
