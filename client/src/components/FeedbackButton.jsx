import React, { useState } from 'react';
import { publicApi } from '../utils/http';
import { toast } from 'react-toastify';

const FeedbackButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [foodRating, setFoodRating] = useState(0);
  const [cleanlinessRating, setCleanlinessRating] = useState(0);
  const [staffRating, setStaffRating] = useState(0);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (foodRating === 0 || cleanlinessRating === 0 || staffRating === 0) {
      toast.error('Zəhmət olmasa bütün reytinqləri seçin');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await publicApi.post('/feedback', {
        foodRating,
        cleanlinessRating,
        staffRating,
        message: message.trim()
      });
      
      toast.success('Geri bildiriminiz uğurla göndərildi!');
      // Reset form
      setFoodRating(0);
      setCleanlinessRating(0);
      setStaffRating(0);
      setMessage('');
      setIsOpen(false);
    } catch (error) {
      console.error('Feedback göndərilərkən xəta:', error);
      toast.error(error.response?.data?.error || 'Xəta baş verdi. Zəhmət olmasa yenidən cəhd edin.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const StarRating = ({ rating, setRating, label }) => {
    return (
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-3">{label}</label>
        <div className="flex gap-2 justify-center">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              className="focus:outline-none transition-transform hover:scale-110"
            >
              <i
                className={`bi ${
                  star <= rating ? 'bi-star-fill text-yellow-400' : 'bi-star text-gray-300'
                } text-3xl`}
              ></i>
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Feedback Button - User-friendly design */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed z-40 bottom-20 right-5 bg-white border border-gray-200 shadow-md rounded-full px-4 py-2.5 flex items-center gap-2 text-gray-700 hover:shadow-lg hover:bg-gray-50 transition-all duration-200 text-sm font-normal"
        aria-label="Geri bildirim edin"
      >
        <i className="bi bi-chat-dots text-base text-gray-600"></i>
        <span className="text-gray-700">Geri bildirim</span>
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center rounded-t-2xl">
              <h2 className="text-2xl font-bold text-gray-800">Geri Bildirim</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
                aria-label="Bağla"
              >
                <i className="bi bi-x-lg text-2xl"></i>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              {/* Yemək Reytinqi */}
              <StarRating
                rating={foodRating}
                setRating={setFoodRating}
                label="Yemək Reytinqi"
              />

              {/* Temizlik Reytinqi */}
              <StarRating
                rating={cleanlinessRating}
                setRating={setCleanlinessRating}
                label="Temizlik Reytinqi"
              />

              {/* Personel Reytinqi */}
              <StarRating
                rating={staffRating}
                setRating={setStaffRating}
                label="Personel Reytinqi"
              />

              {/* Mesaj */}
              <div className="mb-6">
                <label htmlFor="message" className="block text-sm font-semibold text-gray-700 mb-2">
                  Mesaj (İstəyə bağlı)
                </label>
                <textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  maxLength={500}
                  placeholder="Geri bildiriminizi yazın..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none resize-none"
                />
                <p className="text-xs text-gray-500 mt-1 text-right">{message.length}/500</p>
              </div>

              {/* Submit Button */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                >
                  Ləğv et
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg font-semibold hover:from-orange-600 hover:to-orange-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center">
                      <i className="bi bi-hourglass-split animate-spin mr-2"></i>
                      Göndərilir...
                    </span>
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

export default FeedbackButton;

