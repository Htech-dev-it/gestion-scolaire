import React, { useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';
import type { Resource } from '../types';

interface ResourceViewerModalProps {
    isOpen: boolean;
    onClose: () => void;
    resourceId: number;
}

// Helper function to convert base64 to a Blob
const base64ToBlob = (base64: string, mimeType: string): Blob => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
};


const ResourceViewerModal: React.FC<ResourceViewerModalProps> = ({ isOpen, onClose, resourceId }) => {
    const [resource, setResource] = useState<Resource | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [objectUrl, setObjectUrl] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && resourceId) {
            setIsLoading(true);
            setObjectUrl(null); // Reset on new resource
            apiFetch(`/resources/${resourceId}`)
                .then(data => setResource(data))
                .catch(err => console.error(err))
                .finally(() => setIsLoading(false));
        }
    }, [isOpen, resourceId]);

    // Create a Blob URL for PDF files to ensure reliable rendering
    useEffect(() => {
        if (resource?.file_content && resource.mime_type === 'application/pdf') {
            try {
                const blob = base64ToBlob(resource.file_content, resource.mime_type);
                const url = URL.createObjectURL(blob);
                setObjectUrl(url);

                // Cleanup the object URL when the component unmounts or resource changes
                return () => {
                    URL.revokeObjectURL(url);
                };
            } catch (error) {
                console.error("Error creating Blob URL for PDF:", error);
                setObjectUrl(null);
            }
        }
    }, [resource]);


    if (!isOpen) return null;
    
    const renderContent = () => {
        if (isLoading) return <p className="text-center p-10">Chargement...</p>;
        if (!resource) return <p className="text-center p-10">Ressource non trouvée.</p>;

        const fileUrl = resource.file_content ? `data:${resource.mime_type};base64,${resource.file_content}` : '';

        switch(resource.resource_type) {
            case 'file':
                if (resource.mime_type?.startsWith('image/')) {
                    return <img src={fileUrl} alt={resource.title} className="max-w-full max-h-[70vh] mx-auto" />;
                }
                if (resource.mime_type === 'application/pdf') {
                    return objectUrl ? (
                        <iframe src={objectUrl} className="w-full h-full" title={resource.title} />
                    ) : (
                        <p className="text-center p-10">Préparation de l'aperçu du PDF...</p>
                    );
                }
                return <p>Prévisualisation non supportée. Veuillez télécharger le fichier.</p>;

            default:
                return null;
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-6xl mx-4 my-8 h-[95vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex-shrink-0 flex justify-between items-start mb-4 border-b pb-4">
                    <div>
                        <h2 className="text-xl font-bold font-display text-slate-800">{resource?.title || 'Chargement...'}</h2>
                        {resource?.file_name && <p className="text-sm text-slate-500">{resource.file_name}</p>}
                    </div>
                     <div className="flex items-center gap-2">
                        {resource?.resource_type === 'file' && resource.file_content && (
                            <a 
                                href={`data:${resource.mime_type};base64,${resource.file_content}`} 
                                download={resource.file_name}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700"
                            >
                                Télécharger
                            </a>
                        )}
                        <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                </div>
                <div className="flex-grow overflow-auto flex items-center justify-center">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};

export default ResourceViewerModal;