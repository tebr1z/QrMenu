import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { createContext } from 'react'
export const ContextUser = createContext()
import { toast } from 'react-toastify';
import { normalizePermissions } from '../config/permissions';
import { getRoleFromToken } from '../utils/jwt';
import { createApiClient, getCookie } from '../utils/http';

const SESSION_KEY = 'admin_session_data';
const MAX_SESSION_AGE = 24 * 60 * 60 * 1000;

function readSession() {
    try {
        const raw = localStorage.getItem(SESSION_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

function persistSession(hasToken, extra = {}) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
        timestamp: Date.now(),
        hasToken,
        ...extra,
    }));
}

const CheckUserContext = ({ children }) => {
    const apiUrl = import.meta.env.VITE_API || '/api';

    const apiClient = useMemo(() => createApiClient(apiUrl), [apiUrl]);

    const [hasJwtToken, sethasJwtToken] = useState(false)
    const [authReady, setAuthReady] = useState(false)
    const [userRole, setUserRole] = useState(() => readSession()?.role || null)
    const [userPermissions, setUserPermissions] = useState(() => {
        const p = readSession()?.permissions;
        return p ? normalizePermissions(p) : null;
    })

    const checkJwtToken = useCallback(() => {
        const parsed = readSession();
        const jwtToken = getCookie('jwtToken');
        const hasToken = jwtToken && jwtToken.length > 10;
        const roleFromJwt = hasToken ? getRoleFromToken(jwtToken) : null;

        if (parsed) {
            const sessionAge = Date.now() - parsed.timestamp;
            if (sessionAge < MAX_SESSION_AGE && parsed.hasToken) {
                if (parsed.role) setUserRole(parsed.role);
                else if (roleFromJwt) setUserRole(roleFromJwt);
                if (parsed.permissions) setUserPermissions(normalizePermissions(parsed.permissions));
                sethasJwtToken(true);
                return true;
            }
        }

        if (hasToken) {
            sethasJwtToken(true);
            if (roleFromJwt) setUserRole(roleFromJwt);
            persistSession(true, {
                role: roleFromJwt || undefined,
            });
            return true;
        }

        sethasJwtToken(false);
        return false;
    }, []);

    const setAuthStatus = useCallback((status, userPayload = null) => {
        sethasJwtToken(status);

        if (status) {
            const role = userPayload?.Role || userPayload?.role || null;
            const name = userPayload?.Name || userPayload?.name;
            const email = userPayload?.Email || userPayload?.email;
            const permissions = userPayload?.permissions
                ? normalizePermissions(userPayload.permissions)
                : null;
            if (role) setUserRole(role);
            if (permissions) setUserPermissions(permissions);
            persistSession(true, { role, name, email, permissions });
            if (name) localStorage.setItem('userName', name);
            setAuthReady(true);
        } else {
            localStorage.removeItem(SESSION_KEY);
            localStorage.removeItem('userName');
            setUserRole(null);
            setUserPermissions(null);
        }
    }, []);

    const clearAuth = useCallback(() => {
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem('userName');
        sethasJwtToken(false);
        setUserRole(null);
        setUserPermissions(null);
        setAuthReady(true);
    }, []);

    useEffect(() => {
        const interceptorId = apiClient.interceptors.response.use(
            (response) => response,
            (error) => {
                const status = error.response?.status;
                const msg = String(error.response?.data?.error || '');

                if (status === 401) {
                    clearAuth();
                    if (window.location.pathname !== '/' && !window.location.pathname.startsWith('/Sign')) {
                        toast.error('Səssiyanız bitib. Yenidən daxil olun.');
                        window.location.href = '/Sign';
                    }
                    return Promise.reject(error);
                }

                if (status === 403) {
                    const isSessionError = msg.includes('Token tapılmadı')
                        || msg.includes('Etibarsız token')
                        || msg.includes('Icazə vaxtı bitdi');
                    if (isSessionError) {
                        clearAuth();
                        if (window.location.pathname !== '/' && !window.location.pathname.startsWith('/Sign')) {
                            toast.error('Səssiyanız bitib. Yenidən daxil olun.');
                            window.location.href = '/Sign';
                        }
                    }
                }
                return Promise.reject(error);
            }
        );
        return () => apiClient.interceptors.response.eject(interceptorId);
    }, [apiClient, clearAuth]);

    useEffect(() => {
        checkJwtToken();

        const syncRole = async () => {
            const jwtToken = getCookie('jwtToken');
            const parsed = readSession();
            if (!jwtToken && !parsed?.hasToken) {
                setAuthReady(true);
                return;
            }
            try {
                const res = await apiClient.get('/Auth/Me');
                const role = res.data?.role;
                const permissions = res.data?.permissions
                    ? normalizePermissions(res.data.permissions)
                    : null;
                if (role) {
                    setUserRole(role);
                    if (permissions) setUserPermissions(permissions);
                    persistSession(true, {
                        role,
                        name: res.data.name,
                        email: res.data.email,
                        permissions,
                    });
                    if (res.data.name) localStorage.setItem('userName', res.data.name);
                }
            } catch {
                const roleFromJwt = getRoleFromToken(getCookie('jwtToken'));
                if (roleFromJwt) setUserRole(roleFromJwt);
            } finally {
                setAuthReady(true);
            }
        };
        syncRole();

        const interval = setInterval(checkJwtToken, 30000);
        return () => clearInterval(interval);
    }, [checkJwtToken, apiClient])

    return (
        <ContextUser.Provider value={{
            apiClient,
            hasJwtToken,
            authReady,
            userRole,
            userPermissions,
            setUserRole,
            setUserPermissions,
            setAuthStatus,
            clearAuth,
            checkJwtToken
        }}>
            {children}
        </ContextUser.Provider>
    )
}

export default CheckUserContext
