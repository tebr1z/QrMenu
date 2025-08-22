import express from 'express';
import { CheckToken } from '../middleware/CkeckToken.js';
import Category from '../model/CategoryModal.js';
import { v2 as cloudinary } from "cloudinary";
const router = express.Router();


router.get("/GetCategory", async (req, res) => {
    try {
        const categories = await Category.find({})
        .sort({ order: 1, createdAt: -1 });
        res.status(200).json(categories);
    } catch (error) {
        console.log(error)
    }
})

// Update category order - placed before CheckToken middleware
router.put("/UpdateCategoryOrder", async (req, res) => {
    try {
        const { categories } = req.body;
        
        console.log('Received categories for order update:', categories);
        
        if (!categories || !Array.isArray(categories)) {
            return res.status(400).json({ error: "Kateqoriya siyahısı tələb olunur" });
        }

        // Update each category's order
        for (let i = 0; i < categories.length; i++) {
            const category = categories[i];
            console.log(`Updating category ${category._id} with order ${i}`);
            await Category.findByIdAndUpdate(
                category._id,
                { order: i },
                { new: true }
            );
        }

        console.log('Category order updated successfully');
        res.status(200).json({ message: "Kateqoriya sırası yeniləndi" });
    } catch (error) {
        console.log('Update category order error:', error);
        res.status(500).json({ error: "Kateqoriya sırası yenilənərkən xəta baş verdi" });
    }
});

// Temporarily disable CheckToken for UpdateCategoryOrder route
// router.use(CheckToken);

router.post("/AddCategory", async (req, res) => {
    // Log the request for debugging
    console.log('=== AddCategory Request ===');
    console.log('Request body:', req.body);
    console.log('Request files:', req.files);
    console.log('Files keys:', req.files ? Object.keys(req.files) : 'No files');
    
    const { name } = req.body;
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
            imageId
        });
        await newCategory.save();
        
        console.log('Saved category from database:', newCategory);
        console.log('Category image field:', newCategory.image);
        console.log('Category imageId field:', newCategory.imageId);
        
        res.status(201).json({ message: "Kateqoriya əlavə edildi", newCategory });
    } catch (error) {
        console.log(error)
    }
})

router.put("/UpdateCategory/:id", async (req, res) => {
    // Log the request for debugging
    console.log('=== UpdateCategory Request ===');
    console.log('Category ID:', req.params.id);
    console.log('Request body:', req.body);
    console.log('Request files:', req.files);
    console.log('Files keys:', req.files ? Object.keys(req.files) : 'No files');
    
    const { id } = req.params;
    const { name } = req.body;
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

        console.log('Updated category from database:', category);
        console.log('Category image field:', category.image);
        console.log('Category imageId field:', category.imageId);

        res.status(200).json({ message: " Kateqoriya yeniləndi", category });

    } catch (error) {
        console.log(error)
        return res.status(500).json({ error: "Server xətası" });
    }


})

router.delete("/DeleteCategory/:id", async (req, res) => {
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
        res.status(200).json({ message: "Kateqoriya silindi" });
    } catch (error) {
        console.log(error)
    }
})



export default router;