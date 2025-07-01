import React, { useContext, useState, useEffect } from 'react';
import { ContextAdmin } from '../context/AdminContext';
import Loading from '../components/Loading';
const AdminContact = () => {
    const { contactData, contactLoading, updateContactFunc, showContactOrWork, showContactOrWorkFunc } = useContext(ContextAdmin)

    const [contactId, setcontactId] = useState()
    const [contactInput, setcontactInput] = useState({
        wifiName: '',
        wifiPassword: '',
        location: '',
        phone: '',
        day: []
    });

    useEffect(() => {
        if (contactData) {
            setcontactInput({
                wifiName: contactData.wifiName || '',
                wifiPassword: contactData.wifiPassword || '',
                location: contactData.location || '',
                phone: contactData.phone || '',
                day: contactData.day || []
            });
            setcontactId(contactData._id || '')
        }
    }, [contactData]);

    const handleChangeInput = (event) => {
        setcontactInput({
            ...contactInput,
            [event.target.name]: event.target.value
        })
    }

    const handleChangeDays = (index, name, value) => {
        const updatedDays = [...contactInput.day];

        updatedDays[index][name] = value

        setcontactInput({
            ...contactInput,
            day: updatedDays
        })
    }



    if (contactLoading) {
        return < Loading />
    }

    return (
        <div className=' w-full h-[100vh] flex justify-center items-center'>

            {
                showContactOrWork ?
                    <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
                        <h2 className="text-xl font-semibold text-gray-800 mb-6 text-center">İş Saatları Redaktə Et</h2>
                        <table className="w-full table-auto border-collapse border border-gray-200">
                            <thead>
                                <tr className="bg-gray-100">
                                    <th className="border border-gray-200 px-4 py-2 text-left">Gün</th>
                                    <th className="border border-gray-200 px-4 py-2 text-center">Açılış Vaxtı</th>
                                    <th className="border border-gray-200 px-4 py-2 text-center">Bağlanış Vaxtı</th>
                                </tr>
                            </thead>
                            <tbody>
                                {contactInput.day.map((day, index) => (
                                    <tr key={index} className="hover:bg-gray-50">
                                        <td className="border border-gray-200 px-4 py-2">
                                            {day.name}
                                        </td>
                                        <td className="border border-gray-200 px-4 py-2 text-center">
                                            <input
                                                type="time"
                                                value={day.openingTime}
                                                onChange={(e) =>
                                                    handleChangeDays(index, "openingTime", e.target.value)
                                                }
                                                className="w-full px-2 py-1 border rounded focus:ring-2 focus:ring-orange-500 focus:outline-none"
                                            />
                                        </td>
                                        <td className="border border-gray-200 px-4 py-2 text-center">
                                            <input
                                                type="time"
                                                value={day.closingTime}
                                                onChange={(e) =>
                                                    handleChangeDays(index, 'closingTime', e.target.value)
                                                }
                                                className="w-full px-2 py-1 border rounded focus:ring-2 focus:ring-orange-500 focus:outline-none"
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="mt-6 flex flex-col justify-end">
                            <button
                                onClick={() => updateContactFunc(contactInput, contactId)}
                                className="bg-orange-500 text-white px-6 py-2 rounded hover:bg-orange-600 transition duration-300"
                            >
                                Saxla
                            </button>
                            <button
                                onClick={showContactOrWorkFunc}
                                className="w-full  text-black py-2 rounded-lg hover:bg-orange-300 transition duration-300 mt-[10px]"
                            >
                                Əlaqə Məlumatları
                            </button>
                        </div>
                    </div> :
                    <div className='w-[400px] p-6 bg-white rounded-lg shadow-lg'>
                        <h2 className="text-xl font-semibold text-gray-800 mb-6 text-center">
                            Əlaqə Məlumatları
                        </h2>
                        {/* Wi-Fi Adı */}
                        <div className='mb-4'>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Wi-Fi Adı
                            </label>
                            <input
                                value={contactInput.wifiName}
                                onChange={handleChangeInput}
                                name="wifiName"
                                type="text"
                                placeholder="Wi-Fi adını daxil edin"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                            />
                        </div>
                        {/* Wi-Fi Şifrə */}
                        <div className='mb-4'>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Wi-Fi Şifrə
                            </label>
                            <input
                                value={contactInput.wifiPassword}
                                onChange={handleChangeInput}
                                name="wifiPassword"
                                type="text"
                                placeholder="Wi-Fi şifrəsini daxil edin"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                            />
                        </div>
                        {/* Adres */}
                        <div className='mb-4'>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Ünvan
                            </label>
                            <input
                                value={contactInput.location}
                                onChange={handleChangeInput}
                                name="location"
                                type="text"
                                placeholder="Ünvanı daxil edin"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                            />
                        </div>
                        {/* Telefon */}
                        <div className='mb-4'>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Telefon
                            </label>
                            <input
                                value={contactInput.phone}
                                onChange={handleChangeInput}
                                name="phone"
                                type="tel"
                                placeholder="Telefon nömrəsini daxil edin"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                            />
                        </div>
                        {/* Submit Button */}
                        <button
                            onClick={() => updateContactFunc(contactInput, contactId)}
                            className="w-full bg-orange-500 text-white py-2 rounded-lg hover:bg-orange-600 transition duration-300"
                        >
                            Məlumatları Yadda Saxla
                        </button>
                        <button
                            onClick={showContactOrWorkFunc}
                            className="w-full  text-black py-2 rounded-lg hover:bg-orange-300 transition duration-300 mt-[10px]"
                        >
                            İş saatları
                        </button>
                    </div>
            }



        </div>
    );
};

export default AdminContact;
