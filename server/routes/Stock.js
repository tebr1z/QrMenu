import express from 'express';
import Product from '../model/ProductModal.js';
import { CheckToken } from '../middleware/CkeckToken.js';

const router = express.Router();

router.use(CheckToken);

// Stok məlumatlarını yenilə
router.put('/UpdateStock/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { stockQuantity, purchasePrice } = req.body;

        if (stockQuantity === undefined || purchasePrice === undefined) {
            return res.status(400).json({ error: 'Stok miqdarı və alınma qiyməti tələb olunur' });
        }

        const stockQty = Number(stockQuantity) || 0;
        const purchasePrc = Number(purchasePrice) || 0;
        const unitCost = stockQty > 0 && purchasePrc > 0 ? purchasePrc / stockQty : 0;

        const product = await Product.findByIdAndUpdate(
            id,
            {
                stockQuantity: stockQty,
                purchasePrice: purchasePrc,
                unitCost: unitCost
            },
            { new: true }
        ).populate('category');

        if (!product) {
            return res.status(404).json({ error: 'Məhsul tapılmadı' });
        }

        res.status(200).json({ message: 'Stok məlumatları yeniləndi', product });
    } catch (error) {
        console.error('Stok yenilənərkən xəta:', error);
        res.status(500).json({ error: 'Stok yenilənərkən xəta baş verdi' });
    }
});

export default router;




