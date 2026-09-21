import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import { getLegalDoc } from "../services/contentService";
import { Shield } from "lucide-react";

export default function Legal({ slug }) {
  const [doc, setDoc] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    // Allow 'privacy' or 'terms', else it will just show not found if the DB doesn't have it
    getLegalDoc(slug).then((res) => {
      if (isMounted) {
        setDoc(res.data);
        setIsLoading(false);
      }
    });
    return () => { isMounted = false; };
  }, [slug]);

  // A super basic markdown parser for the legal docs (headers and lists)
  function renderContent(content) {
    if (!content) return null;
    return content.split('\n').map((line, i) => {
      if (line.startsWith('## ')) {
        return <h2 key={i} className="font-heading text-primary text-2xl font-semibold mt-10 mb-4">{line.replace('## ', '')}</h2>;
      }
      if (line.startsWith('- ')) {
        const text = line.replace('- ', '');
        const parts = text.split(/(\*\*.*?\*\*)/);
        return (
          <li key={i} className="font-body text-neutral-600 text-base leading-relaxed ml-6 list-disc mb-2">
            {parts.map((part, pi) =>
              part.startsWith('**') && part.endsWith('**') ? (
                <strong key={pi} className="font-semibold">{part.slice(2, -2)}</strong>
              ) : (
                part
              )
            )}
          </li>
        );
      }
      if (line.trim() === '') return null;
      
      // Paragraphs
      return <p key={i} className="font-body text-neutral-600 text-base leading-relaxed mb-4">{line}</p>;
    });
  }

  if (!isLoading && !doc) {
    return <Navigate to="/404" replace />;
  }

  return (
    <>
      <Navbar />

      <main id="main-content" className="pt-24 pb-20 sm:pt-32 sm:pb-32 bg-neutral-50 min-h-screen">
        <div className="container-custom max-w-3xl mx-auto">
          {isLoading ? (
            <div className="animate-pulse flex flex-col gap-4 pt-10">
              <div className="h-10 w-1/3 bg-neutral-200 rounded-lg"></div>
              <div className="h-4 w-1/4 bg-neutral-200 rounded-lg mb-8"></div>
              <div className="h-4 w-full bg-neutral-200 rounded-lg"></div>
              <div className="h-4 w-full bg-neutral-200 rounded-lg"></div>
              <div className="h-4 w-3/4 bg-neutral-200 rounded-lg"></div>
            </div>
          ) : (
            <article className="bg-white p-8 sm:p-12 rounded-3xl shadow-warm-sm border border-neutral-100">
              <div className="flex items-center gap-3 text-gold mb-6">
                <Shield size={24} />
                <span className="font-body text-xs uppercase tracking-wider font-semibold">Legal</span>
              </div>
              
              <h1 className="font-heading text-primary text-4xl sm:text-5xl mb-4">
                {doc.title}
              </h1>
              
              <p className="font-body text-neutral-400 text-sm mb-12 border-b border-neutral-100 pb-8">
                Last updated: {doc.lastUpdated}
              </p>

              <div className="prose prose-neutral max-w-none">
                {renderContent(doc.content)}
              </div>
            </article>
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
