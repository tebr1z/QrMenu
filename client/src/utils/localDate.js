/** Lokal kalendar günü — UTC toISOString sürüşməsinin qarşısını alır */

export function toLocalDateStr(date = new Date()) {
    const d = date instanceof Date ? date : new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

/** YYYY-MM-DD → lokal günün 00:00 */
export function parseLocalDateStart(dateStr) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(dateStr || ''));
    if (!m) {
        const d = new Date(dateStr);
        d.setHours(0, 0, 0, 0);
        return d;
    }
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, 0, 0, 0);
}

/** Ayın [start, end) lokal sərhədləri; end = növbəti ayın 1-i */
export function getLocalMonthRange(dateStr) {
    const d = parseLocalDateStart(dateStr);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    return { start, end, startStr: toLocalDateStr(start), endExclusiveStr: toLocalDateStr(end) };
}

/** Seçilmiş gündən geriyə 7 gün (lokal), inklüziv */
export function getLocalWeekRange(dateStr) {
    const to = parseLocalDateStart(dateStr);
    to.setHours(23, 59, 59, 999);
    const from = parseLocalDateStart(dateStr);
    from.setDate(from.getDate() - 6);
    from.setHours(0, 0, 0, 0);
    const endExclusive = parseLocalDateStart(dateStr);
    endExclusive.setDate(endExclusive.getDate() + 1);
    return {
        from,
        to,
        fromStr: toLocalDateStr(from),
        toStr: toLocalDateStr(to),
        endExclusiveStr: toLocalDateStr(endExclusive),
    };
}

/** from inklüziv, to inklüziv → API üçün endExclusive */
export function rangeToApiBounds(fromStr, toStr) {
    const start = parseLocalDateStart(fromStr);
    const endExclusive = parseLocalDateStart(toStr);
    endExclusive.setDate(endExclusive.getDate() + 1);
    return {
        fromStr: toLocalDateStr(start),
        toExclusiveStr: toLocalDateStr(endExclusive),
    };
}
