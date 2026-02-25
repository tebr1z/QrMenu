import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const api = axios.create({
  baseURL: import.meta.env.VITE_API || '/api',
});

const CustomSetButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [setDescription, setSetDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!setDescription.trim()) {
      toast.error('Set haqqında məlumatı doldurun');
      return;
    }
    if (!phone.trim()) {
      toast.error('Əlaqə nömrəsini daxil edin');
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post('/setrequest', {
        customerName: customerName.trim(),
        setDescription: setDescription.trim(),
        phone: phone.trim(),
      });
      toast.success('Sorğunuz qeydə alındı. Tezliklə sizinlə əlaqə saxlayacağıq.');
      setCustomerName('');
      setSetDescription('');
      setPhone('');
      setIsOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Göndərilərkən xəta baş verdi');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed z-40 bottom-20 right-5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg hover:shadow-xl hover:from-violet-500 hover:to-indigo-500 rounded-full px-5 py-3 flex items-center gap-2.5 font-semibold text-sm transition-all duration-200 border-0"
        aria-label="Öz setini özün yarat"
      >
        <i className="bi bi-palette text-lg"></i>
        <span>Öz setini özün yarat</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <i className="bi bi-palette"></i>
                Öz setini özün yarat
              </h2>
              <button
                type="button"
                onClick={() => !isSubmitting && setIsOpen(false)}
                className="text-white/90 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
                aria-label="Bağla"
              >
                <i className="bi bi-x-lg text-xl"></i>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                İstədiyiniz set haqqında məlumatı yazın. Sizinlə əlaqə saxlayacağıq.
              </p>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Adınız (isteğe bağlı)</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Adınız"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Əlaqə nömrəsi *</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+994 XX XXX XX XX"
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">İstədiyiniz set haqqında məlumat *</label>
                <textarea
                  value={setDescription}
                  onChange={(e) => setSetDescription(e.target.value)}
                  rows={4}
                  required
                  placeholder="Məs: 2 nəfərlik set, vegetarian, şirniyyat daxil..."
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => !isSubmitting && setIsOpen(false)}
                  className="flex-1 px-4 py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition"
                >
                  Ləğv et
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold hover:from-violet-500 hover:to-indigo-500 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Göndərilir...
                    </>
                  ) : (
                    'Göndər'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default CustomSetButton;
