import React from 'react';
import * as ReactRouterDOM from 'react-router-dom';

const FeatureCard: React.FC<{ icon: React.ReactNode; title: string; description: string; }> = ({ icon, title, description }) => (
    <div className="bg-white p-8 rounded-2xl shadow-lg transform transition-transform duration-300 hover:-translate-y-2 border border-slate-100">
        <div className="flex-shrink-0 h-16 w-16 mb-6 rounded-xl flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            {icon}
        </div>
        <div>
            <h3 className="text-xl font-bold text-slate-800 font-display">{title}</h3>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">{description}</p>
        </div>
    </div>
);

const ContactInfo: React.FC<{ icon: React.ReactNode; title: string; value: string; href: string; }> = ({ icon, title, value, href }) => (
    <a href={href} className="group block text-center bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-shadow border">
        <div className="flex items-center justify-center h-12 w-12 rounded-full bg-slate-100 text-slate-600 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors mx-auto mb-4">
            {icon}
        </div>
        <h4 className="font-semibold text-slate-700">{title}</h4>
        <p className="text-blue-600 group-hover:underline">{value}</p>
    </a>
);


const LandingPage: React.FC = () => {
  return (
    <div className="bg-slate-50 text-slate-700">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-lg shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <ReactRouterDOM.Link to="/" className="flex items-center gap-2">
              <img src="/scolalink_logo.jpg" alt="ScolaLink Logo" className="h-9 w-auto" />
              <span className="text-2xl font-bold text-slate-800 font-display">ScolaLink</span>
            </ReactRouterDOM.Link>
            <ReactRouterDOM.Link 
              to="/login"
              className="px-6 py-2.5 text-sm font-bold text-white bg-[#F27438] rounded-lg shadow-md hover:bg-orange-600 transition-all transform hover:scale-105"
            >
              Se connecter
            </ReactRouterDOM.Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative pt-36 pb-24 text-center overflow-hidden bg-white">
          <div className="absolute inset-0 bg-gradient-to-b from-blue-50 to-white opacity-60"></div>
           <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-orange-100 rounded-full opacity-30 blur-2xl"></div>
           <div className="absolute -top-32 -right-32 w-96 h-96 bg-blue-100 rounded-full opacity-30 blur-2xl"></div>
          <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 font-display leading-tight">
              La plateforme de gestion scolaire <span className="text-blue-600">intuitive</span> et <span className="text-orange-500">complète</span>.
            </h1>
            <p className="mt-6 text-lg md:text-xl text-slate-600 max-w-2xl mx-auto">
              ScolaLink centralise toutes vos opérations, de l'inscription des élèves à la génération des bulletins, pour une administration fluide et efficace.
            </p>
            <ReactRouterDOM.Link 
              to="/login" 
              className="mt-10 inline-block px-8 py-4 text-base font-bold text-white bg-[#F27438] rounded-lg shadow-lg hover:bg-orange-600 transform hover:scale-105 transition-all"
            >
              Accéder à mon portail
            </ReactRouterDOM.Link>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-800 font-display">Tout ce dont votre école a besoin, au même endroit</h2>
              <p className="mt-4 text-slate-500 max-w-2xl mx-auto">Optimisez chaque aspect de votre administration avec des outils puissants et simples d'utilisation.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <FeatureCard 
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M17 20h5v-2a3 3 0 0 0-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 0 1 5-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 0 1 9.288 0M15 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm-18 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z" /></svg>}
                title="Gestion des Élèves"
                description="Suivez les dossiers complets de vos élèves, de l'inscription à l'archivage, avec toutes les informations centralisées."
              />
              <FeatureCard 
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
                title="Suivi Financier Simplifié"
                description="Gérez les frais de scolarité, enregistrez les versements et consultez les balances en temps réel pour chaque élève."
              />
              <FeatureCard 
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>}
                title="Bulletins & Carnets de Notes"
                description="Permettez aux professeurs de saisir les notes facilement et générez des bulletins professionnels en quelques clics."
              />
               <FeatureCard 
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
                title="Emploi du Temps Intégré"
                description="Créez et gérez l'emploi du temps de toute l'école. Les professeurs et les élèves y ont accès en temps réel."
              />
              <FeatureCard 
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>}
                title="Suivi des Présences"
                description="Les professeurs peuvent faire l'appel en ligne, vous donnant une vue d'ensemble instantanée de l'assiduité."
              />
              <FeatureCard 
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" /></svg>}
                title="Portails Intuitifs"
                description="Des interfaces dédiées et sécurisées pour les administrateurs, professeurs et élèves, accessibles partout."
              />
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section id="contact" className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-800 font-display">Une question ? Contactez-nous.</h2>
            <p className="mt-4 text-slate-500 max-w-2xl mx-auto">Notre équipe est disponible pour répondre à vos questions ou pour organiser une démonstration personnalisée de la plateforme.</p>
            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto">
                <ContactInfo
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>}
                    title="Par Email"
                    value="beauchant509@gmail.com"
                    href="mailto:beauchant509@gmail.com"
                />
                <ContactInfo
                    icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>}
                    title="Par Téléphone"
                    value="+509 4494-2227"
                    href="tel:+50944942227"
                />
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-800 text-white">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex justify-center items-center gap-2">
              <img src="/scolalink_logo.png" alt="ScolaLink Logo" className="h-8 w-auto" />
              <span className="text-xl font-bold">ScolaLink</span>
          </div>
          <p className="mt-4 text-sm text-slate-400">&copy; {new Date().getFullYear()} ScolaLink. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
