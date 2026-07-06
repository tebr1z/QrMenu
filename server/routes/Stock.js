import express from 'express';
import Product from '../model/ProductModal.js';
import { CheckToken } from '../middleware/CkeckToken.js';
import { isMasterAdmin } from '../utils/permissions.js';
import { calcUnitCost, isLowStock } from '../utils/stockUnits.js';

const router = express.Router();

router.use(CheckToken);

router.get('/low-stock', async (req, res) => {
    try {
        const products = await Product.find({})
            .select('name stockQuantity stockUnit portionSize portionUnit lowStockThreshold category')
            .populate('category', 'name')
            .lean();

        const low = products.filter((p) => isLowStock(p));
        res.json(low);
    } catch {
        res.status(500).json({ error: 'Az stok siyahısı alınmadı' });
    }
});

router.post('/AddStock/:id', async (req, res) => {
    try {
        const { addQuantity, addPurchasePrice } = req.body;
        const addQty = parseFloat(addQuantity) || 0;
        if (addQty <= 0) {
            return res.status(400).json({ error: 'Əlavə miqdar sıfırdan böyük olmalıdır' });
        }

        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ error: 'Məhsul tapılmadı' });
        }

        const newStock = (Number(product.stockQuantity) || 0) + addQty;
        const addedCost = parseFloat(addPurchasePrice) || 0;
        const newPurchase = (Number(product.purchasePrice) || 0) + addedCost;

        product.stockQuantity = newStock;
        product.purchasePrice = newPurchase;
        product.unitCost = calcUnitCost(newPurchase, newStock);
        await product.save();
        await product.populate('category');

        res.json({ message: 'Stok əlavə edildi', product });
    } catch {
        res.status(500).json({ error: 'Stok əlavə edilərkən xəta' });
    }
});

router.put('/UpdateStock/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { stockQuantity, purchasePrice, stockUnit, portionSize, portionUnit } = req.body;

        if (stockQuantity === undefined || purchasePrice === undefined) {
            return res.status(400).json({ error: 'Stok miqdarı və alınma qiyməti tələb olunur' });
        }

        const existing = await Product.findById(id);
        if (!existing) {
            return res.status(404).json({ error: 'Məhsul tapılmadı' });
        }

        const stockQty = parseFloat(stockQuantity) || 0;
        if (stockQty < (Number(existing.stockQuantity) || 0) && !isMasterAdmin(req.user?.Role)) {
            return res.status(403).json({ error: 'Stok azaltmaq yalnız Master Admin üçündür' });
        }

        const purchasePrc = parseFloat(purchasePrice) || 0;
        const unitCost = calcUnitCost(purchasePrc, stockQty);

        const updateFields = {
            stockQuantity: stockQty,
            purchasePrice: purchasePrc,
            unitCost,
        };
        if (stockUnit && ['piece', 'kg', 'g'].includes(stockUnit)) {
            updateFields.stockUnit = stockUnit;
        }
        if (portionSize !== undefined) {
            updateFields.portionSize = Math.max(0, parseFloat(portionSize) || 0);
            updateFields.portionUnit = portionUnit && ['piece', 'kg', 'g'].includes(portionUnit)
                ? portionUnit
                : 'g';
        }

        const product = await Product.findByIdAndUpdate(
            id,
            updateFields,
            { new: true }
        ).populate('category');

        res.status(200).json({ message: 'Stok məlumatları yeniləndi', product });
    } catch (error) {
        console.error('Stok yenilənərkən xəta:', error);
        res.status(500).json({ error: 'Stok yenilənərkən xəta baş verdi' });
    }
});

export default router;
