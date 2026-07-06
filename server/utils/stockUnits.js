export const STOCK_UNITS = ['piece', 'kg', 'g'];

export const UNIT_LABELS = {
    piece: 'ədəd',
    kg: 'kq',
    g: 'qr',
};

export function toBase(amount, unit) {
    const n = Number(amount) || 0;
    if (unit === 'kg') return { kind: 'weight', grams: n * 1000 };
    if (unit === 'g') return { kind: 'weight', grams: n };
    return { kind: 'piece', count: n };
}

export function fromBase(base, unit) {
    if (base.kind === 'weight') {
        if (unit === 'kg') return base.grams / 1000;
        if (unit === 'g') return base.grams;
        return base.grams;
    }
    return base.count;
}

export function getPackSizeGrams(product) {
    const ps = Number(product?.portionSize) || 0;
    if (ps <= 0) return 0;
    const u = product?.portionUnit || 'g';
    if (u === 'g' || u === 'kg') return toBase(ps, u).grams;
    return 0;
}

export function getStockTotalGrams(product) {
    if (!product) return 0;
    const qty = Number(product.stockQuantity) || 0;
    const unit = product.stockUnit || 'piece';
    const packGrams = getPackSizeGrams(product);

    if (unit === 'g') return qty;
    if (unit === 'kg') return qty * 1000;
    if (unit === 'piece' && packGrams > 0) return qty * packGrams;
    return 0;
}

export function resolveSetDeduct(setItem) {
    if (Number(setItem?.deductAmount) > 0) {
        return {
            amount: Number(setItem.deductAmount),
            unit: setItem.deductUnit || 'g',
        };
    }

    const portions = Number(setItem?.portions) || 1;
    const mode = setItem?.stockMode || 'portion';

    if (mode === 'fixed_weight') {
        return {
            amount: (Number(setItem.serveAmount) || 0) * portions,
            unit: setItem.serveUnit || 'g',
        };
    }

    if (mode === 'pack_split') {
        const pack = Number(setItem.packSize) || 0;
        const splits = Number(setItem.splitsPerPack) || 1;
        if (pack > 0 && splits > 0) {
            return {
                amount: (pack / splits) * portions,
                unit: setItem.packUnit || 'g',
            };
        }
    }

    return { amount: 0, unit: 'g' };
}

export function calcSetItemDeduction(setItem, linkedProduct) {
    const { amount, unit } = resolveSetDeduct(setItem);

    if (amount <= 0 && linkedProduct) {
        const stockUnit = linkedProduct.stockUnit || 'piece';
        const pSize = Number(linkedProduct.portionSize) || 0;
        const pUnit = linkedProduct.portionUnit || stockUnit;
        const portions = Number(setItem?.portions) || 1;

        if (stockUnit === 'g' || stockUnit === 'kg') {
            return { amount: 0, unit: stockUnit === 'kg' ? 'kg' : 'g' };
        }
        if (pSize > 0 && (pUnit === 'g' || pUnit === 'kg')) {
            return { amount: pSize * portions, unit: pUnit };
        }
        if (pSize > 0) {
            return { amount: pSize * portions, unit: pUnit };
        }
        if (stockUnit === 'piece') {
            return { amount: portions, unit: 'piece' };
        }
    }

    return { amount, unit };
}

/** Qram çıxışından sonra qalan stok miqdarı və vahidi */
export function applyWeightDeductionToStock(product, gramDeduct, currentQty, currentUnit) {
    const totalGrams = getStockTotalGrams({
        ...product,
        stockQuantity: currentQty,
        stockUnit: currentUnit || product.stockUnit,
    });
    const remaining = Math.max(0, totalGrams - gramDeduct);
    const unit = currentUnit || product.stockUnit || 'g';
    if (unit === 'kg') {
        return { stockQuantity: remaining / 1000, stockUnit: 'kg' };
    }
    return { stockQuantity: remaining, stockUnit: 'g' };
}

/** Qram çıxışından sonra stok (həmişə qr olaraq saxlanır) */
export function applyGramDeductionToStock(product, gramDeduct) {
    const totalGrams = getStockTotalGrams(product);
    const remaining = Math.max(0, totalGrams - gramDeduct);
    return {
        stockQuantity: remaining,
        stockUnit: 'g',
    };
}

export function subtractStock(stockQty, stockUnit, deductAmount, deductUnit, linkedProduct = null) {
    const deductBase = toBase(deductAmount, deductUnit || stockUnit || 'piece');

    if (deductBase.kind === 'weight' && linkedProduct) {
        const totalGrams = getStockTotalGrams({
            stockQuantity: stockQty,
            stockUnit: stockUnit || linkedProduct.stockUnit,
            portionSize: linkedProduct.portionSize,
            portionUnit: linkedProduct.portionUnit,
        });
        if (totalGrams > 0) {
            const remaining = Math.max(0, totalGrams - deductBase.grams);
            return remaining;
        }
    }

    if (deductBase.kind === 'weight') {
        const stock = toBase(stockQty, stockUnit || 'g');
        const remaining = Math.max(0, stock.grams - deductBase.grams);
        return fromBase({ kind: 'weight', grams: remaining }, stockUnit || 'g');
    }

    const stock = toBase(stockQty, stockUnit || 'piece');
    const deduct = toBase(deductAmount, deductUnit || stockUnit || 'piece');

    if (stock.kind !== deduct.kind) {
        return Number(stockQty) || 0;
    }

    const remaining = Math.max(0, stock.count - deduct.count);
    return remaining;
}

export function deductByPortions(product, portions) {
    const p = Number(portions) || 0;
    if (p <= 0) return Number(product.stockQuantity) || 0;

    const portionSize = Number(product.portionSize) || 1;
    const portionUnit = product.portionUnit || product.stockUnit || 'piece';
    const deductAmount = p * portionSize;

    return subtractStock(
        product.stockQuantity,
        product.stockUnit || 'piece',
        deductAmount,
        portionUnit
    );
}

export function calcAvailablePortions(product) {
    const stock = Number(product?.stockQuantity) || 0;
    const stockUnit = product?.stockUnit || 'piece';
    const portionSize = Number(product?.portionSize) || 0;
    const portionUnit = product?.portionUnit || stockUnit;

    if (!portionSize || portionSize <= 0) {
        if (stockUnit === 'piece') return stock;
        return stock;
    }

    const stockBase = toBase(stock, stockUnit);
    const portionBase = toBase(portionSize, portionUnit);

    if (stockBase.kind !== portionBase.kind) return 0;

    if (stockBase.kind === 'weight') {
        if (portionBase.grams <= 0) return 0;
        return stockBase.grams / portionBase.grams;
    }

    if (portionBase.count <= 0) return 0;
    return stockBase.count / portionBase.count;
}

export function calcUnitCost(purchasePrice, stockQty) {
    const qty = Number(stockQty) || 0;
    const price = Number(purchasePrice) || 0;
    return qty > 0 && price > 0 ? price / qty : 0;
}

export function isLowStock(product) {
    const threshold = Number(product?.lowStockThreshold) || 5;
    const portions = calcAvailablePortions(product);
    if (product?.portionSize > 0) {
        return portions <= threshold;
    }
    return (Number(product?.stockQuantity) || 0) <= threshold;
}

export function formatStockDisplay(product) {
    const qty = Number(product?.stockQuantity) || 0;
    const unit = UNIT_LABELS[product?.stockUnit || 'piece'] || 'ədəd';
    const packGrams = getPackSizeGrams(product);
    const totalGrams = getStockTotalGrams(product);

    if (packGrams > 0 && totalGrams > 0) {
        const fullPacks = Math.floor(totalGrams / packGrams);
        const openGrams = Math.round((totalGrams % packGrams) * 10) / 10;
        let text = `${fullPacks} paket`;
        if (openGrams > 0) text += ` + açıq ${openGrams} qr qalıb`;
        return text;
    }

    return `${qty} ${unit}`;
}

export function calcMaxSetSalesFromItem(setItem, linkedProduct) {
    if (!linkedProduct) return 0;
    const deduct = calcSetItemDeduction(setItem, linkedProduct);
    if (deduct.amount <= 0) return 0;

    const deductBase = toBase(deduct.amount, deduct.unit);

    if (deductBase.kind === 'weight') {
        const stockGrams = getStockTotalGrams(linkedProduct);
        if (stockGrams <= 0 || deductBase.grams <= 0) return 0;
        return Math.floor(stockGrams / deductBase.grams);
    }

    const stockBase = toBase(linkedProduct.stockQuantity, linkedProduct.stockUnit || 'piece');
    if (stockBase.kind !== deductBase.kind) return 0;
    return deductBase.count > 0 ? Math.floor(stockBase.count / deductBase.count) : 0;
}

export function calcMaxSetSales(setProduct, productMap) {
    const internal = (setProduct?.setItems || []).filter((i) => i.section === 'internal');
    if (internal.length === 0) return null;

    let min = Infinity;
    internal.forEach((item) => {
        const linkedId = item.linkedProductId || item.productId;
        const linked = productMap.get(String(linkedId));
        const max = calcMaxSetSalesFromItem(item, linked);
        if (max < min) min = max;
    });
    return min === Infinity ? 0 : min;
}
