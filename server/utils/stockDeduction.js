import Product from '../model/ProductModal.js';
import { subtractStock, deductByPortions, isLowStock, calcSetItemDeduction, toBase, applyWeightDeductionToStock } from './stockUnits.js';

/**
 * Satış zamanı anbardan çıxış — miqdar, porsiya, resept və set məntiqi.
 */
export async function applyStockDeductionForOrder(selectedMenu) {
    if (!Array.isArray(selectedMenu) || selectedMenu.length === 0) return [];

    const menuIds = new Set();
    selectedMenu.forEach((item) => {
        const id = item._id || item.id;
        if (id) menuIds.add(id.toString());
    });

    const soldProducts = await Product.find({ _id: { $in: Array.from(menuIds) } }).lean();
    const productMap = new Map(soldProducts.map((p) => [p._id.toString(), p]));

    const allIngredientIds = new Set();
    const allSetProductIds = new Set();

    soldProducts.forEach((product) => {
        (product.ingredients || []).forEach((ing) => {
            if (ing.productId) allIngredientIds.add(ing.productId.toString());
        });
        if (product.isSet && product.setItems?.length) {
            product.setItems.forEach((si) => {
                if (si.productId) allSetProductIds.add(si.productId.toString());
                if (si.linkedProductId) allSetProductIds.add(si.linkedProductId.toString());
            });
        }
    });

    const relatedIds = [...new Set([...allIngredientIds, ...allSetProductIds])];
    if (relatedIds.length > 0) {
        const related = await Product.find({ _id: { $in: relatedIds } }).lean();
        related.forEach((p) => productMap.set(p._id.toString(), p));
    }

    const stockUpdates = new Map();
    const stockUnitUpdates = new Map();

    const setStock = (productId, newQty, unit) => {
        const key = productId.toString();
        stockUpdates.set(key, Math.max(0, newQty));
        if (unit) stockUnitUpdates.set(key, unit);
    };

    const getStock = (productId) => {
        const key = productId.toString();
        if (stockUpdates.has(key)) return stockUpdates.get(key);
        const p = productMap.get(key);
        return p ? Number(p.stockQuantity) || 0 : null;
    };

    const getStockUnit = (productId) => {
        const key = productId.toString();
        if (stockUnitUpdates.has(key)) return stockUnitUpdates.get(key);
        const p = productMap.get(key);
        return p?.stockUnit || 'piece';
    };

    for (const item of selectedMenu) {
        const productId = (item._id || item.id)?.toString();
        if (!productId) continue;

        const product = productMap.get(productId);
        if (!product) continue;

        const orderQty = Number(item.quantity) || 1;

        if (product.isSet && product.setItems?.length) {
            for (const setItem of product.setItems) {
                const section = setItem.section || 'qr';

                // QR — yalnız menyu, stokdan çıxmır
                if (section !== 'internal') continue;

                const targetId = (setItem.linkedProductId || setItem.productId)?.toString();
                if (!targetId) continue;

                const target = productMap.get(targetId);
                if (!target) continue;

                const current = getStock(target._id);
                if (current === null) continue;

                const deduct = calcSetItemDeduction(setItem, target);
                if (!deduct.amount || deduct.amount <= 0) continue;

                const totalDeduct = deduct.amount * orderQty;
                const deductBase = toBase(totalDeduct, deduct.unit);
                const currentUnit = getStockUnit(target._id);

                if (deductBase.kind === 'weight') {
                    const after = applyWeightDeductionToStock(
                        target,
                        deductBase.grams,
                        current,
                        currentUnit
                    );
                    setStock(target._id, after.stockQuantity, after.stockUnit);
                } else {
                    const newStock = subtractStock(
                        current,
                        currentUnit,
                        totalDeduct,
                        deduct.unit,
                        target
                    );
                    setStock(target._id, newStock);
                }
            }
        } else {
            (product.ingredients || []).forEach((ing) => {
                const ingId = ing.productId?.toString();
                if (!ingId) return;
                const ingProduct = productMap.get(ingId);
                if (!ingProduct) return;

                const current = getStock(ingProduct._id);
                if (current === null) return;

                const deductAmount = (Number(ing.amount) || 0) * orderQty;
                const newStock = subtractStock(
                    current,
                    ingProduct.stockUnit || 'piece',
                    deductAmount,
                    ing.unit || ingProduct.stockUnit || 'piece'
                );
                setStock(ingProduct._id, newStock);
            });

            if (!product.isSet && (product.ingredients || []).length === 0) {
                const current = getStock(product._id);
                if (current !== null && current > 0) {
                    if (product.portionSize > 0) {
                        setStock(product._id, deductByPortions({ ...product, stockQuantity: current }, orderQty));
                    } else if ((product.stockUnit || 'piece') === 'piece') {
                        setStock(product._id, Math.max(0, current - orderQty));
                    }
                }
            }
        }
    }

    const bulkOps = [];
    const lowStockProducts = [];

    for (const [id, newQty] of stockUpdates.entries()) {
        const updateFields = { stockQuantity: newQty };
        if (stockUnitUpdates.has(id)) {
            updateFields.stockUnit = stockUnitUpdates.get(id);
        }
        bulkOps.push({
            updateOne: {
                filter: { _id: id },
                update: { $set: updateFields },
            },
        });
        const p = productMap.get(id);
        if (p) {
            const updated = {
                ...p,
                stockQuantity: newQty,
                stockUnit: stockUnitUpdates.get(id) || p.stockUnit,
            };
            if (isLowStock(updated)) {
                lowStockProducts.push({ _id: id, name: p.name, stockQuantity: newQty });
            }
        }
    }

    if (bulkOps.length > 0) {
        await Product.bulkWrite(bulkOps);
    }

    return lowStockProducts;
}
