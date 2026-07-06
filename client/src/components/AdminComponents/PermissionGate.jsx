import React, { useContext } from 'react';
import { ContextUser } from '../../context/CheckUserContext';
import { canPageAction } from '../../config/permissions';

const PermissionGate = ({ page, action = 'view', children, fallback = null }) => {
  const { userRole, userPermissions } = useContext(ContextUser);

  if (!canPageAction(userRole, userPermissions, page, action)) {
    return fallback;
  }

  return children;
};

export default PermissionGate;
