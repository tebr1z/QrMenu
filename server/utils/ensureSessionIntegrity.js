import TableSession from '../model/TableSessionModal.js';
import Table from '../model/TableModal.js';

/**
 * Hər server startında və lazım olanda:
 * 1) Eyni masa üçün bir neçə aktiv session → yalnız ən yenisini saxla
 * 2) Silinmiş masaya bağlı orphan session-ları sil
 * 3) Unique indeksin mövcud olduğundan əmin ol
 */
export async function ensureSessionIntegrity() {
    const summary = {
        duplicatesRemoved: 0,
        orphansRemoved: 0,
        inactiveRemoved: 0,
        indexReady: false,
    };

    try {
        // 1) Dublikat aktiv session-lar
        const active = await TableSession.find({ isActive: true })
            .sort({ startTime: -1 })
            .select('_id tableId startTime')
            .lean();

        const keep = new Map();
        const dupIds = [];
        for (const s of active) {
            const key = String(s.tableId);
            if (!keep.has(key)) keep.set(key, s._id);
            else dupIds.push(s._id);
        }

        if (dupIds.length) {
            const r = await TableSession.deleteMany({ _id: { $in: dupIds } });
            summary.duplicatesRemoved = r.deletedCount || 0;
        }

        // 2) Inactive qalıqlar (bitməmiş "zombies")
        const inactive = await TableSession.deleteMany({ isActive: { $ne: true } });
        summary.inactiveRemoved = inactive.deletedCount || 0;

        // 3) Orphan — table artıq yoxdur
        const tables = await Table.find({}).select('_id').lean();
        const validTableIds = new Set(tables.map((t) => String(t._id)));
        const allSessions = await TableSession.find({}).select('_id tableId').lean();
        const orphanIds = allSessions
            .filter((s) => !validTableIds.has(String(s.tableId)))
            .map((s) => s._id);

        if (orphanIds.length) {
            const r = await TableSession.deleteMany({ _id: { $in: orphanIds } });
            summary.orphansRemoved = r.deletedCount || 0;
        }

        // 4) Unique indeks (eyni masa = max 1 aktiv session)
        try {
            await TableSession.collection.createIndex(
                { tableId: 1 },
                {
                    unique: true,
                    partialFilterExpression: { isActive: true },
                    name: 'unique_active_table',
                    background: true,
                }
            );
            summary.indexReady = true;
        } catch (idxErr) {
            // İndeks artıq varsa və ya hələ dublikat qalıbsa
            if (idxErr?.code === 85 || idxErr?.code === 86 || /already exists/i.test(idxErr?.message || '')) {
                summary.indexReady = true;
            } else if (process.env.NODE_ENV === 'development') {
                console.warn('[session-integrity] unique index:', idxErr.message);
            }
        }

        if (
            summary.duplicatesRemoved ||
            summary.orphansRemoved ||
            summary.inactiveRemoved
        ) {
            console.log('[session-integrity]', summary);
        } else {
            console.log('[session-integrity] OK — dublikat/orphan yoxdur');
        }
    } catch (err) {
        console.error('[session-integrity] xəta:', err.message || err);
    }

    return summary;
}
