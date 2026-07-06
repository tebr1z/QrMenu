import React, { useState } from 'react';
import { publicApi } from '../utils/http';

const ComplaintBox = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!message.trim()) {
      toast.error('Şikayət mətnini yazın');
      return;
    }

    setIsSubmitting(true);
    try {
      await publicApi.post('/complaint', {
        message: message.trim(),
      });
      toast.success('Şikayətiniz qəbul edildi. Təşəkkür edirik.');
      setMessage('');
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
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed z-40 bottom-[4.75rem] right-3 sm:right-5 max-w-[calc(100vw-1.5rem)] bg-white border border-rose-200 text-rose-700 shadow-md hover:shadow-lg hover:bg-rose-50 rounded-full px-3 sm:px-4 py-2.5 flex items-center gap-2 text-xs sm:text-sm font-semibold transition-all duration-200"
        aria-label="Şikayət qutusu"
      >
        <i className="bi bi-chat-left-text-fill text-base text-rose-500 shrink-0"></i>
        <span className="truncate">Şikayət qutusu</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
          <div
            className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-labelledby="complaint-title"
          >
            <div className="bg-gradient-to-r from-rose-600 to-red-600 px-4 sm:px-6 py-4 flex justify-between items-center shrink-0">
              <h2 id="complaint-title" className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <i className="bi bi-chat-left-text-fill"></i>
                Şikayət qutusu
              </h2>
              <button
                type="button"
                onClick={() => !isSubmitting && setIsOpen(false)}
                className="text-white/90 hover:text-white p-2 -mr-1 rounded-lg hover:bg-white/10 transition min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Bağla"
              >
                <i className="bi bi-x-lg text-xl"></i>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto">
              <p className="text-sm text-gray-600 leading-relaxed">
                Narahatlığınızı bizə yazın. Ad və nömrə tələb olunmur.
              </p>

              <div>
                <label htmlFor="complaint-message" className="block text-sm font-semibold text-gray-700 mb-1">
                  Şikayətiniz *
                </label>
                <textarea
                  id="complaint-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  maxLength={2000}
                  required
                  placeholder="Nə baş verib, qısa yazın..."
                  className="w-full px-4 py-3 text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none resize-none"
                />
                <p className="text-xs text-gray-400 mt-1 text-right">{message.length}/2000</p>
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2 pb-[env(safe-area-inset-bottom)]">
                <button
                  type="button"
                  onClick={() => !isSubmitting && setIsOpen(false)}
                  className="w-full sm:flex-1 px-4 py-3.5 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition min-h-[48px]"
                >
                  Ləğv et
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:flex-1 px-4 py-3.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 text-white font-semibold hover:from-rose-500 hover:to-red-500 transition disabled:opacity-50 flex items-center justify-center gap-2 min-h-[48px]"
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

export default ComplaintBox;
