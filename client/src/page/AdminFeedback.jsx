import React, { useState, useEffect, useContext } from 'react';
import { ContextUser } from '../context/CheckUserContext';
import Loading from '../components/Loading';

const AdminFeedback = () => {
  const { apiClient } = useContext(ContextUser);
  const [feedbacks, setFeedbacks] = useState([]);
  const [allFeedbacks, setAllFeedbacks] = useState([]);
  const [selectedRating, setSelectedRating] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const fetchFeedbacks = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/feedback');
      
      // Orta reytinq hesabla və sırala
      const sortedFeedbacks = response.data
        .map(feedback => ({
          ...feedback,
          averageRating: (
            feedback.foodRating + 
            feedback.cleanlinessRating + 
            feedback.staffRating
          ) / 3
        }))
        .sort((a, b) => b.averageRating - a.averageRating); // Yüksəkdən aşağıya
      
      setAllFeedbacks(sortedFeedbacks);
      setFeedbacks(sortedFeedbacks);
    } catch (error) {
      console.error('Feedback-ləri gətirərkən xəta:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('az-AZ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const StarDisplay = ({ rating }) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <i
            key={star}
            className={`bi ${
              star <= rating ? 'bi-star-fill text-yellow-400' : 'bi-star text-gray-300'
            } text-lg`}
          ></i>
        ))}
      </div>
    );
  };

  const getRatingCategory = (rating) => {
    if (rating >= 4.5) return 5;
    if (rating >= 3.5) return 4;
    if (rating >= 2.5) return 3;
    if (rating >= 1.5) return 2;
    return 1;
  };

  const handleFilterByRating = (rating) => {
    if (selectedRating === rating) {
      // Eyni buttona yenidən klikləndikdə filter-i ləğv et
      setSelectedRating(null);
      setFeedbacks(allFeedbacks);
    } else {
      setSelectedRating(rating);
      const filtered = allFeedbacks.filter(feedback => {
        const category = getRatingCategory(feedback.averageRating);
        return category === rating;
      });
      setFeedbacks(filtered);
    }
  };

  const getCountByRating = (rating) => {
    return allFeedbacks.filter(feedback => {
      const category = getRatingCategory(feedback.averageRating);
      return category === rating;
    }).length;
  };

  if (loading) {
    return <Loading />;
  }

  const hasAnyFeedback = allFeedbacks.length > 0;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8 text-gray-800">Geri Bildirimlər</h1>

      {/* Filter Buttons */}
      {hasAnyFeedback && (
        <div className="mb-6 flex flex-wrap gap-3">
          <button
            onClick={() => handleFilterByRating(null)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedRating === null
                ? 'bg-orange-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Hamısı ({allFeedbacks.length})
          </button>
          {[5, 4, 3, 2, 1].map((rating) => {
            const count = getCountByRating(rating);
            if (count === 0) return null;
            return (
              <button
                key={rating}
                onClick={() => handleFilterByRating(rating)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  selectedRating === rating
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <div className="flex items-center gap-1">
                  {[...Array(rating)].map((_, i) => (
                    <i key={i} className="bi bi-star-fill text-yellow-400 text-sm"></i>
                  ))}
                </div>
                <span>({count})</span>
              </button>
            );
          })}
        </div>
      )}

      {!hasAnyFeedback ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm">
          <i className="bi bi-inbox text-6xl text-gray-300 mb-4"></i>
          <p className="text-gray-500 text-lg">Hələ geri bildirim yoxdur</p>
        </div>
      ) : feedbacks.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm">
          <i className="bi bi-funnel text-6xl text-gray-300 mb-4"></i>
          <p className="text-gray-500 text-lg">Bu filter üçün geri bildirim tapılmadı</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {feedbacks.map((feedback) => (
            <div
              key={feedback._id}
              className="bg-white rounded-xl shadow-md p-6 border-l-4 border-orange-500 hover:shadow-lg transition-shadow"
            >
              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-gray-500">
                    {formatDate(feedback.createdAt)}
                  </span>
                  <div className="flex items-center gap-1 bg-orange-50 px-2 py-1 rounded-full">
                    <i className="bi bi-star-fill text-yellow-400 text-xs"></i>
                    <span className="text-xs font-semibold text-orange-700">
                      {feedback.averageRating.toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {/* Yemək Reytinqi */}
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">
                    Yemək Reytinqi
                  </label>
                  <StarDisplay rating={feedback.foodRating} />
                </div>

                {/* Temizlik Reytinqi */}
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">
                    Temizlik Reytinqi
                  </label>
                  <StarDisplay rating={feedback.cleanlinessRating} />
                </div>

                {/* Personel Reytinqi */}
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-2 block">
                    Personel Reytinqi
                  </label>
                  <StarDisplay rating={feedback.staffRating} />
                </div>

                {/* Mesaj */}
                {feedback.message && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <label className="text-sm font-semibold text-gray-700 mb-2 block">
                      Mesaj
                    </label>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {feedback.message}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminFeedback;

