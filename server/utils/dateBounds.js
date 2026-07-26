/**
 * Date-only (YYYY-MM-DD) → server lokal gün sərhədləri.
 * new Date('YYYY-MM-DD') UTC midnight sürüşməsinin qarşısını alır.
 */

export function parseDayStart(dateStr) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(dateStr || ''));
    if (m) {
        return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, 0, 0, 0);
    }
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return new Date(0);
    d.setHours(0, 0, 0, 0);
    return d;
}

/** [start, end) — end növbəti gün 00:00 */
export function dayBounds(dateStr) {
    const start = parseDayStart(dateStr);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start, end };
}

/** from/to query — date-only və ya ISO; end exclusive əgər toExclusive true */
export function rangeBounds(from, to) {
    const start = from ? parseDayStart(from) : new Date('1970-01-01');
    let end;
    if (!to) {
        end = new Date('2999-12-31');
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(String(to).slice(0, 10)) && String(to).length <= 10) {
        // date-only: inclusive day → exclusive next day
        end = parseDayStart(to);
        end.setDate(end.getDate() + 1);
    } else {
        end = new Date(to);
    }
    return { start, end };
}
