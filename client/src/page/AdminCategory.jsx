import React, { useContext, useState, useEffect } from 'react'
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import AdminCategoryList from '../components/AdminComponents/AdminCategoryList'
import CategoryModal from '../components/AdminComponents/CategoryModal';
import { ContextAdmin } from '../context/AdminContext';

// Sortable Category Item Component
const SortableCategoryItem = ({ category, handleModalToggle, setIsOpen }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: category._id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div ref={setNodeRef} style={style}>
            {/* Drag handle - only this area should be draggable */}
            <div {...attributes} {...listeners} className="cursor-move p-2 mb-2 bg-gray-100 rounded text-center text-gray-500 hover:bg-gray-200">
                <i className="bi bi-grip-vertical text-lg"></i>
                <span className="ml-2 text-sm">Sürüklə</span>
            </div>
            
            <AdminCategoryList
                handleModalToggle={handleModalToggle}
                category={category}
                setIsOpen={setIsOpen}
            />
        </div>
    );
};

const AdminCategory = () => {
    const { categories, updateCategoryOrderFunc, getCategoriesFunc } = useContext(ContextAdmin)
    const [isOpen, setIsOpen] = useState(false);
    const [editCategory, setEditCategory] = useState(null);
    const [FilterCategory, setFilterCategory] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    
    // Debug state changes
    useEffect(() => {
        console.log('AdminCategory state changed:', { isOpen, editCategory });
    }, [isOpen, editCategory]);
    
    // Load categories on component mount
    useEffect(() => {
        const loadCategories = async () => {
            try {
                setLoading(true);
                setError(null);
                console.log('Loading categories...');
                await getCategoriesFunc();
                console.log('Categories loaded successfully');
            } catch (err) {
                console.error('Error loading categories:', err);
                setError('Kateqoriyalar yüklənərkən xəta baş verdi');
            } finally {
                setLoading(false);
            }
        };
        
        loadCategories();
    }, [getCategoriesFunc]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // Only start dragging after 8px movement
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleModalToggle = (categoryToogle) => {
        console.log('handleModalToggle called with:', categoryToogle);
        console.log('Current isOpen state:', isOpen);
        if (categoryToogle) {
            // Editing existing category
            console.log('Setting editCategory to:', categoryToogle);
            setEditCategory(categoryToogle);
            setIsOpen(true);
        } else {
            // Adding new category
            console.log('Setting editCategory to null for new category');
            setEditCategory(null);
            setIsOpen(true);
        }
        console.log('Modal should now be open');
    };

    const [sectionInput, setsectionInput] = useState('')
    const handleChangeSectionInput = (e) => {
        setsectionInput(e.target.value)
        const filterRespons = categories.filter((category, index) => {
            return (
                category.name === e.target.value
            )
        })
        setFilterCategory(filterRespons)
    }

    // Handle drag end
    const handleDragEnd = async (event) => {
        const { active, over } = event;
        
        // Only process if we have both active and over elements
        if (!active || !over) {
            console.log('Drag end: missing active or over element');
            return;
        }
        
        console.log('Drag end event:', { active: active.id, over: over.id });

        // Only process if the position actually changed
        if (active.id !== over.id) {
            const oldIndex = categories.findIndex(cat => cat._id === active.id);
            const newIndex = categories.findIndex(cat => cat._id === over.id);
            
            if (oldIndex !== -1 && newIndex !== -1) {
                console.log('Moving category from index', oldIndex, 'to index', newIndex);

                const newCategories = arrayMove(categories, oldIndex, newIndex);
                console.log('New categories order:', newCategories);
                
                // Update order in backend
                try {
                    await updateCategoryOrderFunc(newCategories);
                    console.log('Category order updated successfully');
                } catch (error) {
                    console.error('Error updating category order:', error);
                }
            } else {
                console.log('Invalid indices found:', { oldIndex, newIndex });
            }
        } else {
            console.log('No change in position - same element');
        }
    };

    // Show loading state
    if (loading) {
        return (
            <div className='w-full h-[100vh] flex justify-center items-center pb-[100px] pt-[50px]'>
                <div className="text-center">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500 mx-auto mb-4"></div>
                    <p className="text-xl text-gray-600">Kateqoriyalar yüklənir...</p>
                </div>
            </div>
        );
    }
    
    // Show error state
    if (error) {
        return (
            <div className='w-full h-[100vh] flex justify-center items-center pb-[100px] pt-[50px]'>
                <div className="text-center">
                    <i className="bi bi-exclamation-triangle text-6xl text-red-500 mb-4"></i>
                    <h2 className="text-xl font-semibold text-gray-800 mb-2">Xəta baş verdi</h2>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <button 
                        onClick={() => window.location.reload()} 
                        className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                    >
                        Yenidən cəhd edin
                    </button>
                </div>
            </div>
        );
    }
    
    // Show empty state if no categories
    if (!categories || categories.length === 0) {
        return (
            <div className='w-full h-[100vh] flex justify-center items-center pb-[100px] pt-[50px]'>
                <div className="text-center">
                    <i className="bi bi-folder-x text-6xl text-gray-400 mb-4"></i>
                    <h2 className="text-xl font-semibold text-gray-800 mb-2">Kateqoriya tapılmadı</h2>
                    <p className="text-gray-600 mb-4">Hələ heç bir kateqoriya əlavə edilməyib</p>
                    <button 
                        onClick={() => handleModalToggle(null)} 
                        className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                    >
                        İlk Kateqoriyanı Əlavə Et
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className='w-full h-[100vh] flex justify-center pb-[100px] pt-[50px]'>
            <div className="p-4 bg-gray-100 w-full ">
                <div className='flex justify-between items-center max-[768px]:flex-col max-[768px]:items-start'>
                    <p className="text-2xl font-bold text-gray-800 mb-6">Kateqoriya Siyahısı</p>
                    <div className="mb-6">
                        <select
                            value={sectionInput}
                            onChange={handleChangeSectionInput}
                            id="filter"
                            className="block w-full px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        >
                            <option value="">Bütün Kateqoryalar</option>
                            {
                                categories && categories.map((category, index) => (
                                    <option key={index} value={category.name}>{category.name}</option>
                                ))
                            }
                        </select>
                    </div>
                    <button
                        onClick={() => handleModalToggle(null)}
                        className="mb-6 px-6 py-3 text-[14px] bg-orange-500 text-white font-semibold rounded-lg shadow-md hover:bg-orange-600 transition duration-300">
                        Kateqoriya Əlavə Et
                        <i className="fa-solid fa-plus pl-[10px]"></i>
                    </button>
                </div>
                
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={FilterCategory.length > 0 ? FilterCategory.map(cat => cat._id) : categories.map(cat => cat._id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 overflow-y-auto min-h-[35%] max-h-[100%] pb-[70px]">
                            {FilterCategory.length > 0 ?
                                FilterCategory.map((category, index) => (
                                    <SortableCategoryItem
                                        key={category._id}
                                        category={category}
                                        handleModalToggle={handleModalToggle}
                                        setIsOpen={setIsOpen}
                                    />
                                )) :
                                categories &&
                                categories.map((category, index) => (
                                    <SortableCategoryItem
                                        key={category._id}
                                        category={category}
                                        handleModalToggle={handleModalToggle}
                                        setIsOpen={setIsOpen}
                                    />
                                ))
                            }
                        </div>
                    </SortableContext>
                </DndContext>
            </div>
            {isOpen && (
                <CategoryModal
                    editCategory={editCategory}
                    handleModalToggle={handleModalToggle}
                    isOpen={isOpen}
                    setIsOpen={setIsOpen}
                    onClose={() => {
                        console.log('Modal closing, resetting states');
                        setIsOpen(false);
                        setEditCategory(null);
                    }}
                />
            )}
            {/* Debug info */}
            {process.env.NODE_ENV === 'development' && (
                <div className="fixed bottom-4 right-4 bg-black bg-opacity-75 text-white p-4 rounded-lg text-xs">
                    <div>isOpen: {isOpen ? 'true' : 'false'}</div>
                    <div>editCategory: {editCategory ? editCategory.name : 'null'}</div>
                </div>
            )}
        </div>
    )
}

export default AdminCategory