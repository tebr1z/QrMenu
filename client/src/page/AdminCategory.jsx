import React, { useContext, useState } from 'react'
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
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            <AdminCategoryList
                handleModalToggle={handleModalToggle}
                category={category}
                setIsOpen={setIsOpen}
            />
        </div>
    );
};

const AdminCategory = () => {
    const { categories, updateCategoryOrderFunc } = useContext(ContextAdmin)
    const [isOpen, setIsOpen] = useState(false);
    const [editCategory, setEditCategory] = useState(null);
    const [FilterCategory, setFilterCategory] = useState([])

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleModalToggle = (categoryToogle) => {
        setIsOpen(!isOpen);
        setEditCategory(categoryToogle)
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
        
        console.log('Drag end event:', { active, over });

        if (active.id !== over.id) {
            const oldIndex = categories.findIndex(cat => cat._id === active.id);
            const newIndex = categories.findIndex(cat => cat._id === over.id);
            
            console.log('Moving category from index', oldIndex, 'to index', newIndex);

            const newCategories = arrayMove(categories, oldIndex, newIndex);
            console.log('New categories order:', newCategories);
            
            // Update order in backend
            await updateCategoryOrderFunc(newCategories);
        } else {
            console.log('No change in position');
        }
    };

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
            <CategoryModal
                editCategory={editCategory}
                handleModalToggle={handleModalToggle}
                isOpen={isOpen}
                setIsOpen={setIsOpen}
            />
        </div>
    )
}

export default AdminCategory