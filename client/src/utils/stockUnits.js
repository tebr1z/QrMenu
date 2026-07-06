export const UNIT_LABELS = { piece: 'ədəd', kg: 'kq', g: 'qr' };

export function getStockUnitLabel(unit) {
  return UNIT_LABELS[unit || 'piece'] || 'ədəd';
}

export function getUnitCostLabel(product) {
  const unit = product?.stockUnit || 'piece';
  if (unit === 'kg') return '1 kq maya';
  if (unit === 'g') return '1 qr maya';
  return '1 ədəd maya';
}

export function getStockInputStep(unit) {
  return unit === 'piece' ? '1' : '0.001';
}

export function toBase(amount, unit) {
  const n = Number(amount) || 0;
  if (unit === 'kg') return { kind: 'weight', grams: n * 1000 };
  if (unit === 'g') return { kind: 'weight', grams: n };
  return { kind: 'piece', count: n };
}

/** Məhsulda "1 paket = X qr" (portionSize) */
export function getPackSizeGrams(product) {
  const ps = Number(product?.portionSize) || 0;
  if (ps <= 0) return 0;
  const u = product?.portionUnit || 'g';
  if (u === 'g' || u === 'kg') return toBase(ps, u).grams;
  return 0;
}

/** Anbar miqdarını qr-a çevir (ədəd + paket ölçüsü dəstəklənir) */
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

/** Stok xülasəsi — paket, qr, kq */
export function getStockSummary(product) {
  const packGrams = getPackSizeGrams(product);
  const totalGrams = getStockTotalGrams(product);
  const unit = product?.stockUnit || 'piece';
  const qty = Number(product?.stockQuantity) || 0;
  const fullPacks = packGrams > 0 ? Math.floor(totalGrams / packGrams) : (unit === 'piece' ? qty : 0);
  const openGrams = packGrams > 0 ? Math.round((totalGrams % packGrams) * 10) / 10 : 0;

  return {
    totalGrams,
    totalKg: totalGrams / 1000,
    fullPacks,
    openGrams,
    packGrams,
    hasPack: packGrams > 0,
    storedQty: qty,
    storedUnit: unit,
  };
}

/** Məhsulun qr/kq göstərimi mümkündürmü */
export function hasGramConversion(product) {
  if (!product) return false;
  const unit = product.stockUnit || 'piece';
  if (unit === 'g' || unit === 'kg') return true;
  return getPackSizeGrams(product) > 0;
}

/** Məhsul üçün mövcud göstərim rejimləri — ya ədəd, ya qr */
export function getAvailableStockViewModes(product) {
  if (hasGramConversion(product)) return ['piece', 'g'];
  const unit = product?.stockUnit || 'piece';
  if (unit === 'piece') return ['piece'];
  return ['g'];
}

/** Göstərim rejimi: piece | g | kg */
export function cycleStockViewMode(current, product) {
  const modes = getAvailableStockViewModes(product);
  const idx = modes.indexOf(current);
  return modes[(idx + 1) % modes.length];
}

export function getDefaultStockViewMode(product) {
  const unit = product?.stockUnit || 'piece';
  if (getPackSizeGrams(product) > 0) return 'piece';
  if (unit === 'kg') return 'kg';
  if (unit === 'g') return 'g';
  return 'piece';
}

export function stockViewModeIcon(mode) {
  if (mode === 'g') return 'bi-speedometer2';
  if (mode === 'kg') return 'bi-box';
  return 'bi-box-seam';
}

export function stockViewModeLabel(mode) {
  if (mode === 'g') return 'qr';
  if (mode === 'kg') return 'kq';
  return 'ədəd';
}

/** Seçilmiş rejimdə stok mətni — ya ədəd, ya qr (qarışıq yox) */
export function formatStockByView(product, viewMode) {
  const s = getStockSummary(product);
  const unit = product?.stockUnit || 'piece';

  if (viewMode === 'g') {
    if (s.totalGrams > 0) return `${Math.round(s.totalGrams * 10) / 10} qr`;
    if (unit === 'g') return `${s.storedQty} qr`;
    if (unit === 'kg') return `${Math.round(s.storedQty * 1000 * 10) / 10} qr`;
    return '0 qr';
  }

  // ədəd rejimi
  if (s.hasPack && s.totalGrams > 0) {
    const packs = Math.round((s.totalGrams / s.packGrams) * 100) / 100;
    return `${packs} paket`;
  }
  if (unit === 'piece') return `${s.storedQty} ədəd`;
  if (unit === 'kg') return `${s.storedQty} kq`;
  if (unit === 'g') return `${Math.round(s.storedQty * 10) / 10} qr`;
  return `${s.storedQty} ədəd`;
}

/** Sağ tərəf paket xülasəsi */
export function getStockSideHint(product) {
  const s = getStockSummary(product);
  if (!s.hasPack || s.totalGrams <= 0) return null;
  const g = Math.round(s.totalGrams * 10) / 10;
  return `${s.fullPacks} paket · ${g} qr`;
}

/** Redaktə inputu — cari rejimdə göstərilən dəyər */
export function getStockEditValue(product, viewMode) {
  const s = getStockSummary(product);
  if (viewMode === 'g') {
    return s.totalGrams > 0 ? Math.round(s.totalGrams * 10) / 10 : (product.stockUnit === 'g' ? s.storedQty : 0);
  }
  if (viewMode === 'kg') {
    const kg = s.totalGrams > 0 ? s.totalKg : (product.stockUnit === 'kg' ? s.storedQty : 0);
    return Math.round(kg * 1000) / 1000;
  }
  if (s.hasPack && s.totalGrams > 0) {
    return Math.round((s.totalGrams / s.packGrams) * 100) / 100;
  }
  return s.storedQty;
}

/** Redaktədən saxlanacaq stockQuantity + stockUnit */
export function parseStockEditInput(value, viewMode, product) {
  const n = parseFloat(value) || 0;
  const packGrams = getPackSizeGrams(product);

  if (viewMode === 'g') {
    return { stockQuantity: n, stockUnit: 'g' };
  }
  if (viewMode === 'kg') {
    return { stockQuantity: n, stockUnit: 'kg' };
  }
  if (packGrams > 0) {
    return { stockQuantity: n, stockUnit: 'piece' };
  }
  return { stockQuantity: n, stockUnit: product?.stockUnit || 'piece' };
}

/** Məhsul forması — paket/kq/qr preview */
export function calcStockFormPreview(stockQuantity, stockUnit, portionSize, portionUnit = 'g') {
  const product = {
    stockQuantity,
    stockUnit,
    portionSize,
    portionUnit,
  };
  const s = getStockSummary(product);
  if (s.hasPack && s.totalGrams > 0) {
    return {
      totalGrams: Math.round(s.totalGrams * 10) / 10,
      packs: s.fullPacks,
      openGrams: s.openGrams,
      text: `${Math.round(s.totalGrams)} qr · ${s.fullPacks} paket${s.openGrams > 0 ? ` + açıq ${s.openGrams} qr` : ''}`,
    };
  }
  if (stockUnit === 'kg') {
    const g = (Number(stockQuantity) || 0) * 1000;
    const packGrams = getPackSizeGrams(product);
    if (packGrams > 0 && g > 0) {
      const packs = Math.floor(g / packGrams);
      const open = Math.round((g % packGrams) * 10) / 10;
      return {
        totalGrams: g,
        packs,
        openGrams: open,
        text: `${g} qr · ${packs} paket${open > 0 ? ` + açıq ${open} qr` : ''}`,
      };
    }
    return { totalGrams: g, text: `${stockQuantity || 0} kq${g > 0 ? ` (${g} qr)` : ''}` };
  }
  if (stockUnit === 'g') {
    return { totalGrams: Number(stockQuantity) || 0, text: `${stockQuantity || 0} qr` };
  }
  return { text: `${stockQuantity || 0} ədəd` };
}

export function formatWarehouseStock(product) {
  const qty = Number(product?.stockQuantity) || 0;
  const unit = product.stockUnit || 'piece';
  const packGrams = getPackSizeGrams(product);
  const totalGrams = getStockTotalGrams(product);

  if (packGrams > 0 && totalGrams > 0) {
    const fullPacks = Math.floor(totalGrams / packGrams);
    const openGrams = Math.round((totalGrams % packGrams) * 10) / 10;
    let text = `${fullPacks} paket`;
    if (openGrams > 0) {
      text += ` + açıq ${openGrams} qr qalıb`;
    }
    return {
      text,
      totalGrams,
      fullPacks,
      openGrams,
      packGrams,
      hasPack: true,
    };
  }

  return {
    text: `${qty} ${getStockUnitLabel(unit)}`,
    totalGrams: unit === 'g' ? qty : unit === 'kg' ? qty * 1000 : 0,
    fullPacks: 0,
    openGrams: 0,
    packGrams: 0,
    hasPack: false,
  };
}

export function formatPortionHint(product) {
  const packGrams = getPackSizeGrams(product);
  if (packGrams > 0) {
    return `1 paket = ${product.portionSize} ${getStockUnitLabel(product.portionUnit || 'g')}`;
  }
  const portionSize = Number(product?.portionSize) || 0;
  if (portionSize <= 0) return null;
  const pUnit = getStockUnitLabel(product.portionUnit || product.stockUnit || 'g');
  return `${portionSize} ${pUnit}/pors`;
}

export function calcAvailablePortions(product) {
  const stock = Number(product?.stockQuantity) || 0;
  const stockUnit = product?.stockUnit || 'piece';
  const portionSize = Number(product?.portionSize) || 0;
  const portionUnit = product?.portionUnit || stockUnit;

  if (!portionSize || portionSize <= 0) {
    return stock;
  }

  const stockBase = toBase(stock, stockUnit);
  const portionBase = toBase(portionSize, portionUnit);
  if (stockBase.kind !== portionBase.kind) return 0;

  if (stockBase.kind === 'weight') {
    return portionBase.grams > 0 ? stockBase.grams / portionBase.grams : 0;
  }
  return portionBase.count > 0 ? stockBase.count / portionBase.count : 0;
}

export function isLowStock(product) {
  const threshold = Number(product?.lowStockThreshold) || 5;
  if (product?.portionSize > 0) {
    return calcAvailablePortions(product) <= threshold;
  }
  return (Number(product?.stockQuantity) || 0) <= threshold;
}

export function formatStockDisplay(product) {
  const wh = formatWarehouseStock(product);
  if (wh.hasPack) return wh.text;
  const qty = Number(product?.stockQuantity) || 0;
  const unit = UNIT_LABELS[product?.stockUnit || 'piece'] || 'ədəd';
  return `${qty} ${unit}`;
}

export function calcUnitCostDisplay(purchasePrice, stockQty) {
  const qty = Number(stockQty) || 0;
  const price = Number(purchasePrice) || 0;
  return qty > 0 && price > 0 ? (price / qty).toFixed(2) : '0.00';
}

/** Set daxili: köhnə məlumatı yeni formata */
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

/** 1 set satışında anbardan çıxacaq miqdar */
export function calcSetItemDeduction(setItem, linkedProduct) {
  const { amount, unit } = resolveSetDeduct(setItem);
  const unitLabel = UNIT_LABELS[unit] || unit;

  if (amount <= 0 && linkedProduct) {
    const stockUnit = linkedProduct.stockUnit || 'piece';
    const pSize = Number(linkedProduct.portionSize) || 0;
    const pUnit = linkedProduct.portionUnit || stockUnit;
    const portions = Number(setItem?.portions) || 1;

    if (stockUnit === 'g' || stockUnit === 'kg') {
      return { amount: 0, unit: stockUnit === 'kg' ? 'kg' : 'g', label: '— qr/kq yazın' };
    }
    if (pSize > 0) {
      return {
        amount: pSize * portions,
        unit: pUnit,
        label: `${pSize * portions} ${UNIT_LABELS[pUnit]} / set`,
      };
    }
    if (stockUnit === 'piece') {
      return {
        amount: portions,
        unit: 'piece',
        label: `${portions} ədəd / set`,
      };
    }
  }

  return {
    amount,
    unit,
    label: `${amount} ${unitLabel} / set`,
  };
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
    const linked = typeof productMap?.get === 'function'
      ? productMap.get(String(linkedId))
      : productMap?.[String(linkedId)];
    const max = calcMaxSetSalesFromItem(item, linked);
    if (max < min) min = max;
  });

  return min === Infinity ? 0 : min;
}

/** Satışdan sonra qalan anbar (simulyasiya) */
export function simulateAfterDeduct(product, deductAmount, deductUnit) {
  const wh = formatWarehouseStock(product);
  const deductGrams = toBase(deductAmount, deductUnit).grams;
  if (deductGrams <= 0 || wh.totalGrams <= 0) return wh;

  const remaining = Math.max(0, wh.totalGrams - deductGrams);
  const packGrams = wh.packGrams || getPackSizeGrams(product);
  if (packGrams > 0) {
    const fullPacks = Math.floor(remaining / packGrams);
    const openGrams = Math.round((remaining % packGrams) * 10) / 10;
    if (remaining <= 0) return { ...wh, text: '0 qr qalıb', totalGrams: 0, fullPacks: 0, openGrams: 0 };
    let text = `${fullPacks} paket`;
    if (openGrams > 0) text += ` + açıq ${openGrams} qr qalıb`;
    else if (fullPacks === 0) text = `${openGrams || remaining} qr qalıb`;
    return { ...wh, text, totalGrams: remaining, fullPacks, openGrams };
  }
  return { ...wh, text: remaining > 0 ? `${remaining} qr qalıb` : '0 qr qalıb', totalGrams: remaining };
}
