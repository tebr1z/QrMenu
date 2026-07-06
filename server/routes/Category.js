import express from 'express';
import { CheckToken } from '../middleware/CkeckToken.js';
import { requirePermission } from '../middleware/requirePermission.js';
import { logAudit } from '../utils/auditLog.js';
import Category from '../model/CategoryModal.js';
import { v2 as cloudinary } from "cloudinary";
const router = express.Router();

function parseBooleanField(val, defaultValue = true) {
    if (val === undefined || val === null || val === '') return defaultValue;
    if (val === true || val === 'true') return true;
    if (val === false || val === 'false') return false;
    return defaultValue;
}

router.get("/GetCategory", async (req, res) => {
    try {
        // Optimized: use lean() for better performance
        const categories = await Category.find({})
            .select("name image imageId order showInCustomerMenu createdAt")
            .sort({ order: 1, createdAt: -1 })
            .lean();
        res.status(200).json(categories);
    } catch (error) {
        if (process.env.NODE_ENV === 'development') {
            console.log(error)
        }
        res.status(500).json({ error: 'Kateqoriyalar alınarkən xəta baş verdi' });
    }
})

// Update category order - placed before CheckToken middleware
router.put("/UpdateCategoryOrder", CheckToken, requirePermission('Category', 'edit'), async (req, res) => {
    try {
        const { categories } = req.body;
        
        if (!categories || !Array.isArray(categories)) {
            return res.status(400).json({ error: "Kateqoriya siyahısı tələb olunur" });
        }

        // Optimized: Use bulk operations instead of individual updates
        const bulkOps = categories.map((category, i) => ({
            updateOne: {
                filter: { _id: category._id },
                update: { $set: { order: i } }
            }
        }));

        await Category.bulkWrite(bulkOps);

        res.status(200).json({ message: "Kateqoriya sırası yeniləndi" });
    } catch (error) {
        if (process.env.NODE_ENV === 'development') {
            console.log('Update category order error:', error);
        }
        res.status(500).json({ error: "Kateqoriya sırası yenilənərkən xəta baş verdi" });
    }
});

// Temporarily disable CheckToken for UpdateCategoryOrder route
// router.use(CheckToken);

router.post("/AddCategory", CheckToken, requirePermission('Category', 'edit'), async (req, res) => {
    // Log the request for debugging
    console.log('=== AddCategory Request ===');
    console.log('Request body:', req.body);
    console.log('Request files:', req.files);
    console.log('Files keys:', req.files ? Object.keys(req.files) : 'No files');
    
    const { name, showInCustomerMenu } = req.body;
    let imageCategory = req.files && req.files.imageCategory;
    let imageId = null;
    
    console.log('Extracted data:');
    console.log('- name:', name);
    console.log('- imageCategory:', imageCategory);
    
    if (!name) {
        return res.status(422).json({ error: "Zəhmət olmasa, bir ad daxil edin" });
    }

    if (imageCategory) {
        try {
            console.log('Uploading category image to Cloudinary...');
            console.log('Image file:', imageCategory.name);
            console.log('Image temp path:', imageCategory.tempFilePath);
            console.log('Image size:', imageCategory.size, 'bytes');
            
            // Upload to Cloudinary
            const uploadImg = await cloudinary.uploader.upload(
                imageCategory.tempFilePath,
                {
                    use_filename: true,
                    folder: "Home",
                    resource_type: "auto",
                    transformation: [
                        { width: 400, height: 400, crop: "fill" }
                    ]
                }
            );

            console.log('Cloudinary upload successful:');
            console.log('URL:', uploadImg.url);
            console.log('Public ID:', uploadImg.public_id);
            console.log('Secure URL:', uploadImg.secure_url);
            
            // Use secure URL for better compatibility
            imageCategory = uploadImg.secure_url || uploadImg.url;
            imageId = uploadImg.public_id;
            
            console.log('Final image URL:', imageCategory);
            console.log('Final image ID:', imageId);
            
        } catch (error) {
            console.log('Image upload error:', error);
            console.log('Error details:', error.message);
            console.log('Error stack:', error.stack);
            return res.status(500).json({ error: "Şəkil yüklənərkən xəta baş verdi: " + error.message });
        }
    }

    try {
        console.log('Creating new category with data:');
        console.log('- name:', name);
        console.log('- image:', imageCategory ? imageCategory : undefined);
        console.log('- imageId:', imageId);
        
        const newCategory = new Category({
            name,
            image: imageCategory ? imageCategory : undefined,
            imageId,
            showInCustomerMenu: parseBooleanField(showInCustomerMenu, true),
        });
        await newCategory.save();
        
        await logAudit(req, {
            action: 'create',
            resource: 'Category',
            resourceId: newCategory._id,
            summary: `Kateqoriya əlavə edildi: ${newCategory.name}`,
        });

        res.status(201).json({ message: "Kateqoriya əlavə edildi", newCategory });
    } catch (error) {
        console.log(error)
    }
})

router.put("/UpdateCategory/:id", CheckToken, requirePermission('Category', 'edit'), async (req, res) => {
    // Log the request for debugging
    console.log('=== UpdateCategory Request ===');
    console.log('Category ID:', req.params.id);
    console.log('Request body:', req.body);
    console.log('Request files:', req.files);
    console.log('Files keys:', req.files ? Object.keys(req.files) : 'No files');
    
    const { id } = req.params;
    const { name, showInCustomerMenu } = req.body;
    let imageCategory = req.files && req.files.imageCategory;

    let updateCategory = {};
    
    console.log('Extracted data:');
    console.log('- id:', id);
    console.log('- name:', name);
    console.log('- imageCategory:', imageCategory);

    if (name) {
        updateCategory.name = name;
    } else {
        return res.status(422).json({ error: "Zəhmət olmasa, bir ad daxil edin" });
    }
    if (req.body.showInCustomerMenu !== undefined) {
        updateCategory.showInCustomerMenu = parseBooleanField(req.body.showInCustomerMenu, true);
    }
    if (imageCategory) {

        const categoryImage = await Category.findById(id);

        try {

            if (categoryImage.imageId) {
                await cloudinary.uploader.destroy(categoryImage.imageId);
            }

            const uploadImg = await cloudinary.uploader.upload(
                imageCategory.tempFilePath,
                {
                    use_filename: true,
                    folder: "Home",
                }
            );

            imageCategory = uploadImg.url;
            updateCategory.image = imageCategory;
            updateCategory.imageId = uploadImg.public_id;
        } catch (error) {
            console.log(error);
            return res.status(500).json({ error: "Şəkil yüklənərkən xəta baş verdi" });
        }
    }


    try {
        console.log('Final updateCategory object before database update:', updateCategory);

        const category = await Category.findByIdAndUpdate(
            {
                _id: id,
            },
            {
                $set: updateCategory
            },
            { new: true }
        );

        if (!category) {
            return res.status(404).json({ message: "Kateqoriya tapılmadı" });
        }

        await logAudit(req, {
            action: 'update',
            resource: 'Category',
            resourceId: category._id,
            summary: `Kateqoriya yeniləndi: ${category.name}`,
        });

        res.status(200).json({ message: " Kateqoriya yeniləndi", category });

    } catch (error) {
        console.log(error)
        return res.status(500).json({ error: "Server xətası" });
    }


})

router.patch("/ToggleCustomerMenu/:id", CheckToken, requirePermission('Category', 'edit'), async (req, res) => {
    try {
        const { id } = req.params;
        const existing = await Category.findById(id);
        if (!existing) {
            return res.status(404).json({ error: 'Kateqoriya tapılmadı' });
        }
        const nextVisible = existing.showInCustomerMenu === false;
        const category = await Category.findByIdAndUpdate(
            id,
            { showInCustomerMenu: nextVisible },
            { new: true }
        );

        await logAudit(req, {
            action: 'update',
            resource: 'Category',
            resourceId: category._id,
            summary: nextVisible
                ? `Kateqoriya müştəri menyusunda göstərilir: ${category.name}`
                : `Kateqoriya müştəri menyusundan gizlədildi: ${category.name}`,
        });

        res.status(200).json({
            message: nextVisible ? 'Müştəri menyusunda göstərilir' : 'Müştəri menyusundan gizlədildi',
            showInCustomerMenu: nextVisible,
            category,
        });
    } catch (error) {
        console.error('ToggleCustomerMenu error:', error);
        res.status(500).json({ error: 'Görünürlük dəyişdirilərkən xəta baş verdi' });
    }
});

router.delete("/DeleteCategory/:id", CheckToken, requirePermission('Category', 'delete'), async (req, res) => {
    try {
        const { id } = req.params;
        const categoryImage = await Category.findById(id);

        if (!categoryImage) {
            return res.status(404).json({ message: "Kateqoriya tapılmadı" });
        }

        if (categoryImage.imageId) {
            await cloudinary.uploader.destroy(categoryImage.imageId);
        }

        const category = await Category.findByIdAndDelete(id);
        if (!category) {
            return res.status(404).json({ message: "Kateqoriya tapılmadı" });
        }

        await logAudit(req, {
            action: 'delete',
            resource: 'Category',
            resourceId: categoryImage._id,
            summary: `Kateqoriya silindi: ${categoryImage.name}`,
        });

        res.status(200).json({ message: "Kateqoriya silindi" });
    } catch (error) {
        console.log(error)
    }
})



export default router;