import express from 'express';
import { v2 as cloudinary } from 'cloudinary';
import { CheckToken } from '../middleware/CkeckToken.js';
import { requireRole } from '../middleware/requireRole.js';
import { requirePermission } from '../middleware/requirePermission.js';
import { requireAnyPermission } from '../middleware/requireAnyPermission.js';
import { logAudit } from '../utils/auditLog.js';
import { calcUnitCost } from '../utils/stockUnits.js';
import mongoose from 'mongoose';
import Product from '../model/ProductModal.js';
import Category from "../model/CategoryModal.js";
import Table from '../model/TableModal.js';

const router = express.Router();

function toObjectId(val) {
    if (!val) return null;
    const id = val._id || val;
    const str = String(id);
    if (!mongoose.Types.ObjectId.isValid(str)) return null;
    return new mongoose.Types.ObjectId(str);
}

/** Set elementlərini DB üçün təmizlə */
function normalizeSetItems(raw) {
    if (!Array.isArray(raw)) return [];
    return raw.map((item) => {
        const productId = toObjectId(item?.productId);
        if (!productId) return null;
        const section = item?.section === 'internal' ? 'internal' : 'qr';
        const base = {
            productId,
            quantity: Math.max(1, Number(item?.quantity) || 1),
            section,
        };
        if (section === 'internal') {
            const linkedId = toObjectId(item?.linkedProductId) || productId;
            const deductAmount = Number(item?.deductAmount) || 0;
            const deductUnit = ['g', 'kg', 'piece'].includes(item?.deductUnit) ? item.deductUnit : 'g';
            return {
                ...base,
                linkedProductId: linkedId,
                deductAmount,
                deductUnit,
            };
        }
        return base;
    }).filter(Boolean);
}

function parseJsonField(val, fallback = []) {
    if (!val) return fallback;
    try {
        return typeof val === 'string' ? JSON.parse(val) : val;
    } catch {
        return fallback;
    }
}

function parseBooleanField(val, defaultValue = true) {
    if (val === undefined || val === null || val === '') return defaultValue;
    if (val === true || val === 'true') return true;
    if (val === false || val === 'false') return false;
    return defaultValue;
}

function validateProductPrice({ price, showInCustomerMenu, existingVisibleInMenu = true }) {
    const visibleInMenu = showInCustomerMenu !== undefined
        ? parseBooleanField(showInCustomerMenu, true)
        : existingVisibleInMenu !== false;

    let priceNum;
    if (price === undefined || price === null || price === '') {
        if (visibleInMenu) {
            return 'Qiymət daxil edin.';
        }
        priceNum = 0;
    } else {
        priceNum = parseFloat(price);
        if (Number.isNaN(priceNum)) {
            return 'Düzgün qiymət daxil edin.';
        }
    }

    if (priceNum < 0) {
        return 'Qiymət mənfi ola bilməz.';
    }
    if (visibleInMenu && priceNum <= 0) {
        return 'Menyuda görünən məhsulun qiyməti 0 ola bilməz.';
    }
    return null;
}

function parsePriceValue(price) {
    if (price === undefined || price === null || price === '') return 0;
    return parseFloat(price);
}

function parseStockPayload(body) {
    const stockQty = parseFloat(body.stockQuantity) || 0;
    const purchasePrc = parseFloat(body.purchasePrice) || 0;
    return {
        stockQuantity: stockQty,
        stockUnit: body.stockUnit || 'piece',
        portionSize: parseFloat(body.portionSize) || 0,
        portionUnit: body.portionUnit || body.stockUnit || 'piece',
        lowStockThreshold: parseFloat(body.lowStockThreshold) || 5,
        purchasePrice: purchasePrc,
        unitCost: calcUnitCost(purchasePrc, stockQty),
    };
}

router.get("/GetProduct", async (req, res) => {
    try {
        // Optimized: only select needed fields and populate category name
        const products = await Product.find({})
            .populate("category", "name image")
            .select("name price oldPrice category description image imageId freeMinutes freeMinutesForPS order stockQuantity stockUnit portionSize portionUnit lowStockThreshold purchasePrice unitCost salesCost showInCustomerMenu isSet setItems ingredients createdAt")
            .lean(); // Use lean() for better performance (returns plain JS objects)
        res.status(200).json(products)
    } catch (error) {
        if (process.env.NODE_ENV === 'development') {
            console.log(error)
        }
        res.status(500).json({ error: 'Məhsullar alınarkən xəta baş verdi' });
    }
})

router.get("/GetProduct/:name", async (req, res) => {
    const { name } = req.params;
    try {
        const categoryDoc = await Category.findOne({ name }).select("_id showInCustomerMenu").lean();
        if (!categoryDoc) {
            return res.status(404).json({ message: "Category not found" });
        }
        if (categoryDoc.showInCustomerMenu === false) {
            return res.status(404).json({ message: "Category not found" });
        }

        // Optimized: use lean() and select only needed fields
        const products = await Product.find({
            category: categoryDoc._id,
            showInCustomerMenu: { $ne: false },
        })
            .populate("category", "name image")
            .select("name price oldPrice category description image imageId freeMinutes freeMinutesForPS order stockQuantity stockUnit portionSize portionUnit lowStockThreshold purchasePrice unitCost salesCost showInCustomerMenu isSet setItems ingredients createdAt")
            .sort({ order: 1, createdAt: -1 })
            .lean();

        res.status(200).json(products)

    } catch (error) {
        if (process.env.NODE_ENV === 'development') {
            console.log(error)
        }
        res.status(500).json({ message: "Məhsullar alınarkən xəta baş verdi" });
    }
});

// router.use(CheckToken);
router.post("/AddProduct", CheckToken, requireAnyPermission('Product', 'edit', 'view'), async (req, res) => {
    // Log the request for debugging
    console.log('=== AddProduct Request ===');
    console.log('Request body:', req.body);
    console.log('Request files:', req.files);
    console.log('Files keys:', req.files ? Object.keys(req.files) : 'No files');
    
    const { name, price, oldPrice, category, description, freeMinutes, freeMinutesForPS, stockQuantity, purchasePrice, isSet, setItems, ingredients, showInCustomerMenu } = req.body;
    let imageProduct = req.files && req.files.imageProduct;
    let imageId = null;
    
    console.log('Extracted data:');
    console.log('- name:', name);
    console.log('- price:', price);
    console.log('- category:', category);
    console.log('- description:', description);
    console.log('- freeMinutes:', freeMinutes);
    console.log('- imageProduct:', imageProduct);

    if (!name || !category) {
        return res.status(422).json({ error: "Zəhmət olmasa, ad və kateqoriya seçin." });
    }

    const priceError = validateProductPrice({ price, showInCustomerMenu });
    if (priceError) {
        return res.status(422).json({ error: priceError });
    }

    if (imageProduct) {
        try {
            console.log('Uploading image to Cloudinary...');
            console.log('Image file:', imageProduct.name);
            console.log('Image temp path:', imageProduct.tempFilePath);
            console.log('Image size:', imageProduct.size, 'bytes');
            
            // Upload to Cloudinary
            const uploadImg = await cloudinary.uploader.upload(
                imageProduct.tempFilePath,
                {
                    use_filename: true,
                    folder: "Home",
                    resource_type: "auto",
                    transformation: [
                        { width: 800, height: 600, crop: "limit" }
                    ]
                }
            );

            console.log('Cloudinary upload successful:');
            console.log('URL:', uploadImg.url);
            console.log('Public ID:', uploadImg.public_id);
            console.log('Secure URL:', uploadImg.secure_url);
            
            // Use secure URL for better compatibility
            imageProduct = uploadImg.secure_url || uploadImg.url;
            imageId = uploadImg.public_id;
            
            console.log('Final image URL:', imageProduct);
            console.log('Final image ID:', imageId);
            
        } catch (error) {
            console.log('Image upload error:', error);
            console.log('Error details:', error.message);
            console.log('Error stack:', error.stack);
            return res.status(500).json({ error: "Şəkil yüklənərkən xəta baş verdi: " + error.message })
        }
    }

    try {
        console.log('Creating new product with data:');
        console.log('- name:', name);
        console.log('- price:', parseFloat(price));
        console.log('- category:', category);
        console.log('- description:', description || '');
        console.log('- image:', imageProduct ? imageProduct : undefined);
        console.log('- imageId:', imageId);
        console.log('- freeMinutes:', Number(freeMinutes) || 0);
        
        const stockFields = parseStockPayload(req.body);

        const isSetProduct = isSet === 'true' || isSet === true;
        const parsedSetItems = isSetProduct
            ? normalizeSetItems(parseJsonField(setItems, []))
            : [];

        const parsedIngredients = parseJsonField(ingredients, []);

        const newProduct = new Product({
            name,
            price: parsePriceValue(price),
            oldPrice: oldPrice !== undefined && oldPrice !== '' ? parseFloat(oldPrice) : 0,
            category,
            description: description || '',
            image: imageProduct ? imageProduct : undefined,
            imageId,
            freeMinutes: Number(freeMinutes) || 0,
            freeMinutesForPS: freeMinutesForPS || null,
            ...stockFields,
            showInCustomerMenu: parseBooleanField(showInCustomerMenu, true),
            isSet: isSetProduct,
            setItems: parsedSetItems,
            ingredients: parsedIngredients,
        })

        await newProduct.save()
        
        // Populate category before sending response
        await newProduct.populate('category')
        
        await logAudit(req, {
            action: 'create',
            resource: 'Product',
            resourceId: newProduct._id,
            summary: `Məhsul əlavə edildi: ${newProduct.name}`,
        });

        res.status(201).json({ message: "Məhsul əlavə edildi", newProduct })

    } catch (error) {
        console.log('AddProduct error:', error)
        return res.status(500).json({ error: "Məhsul əlavə edilərkən xəta baş verdi" })
    }
})

router.patch("/ToggleCustomerMenu/:id", CheckToken, requirePermission('Product', 'edit'), async (req, res) => {
    try {
        const { id } = req.params;
        const existing = await Product.findById(id);
        if (!existing) {
            return res.status(404).json({ error: 'Məhsul tapılmadı' });
        }
        const nextVisible = existing.showInCustomerMenu === false;
        const product = await Product.findByIdAndUpdate(
            id,
            { showInCustomerMenu: nextVisible },
            { new: true }
        ).populate('category');

        await logAudit(req, {
            action: 'update',
            resource: 'Product',
            resourceId: product._id,
            summary: nextVisible
                ? `Məhsul müştəri menyusunda göstərilir: ${product.name}`
                : `Məhsul müştəri menyusundan gizlədildi: ${product.name}`,
        });

        res.status(200).json({
            message: nextVisible ? 'Müştəri menyusunda göstərilir' : 'Müştəri menyusundan gizlədildi',
            showInCustomerMenu: nextVisible,
            product,
        });
    } catch (error) {
        console.error('ToggleCustomerMenu error:', error);
        res.status(500).json({ error: 'Görünürlük dəyişdirilərkən xəta baş verdi' });
    }
});

router.put("/UpdateSetItems/:id", CheckToken, requirePermission('Product', 'edit'), async (req, res) => {
    try {
        const { id } = req.params;
        const { isSet, setItems } = req.body;
        const existing = await Product.findById(id);
        if (!existing) {
            return res.status(404).json({ error: 'Məhsul tapılmadı' });
        }
        const isSetProduct = isSet === true || isSet === 'true';
        const raw = Array.isArray(setItems) ? setItems : parseJsonField(setItems, []);
        const normalized = isSetProduct ? normalizeSetItems(raw) : [];

        const product = await Product.findByIdAndUpdate(
            id,
            { isSet: isSetProduct, setItems: normalized },
            { new: true }
        ).populate('category');

        res.status(200).json({ message: 'Set saxlanıldı', product });
    } catch (error) {
        console.error('UpdateSetItems error:', error);
        res.status(500).json({ error: 'Set saxlanarkən xəta baş verdi' });
    }
});

router.put("/UpdateProduct/:id", CheckToken, requirePermission('Product', 'edit'), async (req, res) => {
    const { id } = req.params;
    
    // Log the request for debugging
    console.log('=== UpdateProduct Request ===');
    console.log('Product ID:', req.params.id);
    console.log('Request body:', req.body);
    console.log('Request files:', req.files);
    console.log('Files keys:', req.files ? Object.keys(req.files) : 'No files');
    
    const { name, price, oldPrice, category, description, freeMinutes, freeMinutesForPS, stockQuantity, purchasePrice, isSet, setItems, ingredients, showInCustomerMenu } = req.body;
    const imageProduct = req.files && req.files.imageProduct;
    let updateProduct = {};
    
    console.log('Extracted data:');
    console.log('- id:', id);
    console.log('- name:', name);
    console.log('- price:', price);
    console.log('- category:', category);
    console.log('- description:', description);
    console.log('- freeMinutes:', freeMinutes);
    console.log('- freeMinutesForPS:', freeMinutesForPS);
    console.log('- imageProduct:', imageProduct);

    if (!name || !category) {
        return res.status(422).json({ error: "Zəhmət olmasa, ad və kateqoriya seçin." });
    } else {
        const existingProduct = await Product.findById(id);
        if (!existingProduct) {
            return res.status(404).json({ error: "Məhsul tapılmadı" });
        }

        const priceError = validateProductPrice({
            price,
            showInCustomerMenu,
            existingVisibleInMenu: existingProduct.showInCustomerMenu,
        });
        if (priceError) {
            return res.status(422).json({ error: priceError });
        }

        const stockFields = parseStockPayload(req.body);
        if (
            stockFields.stockQuantity < (Number(existingProduct.stockQuantity) || 0) &&
            req.user?.Role !== 'master_admin'
        ) {
            return res.status(403).json({ error: 'Stok azaltmaq yalnız Master Admin üçündür' });
        }

        updateProduct.name = name;
        updateProduct.price = parsePriceValue(price);
        updateProduct.oldPrice = oldPrice !== undefined && oldPrice !== '' ? parseFloat(oldPrice) : 0;
        updateProduct.category = category;
        updateProduct.description = description || '';
        updateProduct.freeMinutes = Number(freeMinutes) || 0;
        updateProduct.freeMinutesForPS = freeMinutesForPS || null;
        Object.assign(updateProduct, stockFields);
        if (showInCustomerMenu !== undefined) {
            updateProduct.showInCustomerMenu = parseBooleanField(showInCustomerMenu, true);
        }

        const isSetProduct = isSet === 'true' || isSet === true;
        if (isSet !== undefined) {
            updateProduct.isSet = isSetProduct;
        }
        if (setItems !== undefined) {
            updateProduct.setItems = isSetProduct
                ? normalizeSetItems(parseJsonField(setItems, []))
                : [];
        }
        if (req.body.ingredients !== undefined) {
            updateProduct.ingredients = parseJsonField(req.body.ingredients, []);
        }
    }

    if (imageProduct) {
        const productImg = await Product.findById(id)
        try {
            console.log('Updating product image...');
            console.log('Old image ID:', productImg?.imageId);
            
            // Delete old image from Cloudinary if exists
            if (productImg && productImg.imageId) {
                console.log('Deleting old image from Cloudinary...');
                await cloudinary.uploader.destroy(productImg.imageId);
                console.log('Old image deleted successfully');
            }

            // Upload new image to Cloudinary
            console.log('Uploading new image to Cloudinary...');
            const uploadImg = await cloudinary.uploader.upload(
                imageProduct.tempFilePath,
                {
                    use_filename: true,
                    folder: "Home",
                    resource_type: "auto",
                    transformation: [
                        { width: 800, height: 600, crop: "limit" }
                    ]
                }
            );
            
            console.log('New image upload successful:');
            console.log('URL:', uploadImg.url);
            console.log('Public ID:', uploadImg.public_id);
            console.log('Secure URL:', uploadImg.secure_url);
            
            // Use secure URL for better compatibility
            updateProduct.image = uploadImg.secure_url || uploadImg.url;
            updateProduct.imageId = uploadImg.public_id;
            
            console.log('Final update image URL:', updateProduct.image);
            console.log('Final update image ID:', updateProduct.imageId);

        } catch (error) {
            console.log('Image upload error:', error);
            console.log('Error details:', error.message);
            console.log('Error stack:', error.stack);
            return res.status(500).json({ error: "Şəkil yüklənərkən xəta baş verdi: " + error.message })
        }
    }

    try {
        console.log('Final updateProduct object before database update:', updateProduct);
        
        const product = await Product.findByIdAndUpdate(
            { _id: id },
            { $set: updateProduct },
            { new: true }
        ).populate('category')

        if (!product) {
            return res.status(404).json({ error: "Məhsul tapılmadı" })
        }

        await logAudit(req, {
            action: 'update',
            resource: 'Product',
            resourceId: product._id,
            summary: `Məhsul yeniləndi: ${product.name}`,
        });

        res.status(200).json({ message: "Məhsul yeniləndi", product })

    } catch (error) {
        console.log('UpdateProduct error:', error)
        return res.status(500).json({ error: "Məhsul yenilənərkən xəta baş verdi" })
    }
})

router.delete("/DeleteProduct/:id", CheckToken, requireRole('master_admin'), async (req, res) => {
    const { id } = req.params;
    try {

        const productImg = await Product.findById(id)

        if (!productImg) {
            return res.status(404).json({ error: "Məhsul tapılmadı" })
        }

        if (productImg.imageId) {
            await cloudinary.uploader.destroy(productImg.imageId)
        }
        // ------------------------------
        const product = await Product.findByIdAndDelete(id)

        if (!product) {
            return res.status(404).json({ error: "Məhsul tapılmadı" })
        }

        await logAudit(req, {
            action: 'delete',
            resource: 'Product',
            resourceId: product._id,
            summary: `Məhsul silindi: ${productImg.name}`,
        });

        res.status(200).json({ message: "Məhsul silindi", product })

    } catch (error) {
        console.log(error)
        return res.status(500).json({ error: "Məhsul silinərkən xəta baş verdi" })
    }
})

router.get('/GetTables', async (req, res) => {
    try {
        const tables = await Table.find({});
        res.status(200).json(tables);
    } catch (error) {
        res.status(500).json({ error: "Masalar alınarkən xəta baş verdi" });
    }
});

router.post('/AddTable', async (req, res) => {
    const { name, hourlyPrice, extraItems } = req.body;
    if (!name || hourlyPrice === undefined) {
        return res.status(400).json({ error: "Masa adı və saatlıq qiymət tələb olunur" });
    }
    try {
        let parsedExtraItems = [];
        if (Array.isArray(extraItems)) {
            parsedExtraItems = extraItems;
        } else if (typeof extraItems === 'string') {
            try {
                parsedExtraItems = JSON.parse(extraItems);
            } catch (err) {
                parsedExtraItems = [];
            }
        }
        const newTable = new Table({ name, hourlyPrice, extraItems: parsedExtraItems });
        await newTable.save();
        res.status(201).json({ message: "Masa əlavə olundu", newTable });
    } catch (error) {
        res.status(500).json({ error: "Masa əlavə edilərkən xəta baş verdi" });
    }
});

router.delete('/DeleteTable/:id', async (req, res) => {
    try {
        const table = await Table.findByIdAndDelete(req.params.id);
        if (!table) return res.status(404).json({ error: "Masa tapılmadı" });
        res.status(200).json({ message: "Masa silindi", table });
    } catch (error) {
        res.status(500).json({ error: "Masa silinərkən xəta baş verdi" });
    }
});

router.put('/UpdateTable/:id', async (req, res) => {
    const { name, hourlyPrice, extraItems } = req.body;
    try {
        let parsedExtraItems;
        if (Array.isArray(extraItems)) {
            parsedExtraItems = extraItems;
        } else if (typeof extraItems === 'string') {
            try {
                parsedExtraItems = JSON.parse(extraItems);
            } catch (err) {
                parsedExtraItems = undefined;
            }
        }
        const table = await Table.findByIdAndUpdate(
            req.params.id,
            { name, hourlyPrice, ...(parsedExtraItems !== undefined ? { extraItems: parsedExtraItems } : {}) },
            { new: true }
        );
        if (!table) return res.status(404).json({ error: "Masa tapılmadı" });
        res.status(200).json({ message: "Masa yeniləndi", table });
    } catch (error) {
        res.status(500).json({ error: "Masa yenilənərkən xəta baş verdi" });
    }
});

router.patch('/:id/sales-cost', CheckToken, requireRole('master_admin'), async (req, res) => {
    try {
        const { salesCost } = req.body;
        const product = await Product.findByIdAndUpdate(
            req.params.id,
            { salesCost: Number(salesCost) || 0 },
            { new: true }
        ).select('name salesCost isSet');

        if (!product) {
            return res.status(404).json({ error: 'Məhsul tapılmadı' });
        }

        res.json({
            message: 'Maya dəyəri yeniləndi',
            product,
        });
    } catch (error) {
        res.status(500).json({ error: 'Maya dəyəri yenilənərkən xəta baş verdi' });
    }
});

// Update product order within category
router.put("/UpdateProductOrder", async (req, res) => {
    try {
        const { products, categoryId } = req.body;
        
        if (!products || !Array.isArray(products)) {
            return res.status(400).json({ error: "Məhsul siyahısı tələb olunur" });
        }

        if (!categoryId) {
            return res.status(400).json({ error: "Kateqoriya ID tələb olunur" });
        }

        // Optimized: Use bulk operations instead of individual updates
        const bulkOps = products.map((product, i) => ({
            updateOne: {
                filter: { _id: product._id },
                update: { $set: { order: i } }
            }
        }));

        await Product.bulkWrite(bulkOps);

        res.status(200).json({ message: "Məhsul sırası yeniləndi" });
    } catch (error) {
        if (process.env.NODE_ENV === 'development') {
            console.log('Update product order error:', error);
        }
        res.status(500).json({ error: "Məhsul sırası yenilənərkən xəta baş verdi" });
    }
});

export default router