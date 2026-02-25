import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
    <div className="bg-white border rounded-2xl shadow-sm p-8 max-w-md w-full text-center">
      <div className="text-6xl font-extrabold text-orange-600">404</div>
      <h1 className="text-2xl font-bold text-gray-800 mt-3">Səhifə tapılmadı</h1>
      <p className="text-gray-500 mt-2">Axtardığınız səhifə mövcud deyil.</p>
      <Link
        to="/"
        className="inline-flex items-center justify-center mt-6 px-4 py-2 rounded-lg bg-orange-600 text-white font-semibold hover:bg-orange-500 transition"
      >
        Ana səhifə
      </Link>
    </div>
  </div>
);

export default NotFound;
