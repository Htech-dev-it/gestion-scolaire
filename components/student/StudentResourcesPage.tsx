import React, { useState, useEffect, useCallback, useMemo } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { useSchoolYear } from '../../contexts/SchoolYearContext';
import { useNotification } from '../../contexts/NotificationContext';
import { apiFetch } from '../../utils/api';
import type { Resource } from '../../types';
import ResourceViewerModal from '../ResourceViewerModal';

const ResourceIcon: React.FC<{ type: Resource['resource_type'] }> = ({ type }) => {
    const icons = {
        file: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg>,
        link: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" /></svg>,
    };
    return <div className="mr-3 text-slate-500">{icons[type] || icons['file']}</div>;
};


const StudentResourcesPage: React.FC = () => {
    const { user } = useAuth();
    const { selectedYear } = useSchoolYear();
    const { addNotification } = useNotification();
    const [resources, setResources] = useState<Resource[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedResource, setSelectedResource] = useState<Resource | null>(null);

    const fetchResources = useCallback(async () => {
        if (!selectedYear || !user?.student_id) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const data = await apiFetch(`/resources?yearId=${selectedYear.id}&studentId=${user.student_id}`);
            setResources(data);
        } catch (error) {
            if (error instanceof Error) addNotification({ type: 'error', message: error.message });
        } finally {
            setIsLoading(false);
        }
    }, [selectedYear, user, addNotification]);

    useEffect(() => {
        fetchResources();
    }, [fetchResources]);

    const resourcesBySubject = useMemo(() => {
        return resources.reduce((acc, resource) => {
            const subjectName = resource.subject_name || 'Non classé';
            if (!acc[subjectName]) {
                acc[subjectName] = [];
            }
            acc[subjectName].push(resource);
            return acc;
        }, {} as Record<string, Resource[]>);
    }, [resources]);
    
    const handleResourceClick = (resource: Resource) => {
        if (resource.resource_type === 'link' && resource.url) {
            window.open(resource.url, '_blank', 'noopener,noreferrer');
        } else {
            setSelectedResource(resource);
        }
    };

    const renderContent = () => {
        if (isLoading) return <div className="text-center p-10 text-slate-500">Chargement des ressources...</div>;
        if (resources.length === 0) return <div className="text-center p-10 bg-white rounded-lg shadow-md italic">Aucune ressource partagée pour cette année scolaire.</div>;
        
        return (
             <div className="space-y-6">
                {Object.entries(resourcesBySubject).map(([subjectName, subjectResources]) => (
                    <div key={subjectName} className="p-6 bg-white rounded-xl shadow-md">
                        <h2 className="text-xl font-bold text-slate-800 font-display mb-4 border-b pb-2">{subjectName}</h2>
                        <ul className="space-y-2">
                            {subjectResources.map(resource => (
                                <li key={resource.id}>
                                    <button 
                                        onClick={() => handleResourceClick(resource)}
                                        className="w-full flex items-center p-3 bg-slate-50 rounded-lg hover:bg-blue-100 transition-colors text-left"
                                    >
                                        <ResourceIcon type={resource.resource_type} />
                                        <div className="flex-grow">
                                            <p className="font-medium text-slate-700">{resource.title}</p>
                                            <p className="text-xs text-slate-500">{new Date(resource.created_at).toLocaleDateString('fr-FR')}</p>
                                        </div>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="p-4 md:p-8 max-w-4xl mx-auto">
            <header className="mb-8">
                <ReactRouterDOM.Link to="/student" className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors mb-4 group font-medium"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" /></svg>Retour</ReactRouterDOM.Link>
                <h1 className="text-4xl font-bold text-gray-800 font-display">Ressources Pédagogiques</h1>
                <p className="text-lg text-slate-500 mt-2">Documents et liens pour l'année {selectedYear?.name}</p>
            </header>
            {renderContent()}

            {selectedResource && (
                <ResourceViewerModal
                    isOpen={!!selectedResource}
                    onClose={() => setSelectedResource(null)}
                    resourceId={selectedResource.id}
                />
            )}
        </div>
    );
};

export default StudentResourcesPage;