import React from 'react';
import * as ReactRouterDOM from 'react-router-dom';

const FeatureCard: React.FC<{ icon: React.ReactNode; title: string; description: string; }> = ({ icon, title, description }) => (
    <div className="bg-white p-8 rounded-2xl shadow-lg transform transition-transform duration-300 hover:-translate-y-2 border border-slate-100 h-full">
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
  const handleScrollToContact = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const contactSection = document.getElementById('contact');
    if (contactSection) {
      contactSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

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
            <a 
              href="#contact" 
              onClick={handleScrollToContact}
              className="mt-10 inline-block px-8 py-4 text-base font-bold text-white bg-[#F27438] rounded-lg shadow-lg hover:bg-orange-600 transform hover:scale-105 transition-all"
            >
              Contactez-nous
            </a>
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
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                title="Gestion des Élèves"
                description="Suivez les dossiers complets de vos élèves, de l'inscription à l'archivage, avec toutes les informations centralisées."
              />
              <FeatureCard 
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>}
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

        {/* Security Section */}
        <section id="security" className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-800 font-display">Notre Engagement pour la Sécurité</h2>
              <p className="mt-4 text-slate-500 max-w-2xl mx-auto">La protection des données de votre établissement est notre priorité absolue.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <FeatureCard
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-1.026.977-2.19.977-3.434m-2.09-2.09a13.916 13.916 0 00-2.25-3.11m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-1.026.977-2.19.977-3.434" /></svg>}
                title="Isolation des Données"
                description="Les données de chaque école sont dans un 'coffre-fort' numérique totalement isolé. Aucune autre école ne peut y accéder."
              />
              <FeatureCard
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M15 21v-2a6 6 0 00-5.197-5.975M15 21H9" /></svg>}
                title="Gestion des Rôles"
                description="Chaque utilisateur (secrétaire, comptable, professeur) ne voit que ce qui est nécessaire à son travail, protégeant ainsi l'information sensible."
              />
              <FeatureCard
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>}
                title="Chiffrement des Données"
                description="Les communications sont sécurisées et les mots de passe sont stockés de manière chiffrée, suivant les standards bancaires."
              />
              <FeatureCard
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>}
                title="Sauvegardes Régulières"
                description="Vos données sont sauvegardées de manière régulière et sécurisée pour prévenir toute perte accidentelle."
              />
            </div>
          </div>
        </section>

        {/* Offline/PWA Section */}
        <section id="offline" className="py-24 bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-800 font-display">Fiabilité à Toute Épreuve : En Ligne ou Hors Ligne</h2>
              <p className="mt-4 text-slate-500 max-w-2xl mx-auto">ScolaLink est conçue pour fonctionner même lorsque votre connexion internet est instable.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <FeatureCard
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z" /></svg>}
                title="Continuité du Travail"
                description="Ne perdez jamais votre travail. ScolaLink sauvegarde vos modifications même sans internet et synchronise tout dès que la connexion revient."
              />
              <FeatureCard
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>}
                title="Application Installable"
                description="Installez ScolaLink sur votre ordinateur ou tablette pour un accès direct depuis votre bureau, comme une application native."
              />
              <FeatureCard
                icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
                title="Performance Exceptionnelle"
                description="Grâce à sa technologie PWA, l'application est incroyablement rapide au lancement et à l'utilisation quotidienne."
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