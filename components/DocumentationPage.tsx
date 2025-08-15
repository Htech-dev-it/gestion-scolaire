import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import IntelligentDocumentationRenderer from './IntelligentDocumentationRenderer';

const DocumentationPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [markdown, setMarkdown] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
 
  useEffect(() => {
    // The new renderer handles its own data fetching for the 'standard' role
    if (!user || user.role === 'standard') {
      setIsLoading(false);
      return;
    }

    const docPath = `/docs/${user.role}.md`;

    const fetchDocs = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(docPath);
        if (!response.ok) {
          throw new Error(`La documentation pour votre rôle (${user.role}) n'a pas été trouvée.`);
        }
        const text = await response.text();
        setMarkdown(text);
      } catch (e) {
        if (e instanceof Error) setError(e.message);
        else setError('Une erreur inconnue est survenue.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocs();
  }, [user]);
  
  const renderContent = () => {
    if (isLoading) return <div className="text-center p-10">Chargement de la documentation...</div>;
    if (error) return <div className="text-center p-10 text-red-600 bg-red-50 rounded-lg">{error}</div>;

    // Delegate rendering to the new intelligent component for 'standard' users
    if (user?.role === 'standard') {
        return <IntelligentDocumentationRenderer />;
    }
    
    // For other roles, use the old renderer (now embedded in the new component)
    return <IntelligentDocumentationRenderer staticMarkdown={markdown} />;
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <header className="mb-8 flex justify-between items-start flex-wrap gap-4">
        <div>
           <button onClick={() => navigate(-1)} className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors mb-4 group font-medium">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 transform group-hover:-translate-x-1 transition-transform" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
            Retour
          </button>
          <h1 className="text-4xl font-bold text-gray-800 font-display">Documentation</h1>
          <p className="text-lg text-slate-500 mt-2">
              Guide d'utilisation pour le rôle : <span className="font-semibold capitalize text-blue-600">{user?.role}</span>
          </p>
        </div>
      </header>

      {renderContent()}
    </div>
  );
};

export default DocumentationPage;