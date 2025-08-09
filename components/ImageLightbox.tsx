import React from 'react';
import type { StudentWithEnrollment } from '../types';

interface ImageLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  student: StudentWithEnrollment | null;
}

const ImageLightbox: React.FC<ImageLightboxProps> = ({ isOpen, onClose, student }) => {
  if (!isOpen || !student || !student.photo_url) return null;

  const imageUrl = student.photo_url;
  const studentName = `${student.prenom || ''} ${student.nom || ''}`;
  const className = student.enrollment?.className || student.classe_ref;
  const title = className ? `${studentName} - ${className}` : studentName;


  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 transition-opacity" 
      onClick={onClose}
      aria-labelledby="lightbox-title" 
      role="dialog" 
      aria-modal="true"
    >
      <div 
        className="bg-white rounded-lg shadow-xl transform transition-all p-4 max-w-lg w-full"
        onClick={e => e.stopPropagation()}
      >
        <div className="relative text-center pb-3">
          <h3 className="text-lg font-medium text-gray-900 px-8" id="lightbox-title">{title}</h3>
          <button
            type="button"
            className="absolute top-0 right-0 text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 ml-auto inline-flex items-center"
            onClick={onClose}
            aria-label="Close modal"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
          </button>
        </div>
        <div className="flex justify-center items-center">
          <img src={imageUrl} alt={`Photo de ${studentName}`} className="max-w-full max-h-[70vh] object-contain" />
        </div>
      </div>
    </div>
  );
};

export default ImageLightbox;