/** Maaş dövrü: hər ayın 10-u – növbəti ayın 10-u */
export function getPayPeriod(date = new Date()) {
    const d = new Date(date);
    const day = d.getDate();
    let start;
    let end;
    if (day >= 10) {
        start = new Date(d.getFullYear(), d.getMonth(), 10, 0, 0, 0, 0);
        end = new Date(d.getFullYear(), d.getMonth() + 1, 10, 0, 0, 0, 0);
    } else {
        start = new Date(d.getFullYear(), d.getMonth() - 1, 10, 0, 0, 0, 0);
        end = new Date(d.getFullYear(), d.getMonth(), 10, 0, 0, 0, 0);
    }
    return { start, end };
}

export function periodKeyFromRange(start, end) {
    const s = start instanceof Date ? start.toISOString().slice(0, 10) : start;
    const e = end instanceof Date ? end.toISOString().slice(0, 10) : end;
    return `${s}_${e}`;
}

export function getPreviousPeriod(date = new Date()) {
    const current = getPayPeriod(date);
    const prevEnd = new Date(current.start);
    const prevStart = new Date(prevEnd);
    prevStart.setMonth(prevStart.getMonth() - 1);
    return {
        start: prevStart,
        end: prevEnd,
        periodKey: periodKeyFromRange(prevStart, prevEnd),
    };
}

export function formatPeriodLabel(start, end) {
    const s = new Date(start);
    const e = new Date(end);
    const opts = { day: 'numeric', month: 'long', year: 'numeric' };
    return `${s.toLocaleDateString('az-AZ', opts)} – ${e.toLocaleDateString('az-AZ', opts)}`;
}
