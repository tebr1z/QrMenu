export function parseJwtPayload(token) {
    if (!token || typeof token !== 'string') return null;
    try {
        const base64 = token.split('.')[1];
        if (!base64) return null;
        const json = atob(base64.replace(/-/g, '+').replace(/_/g, '/'));
        return JSON.parse(json);
    } catch {
        return null;
    }
}

export function getRoleFromToken(token) {
    const payload = parseJwtPayload(token);
    return payload?.Role || payload?.role || null;
}
